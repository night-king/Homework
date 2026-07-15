using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Journeys.Dtos;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IJourneyAppService _service;
    private readonly IJourneyPlayAppService _play;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public JourneyAppService_Tests()
    {
        _service = GetRequiredService<IJourneyAppService>();
        _play = GetRequiredService<IJourneyPlayAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(
        new[] { new Claim(AbpClaimTypes.UserId, id.ToString()) }, "test"));

    private async Task<Guid> SeedChildAsync(Guid parentId)
    {
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, "娃", 3)));
        return childId;
    }

    [Fact]
    public async Task Create_Then_Get()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var medalId = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "暑假之旅", Description = "背单词",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = medalId
            });
            created.ChildId.ShouldBe(childId);
            created.Title.ShouldBe("暑假之旅");
            created.Description.ShouldBe("背单词");
            created.MedalId.ShouldBe(medalId);
            created.Status.ShouldBe(JourneyStatus.Draft);
            created.CurrentLevel.ShouldBe(1);

            var fetched = await _service.GetAsync(created.Id);
            fetched.Id.ShouldBe(created.Id);
            fetched.Title.ShouldBe("暑假之旅");
            fetched.StartDate.ShouldBe(new DateOnly(2026, 7, 1));
            fetched.EndDate.ShouldBe(new DateOnly(2026, 8, 31));

            var list = await _service.GetListAsync(new GetJourneyListInput { ChildId = childId });
            list.Items.Count.ShouldBe(1);
        }
    }

    [Fact]
    public async Task Update_Changes_Fields()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "旧标题", Description = "旧描述",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });

            var newMedal = _guid.Create();
            var updated = await _service.UpdateAsync(created.Id, new UpdateJourneyDto
            {
                Title = "新标题", Description = null,
                StartDate = new DateOnly(2026, 9, 1), EndDate = new DateOnly(2026, 9, 30),
                MedalId = newMedal
            });
            updated.Title.ShouldBe("新标题");
            updated.Description.ShouldBeNull();
            updated.StartDate.ShouldBe(new DateOnly(2026, 9, 1));
            updated.EndDate.ShouldBe(new DateOnly(2026, 9, 30));
            updated.MedalId.ShouldBe(newMedal);
        }
    }

    [Fact]
    public async Task CrossParent_Get_Throws()
    {
        var owner = _guid.Create();
        var childId = await SeedChildAsync(owner);
        Guid journeyId;

        using (_principal.Change(Parent(owner)))
        {
            var created = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "私有旅程",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });
            journeyId = created.Id;
        }

        var stranger = _guid.Create();
        using (_principal.Change(Parent(stranger)))
        {
            await Should.ThrowAsync<EntityNotFoundException>(async () =>
                await _service.GetAsync(journeyId));
        }
    }

    [Fact]
    public async Task Delete_Also_Removes_Its_Task_Templates()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var templateService = GetRequiredService<Homework.Tasks.IJourneyTaskTemplateAppService>();
        var templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        Guid journeyId;

        using (_principal.Change(Parent(pid)))
        {
            var journey = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "旅程",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });
            journeyId = journey.Id;
            await templateService.CreateAsync(new CreateJourneyTaskTemplateItemDto
            {
                JourneyId = journeyId, DayOfWeek = DayOfWeek.Monday, Title = "背单词", Order = 0, RewardIsRandom = true
            });
            await templateService.CreateAsync(new CreateJourneyTaskTemplateItemDto
            {
                JourneyId = journeyId, DayOfWeek = DayOfWeek.Tuesday, Title = "读书", Order = 0, RewardIsRandom = true
            });
        }

        await WithUnitOfWorkAsync(async () =>
        {
            var items = await templateRepo.GetListAsync(t => t.JourneyId == journeyId);
            items.Count.ShouldBe(2);
        });

        using (_principal.Change(Parent(pid)))
        {
            await _service.DeleteAsync(journeyId);
        }

        await WithUnitOfWorkAsync(async () =>
        {
            var items = await templateRepo.GetListAsync(t => t.JourneyId == journeyId);
            items.Count.ShouldBe(0);
        });
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
                s.SetFormEvolveVideo(lvl, $"pets/x/evolve-{lvl}-{lvl + 1}.mp4"); // Activate 要求 1..4 阶有视频
            }
            s.SetForm(5, "满阶", "首次喷火", null, 1.6m);
            s.SetFormSprite(5, "pets/x/form-5.png");
            s.Activate();
            await _speciesRepo.InsertAsync(s, autoSave: true);
        });
        return id;
    }

    /// <summary>建旅程 + 周一模板 → 开始（Draft→Active，任务只可能由 Active 旅程生成）。</summary>
    private async Task<Guid> StartJourneyWithMondayTaskAsync(Guid pid, Guid childId, Guid speciesId, string title)
    {
        var templateService = GetRequiredService<IJourneyTaskTemplateAppService>();
        using (_principal.Change(Parent(pid)))
        {
            var journey = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = title,
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });
            await templateService.CreateAsync(new CreateJourneyTaskTemplateItemDto
            {
                JourneyId = journey.Id, DayOfWeek = DayOfWeek.Monday,
                Title = $"{title}的口算", Order = 0, RewardIsRandom = true
            });
            await _play.StartAsync(new StartJourneyDto
            {
                ChildId = childId, JourneyId = journey.Id, PetSpeciesId = speciesId
            });
            return journey.Id;
        }
    }

    /// <summary>
    /// 真机复现过的症状：删旅程只清模板、留下已生成的 DailyTask → 看板按 childId + date 查，
    /// 仍返回指向已删除旅程的任务，且这些遗留占住那些日期（生成器见当天已有任务就短路），
    /// 导致新旅程再也生成不出自己的任务。
    /// 走真实路径：Draft 旅程不可能有任务（任务只由 Active 旅程生成），所以必须先 Start。
    /// </summary>
    [Fact]
    public async Task Delete_Frees_Its_Days_So_A_New_Journey_Regenerates_Them()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();
        var monday = new DateOnly(2026, 7, 6);

        var a = await StartJourneyWithMondayTaskAsync(pid, childId, speciesId, "旅程A");
        using (_principal.Change(Parent(pid)))
        {
            var boardA = await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = monday });
            boardA.Tasks.Count.ShouldBeGreaterThan(0);
            boardA.Tasks.ShouldAllBe(t => t.JourneyId == a);

            await _service.DeleteAsync(a);
        }

        var b = await StartJourneyWithMondayTaskAsync(pid, childId, speciesId, "旅程B");
        using (_principal.Change(Parent(pid)))
        {
            var boardB = await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = childId, Date = monday });
            boardB.Tasks.Count.ShouldBeGreaterThan(0);
            // 一条都不许still属于已删除的 A
            boardB.Tasks.ShouldAllBe(t => t.JourneyId == b);
        }
    }

    /// <summary>删旅程按 JourneyId 精确清理，不能波及别的孩子当天的任务。</summary>
    [Fact]
    public async Task Delete_Keeps_Daily_Tasks_Of_Another_Child()
    {
        var pid = _guid.Create();
        var doomedChild = await SeedChildAsync(pid);
        var keptChild = await SeedChildAsync(pid);
        var speciesId = await SeedSpeciesAsync();
        var monday = new DateOnly(2026, 7, 6);

        var doomed = await StartJourneyWithMondayTaskAsync(pid, doomedChild, speciesId, "要删的");
        var kept = await StartJourneyWithMondayTaskAsync(pid, keptChild, speciesId, "留着的");

        using (_principal.Change(Parent(pid)))
        {
            await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = doomedChild, Date = monday });
            await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = keptChild, Date = monday });

            await _service.DeleteAsync(doomed);

            var keptBoard = await _play.GetDailyBoardAsync(new GetDailyBoardInput { ChildId = keptChild, Date = monday });
            keptBoard.Tasks.Count.ShouldBeGreaterThan(0);
            keptBoard.Tasks.ShouldAllBe(t => t.JourneyId == kept);
        }
    }
}
