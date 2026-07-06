using System;

namespace Homework.Scoring;

/// <summary>连击/排行榜计算用的轻量账本快照（与 EF 实体解耦，便于纯函数测试）。</summary>
public readonly record struct DailyScoreSnapshot(DateOnly Date, bool IsFull, bool IsRestDay);
