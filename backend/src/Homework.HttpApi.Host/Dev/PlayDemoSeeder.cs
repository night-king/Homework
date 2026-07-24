using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Volo.Abp.BlobStoring;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Identity;
using Volo.Abp.Timing;
using Volo.Abp.Uow;

namespace Homework.Dev;

/// <summary>
/// 仅 Development：种入 2 个 active 宠物物种（火龙/光之英雄，美术取自 child-web-prototype）
/// + 给 demo 孩子「哥哥」建一个 Draft 旅程（带周任务模板）。幂等，可重复运行。
/// 写入 blob 用 Host 进程的 CatalogBlobContainer，与 /blob 读端点同一 App_Data/blobs。
/// </summary>
public class PlayDemoSeeder : ITransientDependency
{
    // 与原型 SPECIES 对齐的阶段数据：(level, 名称, reveal, growthToNext, scale)
    private static readonly (int Level, string Name, string? Reveal, int? Growth, decimal Scale)[] DragonStages =
    {
        (1, "龙蛋", null, 36, 0.48m),
        (2, "破壳萌龙", "裂壳光爆·奶龙探头", 60, 0.72m),
        (3, "成长幼龙", null, 80, 0.98m),
        (4, "展翼幼龙", "翅膀第一次展开", 100, 1.24m),
        (5, "喷火成龙", "首次喷火", null, 1.62m),
    };
    private static readonly (int Level, string Name, string? Reveal, int? Growth, decimal Scale)[] HeroStages =
    {
        (1, "光之核", null, 36, 0.48m),
        (2, "觉醒小英雄", "从光中觉醒", 60, 0.72m),
        (3, "成长斗士", null, 80, 0.98m),
        (4, "铠甲光刃", "铠甲+光刃", 100, 1.24m),
        (5, "光之巨神", "首次光束", null, 1.55m),
    };

    private readonly IRepository<PetSpecies, Guid> _speciesRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<SharedJourney, Guid> _sharedJourneyRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Medal, Guid> _medalRepo;
    private readonly IBlobContainer<CatalogBlobContainer> _blob;
    private readonly IdentityUserManager _userManager;
    private readonly IGuidGenerator _guid;
    private readonly IClock _clock;
    private readonly IUnitOfWorkManager _uowManager;
    private readonly IConfiguration _config;
    private readonly ILogger<PlayDemoSeeder> _logger;

    public PlayDemoSeeder(
        IRepository<PetSpecies, Guid> speciesRepo,
        IRepository<Journey, Guid> journeyRepo,
        IRepository<SharedJourney, Guid> sharedJourneyRepo,
        IRepository<JourneyTaskTemplateItem, Guid> templateRepo,
        IRepository<ChildProfile, Guid> childRepo,
        IRepository<Medal, Guid> medalRepo,
        IBlobContainer<CatalogBlobContainer> blob,
        IdentityUserManager userManager,
        IGuidGenerator guid,
        IClock clock,
        IUnitOfWorkManager uowManager,
        IConfiguration config,
        ILogger<PlayDemoSeeder> logger)
    {
        _speciesRepo = speciesRepo; _journeyRepo = journeyRepo; _sharedJourneyRepo = sharedJourneyRepo;
        _templateRepo = templateRepo;
        _childRepo = childRepo; _medalRepo = medalRepo; _blob = blob;
        _userManager = userManager; _guid = guid; _clock = clock; _uowManager = uowManager;
        _config = config; _logger = logger;
    }

    public async Task SeedAsync()
    {
        // 显式开关（默认关），任何环境都可用于首次布种。幂等：物种/旅程已存在则跳过。
        // 生产首次布种：设 Seed:PlayDemo=true + Seed:PetArtDir=<美术目录>，重启种入后可关掉。
        if (_config["Seed:PlayDemo"] != "true")
        {
            return;
        }

        var artDir = ResolvePrototypePetArtDir();
        if (artDir == null)
        {
            _logger.LogWarning("PlayDemoSeeder：未找到原型美术目录（frontend/child-web-prototype/assets/pets），跳过。");
            return;
        }

        try
        {
            using var uow = _uowManager.Begin(requiresNew: true);
            await EnsureSpeciesAsync("dragon", "火龙", "#E8461F", DragonStages, artDir);
            await EnsureSpeciesAsync("hero", "光之英雄", "#2A9BD8", HeroStages, artDir);
            await EnsureDemoJourneyAsync();
            await uow.CompleteAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PlayDemoSeeder 失败（可能数据库未迁移；先跑 DbMigrator）。");
        }
    }

    private async Task EnsureSpeciesAsync(
        string code, string name, string accent,
        (int Level, string Name, string? Reveal, int? Growth, decimal Scale)[] stages,
        string artDir)
    {
        if (await _speciesRepo.FindAsync(s => s.Code == code) != null)
        {
            return; // 幂等
        }

        var id = _guid.Create();
        var species = new PetSpecies(id, name, code);
        species.SetAccentColor(accent);
        species.SetDisplayOrder(code == "dragon" ? 0 : 1);

        foreach (var st in stages)
        {
            species.SetForm(st.Level, st.Name, st.Reveal, st.Growth, st.Scale);
        }

        // 上传精灵图（5）+ 进化视频（1-4）+ 封面（用 form5）
        for (var level = 1; level <= PetSpecies.FormCount; level++)
        {
            var spriteKey = $"pets/{id:N}/form-{level}.png";
            await SaveArtAsync(Path.Combine(artDir, $"sp-{code}-{level}.png"), spriteKey);
            species.SetFormSprite(level, spriteKey);

            if (level < PetSpecies.FormCount)
            {
                var videoKey = $"pets/{id:N}/evolve-{level}-{level + 1}.mp4";
                await SaveArtAsync(Path.Combine(artDir, $"sp-{code}-{level}-to-{level + 1}.mp4"), videoKey);
                species.SetFormEvolveVideo(level, videoKey);
            }
        }

        var coverKey = $"pets/{id:N}/cover.png";
        await SaveArtAsync(Path.Combine(artDir, $"sp-{code}-5.png"), coverKey);
        species.SetCover(coverKey);

        species.Activate(); // 需 5 形态齐 + 封面 + 各精灵图 + 1-4 有 growthToNext(>0) 与进化视频
        await _speciesRepo.InsertAsync(species, autoSave: true);
        _logger.LogInformation("PlayDemoSeeder：已种物种 {Name} ({Code})", name, code);
    }

    private async Task SaveArtAsync(string sourcePath, string objectKey)
    {
        if (!File.Exists(sourcePath))
        {
            throw new FileNotFoundException($"缺原型美术：{sourcePath}");
        }

        await using var fs = File.OpenRead(sourcePath);
        await _blob.SaveAsync(objectKey, fs, overrideExisting: true);
    }

    private async Task EnsureDemoJourneyAsync()
    {
        var demo = await _userManager.FindByNameAsync("demo");
        if (demo == null)
        {
            return; // ChildrenDataSeedContributor 未跑（先跑 DbMigrator）
        }

        var child = await _childRepo.FirstOrDefaultAsync(c => c.ParentId == demo.Id && c.DisplayName == "哥哥");
        if (child == null)
        {
            return;
        }

        if (await _journeyRepo.FindAsync(j => j.ChildId == child.Id) != null)
        {
            return; // 幂等：已有旅程就不再造
        }

        var medal = (await _medalRepo.GetListAsync()).OrderBy(m => m.DisplayOrder).FirstOrDefault();
        if (medal == null)
        {
            _logger.LogWarning("PlayDemoSeeder：无勋章（CatalogSampleDataSeedContributor 未跑），跳过 demo 旅程。");
            return;
        }

        var today = _clock.Now;
        var start = DateOnly.FromDateTime(today);
        var end = start.AddDays(60);

        // 先建共享计划（模板挂它），孩子的 Journey 再挂上去（SharedJourneyId）。
        var sharedJourney = new SharedJourney(_guid.Create(), demo.Id, "暑假成长大冒险", start, end, medal.Id);
        sharedJourney.SetDescription("每天完成任务，喂养你的伙伴，一起进化到满级！");
        await _sharedJourneyRepo.InsertAsync(sharedJourney, autoSave: true);

        var journeyId = _guid.Create();
        var journey = new Journey(journeyId, sharedJourney.Id, demo.Id, child.Id, "暑假成长大冒险", start, end, medal.Id);
        journey.SetDescription("每天完成任务，喂养你的伙伴，一起进化到满级！");
        await _journeyRepo.InsertAsync(journey, autoSave: true);

        // 周一~周五各 2 项任务模板（随机奖励，由默认构造保证），挂在共享计划上
        var weekdays = new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday };
        foreach (var day in weekdays)
        {
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                _guid.Create(), sharedJourney.Id, day, "口算 20 分钟", "math", 0, 20), autoSave: true);
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                _guid.Create(), sharedJourney.Id, day, "阅读打卡", "reading", 1, 15), autoSave: true);
        }

        _logger.LogInformation("PlayDemoSeeder：已给「哥哥」种 Draft 旅程 + 周任务模板。");
    }

    /// <summary>
    /// 定位宠物美术目录。优先级：① 配置 Seed:PetArtDir（生产用绝对路径）；
    /// ② Host 运行目录旁的 pet-art/（发布时可一并拷）；
    /// ③ dev：向上找含 .git 的仓库根，拼 frontend/child-web-prototype/assets/pets。
    /// </summary>
    private string? ResolvePrototypePetArtDir()
    {
        var configured = _config["Seed:PetArtDir"];
        if (!string.IsNullOrWhiteSpace(configured) && Directory.Exists(configured))
        {
            return configured;
        }

        var beside = Path.Combine(AppContext.BaseDirectory, "pet-art");
        if (Directory.Exists(beside))
        {
            return beside;
        }

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !Directory.Exists(Path.Combine(dir.FullName, ".git")))
        {
            dir = dir.Parent;
        }

        if (dir == null)
        {
            return null;
        }

        var art = Path.Combine(dir.FullName, "frontend", "child-web-prototype", "assets", "pets");
        return Directory.Exists(art) ? art : null;
    }
}
