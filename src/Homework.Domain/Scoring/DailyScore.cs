using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Scoring;

/// <summary>
/// 某孩子某天的记分账本 —— 唯一真相源（spec §6/§7.7）。
/// 日榜/总榜/大目标/连击都由它派生。经"过去日补档"保持无缺口。
/// </summary>
public class DailyScore : FullAuditedAggregateRoot<Guid>
{
    public Guid ChildId { get; private set; }
    public DateOnly Date { get; private set; }
    public int TasksTotal { get; private set; }
    public int TasksCompleted { get; private set; }
    public int Stars { get; private set; }
    public bool IsFull { get; private set; }       // 吃饱：N>0 且全部完成
    public bool IsRestDay { get; private set; }    // 无任务日：N==0

    protected DailyScore()
    {
    }

    public DailyScore(Guid id, Guid childId, DateOnly date)
        : base(id)
    {
        ChildId = childId;
        Date = date;
    }

    /// <summary>
    /// 用当天任务合计重算本行。total==0 → 休息日（0★、不吃饱）；
    /// 否则 stars = ceil(completed/total × 上限)、IsFull = 全部完成。
    /// </summary>
    public DailyScore Settle(int tasksTotal, int tasksCompleted, int maxStars = ScoringConsts.MaxDailyStars)
    {
        if (tasksTotal < 0)
        {
            tasksTotal = 0;
        }

        if (tasksCompleted < 0)
        {
            tasksCompleted = 0;
        }

        if (tasksCompleted > tasksTotal)
        {
            tasksCompleted = tasksTotal;
        }

        TasksTotal = tasksTotal;
        TasksCompleted = tasksCompleted;
        IsRestDay = tasksTotal == 0;
        Stars = IsRestDay ? 0 : StarCalculator.CalculateStars(tasksTotal, tasksCompleted, maxStars);
        IsFull = !IsRestDay && tasksCompleted == tasksTotal;
        return this;
    }
}
