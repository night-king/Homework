# Phase 4 — 账号体系与家长自助注册 · Design Spec

- **日期**：2026-07-04
- **状态**：设计已确认（brainstorming 通过）→ 待评审
- **依据**：主设计 `docs/superpowers/specs/2026-07-04-kids-homework-pet-game-design.md`（§3 角色、§7.2 认证）——但**本阶段修订了账号模型与产品定位**（见下）。
- **前置**：Phase 1（地基/账号）、Phase 2（任务引擎与记分账本）、Phase 3（家长后台）均已完成。
- **Stack**：ABP 10.5 · .NET 10 · PostgreSQL/Npgsql · MVC + Razor Pages · ABP Account / Identity / OpenIddict · LeptonX-Lite · xUnit/Shouldly（SQLite in-memory 集成测试）。

---

## 产品定位修订（重要，覆盖原 spec 的非目标）

原 spec 按"**单一家庭、自部署**"设计，并把"多家庭 SaaS"列为**非目标**。**自本阶段起产品定位改为：一个公开的、面向全网的儿童作业激励游戏（已购域名 `homework.today`）——家长自助注册、免费开放，为后续变现与全球 PK 做准备。**

但**不采用多租户（multi-tenancy）**：所有数据在**单一全局实例**里（这样后续能做**全球排行榜 / PK**）。家庭之间的隐私靠**"按家长归属（ownership）过滤"**实现，而非租户隔离。

---

## Goal

把当前"**播种账号 + 单一家庭**"的雏形，改造成"**家长自助注册 → 家长账号拥有孩子档案**"的账号体系：家长注册即建号；孩子是家长名下的**档案**（不再是登录账号）；家长后台按登录家长隔离各自数据；为公网上线、全球榜/PK、变现留好架构。**不含孩子游戏端（Phase 5）。**

## Locked decisions（brainstorming 结论）

1. **家长/家庭账号在顶层**：自助注册、承担未成年人数据同意责任、未来承接账单（变现挂在家长账号上）。
2. **孩子 = 家庭名下档案**，不是登录账号（移除孩子 `IdentityUser`）。孩子玩 = 家长设备上"选娃 + 可选 PIN"（Phase 5）。
3. **单一全局实例、不做多租户**；家庭隐私靠 ownership 过滤；全球榜 / PK 用**化名 + 头像**，不暴露真实身份。
4. **PK 玩法 / 真正支付 / 邮箱验证与防刷的深加固**留后；本阶段只留架构 + 最小可用。
5. **顺序**：本 = Phase 4（账号地基）；孩子游戏端 = Phase 5。

---

## Architecture

### Identity / 角色（`Homework.Domain` 播种 + 设置）

- 启用 **ABP 账号自助注册**（`Abp.Account.IsSelfRegistrationEnabled`；实现时确认 10.5 的开关点）。
- **正式启用 `Parent` 角色**（Phase 1 已留常量 `HomeworkRoles.Parent`，一直没用）：把 `HomeworkPermissions.ParentAdmin` **授予 `Parent` 角色**（当前是授给 `admin`，改为授给 Parent），并把 Parent 设为**默认角色**（`IdentityRole.IsDefault = true`），使自助注册的新用户**自动成为家长**、开箱进家长后台。
- 注册页加**同意勾选**（未成年人数据 / COPPA / PIPL 声明）——不勾不能注册。
- 保留 `admin`（超级管理员，运营用）。**移除 `Child` 角色与孩子登录账号**（孩子不再登录）；`Child` 常量可留待 Phase 5 决定是否复用。

### Domain 改动（`Homework.Domain` / `Homework.EntityFrameworkCore`）

- **`ChildProfile`**：**去掉 `IdentityUserId`（及其唯一索引）**，改为 **`ParentId (Guid)`** = 拥有该档案的家长 `IdentityUser` Id；加索引 `(ParentId)`。其余字段不变（`DisplayName / Grade / AvatarKey / Pin / ActivePetId`）。构造器签名相应改为 `ChildProfile(id, parentId, displayName, grade)`。
- **`FamilyGoal`**：加 **`ParentId (Guid)`**（大目标属于某个家庭；现在是全局的）。
- **`WeeklyTaskTemplateItem` / `DailyTask` / `DailyScore`**：**不加 `ParentId`**——它们通过 `ChildId` 归属；授权时校验"该 `ChildId` 是否属于当前家长"。
- 一个 EF 迁移 `Reworked_Accounts`（改列 + 索引）。

### 授权模型（关键：全局实例里的家庭隐私）

**所有"家庭数据"的读写都按当前登录家长过滤 / 校验归属**（`CurrentUser.Id`）：

- `ChildProfileAppService`：`GetListAsync` 只返回 `ParentId == CurrentUser.Id` 的孩子；`Get/Update/SetPin/Delete` 先校验该孩子属于当前家长（否则 `EntityNotFoundException`）。**新增 `CreateAsync(CreateChildDto)`（建孩子，ParentId = 当前家长）与 `DeleteAsync`**（Phase 3 当时特意没做）。
- `WeeklyTaskTemplateAppService` / `DailyTaskAppService`：所有按 `childId` 的方法先校验"该 `childId` 属于当前家长"。
- `FamilyGoalAppService`：按 `ParentId == CurrentUser.Id` 过滤；进度**只聚合本家庭孩子的 `DailyScore`**（现在是聚合全体——多家庭下必须收窄到本家庭）。
- 抽一个小的归属校验复用点（如领域服务 `ChildProfileManager.EnsureOwnedByCurrentParentAsync(childId)` 或 AppService 基类辅助方法），各服务统一调用，避免漏判。
- **例外——全局只读**：未来的排行榜 / PK 是**跨全体家庭**的只读投影（化名 + 头像），**不受** ownership 过滤（Phase 5 实现；本阶段只保证数据形态支持）。

### 注册流程

家长在 `/Account/Register`（ABP 自带页 + 同意勾选）注册 → 建 `IdentityUser` + 自动获 `Parent` 默认角色 → 得 `ParentAdmin` 权限 → 登录后进家长后台，先"加孩子"，再排计划。邮箱验证 / 防刷**本阶段最小化**（开发期可关邮箱确认便于测试），列为上线前加固项。

### 种子数据迁移

- 重写 `ChildrenDataSeedContributor`：**不再建孩子登录账号**；改为播一个**示例家庭**——一个家长账号（`demo@homework.today`，给定初始密码，Parent 角色）+ 2 个 `ChildProfile`（哥哥/3、弟弟/1，`ParentId` = 该家长）。幂等。
- 把 `ParentPermissionDataSeedContributor` 从"授 ParentAdmin 给 admin 角色"改为"**授给 Parent 角色**"（admin 作为超管可另配）。
- 开发库数据可丢：迁移 + 重播即可。

### 公网上线安全（列为"上线前必做"，本阶段最小实现）

HTTPS/正式证书、`appsettings` 明文密钥移出（user-secrets / 环境变量）、注册防滥用（限流 / 验证码）、邮箱验证、错误页不泄信息、审计。**本阶段**先把注册跑通 + 在 RUN/部署文档里落一份"上线前安全清单"，深加固临上线再做。

---

## Testing

应用服务集成测试（SQLite in-memory，同 Phase 2/3，置于 `Homework.EntityFrameworkCore.Tests`）：

- **归属过滤**：`ChildProfileAppService.GetList` 只返回当前家长的孩子；`Create` 落 `ParentId = 当前家长`；`Get/Update/Delete` 对非本家长的孩子抛 `EntityNotFoundException`。
- **跨家长隔离（关键）**：造两个家长上下文（用测试的 `ICurrentUser` 切换两个 UserId，各建自己的 `ChildProfile`），验证家长 A **拿不到 / 改不动** 家长 B 的：孩子、每周模板、当日任务、家庭大目标——**每类服务一条隔离用例**。
- **FamilyGoal 家庭内聚合**：进度只算本家庭孩子的星星（跨家庭的 `DailyScore` 不计入）。
- **种子**：DbMigrator 播出一个示例家庭（1 家长 + 2 孩子档案），无孩子登录账号。
- 框架行为（自助注册开关、默认角色分配、注册页同意勾选）以"跑起来冒烟"确认，不写脆弱的框架单测。

> 测试用 `ICurrentUser` 造家长上下文：ABP 测试可用 `FakeCurrentPrincipalAccessor`（`Homework.TestBase/Security` 已有）切换当前用户 Id。

---

## Data flow — 一次注册到用起来

陌生家长 → `/Account/Register`（邮箱+密码+同意）→ 建家长 `IdentityUser` + Parent 默认角色（含 ParentAdmin）→ 登录 → 家长后台"孩子档案"页先**加孩子**（`ChildProfileAppService.CreateAsync`，`ParentId=自己`）→ 给孩子**排每周模板** / 复核，全程**只看得到自己的娃**（ownership 过滤）。数据都在全局库里，但每个家长各见各的；未来榜单 / PK 再做跨家庭的化名只读视图。

---

## Acceptance criteria

- 陌生人能在 `/Account/Register` 自助注册出一个**家长账号**（带同意勾选），登录后进家长后台。
- 家长能在后台**加 / 删自己的孩子**、排模板、复核，且**只看得到自己的娃**。
- **两个家长各自的数据互不可见 / 不可改**（集成测试证明——孩子、模板、任务、大目标四类）。
- 孩子**不再是登录账号**；旧的 `gege`/`didi` 登录账号已移除，示例家庭以**档案**形式存在（`ParentId` 指向示例家长）。
- 全量测试绿；应用可跑；**注册 → 加娃 → 排计划**闭环打通（中文界面）。

## Out of scope（本阶段不做）

孩子游戏端（Phase 5：今日任务/打卡、宠物、鼓励语、排行榜、大目标展示、PWA）、真正的支付 / 订阅、PK 玩法、邮箱验证 / 防刷深加固、运营后台。

## Open items to confirm at implementation

- ABP 10.5 自助注册的确切开关（`Account.IsSelfRegistrationEnabled` 设置 vs `AbpAccountOptions`）与**默认角色**机制（`IdentityRole.IsDefault` 自动分配 vs 注册后事件挂钩授角色）。
- 注册页加"同意勾选"的落地方式（扩展 ABP `Register` 页 / 自定义页 / 追加字段校验）。
- `ChildProfile.ParentId` 用显式属性（推荐）vs 复用 `FullAudited` 的 `CreatorId`——推荐显式，避免拿审计字段当授权依据。
- 归属校验放**领域服务**（`ChildProfileManager`）还是各 AppService 内联——倾向领域服务，统一、少漏判。
- 是否彻底删 `Child` 角色，还是留给 Phase 5 复用。
- 示例家长用新建 `demo@homework.today` 还是复用现有 `admin`。
