using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
using Shouldly;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Children;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class ChildProfileManager_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly ChildProfileManager _manager;
    private readonly IRepository<ChildProfile, Guid> _repo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public ChildProfileManager_Tests()
    {
        _manager = GetRequiredService<ChildProfileManager>();
        _repo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    private async Task<Guid> SeedChildAsync(Guid parentId)
    {
        var id = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _repo.InsertAsync(new ChildProfile(id, parentId, "娃", 3)));
        return id;
    }

    [Fact]
    public async Task Owner_Can_Get_Own_Child_But_Not_Others()
    {
        var pA = _guid.Create();
        var pB = _guid.Create();
        var childOfA = await SeedChildAsync(pA);

        using (_principal.Change(Parent(pA)))
        {
            await WithUnitOfWorkAsync(async () => (await _manager.GetOwnedAsync(childOfA)).ShouldNotBeNull());
        }
        using (_principal.Change(Parent(pB)))
        {
            await WithUnitOfWorkAsync(async () =>
                await Should.ThrowAsync<EntityNotFoundException>(async () => await _manager.GetOwnedAsync(childOfA)));
        }
    }

    [Fact]
    public async Task GetOwnedChildIds_Returns_Only_Current_Parents()
    {
        var pA = _guid.Create();
        var pB = _guid.Create();
        var a1 = await SeedChildAsync(pA);
        await SeedChildAsync(pB);

        using (_principal.Change(Parent(pA)))
        {
            await WithUnitOfWorkAsync(async () =>
            {
                var ids = await _manager.GetOwnedChildIdsAsync();
                ids.ShouldContain(a1);
                ids.Count.ShouldBe(1);
            });
        }
    }
}
