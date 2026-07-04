using System;
using Shouldly;
using Xunit;

namespace Homework.Scoring;

public class DailyScore_Tests
{
    private static DailyScore New() => new(Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 7, 4));

    [Fact]
    public void Settle_AllDone_Is_Full_And_5_Stars()
    {
        var s = New().Settle(4, 4);
        s.Stars.ShouldBe(5);
        s.IsFull.ShouldBeTrue();
        s.IsRestDay.ShouldBeFalse();
    }

    [Fact]
    public void Settle_Partial_Is_Not_Full()
    {
        var s = New().Settle(4, 2);
        s.Stars.ShouldBe(3); // ceil(2/4*5)
        s.IsFull.ShouldBeFalse();
        s.IsRestDay.ShouldBeFalse();
    }

    [Fact]
    public void Settle_NoTasks_Is_RestDay()
    {
        var s = New().Settle(0, 0);
        s.IsRestDay.ShouldBeTrue();
        s.Stars.ShouldBe(0);
        s.IsFull.ShouldBeFalse();
    }

    [Fact]
    public void Settle_Clamps_Completed_Over_Total()
    {
        var s = New().Settle(3, 9);
        s.TasksCompleted.ShouldBe(3);
        s.Stars.ShouldBe(5);
        s.IsFull.ShouldBeTrue();
    }
}
