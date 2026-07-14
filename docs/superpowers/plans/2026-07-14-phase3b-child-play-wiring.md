# Phase 3B — 孩子端接线（沉浸式养成）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把孩子端从纯 HTML 原型重建为 `parent-web` 内嵌的全屏「孩子模式」React 应用，消费真实 `JourneyPlayAppService`，并加 Development 便利（本地静态 blob 端点 + demo 种子）让整条链路开箱可跑。

**Architecture:** 孩子模式内嵌 `parent-web`，路由 `/play`（头像选择）+ `/play/:childId`（游戏壳）挂在 `AppLayout` 之外、用独立全屏 `KidLayout`（自带鉴权守卫，因 AppLayout 的守卫不覆盖它）。数据层 `playService.ts` + `usePlay.ts`（react-query）消费 `/api/app/journey-play/*`。后端仅加 Development 便利：`/blob/{**key}` 端点（用 `CatalogBlobContainer` 流式返回资产）+ Host 启动时 `PlayDemoSeeder`（种火龙/光之英雄 2 物种 + 原型美术 + demo Draft 旅程），**不碰 play 领域/契约**。

**Tech Stack:** 前端 React 19 / Vite 6 / TS ~5.7 / react-router-dom 7 / @tanstack/react-query 5 / zustand 5 / sonner / Radix+CVA(shadcn) / Tailwind 4 / i18next / vitest 3 + jsdom + testing-library。后端 ABP 10.5 / .NET 10 / EF Core / Mapperly / Aliyun+FileSystem BlobStoring。

设计规格：`docs/superpowers/specs/2026-07-14-phase3b-child-play-wiring-design.md`。

## Global Constraints

以下为项目级约束，每个任务隐含包含：

- **技术栈版本**：沿用 `parent-web` 现有依赖，不新增前端库（动画用原生 CSS/`<video>`）。后端沿用 ABP 10.5 / .NET 10。
- **i18n 双语一致**：新增文案键必须同时进 `public/locales/zh-CN/translation.json` 与 `public/locales/en/translation.json`，键集**完全一致**（`src/i18n/locales.test.ts` 强制）。孩子端以 zh 为主，en 可直译占位。
- **zh 优先**：孩子端 UI 以中文为主要体验。
- **play 路由**（ABP 约定，`JourneyPlayAppService` → `/api/app/journey-play/*`）：`GET active?childId=` / `POST start`(body) / `GET daily-board?childId=&date=` / `GET backpack?childId=&journeyId=` / `GET collection?childId=` / `POST complete-task?childId=&taskId=` / `POST uncomplete-task?childId=&taskId=` / `POST feed`(body)。**首次真机联调时用运行 host 核对参数绑定**（query vs body），如与约定不符按实调整（见 Task 3 备注）。
- **DateOnly 序列化契约**：后端 `DateOnly` ↔ 前端 `string` 走 `"YYYY-MM-DD"`（System.Text.Json 默认）。`date` 入参用本地日期字符串（不带时区），如 `2026-07-14`。
- **Blob key 方案**（与 Slice C 上传一致）：宠物精灵图 `pets/{id:N}/form-{level}.png`、进化视频 `pets/{id:N}/evolve-{level}-{level+1}.mp4`、封面 `pets/{id:N}/cover.png`。资产 URL = `{App:AssetCdnBaseUrl}/{objectKey}`（`AssetUrlResolver`）。
- **multipart 上传契约**（如需）：字段名 `file`，`Content-Type` 置 `undefined` 让浏览器带 boundary（现有 `uploadFile` 助手，本 slice 一般不用）。
- **鉴权**：`/play*` 需家长已登录（play 接口 `ParentAdmin` 鉴权，家长 token 即够）。孩子无独立登录，不做 PIN 门。
- **后端 dev 便利仅 Development**：`/blob` 端点与 `PlayDemoSeeder` 均以 `IWebHostEnvironment.IsDevelopment()` + `Seed:PlayDemo` 配置门控，生产不启用（生产走真 CDN）。
- **提交**：每个 task 末尾 commit，中文 message，结尾带 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` trailer。

---

## 任务总览

| # | 交付物 | 层 |
|---|---|---|
| 1 | `/blob/{**key}` dev 端点 + `appsettings.Development.json` 的 `AssetCdnBaseUrl` | 后端 |
| 2 | `PlayDemoSeeder`（repo-root 解析 + 2 物种+美术 + demo Draft 旅程）+ Host 启动接线 | 后端 |
| 3 | play 类型 + `playService.ts`（8 接口） | 前端 |
| 4 | `usePlay.ts` react-query hooks | 前端 |
| 5 | `play.*` i18n scaffold（双语）+ `nav.play` | 前端 |
| 6 | `KidLayout`（守卫+全屏+退出）+ `/play` 路由 | 前端 |
| 7 | 入口：ChildrenPage「进入乐园」按钮 + `KidPickChildPage` 头像选择 | 前端 |
| 8 | `KidGameShell` 状态机 + 空态 | 前端 |
| 9 | `PickPet` 选宠 + `ChooseAdventure` 多 Draft 选择 | 前端 |
| 10 | `DailyBoard` 每日看板（宠物舞台+成长条+周条+任务列表） | 前端 |
| 11 | 完成/取消任务接线 | 前端 |
| 12 | `Backpack` 持久背包 | 前端 |
| 13 | `FeedPanel` 喂养 + `EvolutionCutscene` 进化过场/满级庆祝 | 前端 |
| 14 | `Collection` 收藏/勋章墙 | 前端 |

> 可选 stretch：`PetCodex` 进化图鉴（移植原型「伙伴图鉴」，从当前物种 forms 渲染）。非阻塞，见 Task 14 末尾备注。

---

## Task 1: `/blob/{**key}` dev 端点 + dev AssetCdnBaseUrl

让本地上传/种子的 blob 资产（文件系统 fallback）可经 HTTP 访问，`AssetUrlResolver` 生成的 URL 能真实解析。

**Files:**
- Modify: `backend/src/Homework.HttpApi.Host/HomeworkHttpApiHostModule.cs`（`OnApplicationInitialization` 里 `UseConfiguredEndpoints` 改为 lambda 形态，Development 下映射 `/blob/{**key}`）
- Modify: `backend/src/Homework.HttpApi.Host/appsettings.Development.json`（加 `App:AssetCdnBaseUrl` + `Seed:PlayDemo`）

**Interfaces:**
- Consumes: `IBlobContainer<CatalogBlobContainer>`（`Homework.Catalog`，容器名 `catalog`），`Volo.Abp.BlobStoring.BlobContainerExtensions.GetAllBytesOrNullAsync`。
- Produces: HTTP `GET {SelfUrl}/blob/{objectKey}` → 200 + 资产字节（或 404）。dev `AssetCdnBaseUrl = https://localhost:44394/blob`。

- [ ] **Step 1: 改 `appsettings.Development.json` 加资产基址与种子开关**

`backend/src/Homework.HttpApi.Host/appsettings.Development.json` 全量替换为：
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "App": {
    "AssetCdnBaseUrl": "https://localhost:44394/blob"
  },
  "Seed": {
    "PlayDemo": "true"
  }
}
```
（`AssetCdnBaseUrl` 与 `App:SelfUrl`=`https://localhost:44394` 对齐。`Seed:PlayDemo` 供 Task 2 用。）

- [ ] **Step 2: 在 Host 模块映射 `/blob/{**key}`（仅 Development）**

`HomeworkHttpApiHostModule.cs` 顶部确保 using（多数已在）：
```csharp
using System.IO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.BlobStoring;
using Homework.Catalog;
```
把 `OnApplicationInitialization` 末尾的 `app.UseConfiguredEndpoints();`（约 line 276）替换为：
```csharp
        app.UseConfiguredEndpoints(endpoints =>
        {
            // dev 便利：本地把 CatalogBlobContainer 的资产按 object key 通过 HTTP 提供，
            // 让 AssetUrlResolver 生成的 {AssetCdnBaseUrl}/{key} 在本地能解析（生产走真 CDN，本端点不注册）。
            // AllowAnonymous：资产设计即「公有读」，<img>/<video> 不带 bearer。
            if (env.IsDevelopment())
            {
                endpoints.MapGet("/blob/{**key}", async (
                    string key,
                    IBlobContainer<CatalogBlobContainer> blob,
                    HttpContext http) =>
                {
                    var bytes = await blob.GetAllBytesOrNullAsync(key);
                    if (bytes == null)
                    {
                        http.Response.StatusCode = StatusCodes.Status404NotFound;
                        return;
                    }

                    http.Response.ContentType = BlobContentType(key);
                    http.Response.Headers.CacheControl = "public, max-age=3600";
                    await http.Response.Body.WriteAsync(bytes);
                }).WithMetadata(new AllowAnonymousAttribute());
            }
        });
```
在类内（`HomeworkHttpApiHostModule`）加静态助手：
```csharp
    private static string BlobContentType(string key) =>
        Path.GetExtension(key).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            _ => "application/octet-stream",
        };
```

- [ ] **Step 3: 编译**

Run: `cd backend && dotnet build src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj`
Expected: Build succeeded（若报 MSB3021/MSB3027 文件锁，是 host 仍在运行，先停掉再编译——非编译错误）。

- [ ] **Step 4: 手动 smoke（可选，需运行 host）**

停掉旧 host → `dotnet run --project backend/src/Homework.HttpApi.Host`。启动后（Task 2 种子会灌美术）浏览器访问 `https://localhost:44394/blob/pets/<任意已存在key>`；无种子时访问不存在 key 应得 404。此步为人工验证，SDD 下可在 Task 2 后统一联调。

- [ ] **Step 5: Commit**

```bash
git add backend/src/Homework.HttpApi.Host/HomeworkHttpApiHostModule.cs backend/src/Homework.HttpApi.Host/appsettings.Development.json
git commit -m "feat(host): dev 本地静态 blob 端点 /blob/{**key} + AssetCdnBaseUrl(仅 Development)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `PlayDemoSeeder` + Host 启动接线

Host 启动时（仅 Development + `Seed:PlayDemo=true`）种入火龙/光之英雄 2 个 active 物种（用原型现有美术灌进 blob）+ 给 demo 孩子「哥哥」建一个 Draft 旅程（带周任务模板）。写入方与 Task 1 读取方同进程同 `App_Data/blobs`，天然对齐。

**Files:**
- Create: `backend/src/Homework.HttpApi.Host/Dev/PlayDemoSeeder.cs`
- Modify: `backend/src/Homework.HttpApi.Host/HomeworkHttpApiHostModule.cs`（加 `OnPostApplicationInitializationAsync` 调用 seeder）

**Interfaces:**
- Consumes: 领域 `PetSpecies`（`SetForm`/`SetFormSprite`/`SetFormEvolveVideo`/`SetCover`/`Activate`）、`Journey`（ctor `(id, parentId, childId, title, startDate, endDate, medalId)`，默认 `Status=Draft`）、`JourneyTaskTemplateItem`（ctor `(id, journeyId, dayOfWeek, title, subject, order, estimatedMinutes)`，默认随机奖励）、`ChildProfile`、repos、`IBlobContainer<CatalogBlobContainer>`、`IGuidGenerator`、`IClock`、`IdentityUserManager`、`IUnitOfWorkManager`、`IWebHostEnvironment`、`IConfiguration`、`ILogger`。
- Produces: 幂等 dev 数据。物种 code=`dragon`/`hero`。哥哥的 Draft 旅程（period 覆盖 today→+60d）+ 若干周任务模板项。

- [ ] **Step 1: 写 `PlayDemoSeeder`**

`backend/src/Homework.HttpApi.Host/Dev/PlayDemoSeeder.cs`：
```csharp
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
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
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IRepository<Medal, Guid> _medalRepo;
    private readonly IBlobContainer<CatalogBlobContainer> _blob;
    private readonly IdentityUserManager _userManager;
    private readonly IGuidGenerator _guid;
    private readonly IClock _clock;
    private readonly IUnitOfWorkManager _uowManager;
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;
    private readonly ILogger<PlayDemoSeeder> _logger;

    public PlayDemoSeeder(
        IRepository<PetSpecies, Guid> speciesRepo,
        IRepository<Journey, Guid> journeyRepo,
        IRepository<JourneyTaskTemplateItem, Guid> templateRepo,
        IRepository<ChildProfile, Guid> childRepo,
        IRepository<RewardItem, Guid> rewardRepo,
        IRepository<Medal, Guid> medalRepo,
        IBlobContainer<CatalogBlobContainer> blob,
        IdentityUserManager userManager,
        IGuidGenerator guid,
        IClock clock,
        IUnitOfWorkManager uowManager,
        IConfiguration config,
        IHostEnvironment env,
        ILogger<PlayDemoSeeder> logger)
    {
        _speciesRepo = speciesRepo; _journeyRepo = journeyRepo; _templateRepo = templateRepo;
        _childRepo = childRepo; _rewardRepo = rewardRepo; _medalRepo = medalRepo; _blob = blob;
        _userManager = userManager; _guid = guid; _clock = clock; _uowManager = uowManager;
        _config = config; _env = env; _logger = logger;
    }

    public async Task SeedAsync()
    {
        if (!_env.IsDevelopment() || _config["Seed:PlayDemo"] != "true")
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
        var journeyId = _guid.Create();
        var journey = new Journey(journeyId, demo.Id, child.Id, "暑假成长大冒险", start, end, medal.Id);
        journey.SetDescription("每天完成任务，喂养你的伙伴，一起进化到满级！");
        await _journeyRepo.InsertAsync(journey, autoSave: true);

        // 周一~周五各 2 项任务模板（随机奖励，由默认构造保证）
        var weekdays = new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday };
        foreach (var day in weekdays)
        {
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                _guid.Create(), journeyId, day, "口算 20 分钟", "math", 0, 20), autoSave: true);
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                _guid.Create(), journeyId, day, "阅读打卡", "reading", 1, 15), autoSave: true);
        }

        _logger.LogInformation("PlayDemoSeeder：已给「哥哥」种 Draft 旅程 + 周任务模板。");
    }

    /// <summary>从 Host 运行目录向上找含 .git 的仓库根，再拼 frontend/child-web-prototype/assets/pets。</summary>
    private static string? ResolvePrototypePetArtDir()
    {
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
```

- [ ] **Step 2: 在 Host 模块启动后调用 seeder**

`HomeworkHttpApiHostModule.cs` 加 using：
```csharp
using System.Threading.Tasks;
using Homework.Dev;
```
在类中加（与 `OnApplicationInitialization` 同级）：
```csharp
    public override async Task OnPostApplicationInitializationAsync(ApplicationInitializationContext context)
    {
        // dev 便利：Host 启动后种入孩子端 demo 数据（物种+美术+Draft 旅程）。仅 Development + Seed:PlayDemo。
        using var scope = context.ServiceProvider.CreateScope();
        await scope.ServiceProvider.GetRequiredService<PlayDemoSeeder>().SeedAsync();
    }
```

- [ ] **Step 3: 编译**

Run: `cd backend && dotnet build src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj`
Expected: Build succeeded。

- [ ] **Step 4: 手动 smoke（需运行 host + 已迁移库）**

先 `dotnet run --project backend/src/Homework.DbMigrator`（建库+基础种子），再 `dotnet run --project backend/src/Homework.HttpApi.Host`。日志应见「已种物种 火龙/光之英雄」「给哥哥种 Draft 旅程」。用 demo 家长（`demo`/`1q2w3E*`）取 token 后 `GET /api/app/pet-species/active-list` 应见 2 物种且 `forms[].spriteUrl` 指向 `https://localhost:44394/blob/pets/...`，浏览器打开该 URL 应见图。此步人工验证。

- [ ] **Step 5: Commit**

```bash
git add backend/src/Homework.HttpApi.Host/Dev/PlayDemoSeeder.cs backend/src/Homework.HttpApi.Host/HomeworkHttpApiHostModule.cs
git commit -m "feat(host): Development 孩子端 demo 种子(火龙/光之英雄+美术+哥哥 Draft 旅程)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: play 类型 + `playService.ts`

**Files:**
- Modify: `frontend/parent-web/src/types/homework.ts`（加 5 个缺失类型）
- Create: `frontend/parent-web/src/services/playService.ts`
- Test: `frontend/parent-web/src/services/playService.test.ts`

**Interfaces:**
- Consumes: 现有 `api`（`@/services/api`）、`ListResult`/`JourneyDto`/`DailyBoardDto`/`DailyTaskDto`/`PetSpeciesDto`（`@/types/homework`）。
- Produces：
  - types：`StartJourneyDto`、`FeedDto`、`FeedResultDto`、`BackpackItemDto`、`CollectionEntryDto`。
  - `playService.ts`：`getActiveJourney(childId) => Promise<JourneyDto | null>`、`startJourney(dto) => Promise<JourneyDto>`、`getPlayDailyBoard(input) => Promise<DailyBoardDto>`、`getBackpack(childId, journeyId) => Promise<BackpackItemDto[]>`、`getCollection(childId) => Promise<CollectionEntryDto[]>`、`completeTask(childId, taskId) => Promise<DailyTaskDto>`、`uncompleteTask(childId, taskId) => Promise<DailyTaskDto>`、`feed(dto) => Promise<FeedResultDto>`。

> **备注（路由核对）**：下列路由按 ABP 约定写。首次真机联调若 `complete-task`/`uncomplete-task` 的 Guid 参数绑定不是 query（而是 body/route），在此文件按实调整；其余 GET/POST(body) 约定风险低。

- [ ] **Step 1: 加类型（`types/homework.ts` 末尾追加）**

```ts
// ---- child play (Phase 3B) ----
export interface StartJourneyDto { childId: string; journeyId: string; petSpeciesId: string }
export interface FeedDto { childId: string; journeyId: string; rewardItemId: string }
export interface FeedResultDto {
  evolved: boolean
  newLevel: number
  revealText?: string | null
  evolveVideoUrl?: string | null
  completed: boolean
  currentLevel: number
  growthPoints: number
}
export interface BackpackItemDto {
  rewardItemId: string
  name: string
  iconUrl?: string | null
  glyph?: string | null
  quantity: number
  growthValue: number
}
export interface CollectionEntryDto {
  journeyId: string
  title: string
  petSpeciesId: string
  petName: string
  petFinalSpriteUrl?: string | null
  medalId: string
  medalName: string
  medalImageUrl?: string | null
  completedTime: string
}
```

- [ ] **Step 2: 写失败测试 `playService.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '@/services/api'
import * as play from './playService'

vi.mock('@/services/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }

beforeEach(() => vi.clearAllMocks())

describe('playService', () => {
  it('getActiveJourney → GET journey-play/active with childId, null passes through', async () => {
    mockApi.get.mockResolvedValue({ data: null })
    const r = await play.getActiveJourney('c1')
    expect(mockApi.get).toHaveBeenCalledWith('/api/app/journey-play/active', { params: { childId: 'c1' } })
    expect(r).toBeNull()
  })

  it('startJourney → POST journey-play/start with body', async () => {
    const dto = { childId: 'c1', journeyId: 'j1', petSpeciesId: 'p1' }
    mockApi.post.mockResolvedValue({ data: { id: 'j1' } })
    await play.startJourney(dto)
    expect(mockApi.post).toHaveBeenCalledWith('/api/app/journey-play/start', dto)
  })

  it('getPlayDailyBoard → GET journey-play/daily-board with childId+date', async () => {
    mockApi.get.mockResolvedValue({ data: { tasks: [] } })
    await play.getPlayDailyBoard({ childId: 'c1', date: '2026-07-14' })
    expect(mockApi.get).toHaveBeenCalledWith('/api/app/journey-play/daily-board', { params: { childId: 'c1', date: '2026-07-14' } })
  })

  it('getBackpack → GET journey-play/backpack, unwraps items', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [{ rewardItemId: 'r1' }] } })
    const r = await play.getBackpack('c1', 'j1')
    expect(mockApi.get).toHaveBeenCalledWith('/api/app/journey-play/backpack', { params: { childId: 'c1', journeyId: 'j1' } })
    expect(r).toHaveLength(1)
  })

  it('getCollection → GET journey-play/collection, unwraps items', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [] } })
    await play.getCollection('c1')
    expect(mockApi.get).toHaveBeenCalledWith('/api/app/journey-play/collection', { params: { childId: 'c1' } })
  })

  it('completeTask / uncompleteTask → POST with childId+taskId params', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 't1' } })
    await play.completeTask('c1', 't1')
    expect(mockApi.post).toHaveBeenCalledWith('/api/app/journey-play/complete-task', null, { params: { childId: 'c1', taskId: 't1' } })
    await play.uncompleteTask('c1', 't1')
    expect(mockApi.post).toHaveBeenCalledWith('/api/app/journey-play/uncomplete-task', null, { params: { childId: 'c1', taskId: 't1' } })
  })

  it('feed → POST journey-play/feed with body', async () => {
    const dto = { childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' }
    mockApi.post.mockResolvedValue({ data: { evolved: false } })
    await play.feed(dto)
    expect(mockApi.post).toHaveBeenCalledWith('/api/app/journey-play/feed', dto)
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/services/playService.test.ts`
Expected: FAIL（`playService` 模块不存在）。

- [ ] **Step 4: 写 `playService.ts`**

```ts
import { api } from '@/services/api'
import type {
  ListResult, JourneyDto, DailyBoardDto, DailyTaskDto,
  StartJourneyDto, FeedDto, FeedResultDto, BackpackItemDto, CollectionEntryDto, GetDailyBoardInput,
} from '@/types/homework'

const base = '/api/app/journey-play'

export const getActiveJourney = (childId: string) =>
  api.get<JourneyDto | null>(`${base}/active`, { params: { childId } }).then((r) => r.data)

export const startJourney = (dto: StartJourneyDto) =>
  api.post<JourneyDto>(`${base}/start`, dto).then((r) => r.data)

export const getPlayDailyBoard = (input: GetDailyBoardInput) =>
  api.get<DailyBoardDto>(`${base}/daily-board`, { params: { childId: input.childId, date: input.date } }).then((r) => r.data)

export const getBackpack = (childId: string, journeyId: string) =>
  api.get<ListResult<BackpackItemDto>>(`${base}/backpack`, { params: { childId, journeyId } }).then((r) => r.data.items)

export const getCollection = (childId: string) =>
  api.get<ListResult<CollectionEntryDto>>(`${base}/collection`, { params: { childId } }).then((r) => r.data.items)

export const completeTask = (childId: string, taskId: string) =>
  api.post<DailyTaskDto>(`${base}/complete-task`, null, { params: { childId, taskId } }).then((r) => r.data)

export const uncompleteTask = (childId: string, taskId: string) =>
  api.post<DailyTaskDto>(`${base}/uncomplete-task`, null, { params: { childId, taskId } }).then((r) => r.data)

export const feed = (dto: FeedDto) =>
  api.post<FeedResultDto>(`${base}/feed`, dto).then((r) => r.data)
```

- [ ] **Step 5: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/services/playService.test.ts && npm run typecheck`
Expected: PASS + typecheck 0 error。

- [ ] **Step 6: Commit**

```bash
git add frontend/parent-web/src/types/homework.ts frontend/parent-web/src/services/playService.ts frontend/parent-web/src/services/playService.test.ts
git commit -m "feat(play): 孩子端 play 类型 + playService(8 接口)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `usePlay.ts` react-query hooks

**Files:**
- Create: `frontend/parent-web/src/hooks/usePlay.ts`
- Test: `frontend/parent-web/src/hooks/usePlay.test.tsx`

**Interfaces:**
- Consumes: `playService.ts`（Task 3）、`listActivePetSpecies`/`listJourneys`（`@/services/homeworkService`）、`getErrorMessage`、`sonner.toast`、`@tanstack/react-query`。
- Produces（供后续所有屏消费）：
  - keys：`activeJourneyKey(childId)`、`playBoardKey(childId, date)`、`backpackKey(childId, journeyId)`、`collectionKey(childId)`、`childJourneysKey(childId)`、`activePetSpeciesKey`。
  - queries：`useActiveJourney(childId)`、`usePlayBoard(childId, date)`、`useBackpack(childId, journeyId, enabled)`、`useCollection(childId)`、`useChildJourneys(childId)`、`useActivePetSpecies()`。
  - mutations 工厂：`usePlayMutations(childId, journeyId?)` → `{ start, complete, uncomplete, feed }`，每个成功后 invalidate 相关 query。

- [ ] **Step 1: 写失败测试 `usePlay.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/playService', () => ({
  getActiveJourney: vi.fn().mockResolvedValue({ id: 'j1', childId: 'c1', currentLevel: 1, growthPoints: 0, status: 1 }),
  startJourney: vi.fn().mockResolvedValue({ id: 'j1' }),
  completeTask: vi.fn().mockResolvedValue({ id: 't1' }),
  uncompleteTask: vi.fn().mockResolvedValue({ id: 't1' }),
  feed: vi.fn().mockResolvedValue({ evolved: false, completed: false, currentLevel: 1, growthPoints: 12, newLevel: 1 }),
  getPlayDailyBoard: vi.fn(), getBackpack: vi.fn(), getCollection: vi.fn(),
}))
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([]),
  listJourneys: vi.fn().mockResolvedValue([]),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useActiveJourney, usePlayMutations } from './usePlay'
import { feed as feedSvc } from '@/services/playService'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('usePlay', () => {
  it('useActiveJourney fetches active journey', async () => {
    const { result } = renderHook(() => useActiveJourney('c1'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.data?.id).toBe('j1'))
  })

  it('usePlayMutations.feed calls feed service', async () => {
    const { result } = renderHook(() => usePlayMutations('c1', 'j1'), { wrapper: wrapper() })
    await act(async () => { await result.current.feed.mutateAsync({ childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' }) })
    expect(feedSvc).toHaveBeenCalledWith({ childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/hooks/usePlay.test.tsx`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写 `usePlay.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getActiveJourney, getPlayDailyBoard, getBackpack, getCollection,
  startJourney, completeTask, uncompleteTask, feed,
} from '@/services/playService'
import { listActivePetSpecies, listJourneys } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { StartJourneyDto, FeedDto } from '@/types/homework'

export const activeJourneyKey = (childId: string) => ['play', 'active', childId]
export const playBoardKey = (childId: string, date: string) => ['play', 'board', childId, date]
export const backpackKey = (childId: string, journeyId: string) => ['play', 'backpack', childId, journeyId]
export const collectionKey = (childId: string) => ['play', 'collection', childId]
export const childJourneysKey = (childId: string) => ['play', 'journeys', childId]
export const activePetSpeciesKey = ['play', 'pet-species', 'active']

export const useActiveJourney = (childId: string) =>
  useQuery({ queryKey: activeJourneyKey(childId), queryFn: () => getActiveJourney(childId), enabled: !!childId })

export const usePlayBoard = (childId: string, date: string) =>
  useQuery({ queryKey: playBoardKey(childId, date), queryFn: () => getPlayDailyBoard({ childId, date }), enabled: !!childId && !!date })

export const useBackpack = (childId: string, journeyId: string, enabled = true) =>
  useQuery({ queryKey: backpackKey(childId, journeyId), queryFn: () => getBackpack(childId, journeyId), enabled: enabled && !!childId && !!journeyId })

export const useCollection = (childId: string) =>
  useQuery({ queryKey: collectionKey(childId), queryFn: () => getCollection(childId), enabled: !!childId })

export const useChildJourneys = (childId: string) =>
  useQuery({ queryKey: childJourneysKey(childId), queryFn: () => listJourneys(childId), enabled: !!childId })

export const useActivePetSpecies = () =>
  useQuery({ queryKey: activePetSpeciesKey, queryFn: () => listActivePetSpecies(), staleTime: 5 * 60 * 1000 })

export function usePlayMutations(childId: string, journeyId?: string) {
  const qc = useQueryClient()
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  const invalidateActive = () => qc.invalidateQueries({ queryKey: activeJourneyKey(childId) })
  const invalidateBoard = () => qc.invalidateQueries({ queryKey: ['play', 'board', childId] })
  const invalidateBackpack = () => journeyId && qc.invalidateQueries({ queryKey: backpackKey(childId, journeyId) })

  return {
    start: useMutation({
      mutationFn: (dto: StartJourneyDto) => startJourney(dto),
      onSuccess: () => { void invalidateActive() },
      onError: onErr,
    }),
    complete: useMutation({
      mutationFn: (taskId: string) => completeTask(childId, taskId),
      onSuccess: () => { void invalidateBoard(); void invalidateBackpack() },
      onError: onErr,
    }),
    uncomplete: useMutation({
      mutationFn: (taskId: string) => uncompleteTask(childId, taskId),
      onSuccess: () => { void invalidateBoard(); void invalidateBackpack() },
      onError: onErr,
    }),
    feed: useMutation({
      mutationFn: (dto: FeedDto) => feed(dto),
      onSuccess: () => { void invalidateActive(); void invalidateBackpack() },
      onError: onErr,
    }),
  }
}
```

- [ ] **Step 4: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/hooks/usePlay.test.tsx && npm run typecheck`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add frontend/parent-web/src/hooks/usePlay.ts frontend/parent-web/src/hooks/usePlay.test.tsx
git commit -m "feat(play): usePlay react-query hooks(查询+变更工厂)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `play.*` i18n scaffold + `nav.play`

一次性把孩子端文案键的骨架加进双语（后续屏引用；新增键仍须双语同步）。

**Files:**
- Modify: `frontend/parent-web/public/locales/zh-CN/translation.json`
- Modify: `frontend/parent-web/public/locales/en/translation.json`
- Modify: `frontend/parent-web/src/i18n/locales.test.ts`（加 `play.title` spot-check）

**Interfaces:**
- Produces: `nav.play`、`play.*`（`pickChild`/`enterPlayground`/`backToParent`/`loading`/`noJourney`/`chooseAdventure`/`pickPet`/`start`/`today`/`restDay`/`locked`/`stars`/`progress`/`backpack`/`feed`/`empty`/`evolveTitle`/`completedTitle`/`collection`/`collectionEmpty` 等）。

- [ ] **Step 1: zh-CN 加 `nav.play` + `play` 块**

在 `zh-CN/translation.json` 的 `nav` 对象内加 `"play": "孩子模式"`；在顶层加：
```json
"play": {
  "pickChildTitle": "谁来玩呀？",
  "enterPlayground": "进入乐园",
  "backToParent": "交还家长",
  "loading": "加载中…",
  "noJourneyTitle": "还没有冒险",
  "noJourneyBody": "让爸爸妈妈先创建一个旅程 ✨",
  "chooseAdventureTitle": "选择你的冒险",
  "pickPetTitle": "选择你的伙伴",
  "start": "开始冒险",
  "today": "今天",
  "restDay": "今天休息，好好放松~",
  "locked": "未开启",
  "stars": "今日星星",
  "progress": "今日进度",
  "goComplete": "去完成",
  "done": "已完成",
  "rewardEarned": "获得 {{name}}！",
  "backpackTitle": "背包",
  "backpackEmpty": "背包空空的，快去完成任务吧",
  "feed": "喂养",
  "growth": "成长值",
  "evolveReveal": "进化！",
  "completedTitle": "满级达成！",
  "completedBody": "你的伙伴已成长到最终形态，勋章已收入图鉴 🏅",
  "collectionTitle": "收藏墙",
  "collectionEmpty": "还没有完成的旅程，继续加油！",
  "skip": "跳过"
}
```

- [ ] **Step 2: en 加对应键（键集与 zh 完全一致）**

在 `en/translation.json` 的 `nav` 内加 `"play": "Kid mode"`；顶层加：
```json
"play": {
  "pickChildTitle": "Who's playing?",
  "enterPlayground": "Enter playground",
  "backToParent": "Back to parent",
  "loading": "Loading…",
  "noJourneyTitle": "No adventure yet",
  "noJourneyBody": "Ask a parent to create a journey first ✨",
  "chooseAdventureTitle": "Choose your adventure",
  "pickPetTitle": "Choose your companion",
  "start": "Start adventure",
  "today": "Today",
  "restDay": "Rest day — take it easy!",
  "locked": "Locked",
  "stars": "Stars today",
  "progress": "Today's progress",
  "goComplete": "Do it",
  "done": "Done",
  "rewardEarned": "Got {{name}}!",
  "backpackTitle": "Backpack",
  "backpackEmpty": "Backpack is empty — go finish tasks",
  "feed": "Feed",
  "growth": "Growth",
  "evolveReveal": "Evolved!",
  "completedTitle": "Max level reached!",
  "completedBody": "Your companion reached its final form. Medal added to your collection 🏅",
  "collectionTitle": "Collection",
  "collectionEmpty": "No completed journeys yet. Keep going!",
  "skip": "Skip"
}
```

- [ ] **Step 3: locales.test 加 spot-check**

`src/i18n/locales.test.ts` 第一个 `it` 内的断言追加：
```ts
      expect(flat).toContain('nav.play')
      expect(flat).toContain('play.pickChildTitle')
```

- [ ] **Step 4: 跑 locales 测试**

Run: `cd frontend/parent-web && npx vitest run src/i18n/locales.test.ts`
Expected: PASS（含 zh/en 键集一致断言）。

- [ ] **Step 5: Commit**

```bash
git add frontend/parent-web/public/locales/zh-CN/translation.json frontend/parent-web/public/locales/en/translation.json frontend/parent-web/src/i18n/locales.test.ts
git commit -m "feat(play): i18n play.* 文案骨架 + nav.play(双语)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `KidLayout` + `/play` 路由

全屏、无侧边栏、**自带鉴权守卫**（`/play` 在 AppLayout 之外，不受其守卫保护）。含「交还家长」退出控件。

**Files:**
- Create: `frontend/parent-web/src/features/play/KidLayout.tsx`
- Create: `frontend/parent-web/src/features/play/kid.css`（孩子端作用域样式，`@import` 进入或直接 className）
- Modify: `frontend/parent-web/src/App.tsx`（加 `/play` 路由，AppLayout 之外）
- Test: `frontend/parent-web/src/features/play/KidLayout.test.tsx`

**Interfaces:**
- Consumes: `useAuthStore`（`isAuthenticated`/`isInitializing`）、`useNavigate`、`react-router` `Outlet`。
- Produces: `KidLayout`（未登录 → `<Navigate to="/login" />`；初始化中 → loading；否则全屏容器 + 退出按钮 + `<Outlet/>`）。路由 `/play`（`KidPickChildPage`）、`/play/:childId`（`KidGameShell`）嵌于 `<Route element={<KidLayout/>}>`。

- [ ] **Step 1: 写失败测试 `KidLayout.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { KidLayout } from './KidLayout'

function ui() {
  return render(
    <MemoryRouter initialEntries={['/play']}>
      <Routes>
        <Route element={<KidLayout />}>
          <Route path="/play" element={<div>kid-home</div>} />
        </Route>
        <Route path="/login" element={<div>login-page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}
beforeEach(() => useAuthStore.setState({ isAuthenticated: true, isInitializing: false }))

describe('KidLayout', () => {
  it('renders child route when authenticated', () => {
    ui()
    expect(screen.getByText('kid-home')).toBeInTheDocument()
    expect(screen.getByTestId('kid-exit')).toBeInTheDocument()
  })
  it('redirects to /login when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, isInitializing: false })
    ui()
    expect(screen.getByText('login-page')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/KidLayout.test.tsx`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写 `KidLayout.tsx`**

```tsx
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import './kid.css'

export function KidLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)

  if (isInitializing) return <div className="kid-shell kid-center">{t('play.loading')}</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="kid-shell">
      <button
        type="button"
        data-testid="kid-exit"
        className="kid-exit"
        onClick={() => navigate('/children')}
      >
        ↩ {t('play.backToParent')}
      </button>
      <Outlet />
    </div>
  )
}
```

- [ ] **Step 4: 写 `kid.css`（全屏沉浸底座）**

```css
/* 孩子端全屏沉浸底座；视觉细节可对照 child-web-prototype/child-homepage.html 的 :root/.app-shell */
.kid-shell {
  position: fixed;
  inset: 0;
  overflow: auto;
  background: linear-gradient(160deg, #ffe8c7 0%, #ffd59e 40%, #ffbe76 100%);
  font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.kid-center { display: grid; place-items: center; font-size: 1.25rem; color: #7a4a1e; }
.kid-exit {
  position: absolute; top: 12px; left: 12px; z-index: 20;
  padding: 6px 12px; border: none; border-radius: 999px;
  background: rgba(255, 255, 255, 0.6); color: #7a4a1e; font-size: 0.85rem; cursor: pointer;
}
```

- [ ] **Step 5: 在 `App.tsx` 加 `/play` 路由（AppLayout 之外）**

`App.tsx` 加 import：
```tsx
import { KidLayout } from '@/features/play/KidLayout'
import { KidPickChildPage } from '@/features/play/KidPickChildPage'
import { KidGameShell } from '@/features/play/KidGameShell'
```
在 `<Route element={<AppLayout />}>` 组**之前**（与 `/login` 同级）插入：
```tsx
        <Route element={<KidLayout />}>
          <Route path="/play" element={<KidPickChildPage />} />
          <Route path="/play/:childId" element={<KidGameShell />} />
        </Route>
```
> 注意 `path="*"` 兜底仍在最后，`/play` 与 `/play/:childId` 已显式声明不会被吞。`KidPickChildPage`/`KidGameShell` 在 Task 7/8 创建；本 task 为让 `App.tsx` 编译，先建**占位**：`KidPickChildPage` 返回 `<div>pick-child</div>`、`KidGameShell` 返回 `<div>game-shell</div>`（Task 7/8 替换实体）。

创建占位 `frontend/parent-web/src/features/play/KidPickChildPage.tsx`：
```tsx
export function KidPickChildPage() { return <div>pick-child</div> }
```
创建占位 `frontend/parent-web/src/features/play/KidGameShell.tsx`：
```tsx
export function KidGameShell() { return <div>game-shell</div> }
```

- [ ] **Step 6: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/features/play/KidLayout.test.tsx && npm run typecheck`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add frontend/parent-web/src/features/play/ frontend/parent-web/src/App.tsx
git commit -m "feat(play): KidLayout(全屏+鉴权守卫+退出) + /play 路由 + 占位屏

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 入口 — ChildrenPage 按钮 + `KidPickChildPage`

**Files:**
- Modify: `frontend/parent-web/src/components/layout/AppLayout.tsx`（nav 加 `play`）
- Modify: `frontend/parent-web/src/features/children/ChildrenPage.tsx`（每卡加「进入乐园」）
- Modify: `frontend/parent-web/src/features/play/KidPickChildPage.tsx`（实体化）
- Test: `frontend/parent-web/src/features/play/KidPickChildPage.test.tsx`
- Test: `frontend/parent-web/src/features/children/ChildrenPage.play.test.tsx`

**Interfaces:**
- Consumes: `useChildren()`（`@/hooks/useChildren`，返回 `ChildProfileDto[]`）、`useNavigate`、`useTranslation`、UI `Card`/`Button`。
- Produces: nav 项 `{ to: '/play', icon: Gamepad2, key: 'nav.play' }`；ChildrenPage 卡片按钮 `navigate('/play/' + child.id)`；`KidPickChildPage` 渲染孩子头像卡，点选 → `navigate('/play/' + child.id)`。

- [ ] **Step 1: AppLayout nav 加「孩子模式」**

`AppLayout.tsx`：import 行加 `Gamepad2`：
```tsx
import { Home, Users, ClipboardCheck, Map, Boxes, Gamepad2 } from 'lucide-react'
```
`nav` 数组末尾加：
```tsx
  { to: '/play', icon: Gamepad2, key: 'nav.play' },
```

- [ ] **Step 2: 写失败测试（ChildrenPage 按钮 + PickChild）**

`ChildrenPage.play.test.tsx`：
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ConfirmProvider } from '@/components/ConfirmDialog'

vi.mock('@/services/homeworkService', () => ({
  listChildren: vi.fn().mockResolvedValue([{ id: 'c1', displayName: '哥哥', grade: 3, hasPin: false }]),
  createChild: vi.fn(), updateChild: vi.fn(), deleteChild: vi.fn(), setChildPin: vi.fn(),
}))
import { ChildrenPage } from './ChildrenPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/children']}>
        <ConfirmProvider>
          <Routes>
            <Route path="/children" element={node} />
            <Route path="/play/:childId" element={<div>playground</div>} />
          </Routes>
        </ConfirmProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('ChildrenPage 进入乐园', () => {
  it('per-child button navigates to /play/:childId', async () => {
    ui(<ChildrenPage />)
    await waitFor(() => expect(screen.getByText('哥哥')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('enter-play-c1'))
    expect(screen.getByText('playground')).toBeInTheDocument()
  })
})
```

`KidPickChildPage.test.tsx`：
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/services/homeworkService', () => ({
  listChildren: vi.fn().mockResolvedValue([
    { id: 'c1', displayName: '哥哥', grade: 3, hasPin: false, avatarKey: '🦁' },
    { id: 'c2', displayName: '弟弟', grade: 1, hasPin: false },
  ]),
}))
import { KidPickChildPage } from './KidPickChildPage'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/play']}>
        <Routes>
          <Route path="/play" element={node} />
          <Route path="/play/:childId" element={<div>playground</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('KidPickChildPage', () => {
  it('lists children and enters playground on pick', async () => {
    ui(<KidPickChildPage />)
    await waitFor(() => expect(screen.getByText('哥哥')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('pick-child-c2'))
    expect(screen.getByText('playground')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/KidPickChildPage.test.tsx src/features/children/ChildrenPage.play.test.tsx`
Expected: FAIL（按钮/实体页未实现）。

- [ ] **Step 4: ChildrenPage 加「进入乐园」按钮**

`ChildrenPage.tsx`：确保顶部 `import { useNavigate } from 'react-router-dom'` 且组件内 `const navigate = useNavigate()`。在卡片操作行（`<div className="flex gap-2 pt-1">` 内、「编辑」按钮前）加：
```tsx
        <Button
          size="sm"
          variant="default"
          data-testid={`enter-play-${child.id}`}
          onClick={() => navigate('/play/' + child.id)}
        >
          进入乐园
        </Button>
```

- [ ] **Step 5: 实体化 `KidPickChildPage.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useChildren } from '@/hooks/useChildren'

export function KidPickChildPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: children = [], isLoading } = useChildren()

  return (
    <div className="kid-pick">
      <h1 className="kid-pick-title">{t('play.pickChildTitle')}</h1>
      {isLoading ? (
        <div className="kid-center">{t('play.loading')}</div>
      ) : (
        <div className="kid-pick-grid">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`pick-child-${c.id}`}
              className="kid-pick-card"
              onClick={() => navigate('/play/' + c.id)}
            >
              <span className="kid-pick-avatar">{c.avatarKey ?? '🐼'}</span>
              <span className="kid-pick-name">{c.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```
在 `kid.css` 追加：
```css
.kid-pick { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; padding: 48px 16px; }
.kid-pick-title { font-size: 2rem; font-weight: 800; color: #7a4a1e; }
.kid-pick-grid { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; }
.kid-pick-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 32px; border: none; border-radius: 24px; background: rgba(255,255,255,0.8); box-shadow: 0 8px 24px rgba(0,0,0,0.12); cursor: pointer; transition: transform .12s; }
.kid-pick-card:hover { transform: translateY(-4px) scale(1.03); }
.kid-pick-avatar { font-size: 3.5rem; }
.kid-pick-name { font-size: 1.1rem; font-weight: 700; color: #5a3512; }
```

- [ ] **Step 6: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/features/play/KidPickChildPage.test.tsx src/features/children/ChildrenPage.play.test.tsx && npm run typecheck`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add frontend/parent-web/src/components/layout/AppLayout.tsx frontend/parent-web/src/features/children/ChildrenPage.tsx frontend/parent-web/src/features/children/ChildrenPage.play.test.tsx frontend/parent-web/src/features/play/KidPickChildPage.tsx frontend/parent-web/src/features/play/KidPickChildPage.test.tsx frontend/parent-web/src/features/play/kid.css
git commit -m "feat(play): 入口(nav 孩子模式 + 孩子卡片进入乐园 + 头像选择屏)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `KidGameShell` 状态机 + 空态

`/play/:childId` 的编排：`GetActive` → 有 Active 进看板 / 无 Active 有 ≥2 Draft 进选择冒险 / 恰 1 Draft 进选宠 / 空态。

**Files:**
- Modify: `frontend/parent-web/src/features/play/KidGameShell.tsx`（实体化）
- Test: `frontend/parent-web/src/features/play/KidGameShell.test.tsx`

**Interfaces:**
- Consumes: `useParams`（`childId`）、`useActiveJourney`、`useChildJourneys`（Task 4）、`JourneyStatus`（0/1/2）。子屏 `DailyBoard`（Task 10）、`ChooseAdventure`/`PickPet`（Task 9）在其任务前先用占位。
- Produces: 依状态渲染对应子屏；空态用 `play.noJourney*`。导出便于测试的分支（用 `data-testid`）。

- [ ] **Step 1: 写失败测试 `KidGameShell.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getActiveJourney = vi.fn()
const listJourneys = vi.fn()
vi.mock('@/services/playService', () => ({ getActiveJourney: (...a: unknown[]) => getActiveJourney(...a) }))
vi.mock('@/services/homeworkService', () => ({ listJourneys: (...a: unknown[]) => listJourneys(...a) }))
// 子屏占位，隔离 shell 逻辑
vi.mock('./DailyBoard', () => ({ DailyBoard: () => <div>daily-board</div> }))
vi.mock('./PickPet', () => ({ PickPet: () => <div>pick-pet</div> }))
vi.mock('./ChooseAdventure', () => ({ ChooseAdventure: () => <div>choose-adventure</div> }))
import { KidGameShell } from './KidGameShell'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/play/c1']}>
        <Routes><Route path="/play/:childId" element={node} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => { vi.clearAllMocks(); listJourneys.mockResolvedValue([]) })

describe('KidGameShell 状态机', () => {
  it('active journey → DailyBoard', async () => {
    getActiveJourney.mockResolvedValue({ id: 'j1', childId: 'c1', status: 1, currentLevel: 2, growthPoints: 10 })
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByText('daily-board')).toBeInTheDocument())
  })
  it('no active + exactly 1 draft → PickPet', async () => {
    getActiveJourney.mockResolvedValue(null)
    listJourneys.mockResolvedValue([{ id: 'd1', childId: 'c1', status: 0 }])
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByText('pick-pet')).toBeInTheDocument())
  })
  it('no active + 2 drafts → ChooseAdventure', async () => {
    getActiveJourney.mockResolvedValue(null)
    listJourneys.mockResolvedValue([{ id: 'd1', status: 0 }, { id: 'd2', status: 0 }])
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByText('choose-adventure')).toBeInTheDocument())
  })
  it('nothing → empty state', async () => {
    getActiveJourney.mockResolvedValue(null)
    listJourneys.mockResolvedValue([])
    ui(<KidGameShell />)
    await waitFor(() => expect(screen.getByTestId('play-empty')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/KidGameShell.test.tsx`
Expected: FAIL（占位 shell 只渲染 `game-shell`）。

- [ ] **Step 3: 实体化 `KidGameShell.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useActiveJourney, useChildJourneys } from '@/hooks/usePlay'
import { DailyBoard } from './DailyBoard'
import { PickPet } from './PickPet'
import { ChooseAdventure } from './ChooseAdventure'
import type { JourneyDto } from '@/types/homework'

export function KidGameShell() {
  const { t } = useTranslation()
  const { childId = '' } = useParams()
  const active = useActiveJourney(childId)
  const journeys = useChildJourneys(childId)
  const [chosenDraftId, setChosenDraftId] = useState<string | null>(null)

  const drafts = useMemo(
    () => (journeys.data ?? []).filter((j) => j.status === 0),
    [journeys.data],
  )

  if (active.isLoading || journeys.isLoading) {
    return <div className="kid-center">{t('play.loading')}</div>
  }

  // 有 Active 旅程 → 每日看板
  if (active.data) {
    return <DailyBoard childId={childId} journey={active.data} />
  }

  // 无 Active：按 Draft 数量分支
  if (drafts.length === 0) {
    return (
      <div className="kid-center kid-empty" data-testid="play-empty">
        <h1 className="kid-pick-title">{t('play.noJourneyTitle')}</h1>
        <p>{t('play.noJourneyBody')}</p>
      </div>
    )
  }

  const target: JourneyDto | undefined =
    drafts.length === 1 ? drafts[0] : drafts.find((d) => d.id === chosenDraftId)

  if (!target) {
    return (
      <ChooseAdventure
        drafts={drafts}
        onChoose={(id) => setChosenDraftId(id)}
      />
    )
  }

  return <PickPet childId={childId} journey={target} />
}
```
> `DailyBoard`/`PickPet`/`ChooseAdventure` 在 Task 9/10 前先建**占位**导出，保证编译：
> - `frontend/parent-web/src/features/play/DailyBoard.tsx`：`export function DailyBoard(_: { childId: string; journey: import('@/types/homework').JourneyDto }) { return <div>daily-board</div> }`
> - `frontend/parent-web/src/features/play/PickPet.tsx`：`export function PickPet(_: { childId: string; journey: import('@/types/homework').JourneyDto }) { return <div>pick-pet</div> }`
> - `frontend/parent-web/src/features/play/ChooseAdventure.tsx`：`export function ChooseAdventure(_: { drafts: import('@/types/homework').JourneyDto[]; onChoose: (id: string) => void }) { return <div>choose-adventure</div> }`

- [ ] **Step 4: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/features/play/KidGameShell.test.tsx && npm run typecheck`
Expected: PASS（4 分支全绿）。

- [ ] **Step 5: Commit**

```bash
git add frontend/parent-web/src/features/play/KidGameShell.tsx frontend/parent-web/src/features/play/KidGameShell.test.tsx frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/PickPet.tsx frontend/parent-web/src/features/play/ChooseAdventure.tsx
git commit -m "feat(play): KidGameShell 状态机(Active/单Draft/多Draft/空态)+子屏占位

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `PickPet` 选宠 + `ChooseAdventure` 多 Draft 选择

**Files:**
- Modify: `frontend/parent-web/src/features/play/PickPet.tsx`（实体化）
- Modify: `frontend/parent-web/src/features/play/ChooseAdventure.tsx`（实体化）
- Test: `frontend/parent-web/src/features/play/PickPet.test.tsx`
- Test: `frontend/parent-web/src/features/play/ChooseAdventure.test.tsx`

**Interfaces:**
- Consumes: `useActivePetSpecies`、`usePlayMutations(childId).start`（Task 4）、`PetSpeciesDto`、`JourneyDto`。选宠成功后依赖 `usePlayMutations.start` 的 `onSuccess` invalidate active journey（shell 随即切到看板）。
- Produces: `PickPet` 渲染 active 物种卡（封面/名），选中调 `start.mutate({ childId, journeyId: journey.id, petSpeciesId })`；`ChooseAdventure` 渲染 draft 旅程卡，点选调 `onChoose(id)`。

- [ ] **Step 1: 写失败测试**

`ChooseAdventure.test.tsx`：
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChooseAdventure } from './ChooseAdventure'

describe('ChooseAdventure', () => {
  it('renders draft cards and calls onChoose', () => {
    const onChoose = vi.fn()
    render(
      <ChooseAdventure
        drafts={[
          { id: 'd1', title: '暑假冒险', status: 0 } as never,
          { id: 'd2', title: '阅读之旅', status: 0 } as never,
        ]}
        onChoose={onChoose}
      />,
    )
    expect(screen.getByText('暑假冒险')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('choose-adventure-d2'))
    expect(onChoose).toHaveBeenCalledWith('d2')
  })
})
```

`PickPet.test.tsx`：
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const startJourney = vi.fn().mockResolvedValue({ id: 'j1' })
vi.mock('@/services/playService', () => ({ startJourney: (...a: unknown[]) => startJourney(...a) }))
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', coverUrl: 'http://x/d.png', forms: [] },
    { id: 'p2', name: '光之英雄', code: 'hero', coverUrl: null, forms: [] },
  ]),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { PickPet } from './PickPet'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('PickPet', () => {
  it('picks a species and starts the journey', async () => {
    ui(<PickPet childId="c1" journey={{ id: 'j1', childId: 'c1', status: 0 } as never} />)
    await waitFor(() => expect(screen.getByText('火龙')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('pick-pet-p1'))
    await waitFor(() =>
      expect(startJourney).toHaveBeenCalledWith({ childId: 'c1', journeyId: 'j1', petSpeciesId: 'p1' }),
    )
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/PickPet.test.tsx src/features/play/ChooseAdventure.test.tsx`
Expected: FAIL（占位实现）。

- [ ] **Step 3: 实体化 `ChooseAdventure.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import type { JourneyDto } from '@/types/homework'

export function ChooseAdventure({ drafts, onChoose }: { drafts: JourneyDto[]; onChoose: (id: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="kid-pick">
      <h1 className="kid-pick-title">{t('play.chooseAdventureTitle')}</h1>
      <div className="kid-pick-grid">
        {drafts.map((d) => (
          <button
            key={d.id}
            type="button"
            data-testid={`choose-adventure-${d.id}`}
            className="kid-pick-card"
            onClick={() => onChoose(d.id)}
          >
            <span className="kid-pick-avatar">🗺️</span>
            <span className="kid-pick-name">{d.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 实体化 `PickPet.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { useActivePetSpecies, usePlayMutations } from '@/hooks/usePlay'
import type { JourneyDto } from '@/types/homework'

export function PickPet({ childId, journey }: { childId: string; journey: JourneyDto }) {
  const { t } = useTranslation()
  const species = useActivePetSpecies()
  const { start } = usePlayMutations(childId, journey.id)

  return (
    <div className="kid-pick">
      <h1 className="kid-pick-title">{t('play.pickPetTitle')}</h1>
      <div className="kid-pick-grid">
        {(species.data ?? []).map((s) => (
          <button
            key={s.id}
            type="button"
            data-testid={`pick-pet-${s.id}`}
            className="kid-pick-card"
            disabled={start.isPending}
            onClick={() => start.mutate({ childId, journeyId: journey.id, petSpeciesId: s.id })}
          >
            {s.coverUrl ? (
              <img className="kid-pick-cover" src={s.coverUrl} alt={s.name} />
            ) : (
              <span className="kid-pick-avatar">🥚</span>
            )}
            <span className="kid-pick-name">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```
`kid.css` 追加：`.kid-pick-cover { width: 120px; height: 120px; object-fit: contain; }`

- [ ] **Step 5: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/features/play/PickPet.test.tsx src/features/play/ChooseAdventure.test.tsx && npm run typecheck`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add frontend/parent-web/src/features/play/PickPet.tsx frontend/parent-web/src/features/play/PickPet.test.tsx frontend/parent-web/src/features/play/ChooseAdventure.tsx frontend/parent-web/src/features/play/ChooseAdventure.test.tsx frontend/parent-web/src/features/play/kid.css
git commit -m "feat(play): 选宠开始 PickPet + 多 Draft 选择冒险 ChooseAdventure

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `DailyBoard` 每日看板

今日看板为主：宠物舞台（当前形态精灵图 + 成长条）+ 星星/进度 + 周条（今日高亮、过去可点、未来锁定）+ 任务列表（本 task 只渲染，完成接线在 Task 11）。

**Files:**
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`（实体化）
- Create: `frontend/parent-web/src/features/play/petStage.ts`（当前形态解析助手）
- Test: `frontend/parent-web/src/features/play/DailyBoard.test.tsx`
- Test: `frontend/parent-web/src/features/play/petStage.test.ts`

**Interfaces:**
- Consumes: `usePlayBoard(childId, date)`、`useActivePetSpecies`（取当前物种 forms）、`JourneyDto`、`DailyBoardDto`、`PetSpeciesDto`/`PetFormDto`。
- Produces:
  - `petStage.ts`：`currentForm(species, level) => PetFormDto | undefined`、`growthRatio(journey, form) => number`（`0..1`，`form.growthToNext` 为空/0 时返回 1）。
  - `DailyBoard`：`data-testid="pet-sprite"`（有精灵图时 `<img>`）、`data-testid="growth-bar"`、星星/进度、任务卡 `data-testid="task-{id}"`。今日日期用本地日期字符串。

> **周条范围说明（对 spec §5.3 的 MVP 简化，非静默丢弃）**：本 task 只做**今日看板**（今日为主，符合 spec「今日为主」）。原型的 7 日周条（今日高亮/过去可点/未来锁定）作为 **fast-follow** 后续单独加：需按日多拉 `usePlayBoard`（仅 `date ≤ today`，避免 `EnsureDay` 预生成未来任务）+ 日期选择态。已登记，不阻塞核心闭环。

- [ ] **Step 1: 写失败测试 `petStage.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { currentForm, growthRatio } from './petStage'
import type { PetSpeciesDto, JourneyDto } from '@/types/homework'

const species = {
  id: 'p1', name: '火龙', code: 'dragon', isActive: true, displayOrder: 0,
  forms: [
    { level: 1, name: '龙蛋', growthToNext: 36, scale: 0.48 },
    { level: 2, name: '破壳萌龙', growthToNext: 60, scale: 0.72 },
    { level: 5, name: '喷火成龙', growthToNext: null, scale: 1.62 },
  ],
} as unknown as PetSpeciesDto

describe('petStage', () => {
  it('currentForm returns the matching level form', () => {
    expect(currentForm(species, 2)?.name).toBe('破壳萌龙')
    expect(currentForm(species, 9)).toBeUndefined()
  })
  it('growthRatio clamps to 0..1 and returns 1 when no threshold', () => {
    expect(growthRatio({ growthPoints: 18 } as JourneyDto, { growthToNext: 36 } as never)).toBeCloseTo(0.5)
    expect(growthRatio({ growthPoints: 100 } as JourneyDto, { growthToNext: 36 } as never)).toBe(1)
    expect(growthRatio({ growthPoints: 10 } as JourneyDto, { growthToNext: null } as never)).toBe(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/petStage.test.ts`
Expected: FAIL。

- [ ] **Step 3: 写 `petStage.ts`**

```ts
import type { PetSpeciesDto, PetFormDto, JourneyDto } from '@/types/homework'

export function currentForm(species: PetSpeciesDto | undefined, level: number): PetFormDto | undefined {
  return species?.forms.find((f) => f.level === level)
}

export function growthRatio(journey: Pick<JourneyDto, 'growthPoints'>, form: Pick<PetFormDto, 'growthToNext'> | undefined): number {
  const threshold = form?.growthToNext
  if (!threshold || threshold <= 0) return 1
  return Math.max(0, Math.min(1, journey.growthPoints / threshold))
}
```

- [ ] **Step 4: 写失败测试 `DailyBoard.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getPlayDailyBoard = vi.fn()
vi.mock('@/services/playService', () => ({ getPlayDailyBoard: (...a: unknown[]) => getPlayDailyBoard(...a) }))
vi.mock('@/services/homeworkService', () => ({
  listActivePetSpecies: vi.fn().mockResolvedValue([
    { id: 'p1', name: '火龙', code: 'dragon', forms: [{ level: 2, name: '破壳萌龙', spriteUrl: 'http://x/2.png', growthToNext: 60, scale: 0.72 }] },
  ]),
}))
import { DailyBoard } from './DailyBoard'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
const journey = { id: 'j1', childId: 'c1', status: 1, petSpeciesId: 'p1', currentLevel: 2, growthPoints: 30 } as never
beforeEach(() => {
  vi.clearAllMocks()
  getPlayDailyBoard.mockResolvedValue({
    childId: 'c1', date: '2026-07-14',
    tasks: [{ id: 't1', title: '口算 20 分钟', subject: 'math', order: 0, isCompleted: false, countsAsCompleted: false, rewardItemId: 'r1' }],
    tasksTotal: 1, tasksCompleted: 0, stars: 0, isFull: false, isRestDay: false,
  })
})

describe('DailyBoard', () => {
  it('renders pet sprite, growth bar and today tasks', async () => {
    ui(<DailyBoard childId="c1" journey={journey} />)
    await waitFor(() => expect(screen.getByTestId('task-t1')).toBeInTheDocument())
    expect(screen.getByTestId('pet-sprite')).toBeInTheDocument()
    expect(screen.getByTestId('growth-bar')).toBeInTheDocument()
    expect(screen.getByText('口算 20 分钟')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/DailyBoard.test.tsx`
Expected: FAIL（占位）。

- [ ] **Step 6: 实体化 `DailyBoard.tsx`**

```tsx
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayBoard, useActivePetSpecies } from '@/hooks/usePlay'
import { currentForm, growthRatio } from './petStage'
import type { JourneyDto } from '@/types/homework'

// 本地日期 YYYY-MM-DD（不带时区）
function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function DailyBoard({ childId, journey }: { childId: string; journey: JourneyDto }) {
  const { t } = useTranslation()
  const date = useMemo(todayStr, [])
  const board = usePlayBoard(childId, date)
  const species = useActivePetSpecies()

  const mySpecies = (species.data ?? []).find((s) => s.id === journey.petSpeciesId)
  const form = currentForm(mySpecies, journey.currentLevel)
  const ratio = growthRatio(journey, form)

  return (
    <div className="kid-board">
      {/* 宠物舞台 */}
      <section className="kid-stage">
        {form?.spriteUrl ? (
          <img
            data-testid="pet-sprite"
            className="kid-pet"
            src={form.spriteUrl}
            alt={form.name}
            style={{ transform: `scale(${form.scale ?? 1})` }}
          />
        ) : (
          <div data-testid="pet-sprite" className="kid-pet kid-pet-fallback">🥚</div>
        )}
        <div className="kid-growth">
          <div data-testid="growth-bar" className="kid-growth-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <div className="kid-growth-label">{t('play.growth')} {journey.growthPoints}{form?.growthToNext ? ` / ${form.growthToNext}` : ''}</div>
      </section>

      {/* 状态条 */}
      <section className="kid-stats">
        <span>⭐ {t('play.stars')}：{board.data?.stars ?? 0}</span>
        <span>📈 {t('play.progress')}：{board.data?.tasksCompleted ?? 0}/{board.data?.tasksTotal ?? 0}</span>
      </section>

      {/* 任务列表（完成接线在 Task 11 加，本 task 仅渲染） */}
      <section className="kid-tasks">
        {board.isLoading ? (
          <div className="kid-center">{t('play.loading')}</div>
        ) : board.data?.isRestDay ? (
          <div className="kid-rest">{t('play.restDay')}</div>
        ) : (
          board.data?.tasks.map((task) => (
            <div key={task.id} data-testid={`task-${task.id}`} className={`kid-task ${task.countsAsCompleted ? 'is-done' : ''}`}>
              <div className="kid-task-main">
                <div className="kid-task-title">{task.title}</div>
                {task.subject && <div className="kid-task-subject">{task.subject}</div>}
              </div>
              <span className="kid-task-state">{task.countsAsCompleted ? t('play.done') : t('play.goComplete')}</span>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
```
`kid.css` 追加（结构性最小样式；沉浸细节可对照原型 `child-homepage.html` 的 `.pet-stage`/`.growth`/`.task` 段）：
```css
.kid-board { max-width: 640px; margin: 0 auto; padding: 56px 16px 32px; display: flex; flex-direction: column; gap: 20px; }
.kid-stage { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.kid-pet { width: 180px; height: 180px; object-fit: contain; transition: transform .3s; }
.kid-pet-fallback { display: grid; place-items: center; font-size: 5rem; }
.kid-growth { width: 240px; height: 14px; border-radius: 999px; background: rgba(255,255,255,0.6); overflow: hidden; }
.kid-growth-fill { height: 100%; background: linear-gradient(90deg,#ffca5f,#ff8a3d); transition: width .4s; }
.kid-growth-label { font-size: .85rem; color: #7a4a1e; }
.kid-stats { display: flex; justify-content: center; gap: 20px; font-weight: 700; color: #7a4a1e; }
.kid-tasks { display: flex; flex-direction: column; gap: 10px; }
.kid-task { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,0.85); }
.kid-task.is-done { opacity: .6; }
.kid-task-title { font-weight: 700; color: #4a2e12; }
.kid-task-subject { font-size: .8rem; color: #a0714a; }
.kid-task-state { font-size: .85rem; font-weight: 700; color: #ff7a37; }
.kid-rest { text-align: center; padding: 24px; color: #7a4a1e; }
```

- [ ] **Step 7: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/features/play/petStage.test.ts src/features/play/DailyBoard.test.tsx && npm run typecheck`
Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/DailyBoard.test.tsx frontend/parent-web/src/features/play/petStage.ts frontend/parent-web/src/features/play/petStage.test.ts frontend/parent-web/src/features/play/kid.css
git commit -m "feat(play): 每日看板 DailyBoard(宠物舞台+成长条+星星/进度+任务列表)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 完成/取消任务接线

在 `DailyBoard` 的任务卡上接 `complete`/`uncomplete`，完成后奖励入背包（后端幂等），toast「获得 XX」。

**Files:**
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`
- Test: `frontend/parent-web/src/features/play/DailyBoard.complete.test.tsx`

**Interfaces:**
- Consumes: `usePlayMutations(childId, journey.id)`（`complete`/`uncomplete`）、`sonner.toast`、任务的 `rewardItemId`（用于 toast 文案，可从 board 任务取名——本 task 简化为通用「获得奖励」，具体道具名在背包体现）。
- Produces: 未完成任务点「去完成」→ `complete.mutate(taskId)`；已完成点一下 → `uncomplete.mutate(taskId)`。按钮 `data-testid="task-toggle-{id}"`。

- [ ] **Step 1: 写失败测试 `DailyBoard.complete.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const completeTask = vi.fn().mockResolvedValue({ id: 't1', countsAsCompleted: true })
const uncompleteTask = vi.fn().mockResolvedValue({ id: 't1', countsAsCompleted: false })
const getPlayDailyBoard = vi.fn()
vi.mock('@/services/playService', () => ({
  getPlayDailyBoard: (...a: unknown[]) => getPlayDailyBoard(...a),
  completeTask: (...a: unknown[]) => completeTask(...a),
  uncompleteTask: (...a: unknown[]) => uncompleteTask(...a),
}))
vi.mock('@/services/homeworkService', () => ({ listActivePetSpecies: vi.fn().mockResolvedValue([]) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { DailyBoard } from './DailyBoard'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
const journey = { id: 'j1', childId: 'c1', status: 1, petSpeciesId: null, currentLevel: 1, growthPoints: 0 } as never
beforeEach(() => {
  vi.clearAllMocks()
  getPlayDailyBoard.mockResolvedValue({
    childId: 'c1', date: '2026-07-14',
    tasks: [{ id: 't1', title: '口算', order: 0, isCompleted: false, countsAsCompleted: false, rewardItemId: 'r1' }],
    tasksTotal: 1, tasksCompleted: 0, stars: 0, isFull: false, isRestDay: false,
  })
})

describe('DailyBoard complete', () => {
  it('completing a task calls completeTask', async () => {
    ui(<DailyBoard childId="c1" journey={journey} />)
    await waitFor(() => expect(screen.getByTestId('task-toggle-t1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('task-toggle-t1'))
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith('c1', 't1'))
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/DailyBoard.complete.test.tsx`
Expected: FAIL（无 toggle 按钮）。

- [ ] **Step 3: 在 `DailyBoard.tsx` 接完成/取消**

顶部加 import：
```tsx
import { usePlayMutations } from '@/hooks/usePlay'
import { toast } from 'sonner'
```
组件内加：
```tsx
  const { complete, uncomplete } = usePlayMutations(childId, journey.id)

  const toggleTask = (taskId: string, done: boolean) => {
    if (done) {
      uncomplete.mutate(taskId)
    } else {
      complete.mutate(taskId, { onSuccess: () => toast.success(t('play.rewardEarned', { name: t('play.feed') })) })
    }
  }
```
把任务卡的 `<span className="kid-task-state">…</span>` 替换为按钮：
```tsx
              <button
                type="button"
                data-testid={`task-toggle-${task.id}`}
                className="kid-task-state"
                disabled={complete.isPending || uncomplete.isPending}
                onClick={() => toggleTask(task.id, task.countsAsCompleted)}
              >
                {task.countsAsCompleted ? t('play.done') : t('play.goComplete')}
              </button>
```
> 备注：toast「获得 XX」文案的道具名，MVP 暂用通用词（具体道具在背包/喂养体现）；如需精确道具名，可后续从 `listActiveRewardItems` 建 id→name 映射。此简化不阻塞。

- [ ] **Step 4: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/features/play/DailyBoard.complete.test.tsx src/features/play/DailyBoard.test.tsx && npm run typecheck`
Expected: PASS（原 DailyBoard.test 仍绿）。

- [ ] **Step 5: Commit**

```bash
git add frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/DailyBoard.complete.test.tsx
git commit -m "feat(play): 每日看板完成/取消任务接线(奖励入背包)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: `Backpack` 持久背包

**Files:**
- Create: `frontend/parent-web/src/features/play/Backpack.tsx`
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`（挂入背包区，供喂养入口）
- Test: `frontend/parent-web/src/features/play/Backpack.test.tsx`

**Interfaces:**
- Consumes: `useBackpack(childId, journeyId)`、`BackpackItemDto`。
- Produces: `Backpack`（props `{ childId, journeyId, onFeed?: (item: BackpackItemDto) => void }`），渲染道具卡（图标/glyph + 数量 + 成长值），`data-testid="backpack-item-{rewardItemId}"`；空态用 `play.backpackEmpty`。点道具触发 `onFeed`（喂养在 Task 13 接）。

- [ ] **Step 1: 写失败测试 `Backpack.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getBackpack = vi.fn()
vi.mock('@/services/playService', () => ({ getBackpack: (...a: unknown[]) => getBackpack(...a) }))
import { Backpack } from './Backpack'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('Backpack', () => {
  it('renders items and calls onFeed on click', async () => {
    getBackpack.mockResolvedValue([{ rewardItemId: 'r1', name: '能量果实', glyph: '🍎', quantity: 3, growthValue: 15 }])
    const onFeed = vi.fn()
    ui(<Backpack childId="c1" journeyId="j1" onFeed={onFeed} />)
    await waitFor(() => expect(screen.getByTestId('backpack-item-r1')).toBeInTheDocument())
    expect(screen.getByText('能量果实')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('backpack-item-r1'))
    expect(onFeed).toHaveBeenCalledWith(expect.objectContaining({ rewardItemId: 'r1' }))
  })
  it('shows empty state', async () => {
    getBackpack.mockResolvedValue([])
    ui(<Backpack childId="c1" journeyId="j1" />)
    await waitFor(() => expect(screen.getByTestId('backpack-empty')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/Backpack.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 写 `Backpack.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { useBackpack } from '@/hooks/usePlay'
import type { BackpackItemDto } from '@/types/homework'

export function Backpack({ childId, journeyId, onFeed }: { childId: string; journeyId: string; onFeed?: (item: BackpackItemDto) => void }) {
  const { t } = useTranslation()
  const { data: items = [], isLoading } = useBackpack(childId, journeyId)

  if (isLoading) return <div className="kid-center">{t('play.loading')}</div>
  if (items.length === 0) return <div data-testid="backpack-empty" className="kid-rest">{t('play.backpackEmpty')}</div>

  return (
    <div className="kid-backpack">
      <h2 className="kid-backpack-title">{t('play.backpackTitle')}</h2>
      <div className="kid-backpack-grid">
        {items.map((it) => (
          <button
            key={it.rewardItemId}
            type="button"
            data-testid={`backpack-item-${it.rewardItemId}`}
            className="kid-backpack-item"
            onClick={() => onFeed?.(it)}
          >
            {it.iconUrl ? <img className="kid-backpack-icon" src={it.iconUrl} alt={it.name} /> : <span className="kid-backpack-glyph">{it.glyph ?? '🎁'}</span>}
            <span className="kid-backpack-name">{it.name}</span>
            <span className="kid-backpack-qty">×{it.quantity}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```
`kid.css` 追加：
```css
.kid-backpack { display: flex; flex-direction: column; gap: 10px; }
.kid-backpack-title { font-weight: 800; color: #7a4a1e; }
.kid-backpack-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.kid-backpack-item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 14px; border: none; border-radius: 14px; background: rgba(255,255,255,0.85); cursor: pointer; }
.kid-backpack-icon { width: 40px; height: 40px; object-fit: contain; }
.kid-backpack-glyph { font-size: 2rem; }
.kid-backpack-name { font-size: .8rem; color: #4a2e12; }
.kid-backpack-qty { font-size: .75rem; font-weight: 700; color: #ff7a37; }
```

- [ ] **Step 4: 在 `DailyBoard.tsx` 挂入背包区（喂养入口占位）**

`DailyBoard.tsx` import 加 `import { Backpack } from './Backpack'`，在任务列表 `</section>` 之后加：
```tsx
      {journey.petSpeciesId && (
        <Backpack childId={childId} journeyId={journey.id} />
      )}
```
（`onFeed` 在 Task 13 接喂养；此处先挂空。）

- [ ] **Step 5: 补齐既有 DailyBoard 测试的 `getBackpack` mock**

看板现在挂了 `<Backpack>`（`journey.petSpeciesId` 真时），其 `useBackpack` 查询在**挂载即触发** `getBackpack`。给 `src/features/play/DailyBoard.test.tsx` 与 `src/features/play/DailyBoard.complete.test.tsx` 的 `vi.mock('@/services/playService', () => ({ ... }))` 各补一行，避免渲染时 `getBackpack` 未定义报错：
```ts
  getBackpack: vi.fn().mockResolvedValue([]),
```
（`DailyBoard.test.tsx` 的 journey 有 `petSpeciesId: 'p1'` → 背包会挂载；`DailyBoard.complete.test.tsx` 的 journey `petSpeciesId: null` → 背包不挂载，但补上 mock 无害且防未来改动。）

- [ ] **Step 6: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/features/play/Backpack.test.tsx src/features/play/DailyBoard.test.tsx src/features/play/DailyBoard.complete.test.tsx && npm run typecheck`
Expected: PASS（既有看板测试仍绿）。

- [ ] **Step 7: Commit**

```bash
git add frontend/parent-web/src/features/play/Backpack.tsx frontend/parent-web/src/features/play/Backpack.test.tsx frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/DailyBoard.test.tsx frontend/parent-web/src/features/play/DailyBoard.complete.test.tsx frontend/parent-web/src/features/play/kid.css
git commit -m "feat(play): 持久背包 Backpack + 挂入看板

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: `FeedPanel` 喂养 + `EvolutionCutscene` 进化过场/满级庆祝

点背包道具喂养 → `Feed`（一次一个）→ 用返回更新成长；`evolved` → 进化过场（视频优先 + CSS 兜底 + reveal）；`completed` → 满级庆祝。

**Files:**
- Create: `frontend/parent-web/src/features/play/EvolutionCutscene.tsx`
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`（接 `onFeed` → `feed` mutation → 触发过场）
- Test: `frontend/parent-web/src/features/play/EvolutionCutscene.test.tsx`
- Test: `frontend/parent-web/src/features/play/DailyBoard.feed.test.tsx`

**Interfaces:**
- Consumes: `usePlayMutations(childId, journey.id).feed`、`FeedResultDto`、`BackpackItemDto`。
- Produces:
  - `EvolutionCutscene`（props `{ result: FeedResultDto; onClose: () => void }`）：`evolved && evolveVideoUrl` → `<video data-testid="evo-video">` + reveal 文案；`evolved && !evolveVideoUrl` → CSS 兜底 `data-testid="evo-css"` + reveal；`completed` → `data-testid="evo-completed"` 满级庆祝。有 `data-testid="evo-close"`。
  - `DailyBoard`：背包 `onFeed(item)` → `feed.mutate({childId, journeyId, rewardItemId})`，成功后若 `evolved||completed` 打开 `EvolutionCutscene`。

- [ ] **Step 1: 写失败测试 `EvolutionCutscene.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EvolutionCutscene } from './EvolutionCutscene'
import type { FeedResultDto } from '@/types/homework'

const base: FeedResultDto = { evolved: false, newLevel: 2, completed: false, currentLevel: 2, growthPoints: 0, revealText: '裂壳光爆', evolveVideoUrl: null }

describe('EvolutionCutscene', () => {
  it('evolved with video → renders video + reveal', () => {
    render(<EvolutionCutscene result={{ ...base, evolved: true, evolveVideoUrl: 'http://x/e.mp4' }} onClose={vi.fn()} />)
    expect(screen.getByTestId('evo-video')).toBeInTheDocument()
    expect(screen.getByText('裂壳光爆')).toBeInTheDocument()
  })
  it('evolved without video → CSS fallback', () => {
    render(<EvolutionCutscene result={{ ...base, evolved: true, evolveVideoUrl: null }} onClose={vi.fn()} />)
    expect(screen.getByTestId('evo-css')).toBeInTheDocument()
  })
  it('completed → celebration + close', () => {
    const onClose = vi.fn()
    render(<EvolutionCutscene result={{ ...base, evolved: true, completed: true, newLevel: 5 }} onClose={onClose} />)
    expect(screen.getByTestId('evo-completed')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('evo-close'))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/EvolutionCutscene.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 写 `EvolutionCutscene.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import type { FeedResultDto } from '@/types/homework'

// 视频优先 + CSS 兜底 + reveal；满级庆祝。动画细节可对照原型
// child-homepage.html 的 playEvolutionCutscene(4581-4646) / playEvolutionCss(4648-4698)。
export function EvolutionCutscene({ result, onClose }: { result: FeedResultDto; onClose: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="kid-evo" role="dialog" aria-modal="true">
      {result.completed ? (
        <div data-testid="evo-completed" className="kid-evo-card">
          <div className="kid-evo-emoji">🏅</div>
          <h1>{t('play.completedTitle')}</h1>
          <p>{t('play.completedBody')}</p>
        </div>
      ) : result.evolveVideoUrl ? (
        <div className="kid-evo-card">
          <video data-testid="evo-video" className="kid-evo-video" src={result.evolveVideoUrl} autoPlay muted playsInline onEnded={onClose} />
          <div className="kid-evo-reveal">{result.revealText ?? t('play.evolveReveal')}</div>
        </div>
      ) : (
        <div data-testid="evo-css" className="kid-evo-card kid-evo-flash">
          <div className="kid-evo-emoji">✨</div>
          <h1>{t('play.evolveReveal')}</h1>
          <div className="kid-evo-reveal">{result.revealText ?? ''}</div>
        </div>
      )}
      <button type="button" data-testid="evo-close" className="kid-evo-close" onClick={onClose}>
        {result.completed ? t('play.done') : t('play.skip')}
      </button>
    </div>
  )
}
```
`kid.css` 追加：
```css
.kid-evo { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; gap: 16px; background: rgba(20,10,0,0.72); }
.kid-evo-card { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #fff; text-align: center; padding: 24px; }
.kid-evo-video { width: min(90vw, 480px); border-radius: 16px; }
.kid-evo-emoji { font-size: 4rem; }
.kid-evo-reveal { font-size: 1.1rem; font-weight: 700; }
.kid-evo-flash { animation: kidEvoFlash 1.2s ease-in-out; }
@keyframes kidEvoFlash { 0%,100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.15); filter: brightness(1.8); } }
.kid-evo-close { padding: 8px 20px; border: none; border-radius: 999px; background: #fff; color: #7a4a1e; font-weight: 700; cursor: pointer; }
```

- [ ] **Step 4: 写失败测试 `DailyBoard.feed.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const feed = vi.fn()
const getBackpack = vi.fn().mockResolvedValue([{ rewardItemId: 'r1', name: '果实', glyph: '🍎', quantity: 2, growthValue: 15 }])
const getPlayDailyBoard = vi.fn().mockResolvedValue({ childId: 'c1', date: '2026-07-14', tasks: [], tasksTotal: 0, tasksCompleted: 0, stars: 0, isFull: false, isRestDay: true })
vi.mock('@/services/playService', () => ({
  feed: (...a: unknown[]) => feed(...a),
  getBackpack: (...a: unknown[]) => getBackpack(...a),
  getPlayDailyBoard: (...a: unknown[]) => getPlayDailyBoard(...a),
}))
vi.mock('@/services/homeworkService', () => ({ listActivePetSpecies: vi.fn().mockResolvedValue([]) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { DailyBoard } from './DailyBoard'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}
const journey = { id: 'j1', childId: 'c1', status: 1, petSpeciesId: 'p1', currentLevel: 1, growthPoints: 0 } as never
beforeEach(() => vi.clearAllMocks())

describe('DailyBoard feed', () => {
  it('feeding calls feed and shows cutscene on evolve', async () => {
    feed.mockResolvedValue({ evolved: true, newLevel: 2, completed: false, currentLevel: 2, growthPoints: 3, revealText: '裂壳', evolveVideoUrl: null })
    ui(<DailyBoard childId="c1" journey={journey} />)
    await waitFor(() => expect(screen.getByTestId('backpack-item-r1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('backpack-item-r1'))
    await waitFor(() => expect(feed).toHaveBeenCalledWith({ childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' }))
    await waitFor(() => expect(screen.getByTestId('evo-css')).toBeInTheDocument())
  })
})
```

- [ ] **Step 5: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/DailyBoard.feed.test.tsx`
Expected: FAIL（背包未接 onFeed / 无过场）。

- [ ] **Step 6: 在 `DailyBoard.tsx` 接喂养 + 过场**

import 加：
```tsx
import { useState } from 'react'
import { EvolutionCutscene } from './EvolutionCutscene'
import type { FeedResultDto, BackpackItemDto } from '@/types/homework'
```
组件内加：
```tsx
  const { complete, uncomplete, feed } = usePlayMutations(childId, journey.id)  // 合并原 Task 11 的解构
  const [cutscene, setCutscene] = useState<FeedResultDto | null>(null)

  const onFeed = (item: BackpackItemDto) => {
    feed.mutate(
      { childId, journeyId: journey.id, rewardItemId: item.rewardItemId },
      { onSuccess: (r) => { if (r.evolved || r.completed) setCutscene(r) } },
    )
  }
```
> 注意：Task 11 已解构 `const { complete, uncomplete } = usePlayMutations(...)`——把它改为上面这行合并出 `feed`（勿重复声明）。

把 Task 12 挂的 `<Backpack .../>` 改为传 `onFeed`：
```tsx
      {journey.petSpeciesId && (
        <Backpack childId={childId} journeyId={journey.id} onFeed={onFeed} />
      )}
      {cutscene && <EvolutionCutscene result={cutscene} onClose={() => setCutscene(null)} />}
```

- [ ] **Step 7: 跑测试 + typecheck**

Run: `cd frontend/parent-web && npx vitest run src/features/play/EvolutionCutscene.test.tsx src/features/play/DailyBoard.feed.test.tsx src/features/play/DailyBoard.test.tsx src/features/play/DailyBoard.complete.test.tsx && npm run typecheck`
Expected: PASS（全部既有 DailyBoard 测试仍绿）。

- [ ] **Step 8: Commit**

```bash
git add frontend/parent-web/src/features/play/EvolutionCutscene.tsx frontend/parent-web/src/features/play/EvolutionCutscene.test.tsx frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/DailyBoard.feed.test.tsx frontend/parent-web/src/features/play/kid.css
git commit -m "feat(play): 喂养接线 + 进化过场/满级庆祝 EvolutionCutscene(视频优先+CSS兜底)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: `Collection` 收藏/勋章墙

已完成旅程（满级宠物终态 + 勋章）。从看板提供入口（满级庆祝「去看看」或看板角标），并可直达路由。

**Files:**
- Create: `frontend/parent-web/src/features/play/Collection.tsx`
- Modify: `frontend/parent-web/src/App.tsx`（加 `/play/:childId/collection` 路由）
- Modify: `frontend/parent-web/src/features/play/DailyBoard.tsx`（加收藏入口链接）
- Test: `frontend/parent-web/src/features/play/Collection.test.tsx`

**Interfaces:**
- Consumes: `useCollection(childId)`、`useParams`、`CollectionEntryDto`。
- Produces: `Collection` 渲染完成旅程卡（`petFinalSpriteUrl` + `medalImageUrl`/名 + 完成日），`data-testid="collection-entry-{journeyId}"`；空态 `play.collectionEmpty`。看板加 `data-testid="open-collection"` 链接到 `/play/:childId/collection`。

- [ ] **Step 1: 写失败测试 `Collection.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const getCollection = vi.fn()
vi.mock('@/services/playService', () => ({ getCollection: (...a: unknown[]) => getCollection(...a) }))
import { Collection } from './Collection'

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/play/c1/collection']}>
        <Routes><Route path="/play/:childId/collection" element={node} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('Collection', () => {
  it('renders completed entries', async () => {
    getCollection.mockResolvedValue([{ journeyId: 'j1', title: '暑假之旅', petSpeciesId: 'p1', petName: '火龙', petFinalSpriteUrl: 'http://x/5.png', medalId: 'm1', medalName: '毕业勋章', medalImageUrl: null, completedTime: '2026-08-31T00:00:00Z' }])
    ui(<Collection />)
    await waitFor(() => expect(screen.getByTestId('collection-entry-j1')).toBeInTheDocument())
    expect(screen.getByText('毕业勋章')).toBeInTheDocument()
  })
  it('shows empty state', async () => {
    getCollection.mockResolvedValue([])
    ui(<Collection />)
    await waitFor(() => expect(screen.getByTestId('collection-empty')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend/parent-web && npx vitest run src/features/play/Collection.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 写 `Collection.tsx`**

```tsx
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCollection } from '@/hooks/usePlay'

export function Collection() {
  const { t } = useTranslation()
  const { childId = '' } = useParams()
  const { data: entries = [], isLoading } = useCollection(childId)

  if (isLoading) return <div className="kid-center">{t('play.loading')}</div>

  return (
    <div className="kid-board">
      <h1 className="kid-pick-title">{t('play.collectionTitle')}</h1>
      {entries.length === 0 ? (
        <div data-testid="collection-empty" className="kid-rest">{t('play.collectionEmpty')}</div>
      ) : (
        <div className="kid-collection-grid">
          {entries.map((e) => (
            <div key={e.journeyId} data-testid={`collection-entry-${e.journeyId}`} className="kid-collection-card">
              {e.petFinalSpriteUrl && <img className="kid-collection-pet" src={e.petFinalSpriteUrl} alt={e.petName} />}
              <div className="kid-collection-title">{e.title}</div>
              <div className="kid-collection-medal">
                {e.medalImageUrl ? <img className="kid-collection-medal-img" src={e.medalImageUrl} alt={e.medalName} /> : <span>🏅</span>}
                <span>{e.medalName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```
`kid.css` 追加：
```css
.kid-collection-grid { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
.kid-collection-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px; border-radius: 18px; background: rgba(255,255,255,0.88); width: 160px; }
.kid-collection-pet { width: 100px; height: 100px; object-fit: contain; }
.kid-collection-title { font-weight: 700; color: #4a2e12; }
.kid-collection-medal { display: flex; align-items: center; gap: 6px; font-size: .85rem; color: #7a4a1e; }
.kid-collection-medal-img { width: 28px; height: 28px; object-fit: contain; }
```

- [ ] **Step 4: 加路由 + 看板入口**

`App.tsx` 加 import `import { Collection } from '@/features/play/Collection'`，在 `/play/:childId` 路由后加：
```tsx
          <Route path="/play/:childId/collection" element={<Collection />} />
```
`DailyBoard.tsx` import 加 `import { Link } from 'react-router-dom'`，在 `.kid-stats` 区后加收藏入口：
```tsx
      <Link data-testid="open-collection" className="kid-collection-link" to={`/play/${childId}/collection`}>
        🏆 {t('play.collectionTitle')}
      </Link>
```
`kid.css` 追加：`.kid-collection-link { align-self: center; color: #7a4a1e; font-weight: 700; text-decoration: none; }`

- [ ] **Step 5: 跑测试 + 全量 vitest + build**

Run: `cd frontend/parent-web && npx vitest run src/features/play/Collection.test.tsx && npm run test && npm run build`
Expected: 全绿（含 `locales.test`、既有全部测试、`tsc -b && vite build` 成功）。

- [ ] **Step 6: Commit**

```bash
git add frontend/parent-web/src/features/play/Collection.tsx frontend/parent-web/src/features/play/Collection.test.tsx frontend/parent-web/src/App.tsx frontend/parent-web/src/features/play/DailyBoard.tsx frontend/parent-web/src/features/play/kid.css
git commit -m "feat(play): 收藏/勋章墙 Collection + 路由 + 看板入口

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> **可选 stretch — `PetCodex` 进化图鉴**：移植原型「伙伴图鉴」（`child-homepage.html` renderEvolutionRail 4291），从当前物种 `forms[]` 渲染 5 形态阶梯（精灵图 + 名 + reveal 揭示态）。数据来自 `useActivePetSpecies` + `journey.petSpeciesId`，无新后端。可作为看板一个弹窗入口。非阻塞，可后续单独加。

---

## 附：端到端联调清单（全部任务后，人工）

1. `dotnet run --project backend/src/Homework.DbMigrator`（建库 + 基础/样例种子）。
2. `dotnet run --project backend/src/Homework.HttpApi.Host`（Development；日志见 PlayDemoSeeder 种入 2 物种 + 哥哥 Draft 旅程）。
3. `cd frontend/parent-web && npm run dev`，用 `demo`/`1q2w3E*` 登录。
4. 「孩子」页 → 哥哥卡片「进入乐园」（或 nav「孩子模式」→ 选哥哥）。
5. 选宠（火龙/光之英雄，封面图应真实显示）→ 开始 → 每日看板出任务。
6. 完成任务 → 背包出道具 → 喂养 → 成长条涨 → 攒够进化播过场（火龙/光之英雄有 MP4）。
7. 反复喂到满级 → 满级庆祝 → 收藏墙出现该完成旅程（终态宠物 + 勋章）。
8. 核对 play 路由参数绑定（若 complete/uncomplete 的 Guid 非 query 绑定，回 Task 3 `playService.ts` 调整）。
