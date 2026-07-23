using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Journeys;
using Homework.Tasks;
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
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IGuidGenerator _guid;

    public JourneyManager_Tests()
    {
        _manager = GetRequiredService<JourneyManager>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _speciesRepo = GetRequiredService<IRepository<PetSpecies, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
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
    public async Task Start_Scales_Thresholds_To_Journey_Plan()
    {
        var speciesId = await SeedSpeciesAsync();           // 静态阈值 20/40/60/80（形状 1:2:3:4）
        var childId = _guid.Create();
        // 4 周旅程（28 天：每个工作日恰好各出现 4 次）
        var journey = new Journey(_guid.Create(), _guid.Create(), childId, "计划缩放",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 28), _guid.Create());

        await WithUnitOfWorkAsync(async () =>
        {
            await _journeyRepo.InsertAsync(journey, autoSave: true);
            // 周一~周五各 1 个活跃任务 → 5/周 × 4 周 = 20 个食物
            foreach (var dow in new[]
                     {
                         DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                         DayOfWeek.Thursday, DayOfWeek.Friday,
                     })
            {
                await _templateRepo.InsertAsync(
                    new JourneyTaskTemplateItem(_guid.Create(), journey.Id, dow, "任务", order: 0), autoSave: true);
            }

            // 隔离奖励池：停用种子样例奖励，保证平均食物成长恰为我们这一个(10)
            foreach (var seeded in await _rewardRepo.GetListAsync(x => x.IsActive))
            {
                seeded.Deactivate();
                await _rewardRepo.UpdateAsync(seeded, autoSave: true);
            }

            // 一个启用的奖励道具，成长值 10 → 平均食物成长 = 10
            var reward = new RewardItem(_guid.Create(), "果实", 10, 1);
            reward.Activate();
            await _rewardRepo.InsertAsync(reward, autoSave: true);

            // 同一 UoW 内 Start（否则跨 UoW 的 journey 已分离，新增的 Stages 子实体不会持久化）
            await _manager.StartAsync(journey, speciesId);
            await _journeyRepo.UpdateAsync(journey, autoSave: true);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var q = await _journeyRepo.WithDetailsAsync(x => x.Stages);
            var reloaded = q.Single(x => x.Id == journey.Id);
            // budget = round(0.85 × 20 食物 × 10) = 170，按 20:40:60:80 摊 → 17/34/51/68
            reloaded.Stages.Single(s => s.Level == 1).GrowthToNext.ShouldBe(17);
            reloaded.Stages.Single(s => s.Level == 2).GrowthToNext.ShouldBe(34);
            reloaded.Stages.Single(s => s.Level == 3).GrowthToNext.ShouldBe(51);
            reloaded.Stages.Single(s => s.Level == 4).GrowthToNext.ShouldBe(68);
            reloaded.Stages.Single(s => s.Level == 5).GrowthToNext.ShouldBeNull();
            // 全勤总成长 20×10=200 > 170 → 能满级；且总预算(170) < 满勤(200)，约 85% 完成度即满级
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
