using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Tasks;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class RewardResolver_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly RewardResolver _resolver;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IGuidGenerator _guid;

    public RewardResolver_Tests()
    {
        _resolver = GetRequiredService<RewardResolver>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    [Fact]
    public async Task Specific_Returns_That_Id()
    {
        var id = _guid.Create();
        (await _resolver.ResolveAsync(id, isRandom: false)).ShouldBe(id);
    }

    [Fact]
    public async Task Random_Empty_Pool_Returns_Null()
    {
        // no active reward items seeded in a fresh scope
        (await _resolver.ResolveAsync(null, isRandom: true)).ShouldBeNull();
    }

    [Fact]
    public async Task Random_Picks_An_Active_Item()
    {
        RewardItem active = null!;
        await WithUnitOfWorkAsync(async () =>
        {
            active = new RewardItem(_guid.Create(), "闪光浆果", 12, 1);
            active.Activate();
            await _rewardRepo.InsertAsync(active, autoSave: true);
            var inactive = new RewardItem(_guid.Create(), "隐藏道具", 12, 1); // not activated
            await _rewardRepo.InsertAsync(inactive, autoSave: true);
        });

        var picked = await _resolver.ResolveAsync(null, isRandom: true);
        picked.ShouldBe(active.Id); // only one active → must pick it
    }
}
