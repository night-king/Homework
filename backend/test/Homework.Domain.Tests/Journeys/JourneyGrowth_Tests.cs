using System;
using System.Linq;
using Homework.Journeys;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Homework.Journeys;

public class JourneyGrowth_Tests
{
    private static readonly DateTime Now = new(2026, 7, 10, 12, 0, 0, DateTimeKind.Utc);

    private static Journey Started()
    {
        var j = new Journey(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "旅程",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid());
        // 阶阈值：到2阶需20，到3阶需40，到4阶需60，到5阶需80，5阶无
        j.Start(Guid.NewGuid(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
        return j;
    }

    [Fact]
    public void GrantReward_Adds_To_Backpack()
    {
        var j = Started();
        var item = Guid.NewGuid();
        j.GrantReward(item);
        j.GrantReward(item);
        j.Backpack.Single(b => b.RewardItemId == item).Quantity.ShouldBe(2);
    }

    [Fact]
    public void Feed_Empty_Backpack_Throws()
    {
        var j = Started();
        Should.Throw<BusinessException>(() => j.Feed(Guid.NewGuid(), 12, Now));
    }

    [Fact]
    public void Feed_Below_Threshold_Accumulates_No_Evolve()
    {
        var j = Started();
        var item = Guid.NewGuid();
        j.GrantReward(item);
        var r = j.Feed(item, 12, Now);
        r.Evolved.ShouldBeFalse();
        j.CurrentLevel.ShouldBe(1);
        j.GrowthPoints.ShouldBe(12);
        j.Backpack.Any(b => b.RewardItemId == item).ShouldBeFalse(); // qty 0 → removed
    }

    [Fact]
    public void Feed_Reaching_Threshold_Evolves_One_Level_Carrying_Remainder()
    {
        var j = Started();
        var item = Guid.NewGuid();
        j.GrantReward(item); j.GrantReward(item);
        j.Feed(item, 12, Now);            // growth 12
        var r = j.Feed(item, 12, Now);    // growth 24 >= 20 → evolve to L2, carry 4
        r.Evolved.ShouldBeTrue();
        r.NewLevel.ShouldBe(2);
        r.Completed.ShouldBeFalse();
        j.CurrentLevel.ShouldBe(2);
        j.GrowthPoints.ShouldBe(4);
    }

    [Fact]
    public void Feeding_To_Level5_Completes_Journey()
    {
        var j = Started();
        var item = Guid.NewGuid();
        // 逐级喂到满：每次喂足以跨过当前阶阈值（单级进化，余数清空后继续）
        int[] thresholds = { 20, 40, 60, 80 };
        foreach (var t in thresholds)
        {
            j.GrantReward(item);
            j.Feed(item, t, Now); // 恰好达阈值 → 进化一级，余0
        }
        j.CurrentLevel.ShouldBe(5);
        j.Status.ShouldBe(JourneyStatus.Completed);
        j.CompletedTime.ShouldBe(Now);

        // 完成后再喂被拒
        j.GrantReward(item);
        Should.Throw<BusinessException>(() => j.Feed(item, 10, Now));
    }

    [Fact]
    public void RevokeReward_Decrements_Unfed_Unit()
    {
        var j = Started();
        var item = Guid.NewGuid();
        j.GrantReward(item);
        j.RevokeReward(item);
        j.Backpack.Any(b => b.RewardItemId == item).ShouldBeFalse();
        // 再撤销无副作用
        Should.NotThrow(() => j.RevokeReward(item));
    }
}
