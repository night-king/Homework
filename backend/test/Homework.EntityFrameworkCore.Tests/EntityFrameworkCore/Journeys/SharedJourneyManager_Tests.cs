using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Journeys;
using Shouldly;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class SharedJourneyManager_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly SharedJourneyManager _manager;
    private readonly IRepository<SharedJourney, Guid> _repo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public SharedJourneyManager_Tests()
    {
        _manager = GetRequiredService<SharedJourneyManager>();
        _repo = GetRequiredService<IRepository<SharedJourney, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    [Fact]
    public async Task Create_Persists_With_ParentId_Of_Current_User()
    {
        var pid = _guid.Create();
        var medalId = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            var created = await WithUnitOfWorkAsync(async () => await _manager.CreateAsync(
                "暑假共享计划", "描述",
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), medalId));

            created.ParentId.ShouldBe(pid);
            created.Status.ShouldBe(SharedJourneyStatus.Draft);

            var reloaded = await WithUnitOfWorkAsync(async () => await _repo.GetAsync(created.Id));
            reloaded.ParentId.ShouldBe(pid);
            reloaded.Title.ShouldBe("暑假共享计划");
            reloaded.Description.ShouldBe("描述");
            reloaded.MedalId.ShouldBe(medalId);
        }
    }

    [Fact]
    public async Task GetOwned_Returns_Own_But_Not_Others()
    {
        var pA = _guid.Create();
        var pB = _guid.Create();

        Guid sjId;
        using (_principal.Change(Parent(pA)))
        {
            var created = await WithUnitOfWorkAsync(async () => await _manager.CreateAsync(
                "A的计划", null,
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create()));
            sjId = created.Id;

            await WithUnitOfWorkAsync(async () => (await _manager.GetOwnedAsync(sjId)).ShouldNotBeNull());
        }

        using (_principal.Change(Parent(pB)))
        {
            await WithUnitOfWorkAsync(async () =>
                await Should.ThrowAsync<EntityNotFoundException>(async () => await _manager.GetOwnedAsync(sjId)));
        }
    }
}
