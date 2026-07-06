using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Scoring;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Tasks;

/// <summary>
/// 惰性生成每日任务 + 过去日补档记分账本（spec §4.1、§7.7）。
/// </summary>
public class DailyTaskGenerator : DomainService
{
    private readonly IRepository<WeeklyTaskTemplateItem, Guid> _templateRepository;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IRepository<DailyScore, Guid> _dailyScoreRepository;

    public DailyTaskGenerator(
        IRepository<WeeklyTaskTemplateItem, Guid> templateRepository,
        IRepository<DailyTask, Guid> dailyTaskRepository,
        IRepository<DailyScore, Guid> dailyScoreRepository)
    {
        _templateRepository = templateRepository;
        _dailyTaskRepository = dailyTaskRepository;
        _dailyScoreRepository = dailyScoreRepository;
    }

    /// <summary>某孩子某天若还没有 DailyTask，则按该星期几的启用模板惰性生成（幂等）。</summary>
    public async Task<List<DailyTask>> EnsureDayAsync(Guid childId, DateOnly date)
    {
        var existing = await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date);
        if (existing.Count > 0)
        {
            return existing; // 已生成，幂等返回
        }

        var dayOfWeek = date.DayOfWeek;
        var templates = await _templateRepository.GetListAsync(
            t => t.ChildId == childId && t.DayOfWeek == dayOfWeek && t.IsActive);

        var created = new List<DailyTask>();
        foreach (var template in templates.OrderBy(t => t.Order))
        {
            var task = new DailyTask(
                GuidGenerator.Create(), childId, date, template.Title,
                template.Subject, template.Order, sourceTemplateItemId: template.Id);
            await _dailyTaskRepository.InsertAsync(task, autoSave: true);
            created.Add(task);
        }

        return created;
    }

    /// <summary>结算/刷新某孩子某一天的 DailyScore（含"今天"）。幂等。</summary>
    public async Task SettleDayAsync(Guid childId, DateOnly date)
    {
        var (total, completed) = await ResolveDayTotalsAsync(childId, date);

        var score = await _dailyScoreRepository.FindAsync(s => s.ChildId == childId && s.Date == date);
        if (score == null)
        {
            score = new DailyScore(GuidGenerator.Create(), childId, date);
            score.Settle(total, completed);
            await _dailyScoreRepository.InsertAsync(score);
        }
        else
        {
            score.Settle(total, completed);
            await _dailyScoreRepository.UpdateAsync(score);
        }
    }

    /// <summary>逐日补档 DailyScore，使账本无缺口（spec §7.7）：有 DailyTask 的按其完成情况结算；
    /// 无 DailyTask 的按当天启用模板数结算（缺档 = 漏做，C=0）；模板也为 0 → 休息日。可重复运行（幂等）。</summary>
    public async Task SettlePastDaysAsync(Guid childId, DateOnly fromDate, DateOnly toDate)
    {
        for (var date = fromDate; date <= toDate; date = date.AddDays(1))
        {
            await SettleDayAsync(childId, date);
        }
    }

    /// <summary>某孩子某天的 (应做数 N, 已完成数 C)：优先用已生成的 DailyTask；缺档则退回当天启用模板数、C=0。</summary>
    private async Task<(int Total, int Completed)> ResolveDayTotalsAsync(Guid childId, DateOnly date)
    {
        var tasks = await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date);
        if (tasks.Count > 0)
        {
            return (tasks.Count, tasks.Count(t => t.CountsAsCompleted));
        }

        var dayOfWeek = date.DayOfWeek;
        var templateCount = await _templateRepository.CountAsync(
            t => t.ChildId == childId && t.DayOfWeek == dayOfWeek && t.IsActive);
        return (templateCount, 0); // 缺档 = 漏做（模板为 0 时即休息日）
    }
}
