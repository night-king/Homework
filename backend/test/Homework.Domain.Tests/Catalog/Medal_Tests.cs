using System;
using Homework.Catalog;
using Shouldly;
using Xunit;

namespace Homework.Catalog;

public class Medal_Tests
{
    [Fact]
    public void Creates_Inactive_With_Name()
    {
        var medal = new Medal(Guid.NewGuid(), "暑期毕业勋章");
        medal.Name.ShouldBe("暑期毕业勋章");
        medal.IsActive.ShouldBeFalse();
    }

    [Fact]
    public void Rejects_Blank_Name()
    {
        Should.Throw<ArgumentException>(() => new Medal(Guid.NewGuid(), " "));
    }

    [Fact]
    public void Sets_Image_And_Description()
    {
        var medal = new Medal(Guid.NewGuid(), "勋章");
        medal.SetDescription("坚持一个暑假");
        medal.SetImage("medals/x.png");
        medal.Description.ShouldBe("坚持一个暑假");
        medal.ImageObjectKey.ShouldBe("medals/x.png");
    }
}
