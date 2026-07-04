using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Scoring;

/// <summary>
/// 家庭大目标：两人合力攒星，达标解锁全家奖励（spec §5.4）。
/// 进度由聚合区间内的 DailyScore.Stars 得出，不持久化进度值。
/// </summary>
public class FamilyGoal : FullAuditedAggregateRoot<Guid>
{
    public string Title { get; private set; }
    public int TargetStars { get; private set; }
    public string? RewardText { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public DateTime? AchievedTime { get; private set; }

    protected FamilyGoal()
    {
    }

    public FamilyGoal(
        Guid id, [NotNull] string title, int targetStars, DateOnly startDate, DateOnly endDate,
        string? rewardText = null)
        : base(id)
    {
        SetTitle(title);
        SetTarget(targetStars);
        SetPeriod(startDate, endDate);
        RewardText = rewardText;
    }

    public FamilyGoal SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public FamilyGoal SetTarget(int targetStars)
    {
        if (targetStars <= 0)
        {
            throw new ArgumentException("targetStars must be > 0", nameof(targetStars));
        }

        TargetStars = targetStars;
        return this;
    }

    public FamilyGoal SetPeriod(DateOnly startDate, DateOnly endDate)
    {
        if (endDate < startDate)
        {
            throw new ArgumentException("endDate must be >= startDate", nameof(endDate));
        }

        StartDate = startDate;
        EndDate = endDate;
        return this;
    }

    public void SetRewardText(string? rewardText) => RewardText = rewardText;

    public bool IsInRange(DateOnly date) => date >= StartDate && date <= EndDate;

    /// <summary>据当前累计星星判断是否达标；新达标则记录时间并返回 true。</summary>
    public bool CheckAchieved(int currentStars, DateTime now)
    {
        if (AchievedTime == null && currentStars >= TargetStars)
        {
            AchievedTime = now;
            return true;
        }

        return false;
    }
}
