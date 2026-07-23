using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Pk;
using Homework.Tasks;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Volo.Abp.Timing;
using Xunit;

namespace Homework.EntityFrameworkCore.Pk;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class PkAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IPkAppService _pk;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IRepository<DailyTask, Guid> _dailyRepo;
    private readonly IGuidGenerator _guid;
    private readonly IClock _clock;
    private readonly ICurrentPrincipalAccessor _principal;

    public PkAppService_Tests()
    {
        _pk = GetRequiredService<IPkAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _dailyRepo = GetRequiredService<IRepository<DailyTask, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _clock = GetRequiredService<IClock>();
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
                s.SetForm(lvl, $"阶{lvl}", $"揭示{lvl}", lvl * 20, 1m);
                s.SetFormSprite(lvl, $"pets/x/form-{lvl}.png");
                s.SetFormEvolveVideo(lvl, $"pets/x/evolve-{lvl}-{lvl + 1}.mp4");
            }
            s.SetForm(5, "满阶", "满阶揭示", null, 1.6m);
            s.SetFormSprite(5, "pets/x/form-5.png");
            s.Activate();
            await _speciesRepo.InsertAsync(s, autoSave: true);
        });
        return id;
    }

    /// <summary>建一个孩子 + Active 旅程，并在「今天」放 total 个任务、完成其中 completed 个。</summary>
    private async Task<Guid> SeedKidAsync(Guid parentId, string name, Guid speciesId, int total, int completed)
    {
        var childId = _guid.Create();
        var today = DateOnly.FromDateTime(_clock.Now);
        await WithUnitOfWorkAsync(async () =>
        {
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, name, 3), autoSave: true);
            var jid = _guid.Create();
            var j = new Journey(jid, parentId, childId, name + "的旅程",
                today.AddDays(-2), today.AddDays(30), _guid.Create());
            j.Start(speciesId, new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            await _journeyRepo.InsertAsync(j, autoSave: true);
            for (var i = 0; i < total; i++)
            {
                var t = new DailyTask(_guid.Create(), childId, jid, today, $"任务{i}", order: i);
                if (i < completed)
                {
                    t.Complete(_clock.Now);
                }
                await _dailyRepo.InsertAsync(t, autoSave: true);
            }
        });
        return childId;
    }

    /// <summary>只建孩子档案，不给旅程。</summary>
    private async Task<Guid> SeedChildOnlyAsync(Guid parentId, string name)
    {
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, name, 3), autoSave: true));
        return childId;
    }

    [Fact]
    public async Task Weekly_Ranks_By_Completion_Desc()
    {
        var pid = _guid.Create();
        var species = await SeedSpeciesAsync();
        var a = await SeedKidAsync(pid, "全勤娃", species, total: 2, completed: 2); // 100%
        var b = await SeedKidAsync(pid, "一半娃", species, total: 2, completed: 1); // 50%
        var c = await SeedKidAsync(pid, "多数娃", species, total: 4, completed: 3); // 75%

        var result = await WithUnitOfWorkAsync(async () =>
        {
            using (_principal.Change(Parent(pid)))
            {
                return await _pk.GetWeeklyAsync();
            }
        });

        result.Entries.Count.ShouldBe(3);
        result.Entries[0].ChildId.ShouldBe(a);
        result.Entries[0].Rank.ShouldBe(1);
        result.Entries[0].CompletionPercent.ShouldBe(100);
        result.Entries[1].ChildId.ShouldBe(c);
        result.Entries[1].CompletionPercent.ShouldBe(75);
        result.Entries[2].ChildId.ShouldBe(b);
        result.Entries[2].CompletionPercent.ShouldBe(50);
        // 宠物/名字带出来了
        result.Entries[0].PetName.ShouldBe("火龙");
        result.Entries[0].PetLevel.ShouldBe(1);
        result.Entries[0].DisplayName.ShouldBe("全勤娃");
    }

    [Fact]
    public async Task Weekly_Excludes_Children_Without_Active_Journey()
    {
        var pid = _guid.Create();
        var species = await SeedSpeciesAsync();
        var a = await SeedKidAsync(pid, "在玩的", species, total: 2, completed: 1);
        await SeedChildOnlyAsync(pid, "没开始的"); // 无旅程 → 不上榜

        var result = await WithUnitOfWorkAsync(async () =>
        {
            using (_principal.Change(Parent(pid)))
            {
                return await _pk.GetWeeklyAsync();
            }
        });

        result.Entries.Count.ShouldBe(1);
        result.Entries[0].ChildId.ShouldBe(a);
    }

    [Fact]
    public async Task Weekly_Isolates_By_Parent()
    {
        var species = await SeedSpeciesAsync();
        var pid1 = _guid.Create();
        var pid2 = _guid.Create();
        var mine = await SeedKidAsync(pid1, "我的娃", species, total: 2, completed: 2);
        await SeedKidAsync(pid2, "别家娃", species, total: 2, completed: 2);

        var result = await WithUnitOfWorkAsync(async () =>
        {
            using (_principal.Change(Parent(pid1)))
            {
                return await _pk.GetWeeklyAsync();
            }
        });

        result.Entries.Count.ShouldBe(1);
        result.Entries.Single().ChildId.ShouldBe(mine);
    }
}
