using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Journeys;
using Homework.Scoring;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Tasks;

/// <summary>按孩子的 Active 旅程惰性生成每日任务并结算分数（幂等）。</summary>
public class DailyTaskGenerator : DomainService
{
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepository;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IRepository<DailyScore, Guid> _dailyScoreRepository;
    private readonly RewardResolver _rewardResolver;

    public DailyTaskGenerator(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<JourneyTaskTemplateItem, Guid> templateRepository,
        IRepository<DailyTask, Guid> dailyTaskRepository,
        IRepository<DailyScore, Guid> dailyScoreRepository,
        RewardResolver rewardResolver)
    {
        _journeyRepository = journeyRepository;
        _templateRepository = templateRepository;
        _dailyTaskRepository = dailyTaskRepository;
        _dailyScoreRepository = dailyScoreRepository;
        _rewardResolver = rewardResolver;
    }

    /// <summary>
    /// 生成/补齐某孩子某天的任务（幂等）。
    /// <para>空的一天：按当前活跃模板全量生成。</para>
    /// <para>今天及以后已生成的一天：<b>补齐</b>活跃模板里还没有对应任务（按 SourceTemplateItemId 匹配）的项
    /// —— 旅程进行中家长新加的任务能立刻反映到今日看板。已有任务（含手动加的、已完成的）原样保留。</para>
    /// <para>过去已生成的一天：冻结不动，保留当时的完成记录，不因后来改计划而变动。</para>
    /// </summary>
    public async Task<List<DailyTask>> EnsureDayAsync(Guid childId, DateOnly date)
    {
        var existing = (await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date))
            .OrderBy(t => t.Order).ToList();

        // 过去的日子一旦生成即冻结（保留完成记录）；今天及以后要反映最新计划。
        var today = DateOnly.FromDateTime(Clock.Now);
        if (existing.Count > 0 && date < today)
        {
            return existing;
        }

        var journey = await GetActiveJourneyAsync(childId, date);
        if (journey == null)
        {
            return existing;   // 无可生成的 Active 旅程（或 date 早于 StartDate）→ 保持现状
        }

        var dow = date.DayOfWeek;
        var journeyId = journey.Id;
        var templates = (await _templateRepository.GetListAsync(
                t => t.JourneyId == journeyId && t.DayOfWeek == dow && t.IsActive))
            .OrderBy(t => t.Order).ToList();

        var existingTemplateIds = existing
            .Where(t => t.SourceTemplateItemId.HasValue)
            .Select(t => t.SourceTemplateItemId!.Value)
            .ToHashSet();

        foreach (var t in templates)
        {
            if (existingTemplateIds.Contains(t.Id))
            {
                continue;   // 已有对应任务 → 幂等跳过
            }

            var rewardItemId = await _rewardResolver.ResolveAsync(t.RewardItemId, t.RewardIsRandom);
            var task = new DailyTask(GuidGenerator.Create(), childId, journeyId, date, t.Title,
                t.Subject, t.Order, t.Id, rewardItemId, t.EstimatedMinutes);
            await _dailyTaskRepository.InsertAsync(task, autoSave: true);
            existing.Add(task);
        }

        return existing.OrderBy(t => t.Order).ToList();
    }

    public async Task SettleDayAsync(Guid childId, DateOnly date)
    {
        var (total, completed) = await ResolveDayTotalsAsync(childId, date);
        var score = await _dailyScoreRepository.FirstOrDefaultAsync(s => s.ChildId == childId && s.Date == date);
        if (score == null)
        {
            score = new DailyScore(GuidGenerator.Create(), childId, date);
            score.Settle(total, completed);
            await _dailyScoreRepository.InsertAsync(score, autoSave: true);
        }
        else
        {
            score.Settle(total, completed);
            await _dailyScoreRepository.UpdateAsync(score, autoSave: true);
        }
    }

    public async Task SettlePastDaysAsync(Guid childId, DateOnly fromDate, DateOnly toDate)
    {
        for (var date = fromDate; date <= toDate; date = date.AddDays(1))
        {
            await SettleDayAsync(childId, date);
        }
    }

    /// <summary>
    /// 批量读区间内每天的任务态势。<b>纯读，绝不生成任务</b>——周条要靠它显示未来日状态，
    /// 一旦调 EnsureDay 就会提前把未来任务生成出来（spec §103 明令禁止）。
    /// 查询数量有上限且与区间天数无关，不会逐天发：区间内每天都已有任务行时只发一条查询
    /// （任务表）；只要有一天还没生成任务，才会再补发旅程查询、模板查询各一条——整个区间共用，
    /// 不会因为缺档天数变多而增加。连续完成要扫 90 天，这保证了热路径（单日已生成）只有 1 次
    /// 往返，SettleDayAsync 委托到这里时不会退化成 2~3 次往返。
    /// </summary>
    public async Task<List<DayStatus>> ReadRangeAsync(Guid childId, DateOnly from, DateOnly to)
    {
        var result = new List<DayStatus>();
        if (to < from)
        {
            return result;
        }

        var tasks = await _dailyTaskRepository.GetListAsync(
            t => t.ChildId == childId && t.Date >= from && t.Date <= to);
        var byDate = tasks.GroupBy(t => t.Date).ToDictionary(
            g => g.Key,
            g => (Total: g.Count(), Completed: g.Count(x => x.CountsAsCompleted)));

        // byDate 的 key 必是 [from, to] 的子集（查询已按此过滤）；
        // 若其数量等于区间天数，则子集必等于全集，即每天都已有任务行 —— 无需再查旅程/模板。
        var rangeDays = to.DayNumber - from.DayNumber + 1;
        var hasGap = byDate.Count < rangeDays;

        Journey? journey = null;
        var templateCountByDow = new Dictionary<DayOfWeek, int>();
        if (hasGap)
        {
            journey = await _journeyRepository.FirstOrDefaultAsync(
                j => j.ChildId == childId && j.Status == JourneyStatus.Active);

            if (journey != null)
            {
                var journeyId = journey.Id;
                var templates = await _templateRepository.GetListAsync(
                    t => t.JourneyId == journeyId && t.IsActive);
                templateCountByDow = templates.GroupBy(t => t.DayOfWeek)
                    .ToDictionary(g => g.Key, g => g.Count());
            }
        }

        for (var date = from; date <= to; date = date.AddDays(1))
        {
            if (byDate.TryGetValue(date, out var counts))
            {
                result.Add(new DayStatus(date, counts.Total, counts.Completed));
                continue;
            }

            var total = 0;
            // 与 GetActiveJourneyAsync 同一条件：Active 且 date 已进入 StartDate
            if (journey != null && date >= journey.StartDate
                && templateCountByDow.TryGetValue(date.DayOfWeek, out var templateCount))
            {
                total = templateCount;
            }

            result.Add(new DayStatus(date, total, 0));
        }

        return result;
    }

    private async Task<(int Total, int Completed)> ResolveDayTotalsAsync(Guid childId, DateOnly date)
    {
        var day = (await ReadRangeAsync(childId, date, date))[0];
        return (day.TasksTotal, day.TasksCompleted);
    }

    /// <summary>该孩子当前 Active 旅程，且 date 已进入其 StartDate（Active 期间即使过 EndDate 也持续生成）。</summary>
    private async Task<Journey?> GetActiveJourneyAsync(Guid childId, DateOnly date)
    {
        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == childId && j.Status == JourneyStatus.Active);
        if (journey == null || date < journey.StartDate)
        {
            return null;
        }

        return journey;
    }
}
