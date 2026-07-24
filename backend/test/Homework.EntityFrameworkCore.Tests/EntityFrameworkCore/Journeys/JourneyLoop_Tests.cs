using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Journeys.Dtos;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyLoop_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IJourneyPlayAppService _play;
    private readonly IDailyTaskAppService _taskService;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IRepository<Medal, Guid> _medalRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public JourneyLoop_Tests()
    {
        _play = GetRequiredService<IJourneyPlayAppService>();
        _taskService = GetRequiredService<IDailyTaskAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _medalRepo = GetRequiredService<IRepository<Medal, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _dailyTaskRepo = GetRequiredService<IRepository<DailyTask, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(
        new[] { new Claim(AbpClaimTypes.UserId, id.ToString()) }, "test"));

    /// <summary>Seed a 5-form species with thresholds 20/40/60/80 and evolve videos on forms 1-4.</summary>
    private async Task<Guid> SeedSpeciesAsync()
    {
        var id = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var s = new PetSpecies(id, "循环火龙", $"loop-dragon-{id:N}");
            s.SetCover("pets/loop/cover.png");
            for (var lvl = 1; lvl <= 4; lvl++)
            {
                s.SetForm(lvl, $"阶{lvl}", $"阶{lvl}揭示", lvl * 20, 1m);
                s.SetFormSprite(lvl, $"pets/loop/form-{lvl}.png");
                s.SetFormEvolveVideo(lvl, $"pets/loop/evolve-{lvl}-{lvl + 1}.mp4");
            }
            s.SetForm(5, "满阶", "满阶揭示", null, 1.6m);
            s.SetFormSprite(5, "pets/loop/form-5.png");
            s.Activate();
            await _speciesRepo.InsertAsync(s, autoSave: true);
        });
        return id;
    }

    private async Task<Guid> SeedMedalAsync()
    {
        var id = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var m = new Medal(id, "暑假勋章");
            await _medalRepo.InsertAsync(m, autoSave: true);
        });
        return id;
    }

    private async Task<Guid> SeedChildAsync(Guid parentId)
    {
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, "小测试", 7), autoSave: true));
        return childId;
    }

    /// <summary>Seed an active reward item with GrowthValue=20 (crosses threshold in one feed at each level).</summary>
    private async Task<Guid> SeedRewardAsync()
    {
        var id = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var r = new RewardItem(id, "进化果实", 20, 1);
            r.Activate();
            await _rewardRepo.InsertAsync(r, autoSave: true);
        });
        return id;
    }

    /// <summary>Helper: directly grant a reward into the journey backpack (for feeding without completing a task).</summary>
    private async Task DirectGrantRewardAsync(Guid journeyId, Guid rewardItemId)
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var q = await _journeyRepo.WithDetailsAsync(x => x.Backpack);
            var journey = q.Single(x => x.Id == journeyId);
            journey.GrantReward(rewardItemId);
            await _journeyRepo.UpdateAsync(journey, autoSave: true);
        });
    }

    [Fact]
    public async Task Complete_Grants_Reward_To_Backpack()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();
        var medalId = await SeedMedalAsync();
        var rewardId = await SeedRewardAsync();
        var monday = new DateOnly(2026, 7, 6);
        var journeyId = _guid.Create();

        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(journeyId, journeyId, pid, childId, "完成奖励测试旅程",
                monday, monday.AddDays(60), medalId);
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });

        using (_principal.Change(Parent(pid)))
        {
            // Start the journey and pick species
            await _play.StartAsync(new StartJourneyDto
            {
                ChildId = childId,
                JourneyId = journeyId,
                PetSpeciesId = speciesId
            });

            // Add a Monday template with a specific reward
            await WithUnitOfWorkAsync(async () =>
            {
                var t = new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0);
                t.SetReward(rewardId, isRandom: false);
                await _templateRepo.InsertAsync(t, autoSave: true);
            });

            // Get the daily board — should produce 1 task
            var board = await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = monday });
            board.Tasks.Count.ShouldBe(1);
            var taskId = board.Tasks[0].Id;
            board.Tasks[0].RewardItemId.ShouldBe(rewardId);

            // Complete the task
            var completedDto = await _play.CompleteTaskAsync(childId, taskId);
            completedDto.IsCompleted.ShouldBeTrue();
            completedDto.RewardGranted.ShouldBeTrue();

            // Backpack should now have 1 reward
            var backpack = await _play.GetBackpackAsync(childId, journeyId);
            backpack.Items.Count.ShouldBe(1);
            backpack.Items[0].RewardItemId.ShouldBe(rewardId);
            backpack.Items[0].Quantity.ShouldBe(1);
        }
    }

    [Fact]
    public async Task Feed_Evolves_And_Completes_And_Enters_Collection()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();
        var medalId = await SeedMedalAsync();
        var rewardId = await SeedRewardAsync();
        var monday = new DateOnly(2026, 7, 6);
        var journeyId = _guid.Create();

        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(journeyId, journeyId, pid, childId, "进化全链路旅程",
                monday, monday.AddDays(60), medalId);
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });

        using (_principal.Change(Parent(pid)))
        {
            // Start with species
            await _play.StartAsync(new StartJourneyDto
            {
                ChildId = childId,
                JourneyId = journeyId,
                PetSpeciesId = speciesId
            });

            // Grant rewards directly and feed to test evolution loop
            // Level 1 -> 2 (threshold=20, GrowthValue=20)
            await DirectGrantRewardAsync(journeyId, rewardId);
            var r1 = await _play.FeedAsync(new FeedDto { ChildId = childId, JourneyId = journeyId, RewardItemId = rewardId });
            r1.Evolved.ShouldBeTrue();
            r1.NewLevel.ShouldBe(2);
            r1.EvolveVideoUrl.ShouldNotBeNullOrEmpty();  // form1 evolve video
            r1.Completed.ShouldBeFalse();
            r1.CurrentLevel.ShouldBe(2);

            // Level 2 -> 3 (threshold=40, need 2 feeds of 20)
            await DirectGrantRewardAsync(journeyId, rewardId);
            var r2a = await _play.FeedAsync(new FeedDto { ChildId = childId, JourneyId = journeyId, RewardItemId = rewardId });
            r2a.Evolved.ShouldBeFalse();
            r2a.CurrentLevel.ShouldBe(2);

            await DirectGrantRewardAsync(journeyId, rewardId);
            var r2b = await _play.FeedAsync(new FeedDto { ChildId = childId, JourneyId = journeyId, RewardItemId = rewardId });
            r2b.Evolved.ShouldBeTrue();
            r2b.NewLevel.ShouldBe(3);
            r2b.EvolveVideoUrl.ShouldNotBeNullOrEmpty();
            r2b.Completed.ShouldBeFalse();

            // Level 3 -> 4 (threshold=60, need 3 feeds of 20)
            for (var i = 0; i < 3; i++)
            {
                await DirectGrantRewardAsync(journeyId, rewardId);
                await _play.FeedAsync(new FeedDto { ChildId = childId, JourneyId = journeyId, RewardItemId = rewardId });
            }
            var lvl4Check = await _play.GetBackpackAsync(childId, journeyId); // just check it doesn't throw

            // Verify current level is 4
            var journeyAfterL4 = await WithUnitOfWorkAsync(async () =>
                await _journeyRepo.GetAsync(journeyId));
            journeyAfterL4.CurrentLevel.ShouldBe(4);

            // Level 4 -> 5 (threshold=80, need 4 feeds of 20)
            FeedResultDto? finalResult = null;
            for (var i = 0; i < 4; i++)
            {
                await DirectGrantRewardAsync(journeyId, rewardId);
                finalResult = await _play.FeedAsync(new FeedDto { ChildId = childId, JourneyId = journeyId, RewardItemId = rewardId });
            }

            finalResult!.Completed.ShouldBeTrue();
            finalResult.CurrentLevel.ShouldBe(5);

            // Collection should have 1 entry
            var collection = await _play.GetCollectionAsync(childId);
            collection.Items.Count.ShouldBe(1);
            collection.Items[0].JourneyId.ShouldBe(journeyId);
            collection.Items[0].MedalId.ShouldBe(medalId);
        }
    }

    [Fact]
    public async Task Revoke_Claws_Back_Unfed_Reward()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();
        var medalId = await SeedMedalAsync();
        var rewardId = await SeedRewardAsync();
        var monday = new DateOnly(2026, 7, 6);
        var journeyId = _guid.Create();

        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(journeyId, journeyId, pid, childId, "撤销回收测试旅程",
                monday, monday.AddDays(60), medalId);
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });

        using (_principal.Change(Parent(pid)))
        {
            await _play.StartAsync(new StartJourneyDto
            {
                ChildId = childId,
                JourneyId = journeyId,
                PetSpeciesId = speciesId
            });

            // Add a Monday template with reward
            await WithUnitOfWorkAsync(async () =>
            {
                var t = new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "数学", order: 0);
                t.SetReward(rewardId, isRandom: false);
                await _templateRepo.InsertAsync(t, autoSave: true);
            });

            var board = await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = monday });
            var taskId = board.Tasks[0].Id;

            // Complete -> reward granted to backpack
            var completed = await _play.CompleteTaskAsync(childId, taskId);
            completed.RewardGranted.ShouldBeTrue();
            var backpackBefore = await _play.GetBackpackAsync(childId, journeyId);
            backpackBefore.Items.Count.ShouldBe(1);

            // Parent revokes via DailyTaskAppService
            await _taskService.RevokeAsync(taskId);

            // Backpack should be empty (reward clawed back)
            var backpackAfter = await _play.GetBackpackAsync(childId, journeyId);
            backpackAfter.Items.Count.ShouldBe(0);

            // Task should show RewardGranted = false
            var taskAfter = await WithUnitOfWorkAsync(async () =>
                await _dailyTaskRepo.GetAsync(taskId));
            taskAfter.RewardGranted.ShouldBeFalse();
            taskAfter.ReviewState.ShouldBe(TaskReviewState.Revoked);
        }
    }

    [Fact]
    public async Task Uncomplete_Claws_Back_Reward()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();
        var medalId = await SeedMedalAsync();
        var rewardId = await SeedRewardAsync();
        var monday = new DateOnly(2026, 7, 6);
        var journeyId = _guid.Create();

        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(journeyId, journeyId, pid, childId, "取消完成测试旅程",
                monday, monday.AddDays(60), medalId);
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });

        using (_principal.Change(Parent(pid)))
        {
            await _play.StartAsync(new StartJourneyDto
            {
                ChildId = childId,
                JourneyId = journeyId,
                PetSpeciesId = speciesId
            });

            await WithUnitOfWorkAsync(async () =>
            {
                var t = new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "英语", order: 0);
                t.SetReward(rewardId, isRandom: false);
                await _templateRepo.InsertAsync(t, autoSave: true);
            });

            var board = await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = monday });
            var taskId = board.Tasks[0].Id;

            // Complete -> reward in backpack
            await _play.CompleteTaskAsync(childId, taskId);
            var backpackBefore = await _play.GetBackpackAsync(childId, journeyId);
            backpackBefore.Items.Count.ShouldBe(1);

            // Uncomplete -> reward clawed back
            var uncompleted = await _play.UncompleteTaskAsync(childId, taskId);
            uncompleted.IsCompleted.ShouldBeFalse();
            uncompleted.RewardGranted.ShouldBeFalse();

            var backpackAfter = await _play.GetBackpackAsync(childId, journeyId);
            backpackAfter.Items.Count.ShouldBe(0);
        }
    }

    [Fact]
    public async Task Fed_Reward_Survives_Uncomplete_No_Regrant()
    {
        // Arrange: seed child, species, medal, reward, journey
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();
        var medalId = await SeedMedalAsync();
        var rewardId = await SeedRewardAsync();
        var monday = new DateOnly(2026, 7, 6);
        var journeyId = _guid.Create();

        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(journeyId, journeyId, pid, childId, "喂养后撤销不重复发奖旅程",
                monday, monday.AddDays(60), medalId);
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });

        using (_principal.Change(Parent(pid)))
        {
            await _play.StartAsync(new StartJourneyDto
            {
                ChildId = childId,
                JourneyId = journeyId,
                PetSpeciesId = speciesId
            });

            await WithUnitOfWorkAsync(async () =>
            {
                var t = new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "科学", order: 0);
                t.SetReward(rewardId, isRandom: false);
                await _templateRepo.InsertAsync(t, autoSave: true);
            });

            // Act step 1: get board, complete task → reward lands in backpack
            var board = await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = monday });
            board.Tasks.Count.ShouldBe(1);
            var taskId = board.Tasks[0].Id;

            var completedDto = await _play.CompleteTaskAsync(childId, taskId);
            completedDto.RewardGranted.ShouldBeTrue();

            var backpackAfterComplete = await _play.GetBackpackAsync(childId, journeyId);
            backpackAfterComplete.Items.Count.ShouldBe(1);
            backpackAfterComplete.Items[0].Quantity.ShouldBe(1);

            // Act step 2: feed → backpack qty → 0, growth applied
            var feedResult = await _play.FeedAsync(new FeedDto
            {
                ChildId = childId,
                JourneyId = journeyId,
                RewardItemId = rewardId
            });
            feedResult.Evolved.ShouldBeTrue(); // GrowthValue=20 crosses threshold=20 at level 1

            var backpackAfterFeed = await _play.GetBackpackAsync(childId, journeyId);
            backpackAfterFeed.Items.Count.ShouldBe(0);

            // Act step 3: uncomplete the task (reward already fed → RevokeReward returns false)
            var uncompletedDto = await _play.UncompleteTaskAsync(childId, taskId);
            uncompletedDto.IsCompleted.ShouldBeFalse();

            // Assert: backpack remains empty (clawback was no-op, not clearing RewardGranted incorrectly)
            var backpackAfterUncomplete = await _play.GetBackpackAsync(childId, journeyId);
            backpackAfterUncomplete.Items.Count.ShouldBe(0);

            // Act step 4: re-complete the same task — must NOT re-grant (RewardGranted still true)
            var recompletedDto = await _play.CompleteTaskAsync(childId, taskId);
            recompletedDto.IsCompleted.ShouldBeTrue();

            // Assert: backpack still empty — no second reward granted
            var backpackAfterRecomplete = await _play.GetBackpackAsync(childId, journeyId);
            backpackAfterRecomplete.Items.Count.ShouldBe(0);
        }
    }
}
