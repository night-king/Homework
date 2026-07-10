using Homework.Permissions;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

public class CatalogPermissions_Tests
{
    [Fact]
    public void Constant_Values_Are_Stable()
    {
        HomeworkPermissions.Catalog.Default.ShouldBe("Homework.Catalog");
        HomeworkPermissions.Catalog.Pets.ShouldBe("Homework.Catalog.Pets");
        HomeworkPermissions.Catalog.RewardItems.ShouldBe("Homework.Catalog.RewardItems");
        HomeworkPermissions.Catalog.Medals.ShouldBe("Homework.Catalog.Medals");
    }
}
