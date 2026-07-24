using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
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
public class SharedJourneyManager_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly SharedJourneyManager _manager;
    private readonly IRepository<SharedJourney, Guid> _repo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly JourneyManager _journeyManager;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public SharedJourneyManager_Tests()
    {
        _manager = GetRequiredService<SharedJourneyManager>();
        _repo = GetRequiredService<IRepository<SharedJourney, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
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

    private async Task<SharedJourney> CreateOwnedAsync(Guid pid, string title = "暑假共享计划",
        string? description = "描述", Guid? medalId = null)
    {
        return await WithUnitOfWorkAsync(async () => await _manager.CreateAsync(
            title, description,
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), medalId ?? _guid.Create()));
    }

    [Fact]
    public async Task Create_Persists_With_ParentId_Of_Current_User()
    {
        var pid = _guid.Create();
        var medalId = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            var created = await CreateOwnedAsync(pid, medalId: medalId);

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

    // ---- AddParticipants ----

    [Fact]
    public async Task AddParticipants_Creates_A_Draft_Journey_Per_Child()
    {
        var pid = _guid.Create();
        var child1 = await SeedChildAsync(pid);
        var child2 = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid, medalId: _guid.Create());

            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { child1, child2 }));

            var journeys = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id));
            journeys.Count.ShouldBe(2);
            journeys.ShouldAllBe(j => j.Status == JourneyStatus.Draft);
            journeys.ShouldContain(j => j.ChildId == child1);
            journeys.ShouldContain(j => j.ChildId == child2);
            // 反范式化的计划字段随共享计划拷贝下来
            journeys.ShouldAllBe(j => j.Title == sj.Title);
            journeys.ShouldAllBe(j => j.MedalId == sj.MedalId);
            journeys.ShouldAllBe(j => j.ParentId == pid);
        }
    }

    [Fact]
    public async Task AddParticipants_Is_Idempotent_Per_Child()
    {
        var pid = _guid.Create();
        var child = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid);

            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { child }));
            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { child }));

            var journeys = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id && j.ChildId == child));
            journeys.Count.ShouldBe(1);
        }
    }

    [Fact]
    public async Task AddParticipants_Rejects_Foreign_Child()
    {
        var pid = _guid.Create();
        var other = _guid.Create();
        var foreignChild = await SeedChildAsync(other);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid);

            await WithUnitOfWorkAsync(async () =>
                await Should.ThrowAsync<EntityNotFoundException>(async () =>
                    await _manager.AddParticipantsAsync(sj.Id, new[] { foreignChild })));
        }
    }

    // ---- RemoveParticipant ----

    [Fact]
    public async Task RemoveParticipant_Deletes_Draft_Journey()
    {
        var pid = _guid.Create();
        var child = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid);
            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { child }));

            await WithUnitOfWorkAsync(async () =>
                await _manager.RemoveParticipantAsync(sj.Id, child));

            var remaining = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id && j.ChildId == child));
            remaining.Count.ShouldBe(0);
        }
    }

    [Fact]
    public async Task RemoveParticipant_Throws_When_Journey_Active()
    {
        var pid = _guid.Create();
        var child = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid);
            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { child }));

            // Start the child's journey → Active
            await WithUnitOfWorkAsync(async () =>
            {
                var j = (await _journeyRepo.GetListAsync(x => x.SharedJourneyId == sj.Id && x.ChildId == child)).Single();
                await _journeyManager.StartAsync(j, speciesId);
                await _journeyRepo.UpdateAsync(j, autoSave: true);
            });

            await WithUnitOfWorkAsync(async () =>
                await Should.ThrowAsync<BusinessException>(async () =>
                    await _manager.RemoveParticipantAsync(sj.Id, child)));

            // The active journey survives the failed removal
            var remaining = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id && j.ChildId == child));
            remaining.Count.ShouldBe(1);
        }
    }

    // ---- Delete ----

    [Fact]
    public async Task Delete_Removes_PureDraft_Journeys_Templates_And_Sj()
    {
        var pid = _guid.Create();
        var child1 = await SeedChildAsync(pid);
        var child2 = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid);
            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { child1, child2 }));

            // Seed a template keyed by the SharedJourneyId
            await WithUnitOfWorkAsync(async () =>
                await _templateRepo.InsertAsync(
                    new JourneyTaskTemplateItem(_guid.Create(), sj.Id, DayOfWeek.Monday, "口算", order: 0),
                    autoSave: true));

            await WithUnitOfWorkAsync(async () => await _manager.DeleteAsync(sj.Id));

            var journeys = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id));
            journeys.Count.ShouldBe(0);

            var templates = await WithUnitOfWorkAsync(async () =>
                await _templateRepo.GetListAsync(t => t.SharedJourneyId == sj.Id));
            templates.Count.ShouldBe(0);

            var reloaded = await WithUnitOfWorkAsync(async () => await _repo.FindAsync(sj.Id));
            reloaded.ShouldBeNull();
        }
    }

    [Fact]
    public async Task Delete_Throws_When_A_Participant_Is_Active()
    {
        var pid = _guid.Create();
        var child = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid);
            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { child }));

            await WithUnitOfWorkAsync(async () =>
            {
                var j = (await _journeyRepo.GetListAsync(x => x.SharedJourneyId == sj.Id && x.ChildId == child)).Single();
                await _journeyManager.StartAsync(j, speciesId);
                await _journeyRepo.UpdateAsync(j, autoSave: true);
            });

            await WithUnitOfWorkAsync(async () =>
                await Should.ThrowAsync<BusinessException>(async () => await _manager.DeleteAsync(sj.Id)));

            // Nothing was deleted
            var reloaded = await WithUnitOfWorkAsync(async () => await _repo.FindAsync(sj.Id));
            reloaded.ShouldNotBeNull();
        }
    }

    // ---- UpdatePlan (edit sync + freeze) ----

    [Fact]
    public async Task UpdatePlan_Syncs_Copy_Fields_To_All_Participants()
    {
        var pid = _guid.Create();
        var child1 = await SeedChildAsync(pid);
        var child2 = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid, title: "旧标题", description: "旧描述");
            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { child1, child2 }));

            var newMedal = _guid.Create();
            await WithUnitOfWorkAsync(async () =>
            {
                var owned = await _manager.GetOwnedAsync(sj.Id);
                await _manager.UpdatePlanAsync(owned, "新标题", "新描述",
                    new DateOnly(2026, 9, 1), new DateOnly(2026, 10, 1), newMedal);
            });

            var reloadedSj = await WithUnitOfWorkAsync(async () => await _repo.GetAsync(sj.Id));
            reloadedSj.Title.ShouldBe("新标题");
            reloadedSj.Description.ShouldBe("新描述");
            reloadedSj.StartDate.ShouldBe(new DateOnly(2026, 9, 1));
            reloadedSj.EndDate.ShouldBe(new DateOnly(2026, 10, 1));
            reloadedSj.MedalId.ShouldBe(newMedal);

            var journeys = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetListAsync(j => j.SharedJourneyId == sj.Id));
            journeys.Count.ShouldBe(2);
            journeys.ShouldAllBe(j => j.Title == "新标题");
            journeys.ShouldAllBe(j => j.Description == "新描述");
            journeys.ShouldAllBe(j => j.StartDate == new DateOnly(2026, 9, 1));
            journeys.ShouldAllBe(j => j.EndDate == new DateOnly(2026, 10, 1));
            journeys.ShouldAllBe(j => j.MedalId == newMedal);
        }
    }

    [Fact]
    public async Task UpdatePlan_Freezes_Started_Childs_Stages_And_Progress()
    {
        var pid = _guid.Create();
        var startedChild = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();

        using (_principal.Change(Parent(pid)))
        {
            var sj = await CreateOwnedAsync(pid, title: "旧标题");
            await WithUnitOfWorkAsync(async () =>
                await _manager.AddParticipantsAsync(sj.Id, new[] { startedChild }));

            // 种活跃模板(周一~周五) + 启用奖励道具，让 Start 时阈值被【缩放】(远大于静态 20/40/60/80)。
            // 这样才是真正的冻结守卫：若日后有人在编辑计划时误加「重算阈值」，缩放值会因短周期而变小、断言即失败。
            await WithUnitOfWorkAsync(async () =>
            {
                var reward = new RewardItem(_guid.Create(), "果实", 10, 1);
                reward.Activate();
                await _rewardRepo.InsertAsync(reward, autoSave: true);
                foreach (var dow in new[]
                         {
                             DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                             DayOfWeek.Thursday, DayOfWeek.Friday,
                         })
                {
                    await _templateRepo.InsertAsync(
                        new JourneyTaskTemplateItem(_guid.Create(), sj.Id, dow, "任务", order: 0), autoSave: true);
                }
            });

            // Start → snapshots the 5-stage thresholds and flips to Active
            await WithUnitOfWorkAsync(async () =>
            {
                var j = (await _journeyRepo.GetListAsync(x => x.SharedJourneyId == sj.Id && x.ChildId == startedChild)).Single();
                await _journeyManager.StartAsync(j, speciesId);
                await _journeyRepo.UpdateAsync(j, autoSave: true);
            });

            // Capture the frozen stage snapshot before editing the plan
            List<(int Level, int? GrowthToNext)> stagesBefore = null!;
            await WithUnitOfWorkAsync(async () =>
            {
                var q = await _journeyRepo.WithDetailsAsync(x => x.Stages);
                var j = q.Single(x => x.SharedJourneyId == sj.Id && x.ChildId == startedChild);
                stagesBefore = j.Stages.OrderBy(s => s.Level).Select(s => (s.Level, s.GrowthToNext)).ToList();
                stagesBefore.Count.ShouldBe(5);
                // 证明快照确实被缩放过（非静态 20）——否则本测试对「重算」无守卫意义。
                stagesBefore.Single(s => s.Level == 1).GrowthToNext.ShouldNotBe(20);
            });

            // Edit the plan — including a much shorter period (which would re-scale thresholds if recomputed)
            await WithUnitOfWorkAsync(async () =>
            {
                var owned = await _manager.GetOwnedAsync(sj.Id);
                await _manager.UpdatePlanAsync(owned, "新标题", "新描述",
                    new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 3), _guid.Create());
            });

            await WithUnitOfWorkAsync(async () =>
            {
                var q = await _journeyRepo.WithDetailsAsync(x => x.Stages);
                var j = q.Single(x => x.SharedJourneyId == sj.Id && x.ChildId == startedChild);

                // Copy fields DID sync
                j.Title.ShouldBe("新标题");

                // Freeze: status, progress and snapshotted thresholds are untouched
                j.Status.ShouldBe(JourneyStatus.Active);
                j.CurrentLevel.ShouldBe(1);
                j.GrowthPoints.ShouldBe(0);
                var stagesAfter = j.Stages.OrderBy(s => s.Level).Select(s => (s.Level, s.GrowthToNext)).ToList();
                stagesAfter.ShouldBe(stagesBefore);
            });
        }
    }
}
