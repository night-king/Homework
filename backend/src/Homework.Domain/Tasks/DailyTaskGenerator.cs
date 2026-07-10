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

    private async Task<(int Total, int Completed)> ResolveDayTotalsAsync(Guid childId, DateOnly date)
    {
        var tasks = await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date);
        if (tasks.Count > 0)
        {
            return (tasks.Count, tasks.Count(t => t.CountsAsCompleted));
        }

        var journey = await GetActiveJourneyAsync(childId, date);
        if (journey == null)
        {
            return (0, 0);
        }

        var dow = date.DayOfWeek;
        var journeyId = journey.Id;
        var templateCount = await _templateRepository.CountAsync(
            t => t.JourneyId == journeyId && t.DayOfWeek == dow && t.IsActive);
        return (templateCount, 0);
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
