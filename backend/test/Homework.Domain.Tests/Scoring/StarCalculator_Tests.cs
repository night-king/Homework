using Shouldly;
using Xunit;

namespace Homework.Scoring;

public class StarCalculator_Tests
{
    [Theory]
    // 无任务 / 没做 → 0（休息日在别处判定）
    [InlineData(0, 0, 0)]
    [InlineData(4, 0, 0)]
    // 全做完 → 满 5★（公平核心：4 项和 7 项都能拿满）
    [InlineData(4, 4, 5)]
    [InlineData(7, 7, 5)]
    // 部分完成：ceil(completed/total × 5)
    [InlineData(4, 1, 2)] // ceil(1.25)
    [InlineData(4, 2, 3)] // ceil(2.5)
    [InlineData(4, 3, 4)] // ceil(3.75)
    [InlineData(7, 1, 1)] // ceil(0.71)
    [InlineData(7, 4, 3)] // ceil(2.857)
    [InlineData(7, 6, 5)] // ceil(4.28)
    // completed>total 夹取；封顶不超过 5
    [InlineData(4, 9, 5)]
    public void CalculateStars_Should_Be_Fair_And_Capped(int total, int completed, int expected)
    {
        StarCalculator.CalculateStars(total, completed).ShouldBe(expected);
    }
}
