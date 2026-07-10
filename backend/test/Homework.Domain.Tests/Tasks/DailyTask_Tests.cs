using System;
using Shouldly;
using Xunit;

namespace Homework.Tasks;

public class DailyTask_Tests
{
    private static DailyTask New() => new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 7, 6), "语文");

    [Fact]
    public void SetSubject_Updates_Subject()
        => New().SetSubject("数学").Subject.ShouldBe("数学");

    [Fact]
    public void SetOrder_Updates_Order()
        => New().SetOrder(3).Order.ShouldBe(3);

    [Fact]
    public void SetOrder_Negative_Throws()
        => Should.Throw<ArgumentException>(() => New().SetOrder(-1));

    [Fact]
    public void Reward_Granted_Flag_Toggles()
    {
        var t = new DailyTask(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 7, 6), "语文");
        t.RewardGranted.ShouldBeFalse();
        t.MarkRewardGranted();
        t.RewardGranted.ShouldBeTrue();
        t.ClearRewardGranted();
        t.RewardGranted.ShouldBeFalse();
    }
}
