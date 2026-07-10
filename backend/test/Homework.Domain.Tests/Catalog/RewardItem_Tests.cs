using System;
using Homework.Catalog;
using Shouldly;
using Xunit;

namespace Homework.Catalog;

public class RewardItem_Tests
{
    [Fact]
    public void Creates_With_Defaults_Inactive()
    {
        var item = new RewardItem(Guid.NewGuid(), "星火书签");
        item.Name.ShouldBe("星火书签");
        item.GrowthValue.ShouldBe(12);
        item.RandomWeight.ShouldBe(1);
        item.IsActive.ShouldBeFalse();
    }

    [Fact]
    public void Rejects_Blank_Name()
    {
        Should.Throw<ArgumentException>(() => new RewardItem(Guid.NewGuid(), " "));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Rejects_NonPositive_GrowthValue(int v)
    {
        Should.Throw<ArgumentException>(() => new RewardItem(Guid.NewGuid(), "道具", v));
    }

    [Fact]
    public void Rejects_Negative_RandomWeight()
    {
        Should.Throw<ArgumentException>(() => new RewardItem(Guid.NewGuid(), "道具", 12, -1));
    }

    [Fact]
    public void Activate_Deactivate_Toggle()
    {
        var item = new RewardItem(Guid.NewGuid(), "道具");
        item.Activate();
        item.IsActive.ShouldBeTrue();
        item.Deactivate();
        item.IsActive.ShouldBeFalse();
    }
}
