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

    public async Task<List<DailyTask>> EnsureDayAsync(Guid childId, DateOnly date)
    {
        var existing = await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date);
        if (existing.Count > 0)
        {
            return existing.OrderBy(t => t.Order).ToList();
        }

        var journey = await GetActiveJourneyAsync(childId, date);
        if (journey == null)
        {
            return new List<DailyTask>();
        }

        var dow = date.DayOfWeek;
        var journeyId = journey.Id;
        var templates = (await _templateRepository.GetListAsync(
                t => t.JourneyId == journeyId && t.DayOfWeek == dow && t.IsActive))
            .OrderBy(t => t.Order).ToList();

        var created = new List<DailyTask>();
        foreach (var t in templates)
        {
            var rewardItemId = await _rewardResolver.ResolveAsync(t.RewardItemId, t.RewardIsRandom);
            var task = new DailyTask(GuidGenerator.Create(), childId, journeyId, date, t.Title,
                t.Subject, t.Order, t.Id, rewardItemId);
            await _dailyTaskRepository.InsertAsync(task, autoSave: true);
            created.Add(task);
        }

        return created;
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
    /// 整个区间只发两条查询（区间内全部任务 + 该旅程全部 active 模板），
    /// 连续完成要扫 90 天，逐天查询会变成 180 次往返。
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

        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == childId && j.Status == JourneyStatus.Active);

        var templateCountByDow = new Dictionary<DayOfWeek, int>();
        if (journey != null)
        {
            var journeyId = journey.Id;
            var templates = await _templateRepository.GetListAsync(
                t => t.JourneyId == journeyId && t.IsActive);
            templateCountByDow = templates.GroupBy(t => t.DayOfWeek)
                .ToDictionary(g => g.Key, g => g.Count());
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
