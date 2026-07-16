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
public class JourneyPlay_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IJourneyPlayAppService _service;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public JourneyPlay_Tests()
    {
        _service = GetRequiredService<IJourneyPlayAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(
        new[] { new Claim(AbpClaimTypes.UserId, id.ToString()) }, "test"));

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

    private async Task<Guid> SeedChildAsync(Guid parentId)
    {
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, "娃", 3)));
        return childId;
    }

    /// <summary>
    /// 建 active 旅程 + 一个 active 奖励项 + 指定星期的模板。
    /// 走真实路径：Journey.Start 正是 StartAsync 内部调的领域方法，
    /// 产出的状态生产环境造得出来（对比：手插 DailyTask 造不出，会假绿）。
    /// </summary>
    private async Task<Guid> SeedStartedJourneyAsync(Guid pid, Guid childId, DateOnly start,
        params (DayOfWeek Dow, string Title, string? Subject, int? Minutes)[] templates)
    {
        var journeyId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var reward = new RewardItem(_guid.Create(), "能量果实", 12, 1);
            reward.Activate();
            await _rewardRepo.InsertAsync(reward, autoSave: true);

            var j = new Journey(journeyId, pid, childId, "旅程", start, start.AddDays(60), _guid.Create());
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            await _journeyRepo.InsertAsync(j, autoSave: true);

            var order = 0;
            foreach (var t in templates)
            {
                await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                    _guid.Create(), journeyId, t.Dow, t.Title, t.Subject, order++, t.Minutes), autoSave: true);
            }
        });
        return journeyId;
    }

    [Fact]
    public async Task Start_Then_GetActive_Returns_It()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();
        var medalId = _guid.Create();
        var journeyId = _guid.Create();

        // Create a draft journey — capture id before inserting
        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(journeyId, pid, childId, "暑假之旅",
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), medalId);
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });

        using (_principal.Change(Parent(pid)))
        {
            var dto = await _service.StartAsync(new StartJourneyDto
            {
                ChildId = childId,
                JourneyId = journeyId,
                PetSpeciesId = speciesId
            });

            dto.Status.ShouldBe(JourneyStatus.Active);
            dto.PetSpeciesId.ShouldBe(speciesId);

            var active = await _service.GetActiveAsync(childId);
            active.ShouldNotBeNull();
            active!.Id.ShouldBe(journeyId);
            active.Status.ShouldBe(JourneyStatus.Active);
            active.PetSpeciesId.ShouldBe(speciesId);
        }
    }

    [Fact]
    public async Task GetDailyBoard_Generates_From_Journey_Templates()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var monday = new DateOnly(2026, 7, 6); // Monday
        var journeyId = _guid.Create();

        // Seed an active reward item for random reward assignment
        await WithUnitOfWorkAsync(async () =>
        {
            var reward = new RewardItem(_guid.Create(), "能量果实", 12, 1);
            reward.Activate();
            await _rewardRepo.InsertAsync(reward, autoSave: true);
        });

        // Seed an active journey (started directly, bypassing manager) — capture id before inserting
        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(journeyId, pid, childId, "暑假之旅",
                monday, monday.AddDays(60), _guid.Create());
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });

        // Seed a Monday template
        await WithUnitOfWorkAsync(async () =>
        {
            var t = new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0);
            await _templateRepo.InsertAsync(t, autoSave: true);
        });

        using (_principal.Change(Parent(pid)))
        {
            var board = await _service.GetDailyBoardAsync(new GetDailyBoardInput
            {
                ChildId = childId,
                Date = monday
            });

            board.ShouldNotBeNull();
            board.Tasks.Count.ShouldBeGreaterThan(0);
            board.Tasks[0].RewardItemId.ShouldNotBeNull();
        }
    }

    [Fact]
    public async Task DailyBoard_Carries_Reward_Name_On_Each_Task()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var monday = new DateOnly(2026, 7, 6);
        await SeedStartedJourneyAsync(pid, childId, monday, (DayOfWeek.Monday, "数学作业本", "math", 25));

        using (_principal.Change(Parent(pid)))
        {
            var board = await _service.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = monday });

            board.Tasks.Count.ShouldBeGreaterThan(0);
            var withReward = board.Tasks.Where(t => t.RewardItemId != null).ToList();
            withReward.ShouldNotBeEmpty();
            // 奖励名必须随 DTO 一起下来,不能只给 id 让前端自己去配
            withReward.ShouldAllBe(t => !string.IsNullOrWhiteSpace(t.RewardName));
            // 顺带验 Task 2 的时长确实流到了 DTO
            board.Tasks[0].EstimatedMinutes.ShouldBe(25);
        }
    }
}
