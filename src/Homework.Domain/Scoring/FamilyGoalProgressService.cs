using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Scoring;

/// <summary>家庭大目标进度（spec §5.4）：进度 = 区间内全家 DailyScore.Stars 之和，不持久化进度值。</summary>
public class FamilyGoalProgressService : DomainService
{
    private readonly IRepository<DailyScore, Guid> _dailyScoreRepository;

    public FamilyGoalProgressService(IRepository<DailyScore, Guid> dailyScoreRepository)
    {
        _dailyScoreRepository = dailyScoreRepository;
    }

    /// <summary>大目标进度：goal 区间内全家（所有孩子）DailyScore.Stars 之和。</summary>
    public async Task<int> CalculateStarsAsync(FamilyGoal goal)
    {
        var start = goal.StartDate;
        var end = goal.EndDate;

        var queryable = await _dailyScoreRepository.GetQueryableAsync();
        return await AsyncExecuter.SumAsync(
            queryable.Where(s => s.Date >= start && s.Date <= end),
            s => s.Stars);
    }

    /// <summary>据当前进度刷新达标状态；新达标返回 true 并置 AchievedTime。</summary>
    public async Task<bool> RefreshAchievementAsync(FamilyGoal goal)
    {
        var stars = await CalculateStarsAsync(goal);
        return goal.CheckAchieved(stars, Clock.Now);
    }
}
