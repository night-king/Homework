using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class PetSpeciesAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IPetSpeciesAppService _service;

    public PetSpeciesAppService_Tests()
    {
        _service = GetRequiredService<IPetSpeciesAppService>();
    }

    [Fact]
    public async Task Create_Then_Get_Roundtrips()
    {
        var created = await _service.CreateAsync(new CreateUpdatePetSpeciesDto
        {
            Name = "火龙", Code = "dragon", AccentColor = "#E8461F", DisplayOrder = 1
        });

        var fetched = await _service.GetAsync(created.Id);
        fetched.Name.ShouldBe("火龙");
        fetched.Code.ShouldBe("dragon");
        fetched.AccentColor.ShouldBe("#E8461F");
        fetched.Forms.ShouldBeEmpty();
        fetched.IsActive.ShouldBeFalse();
    }

    [Fact]
    public async Task SetForm_Adds_And_Updates_Form()
    {
        var created = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = "dragon2" });

        await _service.SetFormAsync(created.Id, new SetPetFormDto { Level = 1, Name = "龙蛋", GrowthToNext = 20, Scale = 0.5m });
        await _service.SetFormAsync(created.Id, new SetPetFormDto { Level = 1, Name = "破壳龙蛋", GrowthToNext = 30, Scale = 0.6m });

        var fetched = await _service.GetAsync(created.Id);
        fetched.Forms.Count.ShouldBe(1);
        fetched.Forms.Single().Name.ShouldBe("破壳龙蛋");
        fetched.Forms.Single().GrowthToNext.ShouldBe(30);
    }

    [Fact]
    public async Task Delete_Removes_Species()
    {
        var created = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "删", Code = "del" });
        await _service.DeleteAsync(created.Id);
        (await _service.GetListAsync()).Items.ShouldNotContain(i => i.Id == created.Id);
    }
}
