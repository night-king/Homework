using System;
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
using System.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IJourneyAppService _service;
    private readonly IJourneyPlayAppService _play;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<SharedJourney, Guid> _sharedJourneyRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public JourneyAppService_Tests()
    {
        _service = GetRequiredService<IJourneyAppService>();
        _play = GetRequiredService<IJourneyPlayAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _sharedJourneyRepo = GetRequiredService<IRepository<SharedJourney, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
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

    /// <summary>
    /// 直接经仓储种一个 Draft 旅程（挂在一份 SharedJourney 上）。
    /// Chunk 2 起旅程不再经 JourneyAppService.CreateAsync 建（那已移除，建单在 Chunk 4 的 AddParticipants）。
    /// SharedJourneyId = journeyId：本 chunk 里模板挂同一键，生成器才找得到。
    /// </summary>
    private async Task<Guid> SeedDraftJourneyAsync(Guid parentId, Guid childId, string title,
        DayOfWeek? templateDow = null)
    {
        var journeyId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var sj = new SharedJourney(journeyId, parentId, title,
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create());
            await _sharedJourneyRepo.InsertAsync(sj, autoSave: true);

            var j = new Journey(journeyId, journeyId, parentId, childId, title,
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create());
            await _journeyRepo.InsertAsync(j, autoSave: true);

            if (templateDow is DayOfWeek dow)
            {
                await _templateRepo.InsertAsync(
                    new JourneyTaskTemplateItem(_guid.Create(), journeyId, dow, $"{title}的口算", order: 0),
                    autoSave: true);
            }
        });
        return journeyId;
    }

    [Fact]
    public async Task Get_Returns_Seeded_Journey()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var journeyId = await SeedDraftJourneyAsync(pid, childId, "暑假之旅");

        using (_principal.Change(Parent(pid)))
        {
            var fetched = await _service.GetAsync(journeyId);
            fetched.Id.ShouldBe(journeyId);
            fetched.Title.ShouldBe("暑假之旅");
            fetched.ChildId.ShouldBe(childId);
            fetched.Status.ShouldBe(JourneyStatus.Draft);

            var list = await _service.GetListAsync(new GetJourneyListInput { ChildId = childId });
            list.Items.Count.ShouldBe(1);
        }
    }

    [Fact]
    public async Task CrossParent_Get_Throws()
    {
        var owner = _guid.Create();
        var childId = await SeedChildAsync(owner);
        var journeyId = await SeedDraftJourneyAsync(owner, childId, "私有旅程");

        var stranger = _guid.Create();
        using (_principal.Change(Parent(stranger)))
        {
            await Should.ThrowAsync<EntityNotFoundException>(async () =>
                await _service.GetAsync(journeyId));
        }
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

    /// <summary>种旅程 + 周一模板 → 开始（Draft→Active，任务只可能由 Active 旅程生成）。</summary>
    private async Task<Guid> StartJourneyWithMondayTaskAsync(Guid pid, Guid childId, Guid speciesId, string title)
    {
        var journeyId = await SeedDraftJourneyAsync(pid, childId, title, DayOfWeek.Monday);
        using (_principal.Change(Parent(pid)))
        {
            await _play.StartAsync(new StartJourneyDto
            {
                ChildId = childId, JourneyId = journeyId, PetSpeciesId = speciesId
            });
        }
        return journeyId;
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
