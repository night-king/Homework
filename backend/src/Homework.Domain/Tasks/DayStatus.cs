using System;

namespace Homework.Tasks;

/// <summary>
/// 某孩子某天的任务态势，纯读推导（不生成任务）：
/// 已生成 → 用真实任务计数；未生成 → 回退当天 DayOfWeek 的 active 模板条目数。
/// IsRestDay 语义与 <see cref="DailyTaskGenerator"/>/GetDailyBoardAsync 一致：总数为 0 即休息日。
/// </summary>
public readonly record struct DayStatus(DateOnly Date, int TasksTotal, int TasksCompleted)
{
    public bool IsRestDay => TasksTotal == 0;
    public bool IsFull => TasksTotal > 0 && TasksCompleted == TasksTotal;
}
