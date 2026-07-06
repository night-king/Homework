using System;
using System.Collections.Generic;
using Shouldly;
using Xunit;

namespace Homework.Scoring;

public class StreakCalculator_Tests
{
    private static readonly DateOnly Today = new(2026, 7, 10);

    private static DailyScoreSnapshot Day(int daysAgo, bool full, bool rest = false)
        => new(Today.AddDays(-daysAgo), full, rest);

    [Fact]
    public void Empty_Ledger_Is_Zero()
        => StreakCalculator.CalculateCurrentStreak(new List<DailyScoreSnapshot>(), Today).ShouldBe(0);

    [Fact]
    public void Three_Consecutive_Full_Days_Is_Three()
    {
        var ledger = new[] { Day(0, true), Day(1, true), Day(2, true) };
        StreakCalculator.CalculateCurrentStreak(ledger, Today).ShouldBe(3);
    }

    [Fact]
    public void RestDay_Bridges_The_Streak()
    {
        // 今天吃饱 · 昨天休息(N=0) · 前两天吃饱 → 休息日桥接，仍算 3
        var ledger = new[] { Day(0, true), Day(1, false, rest: true), Day(2, true), Day(3, true) };
        StreakCalculator.CalculateCurrentStreak(ledger, Today).ShouldBe(3);
    }

    [Fact]
    public void Missed_Past_Day_Breaks_The_Streak()
    {
        // 今天吃饱 · 昨天有任务却没吃饱(漏做) · 前天吃饱 → 昨天断裂，只剩今天
        var ledger = new[] { Day(0, true), Day(1, false), Day(2, true) };
        StreakCalculator.CalculateCurrentStreak(ledger, Today).ShouldBe(1);
    }

    [Fact]
    public void Today_InProgress_Does_Not_Break_Streak()
    {
        // 今天还没吃饱(进行中) · 昨天/前天吃饱 → 今天不断裂，连击=2
        var ledger = new[] { Day(0, false), Day(1, true), Day(2, true) };
        StreakCalculator.CalculateCurrentStreak(ledger, Today).ShouldBe(2);
    }
}
