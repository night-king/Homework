using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Journeys;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyManager_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly JourneyManager _manager;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IGuidGenerator _guid;

    public JourneyManager_Tests()
    {
        _manager = GetRequiredService<JourneyManager>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
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

    private Journey NewDraft(Guid childId) => new(_guid.Create(), _guid.Create(), childId, "旅程",
        new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create());

    [Fact]
    public async Task Start_Snapshots_Species_Stage_Thresholds()
    {
        var speciesId = await SeedSpeciesAsync();
        var childId = _guid.Create();
        var journey = NewDraft(childId);

        await WithUnitOfWorkAsync(async () =>
        {
            await _journeyRepo.InsertAsync(journey, autoSave: true);
            await _manager.StartAsync(journey, speciesId);
            await _journeyRepo.UpdateAsync(journey, autoSave: true);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var q = await _journeyRepo.WithDetailsAsync(x => x.Stages);
            var reloaded = q.Single(x => x.Id == journey.Id);
            reloaded.Status.ShouldBe(JourneyStatus.Active);
            reloaded.Stages.Single(s => s.Level == 2).GrowthToNext.ShouldBe(40);
            reloaded.Stages.Single(s => s.Level == 5).GrowthToNext.ShouldBeNull();
        });
    }

    [Fact]
    public async Task Start_Second_Active_Journey_For_Same_Child_Rejected()
    {
        var speciesId = await SeedSpeciesAsync();
        var childId = _guid.Create();
        var first = NewDraft(childId);
        var second = NewDraft(childId);

        await WithUnitOfWorkAsync(async () =>
        {
            await _journeyRepo.InsertAsync(first, autoSave: true);
            await _manager.StartAsync(first, speciesId);
            await _journeyRepo.UpdateAsync(first, autoSave: true);
            await _journeyRepo.InsertAsync(second, autoSave: true);
        });

        await Should.ThrowAsync<BusinessException>(async () =>
            await WithUnitOfWorkAsync(async () => await _manager.StartAsync(second, speciesId)));
    }
}
