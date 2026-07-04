using System;
using Shouldly;
using Xunit;

namespace Homework.Children;

public class ChildProfile_Tests
{
    [Fact]
    public void Should_Create_Valid_ChildProfile()
    {
        var child = new ChildProfile(Guid.NewGuid(), Guid.NewGuid(), "哥哥", 3);

        child.DisplayName.ShouldBe("哥哥");
        child.Grade.ShouldBe(3);
        child.Pin.ShouldBeNull();
    }

    [Fact]
    public void Should_Reject_Empty_DisplayName()
    {
        Should.Throw<ArgumentException>(() =>
            new ChildProfile(Guid.NewGuid(), Guid.NewGuid(), " ", 1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    public void Should_Reject_OutOfRange_Grade(int grade)
    {
        Should.Throw<ArgumentException>(() =>
            new ChildProfile(Guid.NewGuid(), Guid.NewGuid(), "弟弟", grade));
    }
}
