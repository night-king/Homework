# Phase 3 — 家长后台 UI Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (if subagents available) or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. TDD-heavy — write the failing test first (`@superpowers:test-driven-development`). ABP patterns: `@abp82`. Localization hygiene: `@abp-localization-fix`. Final smoke: `@superpowers:verification-before-completion` / `@run`.

**Goal:** 在 Phase 2 领域引擎之上，构建家长后台（parent admin）的四项应用服务 + zh-Hans 优先的 Razor Pages UI：孩子档案、每周任务模板、当日任务（含复核/撤销→重结算）、家庭大目标，全部受单一 `Homework.ParentAdmin` 权限门禁。

**Architecture:** ABP 10.5 MVC 单体，DDD 分层。每能力一个 AppService（contracts 在 `Application.Contracts`、实现在 `Application`），DTO↔实体用 Mapperly（`ObjectMapper.Map<>`），复用 Phase 2 领域引擎（新增单日结算原语 `SettleDayAsync`）。UI 用 stock LeptonX Razor Pages（DataTables 列表 + ABP `abp.ModalManager` 弹窗）。应用服务集成测试跑在 `Homework.EntityFrameworkCore.Tests`（SQLite in-memory，与 Phase 2 同套）。

**Tech Stack:** ABP 10.5 · .NET 10 · PostgreSQL/Npgsql · EF Core 10 · Mapperly（`Volo.Abp.Mapperly`）· Razor Pages + LeptonX-Lite · DataTables · xUnit/Shouldly · SQLite in-memory（测试）

**Spec:** `docs/superpowers/specs/2026-07-04-phase3-parent-admin-design.md`（依赖 `2026-07-04-kids-homework-pet-game-design.md` §3/§4/§5/§9）

---

## File Structure（决策锁定）

**Domain（改动）**
- Modify `src/Homework.Domain/Tasks/DailyTaskGenerator.cs` — 抽出 `public SettleDayAsync(childId, date)`，`SettlePastDaysAsync` 改为循环调用它。
- Modify `src/Homework.Domain/Tasks/DailyTask.cs` — 加 `SetSubject(string?)` / `SetOrder(int)`。

**Application.Contracts（新增）**
- Modify `Permissions/HomeworkPermissions.cs` — `ParentAdmin` 常量。
- Modify `Permissions/HomeworkPermissionDefinitionProvider.cs` — 定义权限。
- Create `Children/Dtos/*.cs`、`Children/IChildProfileAppService.cs`
- Create `Tasks/Dtos/*.cs`、`Tasks/IWeeklyTaskTemplateAppService.cs`、`Tasks/IDailyTaskAppService.cs`
- Create `Scoring/Dtos/*.cs`、`Scoring/IFamilyGoalAppService.cs`

**Application（新增）**
- Modify `HomeworkApplicationMappers.cs` — Mapperly 映射方法。
- Create `Children/ChildProfileAppService.cs`
- Create `Tasks/WeeklyTaskTemplateAppService.cs`、`Tasks/DailyTaskAppService.cs`
- Create `Scoring/FamilyGoalAppService.cs`
- Create `Data/ParentPermissionDataSeedContributor.cs` — 授予 admin `ParentAdmin`。

**Web（新增/改动）**
- Modify `Menus/HomeworkMenus.cs`、`Menus/HomeworkMenuContributor.cs` — 家长后台菜单组 + 4 项。
- Modify `HomeworkWebModule.cs` — zh-Hans 默认文化（`RequestLocalizationOptions`）。
- Create `Pages/ParentAdmin/Children/{Index,EditModal,SetPinModal}.cshtml(.cs)` + `index.js`
- Create `Pages/ParentAdmin/WeeklyTemplates/{Index,CreateModal,EditModal}.cshtml(.cs)` + `index.js`
- Create `Pages/ParentAdmin/DailyTasks/{Index,CreateModal,EditModal}.cshtml(.cs)` + `index.js`
- Create `Pages/ParentAdmin/FamilyGoals/{Index,CreateModal,EditModal}.cshtml(.cs)` + `index.js`

**Localization（改动）**
- Modify `src/Homework.Domain.Shared/Localization/Homework/zh-Hans.json`（主）、`en.json`（兜底）。

---

## Chunk 0: 地基（权限、领域原语、中文默认）

> 本 chunk 不含 UI；产出：权限就绪、领域原语有测试、应用默认中文。所有 Phase 2 测试须保持绿。

### Task 0.1: 定义 `ParentAdmin` 权限

**Files:**
- Modify: `src/Homework.Application.Contracts/Permissions/HomeworkPermissions.cs`
- Modify: `src/Homework.Application.Contracts/Permissions/HomeworkPermissionDefinitionProvider.cs`

- [ ] **Step 1: 加权限常量**

`HomeworkPermissions.cs`：
```csharp
namespace Homework.Permissions;

public static class HomeworkPermissions
{
    public const string GroupName = "Homework";

    /// <summary>家长后台总权限（单家庭单管理员，v1 只此一个）。</summary>
    public const string ParentAdmin = GroupName + ".ParentAdmin";
}
```

- [ ] **Step 2: 定义权限（带本地化名）**

`HomeworkPermissionDefinitionProvider.cs` 的 `Define`：
```csharp
public override void Define(IPermissionDefinitionContext context)
{
    var myGroup = context.AddGroup(HomeworkPermissions.GroupName, L("Permission:Homework"));
    myGroup.AddPermission(HomeworkPermissions.ParentAdmin, L("Permission:ParentAdmin"));
}
```

- [ ] **Step 3: 加本地化 key**（两处，见 Task 0.6 统一补；此处先加）

`zh-Hans.json` + `en.json` 的 `texts` 加：`"Permission:Homework"`、`"Permission:ParentAdmin"`（中：`"家长后台"`；英：`"Homework"` / `"Parent Admin"`）。

- [ ] **Step 4: 编译**

Run: `dotnet build src/Homework.Application.Contracts`
Expected: `Build succeeded`。

### Task 0.2: 授予 admin `ParentAdmin`（permission data seed）

**Files:**
- Create: `src/Homework.Application/Data/ParentPermissionDataSeedContributor.cs`

- [ ] **Step 1: 写幂等授权播种**

```csharp
using System.Threading.Tasks;
using Homework.Permissions;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Data;
using Volo.Abp.PermissionManagement;
using Volo.Abp.Identity;

namespace Homework.Data;

/// <summary>把家长后台权限授予内置 admin 角色，家长开箱即用（幂等）。</summary>
public class ParentPermissionDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IPermissionDataSeeder _permissionDataSeeder;

    public ParentPermissionDataSeedContributor(IPermissionDataSeeder permissionDataSeeder)
        => _permissionDataSeeder = permissionDataSeeder;

    public async Task SeedAsync(DataSeedContext context)
    {
        await _permissionDataSeeder.SeedAsync(
            RolePermissionValueProvider.ProviderName, // "R"
            "admin",                                   // 内置 admin 角色名
            new[] { HomeworkPermissions.ParentAdmin },
            context.TenantId
        );
    }
}
```

- [ ] **Step 2: 编译**

Run: `dotnet build src/Homework.Application`
Expected: `Build succeeded`。（授予效果在 Chunk 5 `dotnet run --project src/Homework.DbMigrator` 后于后台 admin 生效；此处不单测框架授权。）

### Task 0.3: 领域原语 `SettleDayAsync`（TDD，含"今天"）

**Files:**
- Modify: `src/Homework.Domain/Tasks/DailyTaskGenerator.cs`
- Test: `test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskGenerator_Tests.cs`

- [ ] **Step 1: 写失败测试——单日结算（复用已有 helper `SeedFedDayAsync`/`_dailyScoreRepository`）**

在 `DailyTaskGenerator_Tests` 追加：
```csharp
[Fact]
public async Task SettleDay_Settles_A_Single_Day_From_Its_DailyTasks()
{
    var childId = _guidGenerator.Create();
    var date = new DateOnly(2026, 7, 6);

    await WithUnitOfWorkAsync(async () =>
    {
        // 2 个任务，其一已完成 → C=1/N=2 → stars=ceil(1/2*5)=3、未吃饱
        var t1 = new DailyTask(_guidGenerator.Create(), childId, date, "语文", order: 0);
        t1.Complete(new DateTime(2026, 7, 6, 18, 0, 0));
        await _dailyTaskRepository.InsertAsync(t1);
        await _dailyTaskRepository.InsertAsync(new DailyTask(_guidGenerator.Create(), childId, date, "数学", order: 1));
    });

    await WithUnitOfWorkAsync(async () => await _generator.SettleDayAsync(childId, date));

    await WithUnitOfWorkAsync(async () =>
    {
        var score = await _dailyScoreRepository.GetAsync(s => s.ChildId == childId && s.Date == date);
        score.TasksTotal.ShouldBe(2);
        score.TasksCompleted.ShouldBe(1);
        score.Stars.ShouldBe(3);
        score.IsFull.ShouldBeFalse();
    });
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj --filter "FullyQualifiedName~SettleDay_Settles_A_Single_Day"`
Expected: 编译失败/红——`SettleDayAsync` 不存在。

- [ ] **Step 3: 抽出 `SettleDayAsync`，`SettlePastDaysAsync` 复用它**

在 `DailyTaskGenerator.cs`，把 `SettlePastDaysAsync` 循环体抽成公有方法：
```csharp
/// <summary>结算/刷新某孩子某一天的 DailyScore（含"今天"）。幂等。</summary>
public async Task SettleDayAsync(Guid childId, DateOnly date)
{
    var (total, completed) = await ResolveDayTotalsAsync(childId, date);

    var score = await _dailyScoreRepository.FindAsync(s => s.ChildId == childId && s.Date == date);
    if (score == null)
    {
        score = new DailyScore(GuidGenerator.Create(), childId, date);
        score.Settle(total, completed);
        await _dailyScoreRepository.InsertAsync(score);
    }
    else
    {
        score.Settle(total, completed);
        await _dailyScoreRepository.UpdateAsync(score);
    }
}

public async Task SettlePastDaysAsync(Guid childId, DateOnly fromDate, DateOnly toDate)
{
    for (var date = fromDate; date <= toDate; date = date.AddDays(1))
    {
        await SettleDayAsync(childId, date);
    }
}
```
（删除 `SettlePastDaysAsync` 原来的 find/insert/update 内联逻辑——它现在整体搬进 `SettleDayAsync`；`ResolveDayTotalsAsync` 保持不变。）

- [ ] **Step 4: 跑测试确认全绿（新 1 + 旧 5）**

Run: `dotnet test test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj --filter "FullyQualifiedName~DailyTaskGenerator_Tests"`
Expected: 绿——6 passed（新 SettleDay 1 + 原 EnsureDay/SettlePastDays 5）。

- [ ] **Step 5: 提交**

```bash
git add src/Homework.Domain/Tasks/DailyTaskGenerator.cs test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskGenerator_Tests.cs
git commit -m "refactor(tasks): extract SettleDayAsync single-day primitive (TDD)"
```

### Task 0.4: `DailyTask` 增 `SetSubject`/`SetOrder`（TDD）

**Files:**
- Modify: `src/Homework.Domain/Tasks/DailyTask.cs`
- Test: `test/Homework.Domain.Tests/Tasks/DailyTask_Tests.cs`（新建）

- [ ] **Step 1: 写失败测试**

```csharp
using System;
using Shouldly;
using Xunit;

namespace Homework.Tasks;

public class DailyTask_Tests
{
    private static DailyTask New() => new(Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 7, 6), "语文");

    [Fact]
    public void SetSubject_Updates_Subject()
        => New().SetSubject("数学").Subject.ShouldBe("数学");

    [Fact]
    public void SetOrder_Updates_Order()
        => New().SetOrder(3).Order.ShouldBe(3);

    [Fact]
    public void SetOrder_Negative_Throws()
        => Should.Throw<ArgumentException>(() => New().SetOrder(-1));
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `dotnet test test/Homework.Domain.Tests/Homework.Domain.Tests.csproj --filter "FullyQualifiedName~DailyTask_Tests"`
Expected: 红——方法不存在（`SetSubject`/`SetOrder` 未定义或返回类型不符）。

- [ ] **Step 3: 实现 mutator（与 `WeeklyTaskTemplateItem.SetOrder` 一致：负值抛错）**

`DailyTask.cs` 加：
```csharp
public DailyTask SetSubject(string? subject)
{
    Subject = subject;
    return this;
}

public DailyTask SetOrder(int order)
{
    if (order < 0)
    {
        throw new ArgumentException("order must be >= 0", nameof(order));
    }

    Order = order;
    return this;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `dotnet test test/Homework.Domain.Tests/Homework.Domain.Tests.csproj --filter "FullyQualifiedName~DailyTask_Tests"`
Expected: 绿——3 passed。

- [ ] **Step 5: 提交**

```bash
git add src/Homework.Domain/Tasks/DailyTask.cs test/Homework.Domain.Tests/Tasks/DailyTask_Tests.cs
git commit -m "feat(tasks): DailyTask SetSubject/SetOrder mutators (TDD)"
```

### Task 0.5: zh-Hans 默认文化

**Files:**
- Modify: `src/Homework.Web/HomeworkWebModule.cs`

- [ ] **Step 1: 设默认请求文化为 zh-Hans**

在 `HomeworkWebModule.ConfigureServices`（或已有的本地化配置附近）加：
```csharp
Configure<Microsoft.AspNetCore.Builder.RequestLocalizationOptions>(options =>
{
    options.SetDefaultCulture("zh-Hans");
});
```
说明：ABP `app.UseAbpRequestLocalization()` 已在中间件管线；`SetDefaultCulture` 让首次无 cookie/Accept-Language 时默认中文。LeptonX 语言切换保留。若模板未注册 zh-Hans 到支持语言列表，则在同处 `AbpLocalizationOptions.Languages` 里 `Add(new LanguageInfo("zh-Hans", "zh-Hans", "简体中文"))`（先查是否已存在，避免重复）。

- [ ] **Step 2: 冒烟——起服看默认中文**

Run: `dotnet run --project src/Homework.Web`（起后 Ctrl+C）
Expected: 首页默认显示简体中文（登录页/菜单中文）。此步为人工目视，Chunk 5 再统一验收。

- [ ] **Step 3: 提交**

```bash
git add src/Homework.Web/HomeworkWebModule.cs
git commit -m "feat(web): default UI culture to zh-Hans"
```

### Task 0.6: 权限本地化 key + 编译校验

**Files:**
- Modify: `src/Homework.Domain.Shared/Localization/Homework/zh-Hans.json`
- Modify: `src/Homework.Domain.Shared/Localization/Homework/en.json`

- [ ] **Step 1: 确认 Task 0.1 Step 3 的 key 已在两文件**（`Permission:Homework`、`Permission:ParentAdmin`，key 数一致，无空值——`@abp-localization-fix`）。
- [ ] **Step 2: 全量编译**

Run: `dotnet build Homework.sln`
Expected: `Build succeeded`，0 error。

- [ ] **Step 3: 提交**

```bash
git add src/Homework.Domain.Shared/Localization/Homework/*.json
git commit -m "chore(localization): parent-admin permission keys (zh-Hans/en)"
```

---

## Chunk 1: 孩子档案（ChildProfile）—— UI 全流程 exemplar

> 本 chunk 是**页面范式样板**：Chunk 2–4 的 Razor/JS 沿用此结构，只写差异。

### Task 1.1: DTO + 接口（contracts）

**Files:**
- Create: `src/Homework.Application.Contracts/Children/Dtos/ChildProfileDto.cs`
- Create: `src/Homework.Application.Contracts/Children/Dtos/UpdateChildProfileDto.cs`
- Create: `src/Homework.Application.Contracts/Children/Dtos/SetChildPinDto.cs`
- Create: `src/Homework.Application.Contracts/Children/IChildProfileAppService.cs`

- [ ] **Step 1: 写 DTO**

`ChildProfileDto.cs`：
```csharp
using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Children.Dtos;

public class ChildProfileDto : EntityDto<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public int Grade { get; set; }
    public string? AvatarKey { get; set; }
    public bool HasPin { get; set; }          // 不外泄 PIN 明文
    public Guid IdentityUserId { get; set; }
}
```
`UpdateChildProfileDto.cs`：
```csharp
using System.ComponentModel.DataAnnotations;
using Homework.Children; // GradeConsts

namespace Homework.Children.Dtos;

public class UpdateChildProfileDto
{
    [Required]
    [StringLength(32)]
    public string DisplayName { get; set; } = string.Empty;

    [Range(GradeConsts.Min, GradeConsts.Max)]
    public int Grade { get; set; }

    [StringLength(64)]
    public string? AvatarKey { get; set; }
}
```
`SetChildPinDto.cs`：
```csharp
using System.ComponentModel.DataAnnotations;

namespace Homework.Children.Dtos;

public class SetChildPinDto
{
    /// <summary>4 位数字；null/空 = 清除 PIN。</summary>
    [RegularExpression(@"^\d{4}$", ErrorMessage = "PIN must be 4 digits")]
    public string? Pin { get; set; }
}
```

- [ ] **Step 2: 写接口**

`IChildProfileAppService.cs`：
```csharp
using System;
using System.Threading.Tasks;
using Homework.Children.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Children;

public interface IChildProfileAppService : IApplicationService
{
    Task<ListResultDto<ChildProfileDto>> GetListAsync();
    Task<ChildProfileDto> GetAsync(Guid id);
    Task<ChildProfileDto> UpdateAsync(Guid id, UpdateChildProfileDto input);
    Task SetPinAsync(Guid id, SetChildPinDto input);
}
```

- [ ] **Step 3: 编译** — Run: `dotnet build src/Homework.Application.Contracts` → `Build succeeded`。

### Task 1.2: Mapperly 映射

**Files:**
- Modify: `src/Homework.Application/HomeworkApplicationMappers.cs`

- [ ] **Step 1: 加实体→DTO 映射（`HasPin` 忽略、由服务赋值）**

`HasPin` 是从 `Pin` 派生的布尔，Mapperly 无法（也不应）从 `string? Pin` 自动映射到 `bool HasPin`（名字、类型都不同）。因此**映射方法忽略 `HasPin`**，由服务的 `ToDto` 统一赋值（见 Task 1.3 Step 3）。同名属性（`Id`/`DisplayName`/`Grade`/`AvatarKey`/`IdentityUserId`）自动映射；源上多出的 `Pin` 无目标，Mapperly 默认不报错：
```csharp
using Homework.Children;
using Homework.Children.Dtos;
using Riok.Mapperly.Abstractions;
using Volo.Abp.Mapperly;

namespace Homework;

[Mapper]
public partial class HomeworkApplicationMappers
{
    [MapperIgnoreTarget(nameof(ChildProfileDto.HasPin))]
    public partial ChildProfileDto Map(ChildProfile source);
}
```
（注：Mapperly 默认对"未映射的源属性"不报错，只对"未映射的目标属性"给诊断——故显式 `[MapperIgnoreTarget(HasPin)]`。`Pin` 不外泄，天然不映射到 DTO。）

- [ ] **Step 2: 编译** — Run: `dotnet build src/Homework.Application` → `Build succeeded`（Mapperly source-gen 无警告为佳）。

### Task 1.3: 服务实现（TDD）

**Files:**
- Create: `src/Homework.Application/Children/ChildProfileAppService.cs`
- Test: `test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Children/ChildProfileAppService_Tests.cs`

- [ ] **Step 1: 写失败测试（两娃已由测试宿主播种）**

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Children.Dtos;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Children;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class ChildProfileAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IChildProfileAppService _service;

    public ChildProfileAppService_Tests()
        => _service = GetRequiredService<IChildProfileAppService>();

    [Fact]
    public async Task GetList_Returns_Both_Seeded_Children()
    {
        var list = await _service.GetListAsync();
        list.Items.Count.ShouldBe(2);
        list.Items.Select(c => c.Grade).OrderBy(g => g).ShouldBe(new[] { 1, 3 });
    }

    [Fact]
    public async Task Update_Changes_Name_And_Grade()
    {
        var gege = (await _service.GetListAsync()).Items.First(c => c.Grade == 3);
        var updated = await _service.UpdateAsync(gege.Id,
            new UpdateChildProfileDto { DisplayName = "大宝", Grade = 4 });
        updated.DisplayName.ShouldBe("大宝");
        updated.Grade.ShouldBe(4);
    }

    [Fact]
    public async Task SetPin_Sets_Then_Clears()
    {
        var didi = (await _service.GetListAsync()).Items.First(c => c.Grade == 1);

        await _service.SetPinAsync(didi.Id, new SetChildPinDto { Pin = "1234" });
        (await _service.GetAsync(didi.Id)).HasPin.ShouldBeTrue();

        await _service.SetPinAsync(didi.Id, new SetChildPinDto { Pin = null });
        (await _service.GetAsync(didi.Id)).HasPin.ShouldBeFalse();
    }
}
```

- [ ] **Step 2: 跑测试确认失败** — Run: `dotnet test test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj --filter "FullyQualifiedName~ChildProfileAppService_Tests"` → 红（服务未实现，DI 解析失败）。

- [ ] **Step 3: 实现服务**

```csharp
using System;
using System.Threading.Tasks;
using Homework.Children.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Homework.Children;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class ChildProfileAppService : HomeworkAppService, IChildProfileAppService
{
    private readonly IRepository<ChildProfile, Guid> _repository;

    public ChildProfileAppService(IRepository<ChildProfile, Guid> repository)
        => _repository = repository;

    public async Task<ListResultDto<ChildProfileDto>> GetListAsync()
    {
        var children = await _repository.GetListAsync();
        var dtos = children
            .OrderBy(c => c.Grade)
            .Select(ToDto)
            .ToList();
        return new ListResultDto<ChildProfileDto>(dtos);
    }

    public async Task<ChildProfileDto> GetAsync(Guid id)
        => ToDto(await _repository.GetAsync(id));

    public async Task<ChildProfileDto> UpdateAsync(Guid id, UpdateChildProfileDto input)
    {
        var child = await _repository.GetAsync(id);
        child.SetDisplayName(input.DisplayName);
        child.SetGrade(input.Grade);
        child.SetAvatar(input.AvatarKey);
        await _repository.UpdateAsync(child);
        return ToDto(child);
    }

    public async Task SetPinAsync(Guid id, SetChildPinDto input)
    {
        var child = await _repository.GetAsync(id);
        child.SetPin(string.IsNullOrEmpty(input.Pin) ? null : input.Pin);
        await _repository.UpdateAsync(child);
    }

    private ChildProfileDto ToDto(ChildProfile child)
    {
        var dto = ObjectMapper.Map<ChildProfile, ChildProfileDto>(child);
        dto.HasPin = !string.IsNullOrEmpty(child.Pin);
        return dto;
    }
}
```
（`using System.Linq;` 视需要补。）

- [ ] **Step 4: 跑测试确认通过** — 同 Step 2 命令 → 绿（3 passed）。

- [ ] **Step 5: 提交**

```bash
git add src/Homework.Application.Contracts/Children src/Homework.Application/Children src/Homework.Application/HomeworkApplicationMappers.cs test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Children/ChildProfileAppService_Tests.cs
git commit -m "feat(children): ChildProfileAppService (list/update/set-pin) TDD"
```

### Task 1.4: 页面 + 菜单 + 本地化（范式样板）

**Files:**
- Create: `src/Homework.Web/Pages/ParentAdmin/Children/Index.cshtml` + `Index.cshtml.cs`
- Create: `src/Homework.Web/Pages/ParentAdmin/Children/EditModal.cshtml` + `EditModal.cshtml.cs`
- Create: `src/Homework.Web/Pages/ParentAdmin/Children/SetPinModal.cshtml` + `SetPinModal.cshtml.cs`
- Create: `src/Homework.Web/Pages/ParentAdmin/Children/index.js`
- Modify: `src/Homework.Web/Menus/HomeworkMenus.cs`、`Menus/HomeworkMenuContributor.cs`
- Modify: localization `zh-Hans.json` / `en.json`

- [ ] **Step 1: 菜单常量 + 菜单项（家长后台组）**

`HomeworkMenus.cs` 加：
```csharp
public const string ParentAdmin = Prefix + ".ParentAdmin";
public const string Children = ParentAdmin + ".Children";
public const string WeeklyTemplates = ParentAdmin + ".WeeklyTemplates";
public const string DailyTasks = ParentAdmin + ".DailyTasks";
public const string FamilyGoals = ParentAdmin + ".FamilyGoals";
```
`HomeworkMenuContributor.ConfigureMainMenuAsync` 加（`await` 化，注入无需）：
```csharp
var parent = new ApplicationMenuItem(
    HomeworkMenus.ParentAdmin, l["Menu:ParentAdmin"], icon: "fas fa-user-shield", order: 1)
    .RequirePermissions(HomeworkPermissions.ParentAdmin);

parent.AddItem(new ApplicationMenuItem(
    HomeworkMenus.Children, l["Menu:Children"], "/ParentAdmin/Children"));
// Chunk 2/3/4 在此追加 WeeklyTemplates / DailyTasks / FamilyGoals 三项

context.Menu.AddItem(parent);
```
（`using Homework.Permissions;`；`RequirePermissions` 在 `Volo.Abp.UI.Navigation`。）

- [ ] **Step 2: Index 页（DataTables 列表）**

`Index.cshtml`：
```html
@page
@using Homework.Localization
@using Microsoft.AspNetCore.Mvc.Localization
@model Homework.Web.Pages.ParentAdmin.Children.IndexModel
@inject IHtmlLocalizer<HomeworkResource> L
@section scripts { <abp-script src="/Pages/ParentAdmin/Children/index.js" /> }
<abp-card>
    <abp-card-header><h2>@L["Menu:Children"]</h2></abp-card-header>
    <abp-card-body>
        <abp-table striped-rows="true" id="ChildrenTable"></abp-table>
    </abp-card-body>
</abp-card>
```
`Index.cshtml.cs`：
```csharp
using Homework.Web.Pages; // HomeworkPageModel
namespace Homework.Web.Pages.ParentAdmin.Children;
public class IndexModel : HomeworkPageModel { public void OnGet() { } }
```

- [ ] **Step 3: index.js（DataTables + JS 代理 + ModalManager）**

`index.js`：
```javascript
$(function () {
    var l = abp.localization.getResource('Homework');
    var editModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/Children/EditModal');
    var pinModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/Children/SetPinModal');

    var dt = $('#ChildrenTable').DataTable(abp.libs.datatables.normalizeConfiguration({
        serverSide: false, paging: false, searching: false, info: false,
        ajax: abp.libs.datatables.createAjax(homework.children.childProfile.getList),
        columnDefs: [
            { title: l('Actions'), rowAction: { items: [
                { text: l('Edit'), action: function (d) { editModal.open({ id: d.record.id }); } },
                { text: l('SetPin'), action: function (d) { pinModal.open({ id: d.record.id }); } }
            ] } },
            { title: l('DisplayName'), data: 'displayName' },
            { title: l('Grade'), data: 'grade' },
            { title: l('HasPin'), data: 'hasPin' }
        ]
    }));
    editModal.onResult(function () { dt.ajax.reload(); });
    pinModal.onResult(function () { dt.ajax.reload(); });
});
```
说明：`homework.children.childProfile.getList` 是 ABP 动态 JS 代理（服务经自动 API 暴露）。`getList` 返回 `ListResultDto`，`createAjax` 适配其 `items`。

- [ ] **Step 4: EditModal（编辑档案）**

`EditModal.cshtml.cs`：
```csharp
using System;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Children.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.Children;

public class EditModalModel : HomeworkPageModel
{
    [HiddenInput] [BindProperty(SupportsGet = true)] public Guid Id { get; set; }
    [BindProperty] public UpdateChildProfileDto Input { get; set; } = new();

    private readonly IChildProfileAppService _service;
    public EditModalModel(IChildProfileAppService service) => _service = service;

    public async Task OnGetAsync()
    {
        var dto = await _service.GetAsync(Id);
        Input = new UpdateChildProfileDto { DisplayName = dto.DisplayName, Grade = dto.Grade, AvatarKey = dto.AvatarKey };
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await _service.UpdateAsync(Id, Input);
        return NoContent();
    }
}
```
`EditModal.cshtml`：
```html
@page
@using Microsoft.AspNetCore.Mvc.Localization
@using Homework.Localization
@model Homework.Web.Pages.ParentAdmin.Children.EditModalModel
@inject IHtmlLocalizer<HomeworkResource> L
<form asp-page="/ParentAdmin/Children/EditModal">
    <abp-modal>
        <abp-modal-header title="@L["Edit"].Value"></abp-modal-header>
        <abp-modal-body>
            <input asp-for="Id" />
            <abp-input asp-for="Input.DisplayName" label="@L["DisplayName"].Value" />
            <abp-input asp-for="Input.Grade" type="number" label="@L["Grade"].Value" />
            <abp-input asp-for="Input.AvatarKey" label="@L["AvatarKey"].Value" />
        </abp-modal-body>
        <abp-modal-footer buttons="@(AbpModalButtons.Cancel|AbpModalButtons.Save)"></abp-modal-footer>
    </abp-modal>
</form>
```

- [ ] **Step 5: SetPinModal（设/清 PIN）**

同 EditModal 结构，`SetPinModalModel` 绑定 `SetChildPinDto Input`，`OnPostAsync` 调 `_service.SetPinAsync(Id, Input)`；`.cshtml` 单个 `abp-input asp-for="Input.Pin"`（`maxlength=4`，label `@L["Pin"]`，提示"留空=清除"）。

- [ ] **Step 6: 本地化 key（两文件同步，`@abp-localization-fix`）**

`zh-Hans.json` / `en.json` 的 `texts` 加：`Menu:ParentAdmin`(家长后台/Parent Admin)、`Menu:Children`(孩子档案/Children)、`DisplayName`(昵称/Display Name)、`Grade`(年级/Grade)、`AvatarKey`(头像/Avatar)、`HasPin`(已设PIN/Has PIN)、`Pin`(PIN 码/PIN)、`SetPin`(设置PIN/Set PIN)、`Edit`/`Actions`（若 AbpUi 未提供则补）。**两文件 key 数量一致、无空值。**

- [ ] **Step 7: 冒烟 + 提交**

Run: `dotnet build Homework.sln` → 成功。（页面点通留 Chunk 5 统一 `@run`。）
```bash
git add src/Homework.Web/Pages/ParentAdmin/Children src/Homework.Web/Menus src/Homework.Domain.Shared/Localization/Homework/*.json
git commit -m "feat(web): 孩子档案 parent-admin page (list/edit/set-pin)"
```

---

## Chunk 2: 每周任务模板（WeeklyTaskTemplate）

> 页面沿用 Chunk 1 范式（Index+CreateModal+EditModal+index.js），仅列/字段/child 切换器不同。

### Task 2.1: DTO + 接口

**Files:**
- Create: `src/Homework.Application.Contracts/Tasks/Dtos/WeeklyTaskTemplateItemDto.cs`、`CreateWeeklyTaskTemplateItemDto.cs`、`UpdateWeeklyTaskTemplateItemDto.cs`、`GetWeeklyTemplateInput.cs`
- Create: `src/Homework.Application.Contracts/Tasks/IWeeklyTaskTemplateAppService.cs`

- [ ] **Step 1: DTO**
```csharp
// WeeklyTaskTemplateItemDto.cs
using System; using Volo.Abp.Application.Dtos;
namespace Homework.Tasks.Dtos;
public class WeeklyTaskTemplateItemDto : EntityDto<Guid>
{
    public Guid ChildId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public int Order { get; set; }
    public int? EstimatedMinutes { get; set; }
    public bool IsActive { get; set; }
}
```
```csharp
// CreateWeeklyTaskTemplateItemDto.cs
using System; using System.ComponentModel.DataAnnotations;
namespace Homework.Tasks.Dtos;
public class CreateWeeklyTaskTemplateItemDto
{
    [Required] public Guid ChildId { get; set; }
    [Required] public DayOfWeek DayOfWeek { get; set; }
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(64)] public string? Subject { get; set; }
    [Range(0, int.MaxValue)] public int Order { get; set; }
    [Range(1, 600)] public int? EstimatedMinutes { get; set; }
}
```
```csharp
// UpdateWeeklyTaskTemplateItemDto.cs
using System.ComponentModel.DataAnnotations;
namespace Homework.Tasks.Dtos;
public class UpdateWeeklyTaskTemplateItemDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(64)] public string? Subject { get; set; }
    [Range(0, int.MaxValue)] public int Order { get; set; }
    [Range(1, 600)] public int? EstimatedMinutes { get; set; }
    public bool IsActive { get; set; }
}
```
```csharp
// GetWeeklyTemplateInput.cs
using System;
namespace Homework.Tasks.Dtos;
public class GetWeeklyTemplateInput { public Guid ChildId { get; set; } public DayOfWeek? DayOfWeek { get; set; } }
```

- [ ] **Step 2: 接口**
```csharp
using System; using System.Threading.Tasks;
using Homework.Tasks.Dtos; using Volo.Abp.Application.Dtos; using Volo.Abp.Application.Services;
namespace Homework.Tasks;
public interface IWeeklyTaskTemplateAppService : IApplicationService
{
    Task<ListResultDto<WeeklyTaskTemplateItemDto>> GetListAsync(GetWeeklyTemplateInput input);
    Task<WeeklyTaskTemplateItemDto> CreateAsync(CreateWeeklyTaskTemplateItemDto input);
    Task<WeeklyTaskTemplateItemDto> UpdateAsync(Guid id, UpdateWeeklyTaskTemplateItemDto input);
    Task DeleteAsync(Guid id);
}
```
- [ ] **Step 3: 编译** → 成功。

### Task 2.2: Mapperly + 服务（TDD）

**Files:**
- Modify: `HomeworkApplicationMappers.cs`（加 `public partial WeeklyTaskTemplateItemDto Map(WeeklyTaskTemplateItem source);`）
- Create: `src/Homework.Application/Tasks/WeeklyTaskTemplateAppService.cs`
- Test: `test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/WeeklyTaskTemplateAppService_Tests.cs`

- [ ] **Step 1: 写失败测试** — 覆盖：`CreateAsync` 后 `GetListAsync(child)` 返回该项、按 DayOfWeek+Order 排序；`GetListAsync(child, DayOfWeek.Monday)` 只返回周一项；`UpdateAsync` 改 Title/IsActive；`DeleteAsync` 移除。用 `GetRequiredService<IWeeklyTaskTemplateAppService>()` + `GetRequiredService<IGuidGenerator>()` 造 childId。
- [ ] **Step 2: 跑红** → 服务未实现。
- [ ] **Step 3: 实现服务**（`[Authorize(HomeworkPermissions.ParentAdmin)]`，注入 `IRepository<WeeklyTaskTemplateItem, Guid>`）：
  - `GetListAsync`：`GetListAsync(predicate)` where ChildId==input.ChildId && (input.DayOfWeek==null || DayOfWeek==input.DayOfWeek)，`OrderBy(DayOfWeek).ThenBy(Order)`，`ObjectMapper.Map` 成 DTO 列表 → `ListResultDto`。
  - `CreateAsync`：`new WeeklyTaskTemplateItem(GuidGenerator.Create(), input.ChildId, input.DayOfWeek, input.Title, input.Subject, input.Order, input.EstimatedMinutes)` → `InsertAsync(autoSave:true)` → map。
  - `UpdateAsync`：`GetAsync(id)` → `SetTitle/SetSubject/SetOrder/SetEstimatedMinutes` + `Activate()/Deactivate()`（按 `IsActive`）→ `UpdateAsync` → map。
  - `DeleteAsync`：`_repository.DeleteAsync(id)`。
- [ ] **Step 4: 跑绿** → passed。
- [ ] **Step 5: 提交** — `feat(tasks): WeeklyTaskTemplateAppService CRUD (TDD)`。

### Task 2.3: 页面（child 切换器）+ 菜单 + 本地化

**Files:** `src/Homework.Web/Pages/ParentAdmin/WeeklyTemplates/{Index,CreateModal,EditModal}.cshtml(.cs)` + `index.js`；菜单追加 `WeeklyTemplates` 项；localization。

- [ ] **Step 1: Index + child 切换器** — 顶部一个 `<select id="ChildSelect">`（选项来自 `homework.children.childProfile.getList`），`change` 时以选中 `childId` 重载 DataTable（`ajax` data 回调传 `{ childId: selectedId }` 给 `homework.tasks.weeklyTaskTemplate.getList`）。列：Actions(Edit/Delete)、DayOfWeek、Title、Subject、Order、IsActive。首个孩子默认选中。
- [ ] **Step 2: CreateModal** — 隐藏 `ChildId`（取自当前选中）、DayOfWeek 下拉、Title/Subject/Order/EstimatedMinutes。`OnPostAsync` 调 `CreateAsync`。
- [ ] **Step 3: EditModal** — 载入项、编辑同字段 + `IsActive` 开关。
- [ ] **Step 4: 本地化 key** — `Menu:WeeklyTemplates`(每周任务模板)、`DayOfWeek`(星期)、`Title`(标题)、`Subject`(科目)、`Order`(排序)、`EstimatedMinutes`(预计分钟)、`IsActive`(启用)、`Child`(孩子)、`Create`/`Delete`。两文件同步。
- [ ] **Step 5: 菜单追加** `parent.AddItem(... HomeworkMenus.WeeklyTemplates, "/ParentAdmin/WeeklyTemplates")`。
- [ ] **Step 6: build + 提交** — `feat(web): 每周任务模板 page (child-scoped CRUD)`。

---

## Chunk 3: 当日任务（DailyTask）+ 复核/撤销（最重）

> 核心：每次 mutation 后 `SettleDayAsync`；GetBoard 读取即结算。

### Task 3.1: DTO + 接口

**Files:**
- Create: `src/Homework.Application.Contracts/Tasks/Dtos/DailyTaskDto.cs`、`DailyBoardDto.cs`、`CreateDailyTaskDto.cs`、`UpdateDailyTaskDto.cs`、`GetDailyBoardInput.cs`
- Create: `src/Homework.Application.Contracts/Tasks/IDailyTaskAppService.cs`

- [ ] **Step 1: DTO**
```csharp
// DailyTaskDto.cs
using System; using Volo.Abp.Application.Dtos;
namespace Homework.Tasks.Dtos;
public class DailyTaskDto : EntityDto<Guid>
{
    public Guid ChildId { get; set; }
    public DateOnly Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public int Order { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedTime { get; set; }
    public TaskReviewState ReviewState { get; set; }
    public bool CountsAsCompleted { get; set; }
    public Guid? SourceTemplateItemId { get; set; }
}
```
```csharp
// DailyBoardDto.cs
using System; using System.Collections.Generic;
namespace Homework.Tasks.Dtos;
public class DailyBoardDto
{
    public Guid ChildId { get; set; }
    public DateOnly Date { get; set; }
    public List<DailyTaskDto> Tasks { get; set; } = new();
    public int TasksTotal { get; set; }
    public int TasksCompleted { get; set; }
    public int Stars { get; set; }
    public bool IsFull { get; set; }
    public bool IsRestDay { get; set; }
}
```
```csharp
// CreateDailyTaskDto.cs
using System; using System.ComponentModel.DataAnnotations;
namespace Homework.Tasks.Dtos;
public class CreateDailyTaskDto
{
    [Required] public Guid ChildId { get; set; }
    [Required] public DateOnly Date { get; set; }
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(64)] public string? Subject { get; set; }
    [Range(0, int.MaxValue)] public int Order { get; set; }
}
```
```csharp
// UpdateDailyTaskDto.cs
using System.ComponentModel.DataAnnotations;
namespace Homework.Tasks.Dtos;
public class UpdateDailyTaskDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(64)] public string? Subject { get; set; }
    [Range(0, int.MaxValue)] public int Order { get; set; }
}
```
```csharp
// GetDailyBoardInput.cs
using System;
namespace Homework.Tasks.Dtos;
public class GetDailyBoardInput { public Guid ChildId { get; set; } public DateOnly Date { get; set; } }
```

- [ ] **Step 2: 接口**
```csharp
using System; using System.Threading.Tasks;
using Homework.Tasks.Dtos; using Volo.Abp.Application.Services;
namespace Homework.Tasks;
public interface IDailyTaskAppService : IApplicationService
{
    Task<DailyBoardDto> GetBoardAsync(GetDailyBoardInput input);
    Task<DailyTaskDto> CreateAsync(CreateDailyTaskDto input);
    Task<DailyTaskDto> UpdateAsync(Guid id, UpdateDailyTaskDto input);
    Task DeleteAsync(Guid id);
    Task RevokeAsync(Guid id);
    Task RestoreAsync(Guid id);
}
```
- [ ] **Step 3: 编译** → 成功。

### Task 3.2: Mapperly + 服务（TDD，重结算不变式）

**Files:**
- Modify: `HomeworkApplicationMappers.cs`（`public partial DailyTaskDto Map(DailyTask source);`，`CountsAsCompleted` 是只读计算属性——Mapperly 从同名 getter 映射即可；若报错则 `[MapperIgnoreTarget(nameof(DailyTaskDto.CountsAsCompleted))]` 并在服务里赋值）。
- Create: `src/Homework.Application/Tasks/DailyTaskAppService.cs`
- Test: `test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Tasks/DailyTaskAppService_Tests.cs`

- [ ] **Step 1: 写失败测试（重结算是重点）**

要点用例（用 `IDailyTaskAppService` + `IWeeklyTaskTemplateAppService` + `IGuidGenerator`；childId 自造）：
```csharp
[Fact]
public async Task GetBoard_Generates_From_Template_And_Settles()
{
    var child = _guid.Create();
    var monday = new DateOnly(2026, 7, 6);
    // 建 2 个周一模板项
    await _templates.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
    await _templates.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "数学", Order = 1 });

    var board = await _service.GetBoardAsync(new() { ChildId = child, Date = monday });

    board.Tasks.Count.ShouldBe(2);
    board.TasksTotal.ShouldBe(2);
    board.TasksCompleted.ShouldBe(0);
    board.Stars.ShouldBe(0);
    board.IsRestDay.ShouldBeFalse();
}

[Fact]
public async Task Revoke_Recomputes_DailyScore_Down()
{
    var child = _guid.Create();
    var date = new DateOnly(2026, 7, 6);
    // 造 1 个已完成任务（直接用 DailyTask 仓储或 Create + 手动完成）
    await _templates.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
    var board = await _service.GetBoardAsync(new() { ChildId = child, Date = date });
    var taskId = board.Tasks[0].Id;
    // 直接用领域完成（仓储）→ 再 GetBoard 结算成吃饱
    await CompleteViaRepositoryAsync(taskId); // helper：加载 DailyTask.Complete(now) 存回
    (await _service.GetBoardAsync(new() { ChildId = child, Date = date })).IsFull.ShouldBeTrue();

    await _service.RevokeAsync(taskId);

    var after = await _service.GetBoardAsync(new() { ChildId = child, Date = date });
    after.TasksCompleted.ShouldBe(0);
    after.IsFull.ShouldBeFalse();
    after.Stars.ShouldBe(0);
}

[Fact]
public async Task Create_AdHoc_Task_Raises_Total_And_Breaks_Full()
{
    var child = _guid.Create();
    var date = new DateOnly(2026, 7, 6);
    await _templates.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
    var board = await _service.GetBoardAsync(new() { ChildId = child, Date = date });
    await CompleteViaRepositoryAsync(board.Tasks[0].Id);
    (await _service.GetBoardAsync(new() { ChildId = child, Date = date })).IsFull.ShouldBeTrue();

    await _service.CreateAsync(new() { ChildId = child, Date = date, Title = "临时加练", Order = 5 });

    var after = await _service.GetBoardAsync(new() { ChildId = child, Date = date });
    after.TasksTotal.ShouldBe(2);
    after.IsFull.ShouldBeFalse();
}
```
（`CompleteViaRepositoryAsync` = 用 `IRepository<DailyTask,Guid>` 加载→`Complete(now)`→`UpdateAsync`，模拟孩子端打卡；Phase 4 才有打卡服务，这里直接走领域。）

- [ ] **Step 2: 跑红** → 服务未实现。
- [ ] **Step 3: 实现服务**
```csharp
[Authorize(HomeworkPermissions.ParentAdmin)]
public class DailyTaskAppService : HomeworkAppService, IDailyTaskAppService
{
    private readonly IRepository<DailyTask, Guid> _repository;
    private readonly DailyTaskGenerator _generator;

    public DailyTaskAppService(IRepository<DailyTask, Guid> repository, DailyTaskGenerator generator)
    { _repository = repository; _generator = generator; }

    public async Task<DailyBoardDto> GetBoardAsync(GetDailyBoardInput input)
    {
        await _generator.EnsureDayAsync(input.ChildId, input.Date);       // 惰性生成
        await _generator.SettleDayAsync(input.ChildId, input.Date);       // 读取即结算（含今天）
        var tasks = await _repository.GetListAsync(t => t.ChildId == input.ChildId && t.Date == input.Date);
        var (total, completed) = (tasks.Count, tasks.Count(t => t.CountsAsCompleted));
        return new DailyBoardDto
        {
            ChildId = input.ChildId, Date = input.Date,
            Tasks = tasks.OrderBy(t => t.Order).Select(ToDto).ToList(),
            TasksTotal = total, TasksCompleted = completed,
            Stars = total == 0 ? 0 : StarCalculator.CalculateStars(total, completed),
            IsFull = total > 0 && completed == total,
            IsRestDay = total == 0
        };
    }

    public async Task<DailyTaskDto> CreateAsync(CreateDailyTaskDto input)
    {
        var task = new DailyTask(GuidGenerator.Create(), input.ChildId, input.Date, input.Title, input.Subject, input.Order);
        await _repository.InsertAsync(task, autoSave: true);
        await _generator.SettleDayAsync(input.ChildId, input.Date);
        return ToDto(task);
    }

    public async Task<DailyTaskDto> UpdateAsync(Guid id, UpdateDailyTaskDto input)
    {
        var task = await _repository.GetAsync(id);
        task.SetTitle(input.Title).SetSubject(input.Subject).SetOrder(input.Order);
        await _repository.UpdateAsync(task, autoSave: true);
        await _generator.SettleDayAsync(task.ChildId, task.Date);
        return ToDto(task);
    }

    public async Task DeleteAsync(Guid id)
    {
        var task = await _repository.GetAsync(id);
        await _repository.DeleteAsync(task, autoSave: true);
        await _generator.SettleDayAsync(task.ChildId, task.Date);
    }

    public async Task RevokeAsync(Guid id) => await ReviewAsync(id, revoke: true);
    public async Task RestoreAsync(Guid id) => await ReviewAsync(id, revoke: false);

    private async Task ReviewAsync(Guid id, bool revoke)
    {
        var task = await _repository.GetAsync(id);
        if (revoke) task.Revoke(); else task.Restore();
        await _repository.UpdateAsync(task, autoSave: true);
        await _generator.SettleDayAsync(task.ChildId, task.Date);
    }

    private DailyTaskDto ToDto(DailyTask t) => ObjectMapper.Map<DailyTask, DailyTaskDto>(t);
}
```
（`using System.Linq; Homework.Scoring; Homework.Permissions; Microsoft.AspNetCore.Authorization; Volo.Abp.Domain.Repositories;`。）

- [ ] **Step 4: 跑绿** → passed（3 重结算用例 + GetBoard）。
- [ ] **Step 5: 提交** — `feat(tasks): DailyTaskAppService board + overrides + revoke/re-settle (TDD)`。

### Task 3.3: 页面（child 切换器 + 日期 + 汇总卡 + 复核）

**Files:** `Pages/ParentAdmin/DailyTasks/{Index,CreateModal,EditModal}.cshtml(.cs)` + `index.js`；菜单 `DailyTasks` 项；localization。

- [ ] **Step 1: Index** — 顶部 child 切换器 + `<input type="date" id="BoardDate">`（默认今天）；一张**汇总卡**显示 `Stars/吃饱/总数/完成数`；一张任务表（列：Order、Title、Subject、完成状态、ReviewState、Actions）。切换 child/date → 调 `homework.tasks.dailyTask.getBoard({childId,date})` 重渲染卡 + 表。
- [ ] **Step 2: 行内操作** — 每行按 `reviewState`/`isCompleted` 显示 `Revoke`（正常且已完成时）或 `Restore`（被撤销时）按钮 + `Edit`/`Delete`；调对应 JS 代理后 reload。
- [ ] **Step 3: CreateModal / EditModal** — Create 隐藏 ChildId+Date（取自当前选中）+ Title/Subject/Order；Edit 载入任务改 Title/Subject/Order。
- [ ] **Step 4: 本地化** — `Menu:DailyTasks`(当日任务)、`Date`(日期)、`Stars`(星星)、`IsFull`(吃饱)、`Completed`(已完成)、`ReviewState`(复核状态)、`Revoke`(撤销)、`Restore`(恢复)、`Normal`(正常)、`Revoked`(已撤销)、`AddTask`(加任务)。两文件同步。
- [ ] **Step 5: 菜单追加 + build + 提交** — `feat(web): 当日任务 page (board/overrides/review)`。

---

## Chunk 4: 家庭大目标（FamilyGoal）

### Task 4.1: DTO + 接口

**Files:**
- Create: `src/Homework.Application.Contracts/Scoring/Dtos/FamilyGoalDto.cs`、`CreateUpdateFamilyGoalDto.cs`
- Create: `src/Homework.Application.Contracts/Scoring/IFamilyGoalAppService.cs`

- [ ] **Step 1: DTO**
```csharp
// FamilyGoalDto.cs
using System; using Volo.Abp.Application.Dtos;
namespace Homework.Scoring.Dtos;
public class FamilyGoalDto : EntityDto<Guid>
{
    public string Title { get; set; } = string.Empty;
    public int TargetStars { get; set; }
    public string? RewardText { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public DateTime? AchievedTime { get; set; }
    public int CurrentStars { get; set; }
    public bool IsAchieved { get; set; }
    public int ProgressPercent { get; set; }   // 0..100
}
```
```csharp
// CreateUpdateFamilyGoalDto.cs
using System; using System.ComponentModel.DataAnnotations;
namespace Homework.Scoring.Dtos;
public class CreateUpdateFamilyGoalDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [Range(1, int.MaxValue)] public int TargetStars { get; set; }
    [StringLength(256)] public string? RewardText { get; set; }
    [Required] public DateOnly StartDate { get; set; }
    [Required] public DateOnly EndDate { get; set; }
}
```
- [ ] **Step 2: 接口**
```csharp
using System; using System.Threading.Tasks;
using Homework.Scoring.Dtos; using Volo.Abp.Application.Dtos; using Volo.Abp.Application.Services;
namespace Homework.Scoring;
public interface IFamilyGoalAppService : IApplicationService
{
    Task<ListResultDto<FamilyGoalDto>> GetListAsync();
    Task<FamilyGoalDto> GetAsync(Guid id);
    Task<FamilyGoalDto> CreateAsync(CreateUpdateFamilyGoalDto input);
    Task<FamilyGoalDto> UpdateAsync(Guid id, CreateUpdateFamilyGoalDto input);
    Task DeleteAsync(Guid id);
}
```
- [ ] **Step 3: 编译** → 成功。

### Task 4.2: 服务（TDD，进度聚合 + 达标）

**Files:**
- Create: `src/Homework.Application/Scoring/FamilyGoalAppService.cs`
- Test: `test/Homework.EntityFrameworkCore.Tests/EntityFrameworkCore/Scoring/FamilyGoalAppService_Tests.cs`

- [ ] **Step 1: 写失败测试** — 覆盖：`CreateAsync` 后 `GetAsync` 回读字段；播种若干 `DailyScore`（用 `IRepository<DailyScore,Guid>` + `DailyScore.Settle(5, stars)`）在区间内 → `GetAsync().CurrentStars` = 和、`ProgressPercent` 正确、达标时 `IsAchieved` 且 `AchievedTime` 非空；`EndDate < StartDate` 的 Create 抛校验/领域异常；`DeleteAsync` 移除。
- [ ] **Step 2: 跑红** → 未实现。
- [ ] **Step 3: 实现服务**（注入 `IRepository<FamilyGoal, Guid>` + `FamilyGoalProgressService`）：
  - `MapWithProgressAsync(goal)`：`stars = await _progress.CalculateStarsAsync(goal)`；`goal.CheckAchieved(stars, Clock.Now)` 后（若变化则 `UpdateAsync`）；组 `FamilyGoalDto`：`CurrentStars=stars`、`IsAchieved=goal.AchievedTime!=null`、`ProgressPercent = goal.TargetStars==0?0:Math.Min(100, (int)(stars*100L/goal.TargetStars))`。
  - `CreateAsync`：`new FamilyGoal(GuidGenerator.Create(), input.Title, input.TargetStars, input.StartDate, input.EndDate, input.RewardText)`（领域构造器已校验 EndDate≥StartDate、TargetStars>0）→ insert → map。
  - `UpdateAsync`：`GetAsync` → `SetTitle/SetTarget/SetPeriod/SetRewardText` → update → map。
  - `GetListAsync`：全部 goal → 逐个 `MapWithProgressAsync` → `ListResultDto`。
  - `DeleteAsync`：`DeleteAsync(id)`。
- [ ] **Step 4: 跑绿** → passed。
- [ ] **Step 5: 提交** — `feat(scoring): FamilyGoalAppService CRUD + live progress (TDD)`。

### Task 4.3: 页面（进度条）+ 菜单 + 本地化

**Files:** `Pages/ParentAdmin/FamilyGoals/{Index,CreateModal,EditModal}.cshtml(.cs)` + `index.js`；菜单 `FamilyGoals` 项；localization。

- [ ] **Step 1: Index** — 列表每行显示 Title、目标、当前进度（用 `<abp-progress-bar>` 或 bootstrap progress，宽度=`progressPercent`%）、达标标记、奖励文案、Actions(Edit/Delete)。`Create` 按钮开 CreateModal。
- [ ] **Step 2: Create/Edit Modal** — Title/TargetStars/RewardText/StartDate/EndDate（date input）。
- [ ] **Step 3: 本地化** — `Menu:FamilyGoals`(家庭大目标)、`TargetStars`(目标星星)、`RewardText`(奖励)、`StartDate`(开始)、`EndDate`(结束)、`Progress`(进度)、`Achieved`(已达标)、`CreateGoal`(新建目标)。两文件同步。
- [ ] **Step 4: 菜单追加 + build + 提交** — `feat(web): 家庭大目标 page (CRUD + progress)`。

---

## Chunk 5: 收尾与验收

### Task 5.1: 全量测试

- [ ] **Step 1: Domain + EFCore 测试全绿**

Run: `dotnet test test/Homework.Domain.Tests/Homework.Domain.Tests.csproj` 然后 `dotnet test test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj`
Expected: 全绿（含 Phase 2 原有 + Phase 3 新增服务测试）。

- [ ] **Step 2: 全量 build** — Run: `dotnet build Homework.sln` → 0 error。

### Task 5.2: 端到端冒烟（`@run` / `@superpowers:verification-before-completion`）

- [ ] **Step 1: 迁移/播种（授予 admin 权限）** — Run: `dotnet run --project src/Homework.DbMigrator`（在其项目目录义务见 `abp-postgres-stack`）。Expected: 成功；admin 获 `ParentAdmin`。
- [ ] **Step 2: 起 Web + admin 登录** — Run: `dotnet run --project src/Homework.Web`；浏览器 admin/`1q2w3E*` 登录。
- [ ] **Step 3: 逐页点通（中文界面）**
  - 家长后台菜单 4 项可见。
  - 孩子档案：改哥哥昵称/年级、设弟弟 PIN 再清除。
  - 每周任务模板：给某娃周一加 2 项、编辑、停用、删除；切换到另一娃独立。
  - 当日任务：选某娃+今天 → 惰性生成；加临时任务、编辑、删除；（借助已完成任务）Revoke/Restore，汇总卡星星即时变。
  - 家庭大目标：新建"攒 200★"、看进度条、编辑、删除。
- [ ] **Step 4: 记录结果** — 任一页异常则回到对应 Chunk 修复；全通过进 5.3。

### Task 5.3: Phase 3 完成

- [ ] **Step 1: 勾选 spec 验收标准**（`2026-07-04-phase3-parent-admin-design.md` 的 Acceptance criteria 逐条核对）。
- [ ] **Step 2: 更新 RUN.md**（若新增运行注意事项）。
- [ ] **Step 3: 完成提交**
```bash
git add -A
git commit -m "chore: Phase 3 (家长后台 UI) complete" --allow-empty
```

---

## Phase 3 完成的产出

家长（admin）登录后可用中文后台完成：管理两娃档案（含 PIN）、排每周任务模板、临时增删改当日任务并复核/撤销打卡（即时重结算星星/吃饱）、设家庭大目标看实时进度——全部受 `ParentAdmin` 权限门禁、有应用服务集成测试护航。**Phase 4（孩子游戏端 Style A + 登录/PIN + 宠物 + 排行榜）在此之上做。**

## 暂不含（后续阶段）
孩子游戏端与登录/PIN 校验、宠物与成长值、鼓励语 CRUD、Settings 管理页、排行榜展示页（均 Phase 4 / v2）。
