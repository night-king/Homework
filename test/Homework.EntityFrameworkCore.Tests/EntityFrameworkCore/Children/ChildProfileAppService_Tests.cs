using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Children.Dtos;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Children;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class ChildProfileAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IChildProfileAppService _service;
    private readonly IRepository<ChildProfile, Guid> _childRepository;
    private readonly IGuidGenerator _guid;

    public ChildProfileAppService_Tests()
    {
        _service = GetRequiredService<IChildProfileAppService>();
        _childRepository = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    private async Task<Guid> SeedChildAsync(string name, int grade)
    {
        var id = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
            await _childRepository.InsertAsync(new ChildProfile(id, _guid.Create(), name, grade)));
        return id;
    }

    [Fact]
    public async Task GetList_Includes_Seeded_Child()
    {
        var id = await SeedChildAsync("哥哥", 3);
        var mine = (await _service.GetListAsync()).Items.SingleOrDefault(c => c.Id == id);
        mine.ShouldNotBeNull();
        mine!.Grade.ShouldBe(3);
    }

    [Fact]
    public async Task Update_Changes_Name_And_Grade()
    {
        var id = await SeedChildAsync("哥哥", 3);
        var updated = await _service.UpdateAsync(id,
            new UpdateChildProfileDto { DisplayName = "大宝", Grade = 4 });
        updated.DisplayName.ShouldBe("大宝");
        updated.Grade.ShouldBe(4);
    }

    [Fact]
    public async Task SetPin_Sets_Then_Clears()
    {
        var id = await SeedChildAsync("弟弟", 1);

        await _service.SetPinAsync(id, new SetChildPinDto { Pin = "1234" });
        (await _service.GetAsync(id)).HasPin.ShouldBeTrue();

        await _service.SetPinAsync(id, new SetChildPinDto { Pin = null });
        (await _service.GetAsync(id)).HasPin.ShouldBeFalse();
    }
}
