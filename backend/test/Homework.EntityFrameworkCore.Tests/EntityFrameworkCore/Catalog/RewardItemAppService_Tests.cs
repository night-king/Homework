using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class RewardItemAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IRewardItemAppService _service;

    public RewardItemAppService_Tests()
    {
        _service = GetRequiredService<IRewardItemAppService>();
    }

    [Fact]
    public async Task Create_Then_Get_Roundtrips_Fields()
    {
        var created = await _service.CreateAsync(new CreateUpdateRewardItemDto
        {
            Name = "留存果实", Glyph = "🍎", GrowthValue = 15, RandomWeight = 3, DisplayOrder = 2, IsActive = true
        });

        var fetched = await _service.GetAsync(created.Id);
        fetched.Name.ShouldBe("留存果实");
        fetched.Glyph.ShouldBe("🍎");
        fetched.GrowthValue.ShouldBe(15);
        fetched.RandomWeight.ShouldBe(3);
        fetched.IsActive.ShouldBeTrue();
    }

    [Fact]
    public async Task ActiveList_Excludes_Inactive_And_Sorts_By_DisplayOrder()
    {
        await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "B", GrowthValue = 12, RandomWeight = 1, DisplayOrder = 1, IsActive = true });
        await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "A", GrowthValue = 12, RandomWeight = 1, DisplayOrder = 0, IsActive = true });
        await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "隐藏", GrowthValue = 12, RandomWeight = 1, DisplayOrder = 5, IsActive = false });

        var active = await _service.GetActiveListAsync();
        active.Items.Select(i => i.Name).ShouldNotContain("隐藏");
        var ordered = active.Items.Where(i => i.Name is "A" or "B").Select(i => i.Name).ToList();
        ordered.ShouldBe(new[] { "A", "B" });
    }

    [Fact]
    public async Task Update_Changes_Fields()
    {
        var created = await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "旧", GrowthValue = 12, RandomWeight = 1, IsActive = false });
        var updated = await _service.UpdateAsync(created.Id, new CreateUpdateRewardItemDto { Name = "新", GrowthValue = 20, RandomWeight = 2, IsActive = true });
        updated.Name.ShouldBe("新");
        updated.GrowthValue.ShouldBe(20);
        updated.IsActive.ShouldBeTrue();
    }

    [Fact]
    public async Task Delete_Removes()
    {
        var created = await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "删", GrowthValue = 12, RandomWeight = 1 });
        await _service.DeleteAsync(created.Id);
        (await _service.GetListAsync()).Items.ShouldNotContain(i => i.Id == created.Id);
    }
}
