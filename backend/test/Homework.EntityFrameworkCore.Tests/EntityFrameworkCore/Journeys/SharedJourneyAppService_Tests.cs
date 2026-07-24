using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Journeys.Dtos;
using Homework.Tasks;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class SharedJourneyAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly ISharedJourneyAppService _service;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly JourneyManager _journeyManager;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public SharedJourneyAppService_Tests()
    {
        _service = GetRequiredService<ISharedJourneyAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _journeyManager = GetRequiredService<JourneyManager>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    private async Task<Guid> SeedChildAsync(Guid parentId)
    {
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, "娃", 3), autoSave: true));
        return childId;
    }

    private async Task<Guid> SeedSpeciesAsync()
    {
        var id = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var s = new PetSpecies(id, "火龙", $"dragon-{id:N}");
            s.SetCover("pets/x/cover.png");
            for (var lvl = 1; lvl <= 4; lvl++)
            {
                s.SetForm(lvl, $"阶{lvl}", null, lvl * 20, 1m);
                s.SetFormSprite(lvl, $"pets/x/form-{lvl}.png");
                s.SetFormEvolveVideo(lvl, $"pets/x/evolve-{lvl}-{lvl + 1}.mp4");
            }
            s.SetForm(5, "满阶", "首次喷火", null, 1.6m);
            s.SetFormSprite(5, "pets/x/form-5.png");
            s.Activate();
            await _speciesRepo.InsertAsync(s, autoSave: true);
        });
        return id;
    }

    private static CreateUpdateSharedJourneyDto MakeInput(Guid medalId, string title = "暑假共享计划") => new()
    {
        Title = title,
        Description = "描述",
        StartDate = new DateOnly(2026, 7, 1),
        EndDate = new DateOnly(2026, 8, 31),
        MedalId = medalId,
    };

    [Fact]
    public async Task Create_Then_Get_Roundtrips()
    {
        var pid = _guid.Create();
        var medalId = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(MakeInput(medalId));
            created.Id.ShouldNotBe(Guid.Empty);
            created.ParentId.ShouldBe(pid);
            created.Status.ShouldBe(SharedJourneyStatus.Draft);

            var fetched = await _service.GetAsync(created.Id);
            fetched.Title.ShouldBe("暑假共享计划");
            fetched.MedalId.ShouldBe(medalId);
        }
    }

    [Fact]
    public async Task GetList_Is_Parent_Scoped()
    {
        var pA = _guid.Create();
        var pB = _guid.Create();

        using (_principal.Change(Parent(pA)))
        {
            await _service.CreateAsync(MakeInput(_guid.Create(), "A计划1"));
            await _service.CreateAsync(MakeInput(_guid.Create(), "A计划2"));
        }

        using (_principal.Change(Parent(pB)))
        {
            await _service.CreateAsync(MakeInput(_guid.Create(), "B计划"));

            var listB = await _service.GetListAsync();
            listB.Items.Count.ShouldBe(1);
            listB.Items[0].Title.ShouldBe("B计划");
        }

        using (_principal.Change(Parent(pA)))
        {
            var listA = await _service.GetListAsync();
            listA.Items.Count.ShouldBe(2);
            listA.Items.ShouldAllBe(x => x.ParentId == pA);
        }
    }

    [Fact]
    public async Task CrossParent_Get_Throws()
    {
        var owner = _guid.Create();
        Guid sjId;
        using (_principal.Change(Parent(owner)))
        {
            sjId = (await _service.CreateAsync(MakeInput(_guid.Create()))).Id;
        }

        using (_principal.Change(Parent(_guid.Create())))
        {
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _service.GetAsync(sjId));
        }
    }

    [Fact]
    public async Task AddParticipants_Gives_Each_Child_A_Draft_Journey()
    {
        var pid = _guid.Create();
        var child1 = await SeedChildAsync(pid);
        var child2 = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await _service.CreateAsync(MakeInput(_guid.Create()));

            await _service.AddParticipantsAsync(new AddParticipantsDto
            {
                SharedJourneyId = sj.Id,
                ChildIds = new() { child1, child2 },
            });

            var journeys = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id));
            journeys.Count.ShouldBe(2);
            journeys.ShouldAllBe(j => j.Status == JourneyStatus.Draft);
            journeys.Select(j => j.ChildId).OrderBy(x => x)
                .ShouldBe(new[] { child1, child2 }.OrderBy(x => x));
        }
    }

    [Fact]
    public async Task RemoveParticipant_Deletes_Draft_Journey()
    {
        var pid = _guid.Create();
        var child = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await _service.CreateAsync(MakeInput(_guid.Create()));
            await _service.AddParticipantsAsync(new AddParticipantsDto
            {
                SharedJourneyId = sj.Id, ChildIds = new() { child },
            });

            await _service.RemoveParticipantAsync(sj.Id, child);

            var journeys = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id));
            journeys.Count.ShouldBe(0);
        }
    }

    [Fact]
    public async Task Delete_Protection_Surfaces_As_Exception_When_Participant_Active()
    {
        var pid = _guid.Create();
        var child = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();

        using (_principal.Change(Parent(pid)))
        {
            var sj = await _service.CreateAsync(MakeInput(_guid.Create()));
            await _service.AddParticipantsAsync(new AddParticipantsDto
            {
                SharedJourneyId = sj.Id, ChildIds = new() { child },
            });

            await WithUnitOfWorkAsync(async () =>
            {
                var j = (await _journeyRepo.GetListAsync(x => x.SharedJourneyId == sj.Id && x.ChildId == child)).Single();
                await _journeyManager.StartAsync(j, speciesId);
                await _journeyRepo.UpdateAsync(j, autoSave: true);
            });

            await Should.ThrowAsync<BusinessException>(async () => await _service.DeleteAsync(sj.Id));

            // still there
            (await _service.GetAsync(sj.Id)).ShouldNotBeNull();
        }
    }

    [Fact]
    public async Task Delete_Removes_PureDraft_SharedJourney()
    {
        var pid = _guid.Create();
        var child = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await _service.CreateAsync(MakeInput(_guid.Create()));
            await _service.AddParticipantsAsync(new AddParticipantsDto
            {
                SharedJourneyId = sj.Id, ChildIds = new() { child },
            });

            await _service.DeleteAsync(sj.Id);

            await Should.ThrowAsync<EntityNotFoundException>(async () => await _service.GetAsync(sj.Id));
        }
    }

    [Fact]
    public async Task Update_Syncs_Title_To_Participants()
    {
        var pid = _guid.Create();
        var child = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await _service.CreateAsync(MakeInput(_guid.Create(), "旧标题"));
            await _service.AddParticipantsAsync(new AddParticipantsDto
            {
                SharedJourneyId = sj.Id, ChildIds = new() { child },
            });

            var updated = await _service.UpdateAsync(sj.Id, new CreateUpdateSharedJourneyDto
            {
                Title = "新标题",
                Description = "新描述",
                StartDate = new DateOnly(2026, 9, 1),
                EndDate = new DateOnly(2026, 10, 1),
                MedalId = _guid.Create(),
            });
            updated.Title.ShouldBe("新标题");

            var journey = await WithUnitOfWorkAsync(async () =>
                (await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id)).Single());
            journey.Title.ShouldBe("新标题");
            journey.Description.ShouldBe("新描述");
        }
    }
}
