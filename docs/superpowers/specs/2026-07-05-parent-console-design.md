# 子项目 2：家长端 React Console · Design Spec

- **日期**：2026-07-05
- **状态**：设计已确认（brainstorming 通过）→ 待评审
- **背景**：产品前后端分离后，子项目①（后端 headless `Homework.HttpApi.Host`）已完成。本子项目做**家长端管理 SPA**，消费该 headless API。技术与工程约定**对标 `D:\WorkSpaces\lehmansoft\port-shield\console`**（移植其通用管道、简化掉租户/2FA/workspace/billing）。
- **前置**：后端 API 就绪（`https://localhost:44394`，Swagger `/swagger`，OpenIddict 密码流，`Homework_App` 公共客户端，CORS 已放行 `http://localhost:5173`+`https://localhost:5173`）。
- **Stack**：React 19 · Vite · TypeScript(strict) · React Router 7 · TanStack Query 5 · Axios · Zustand 5 · Tailwind 4 · Radix/shadcn · i18next。

---

## Goal

一个 React SPA 家长后台：家长自助**注册/登录**，管理自己名下的**孩子档案**、**每周任务模板**、**每日看板（审阅/撤销）**、**家庭目标（进度）**。纯前端消费后端 REST API + OpenIddict `/connect/token` 密码流，无 SSR、无 ABP Razor。

## Locked decisions（brainstorming 结论）

1. **只做家长端**：不含运营 admin 分析面板（后端目前无任何分析/埋点端点；admin 面板作为后续独立工作，需先补后端聚合 API）。
2. **v1 不做多日历史/日历视图**：后端无批量评分 API（只有单日 `get-board` + 家庭目标周期累计 `CurrentStars`）。首页用**今日看板 + 家庭目标进度条**替代。多日趋势留后续（届时先给后端加批量评分端点）。
3. **取法 A**：Vite 新建脚手架，**移植** port-shield 的通用骨架（`api.ts` 401-refresh 拦截器、`authStore` 结构、`components/ui/*` shadcn 原语、`AppLayout` 守卫、i18n），**简化**掉租户/2FA/workspace/billing，领域功能自建。
4. **位置**：`console/` 建在**仓库根**（与 `src/ test/ docs/` 平级，monorepo）。独立 `package.json`，不进 .NET 构建/`Homework.slnx`。
5. **dev 端口 5173**；vite 代理 `/api`+`/connect` → `https://localhost:44394`（`secure:false`，自签证书）。
6. **认证 = OpenIddict 密码流(ROPC)**：`client_id=Homework_App`、`scope="Homework offline_access"`；`refresh_token` 续期。
7. **本 spec 只覆盖家长 console**；官网(③)、孩子游戏端(④)各自子项目。部署不在范围。

---

## Architecture

### 目录结构（feature-folders，对标 port-shield）
```
console/
  package.json  vite.config.ts  tsconfig*.json  index.html  eslint.config.js
  public/
    favicon.*  locales/{zh-CN,en}/translation.json
  src/
    main.tsx  App.tsx  index.css(Tailwind @theme inline)
    lib/utils.ts                     # cn() = clsx + tailwind-merge
    i18n/config.ts                   # i18next + HttpBackend + LanguageDetector
    stores/authStore.ts              # zustand：token/user/permissions + login/register/logout/initialize/loadPermissions（refresh 逻辑在 api.ts 拦截器 + initialize 里，无独立 refresh action）
    services/
      api.ts                         # axios 实例 + 请求拦截(Bearer/Accept-Language) + 401 refresh 拦截 + getErrorMessage
      authService.ts                 # /connect/token(password|refresh_token)、/api/account/register、/api/account/my-profile 等
      homeworkService.ts             # 4 个应用服务的调用封装（下表）
    types/homework.ts                # DTO 类型（下）
    components/
      layout/AppLayout.tsx           # 侧栏+顶栏 shell + 路由守卫(isAuthenticated→/login) + 权限过滤导航
      ui/                            # button card dialog input label select table textarea switch badge separator dropdown-menu scroll-area
      ConfirmDialog.tsx  LanguageSwitcher.tsx  UserMenu.tsx
    features/
      auth/      LoginPage  RegisterPage  ForgotPasswordPage  ResetPasswordPage
      home/      HomePage                 # 各孩子今日看板摘要 + 家庭目标进度条
      children/  ChildrenPage             # 孩子档案 CRUD + 设/清 PIN + 头像
      schedule/  WeeklyTemplatePage       # 按孩子的一周网格 CRUD/排序/启停
      board/     DailyBoardPage           # 选日期看板 + 撤销/恢复 + 手动增删改
      goals/     FamilyGoalsPage          # 家庭目标 CRUD + 进度条
      account/   ProfileDialog  ChangePasswordDialog
```

### 消费的后端 API（家长向，全部 `Authorize(Homework.ParentAdmin)` + 服务端按 `ParentId==CurrentUser.Id` 归属过滤）

| 服务 | 路由 | 方法 → HTTP | 输入 / 输出 |
|---|---|---|---|
| ChildProfile | `/api/app/child-profile` | GetList→`GET` | — / `ListResultDto<ChildProfileDto>` |
| | | Get→`GET /{id}` · Create→`POST` · Update→`PUT /{id}` · Delete→`DELETE /{id}` | `Create/UpdateChildProfileDto` / `ChildProfileDto` |
| | | SetPin→`POST /{id}/set-pin` | `SetChildPinDto{ pin: "^\d{4}$"? }`（null/空=清除）/ void |
| WeeklyTaskTemplate | `/api/app/weekly-task-template` | GetList→`GET ?childId=&dayOfWeek=` | `GetWeeklyTemplateInput` / `ListResultDto<WeeklyTaskTemplateItemDto>` |
| | | Create→`POST` · Update→`PUT /{id}` · Delete→`DELETE /{id}` | `Create/UpdateWeeklyTaskTemplateItemDto` / `WeeklyTaskTemplateItemDto` |
| DailyTask | `/api/app/daily-task` | **GetBoard→`POST /get-board`** | `GetDailyBoardInput{childId,date}` / `DailyBoardDto` |
| | | Create→`POST` · Update→`PUT /{id}` · Delete→`DELETE /{id}` | `Create/UpdateDailyTaskDto` / `DailyTaskDto` |
| | | **Revoke→`POST /{id}/revoke`** · **Restore→`POST /{id}/restore`** | — / void |
| FamilyGoal | `/api/app/family-goal` | GetList→`GET` · Get→`GET /{id}` · Create→`POST` · Update→`PUT /{id}` · Delete→`DELETE /{id}` | `CreateUpdateFamilyGoalDto` / `FamilyGoalDto` |

**关键 DTO 字段**（`types/homework.ts` 据此写 TS 类型）：
- `ChildProfileDto{ id, displayName(≤32), grade(1..12), avatarKey?(≤64), hasPin }`
- `WeeklyTaskTemplateItemDto{ id, childId, dayOfWeek(0=Sun..6=Sat), title(≤128), subject?(≤64), order, estimatedMinutes?(1..600), isActive }`
- `DailyTaskDto{ id, childId, date, title, subject?, order, isCompleted, completedTime?, reviewState(0=Normal,1=Revoked), countsAsCompleted, sourceTemplateItemId? }`
- `DailyBoardDto{ childId, date, tasks: DailyTaskDto[], tasksTotal, tasksCompleted, stars(0..5), isFull, isRestDay }`
- `FamilyGoalDto{ id, title(≤128), targetStars(≥1), rewardText?(≤256), startDate, endDate, achievedTime?, currentStars, isAchieved, progressPercent(0..100) }`

### 认证（`authService.ts` + `authStore.ts`）
- **登录**：`POST /connect/token`（form-urlencoded：`grant_type=password`、`client_id=Homework_App`、`username`、`password`、`scope="Homework offline_access"`）→ 存 `accessToken`/`refreshToken`(localStorage) → 从 JWT claims 解出 **`User{ id(sub), userName(unique_name), email }`**（轻量自解 base64，无需引库）→ `GET /api/abp/application-configuration` 取 `auth.grantedPolicies` 校验 `Homework.ParentAdmin`。
- **注册**：`POST /api/account/register`（JSON：`userName,emailAddress,password,appName:"Homework_App"`）→ 成功后用同凭据自动登录。**若后端开启了邮箱确认**（dev 默认关），注册返回 200 但随后自动登录会 400/401——此时**不崩**，改提示「请查收邮件完成验证后再登录」。注册表单含**《儿童隐私与家长同意》勾选**（客户端门禁，未勾禁用提交；服务端强制留 `DEPLOY.md`）。
- **资料/改密/忘记/重置**（ABP account 端点）：`ProfileDialog` = **可编辑**表单（`GET /api/account/my-profile` 取、`PUT /api/account/my-profile` 存，带 `concurrencyStamp`，字段 userName/email/name/surname）；`ChangePasswordDialog` → `/api/account/change-password`；忘记 → `/send-password-reset-link`，`ResetPasswordPage` 从 query 读 **`?userId=&token=`**（单租户，去掉 port-shield 的 `tenantId`）→ `/reset-password`。
- **api.ts 401 处理**：响应拦截器遇 401（非 `/connect/token`、未重试过）→ 用 `grant_type=refresh_token` 换新 token（并发请求排队、共享一次刷新）→ 重放原请求；刷新失败 → 清 token、登出、跳 `/login`。（后端已把 `/api/*` 未认证从 302 改成 401，拦截器判定干净。）

### 路由与守卫（React Router 7）
- 公共：`/login /register /forgot-password /reset-password`。
- 受保护：其余全部嵌在 `<Route element={<AppLayout/>}>` 下；`AppLayout` 检查 `isAuthenticated`（初始化中显示 loading，未登录 `<Navigate to="/login"/>`）。
- 落地：`/` → `/home`。导航项按 `hasPermission('Homework.ParentAdmin')` 过滤（MVP 权限单一，主要为防御 + 未来扩展）。

### 状态 / 数据流
- **zustand `authStore`**：`{accessToken, refreshToken, user, permissions, isAuthenticated, isInitializing}` + `login/register/logout/hasPermission/initialize/loadPermissions`；模块加载即 `initialize()`（读 localStorage、必要时静默 refresh）。
- **TanStack Query**：`useQuery`/`useMutation` 包 `homeworkService`；mutation `onSuccess` → `invalidateQueries` + `sonner` toast；`onError` → `getErrorMessage`(解析 ABP 错误信封 `error.message/details/validationErrors`)。

### i18n / 主题
- **i18next**：`fallbackLng:'zh-CN'`，`supportedLngs:['zh-CN','en']`，`public/locales/{lng}/translation.json`，语言存 localStorage。**zh-CN 为主**（产品中文优先），en 次。
- **Tailwind 4 `@theme inline`**（`index.css`，无 config.js/无 PostCSS）。**风格 = 温暖亲和（已定）**：
  - 主色 **珊瑚橙 `#FF7A59`**（brand，按钮/强调）+ **暖蓝绿 `#2BB3A3`**（accent/次要动作）；底色 **暖米白 `#FAF6F0`**（paper），文字 **深棕灰 `#3A3230`**（ink）；**星星 金黄 `#FFC24B`**（star/成就）；成功/危险用暖调绿/红。
  - **大圆角 + 柔和阴影**，圆润友好无衬线字体（Latin 如 Nunito/Quicksand 一类；CJK 用系统 PingFang/微软雅黑）。
  - `@theme` 里定义 `--color-brand/accent/paper/ink/star/...` + 圆角(`--radius-*`)/阴影 token，`components/ui/*` 与页面统一取用。
  - 气质：温馨、鼓励、亲子（贴合星星/奖励激励），但家长管理界面保持高效清晰。**重视觉打磨（插画/动效/角色）留给孩子游戏端④**，本端克制。

### 配置 / 环境
- `VITE_API_BASE_URL`：dev 留空（走 vite 代理），prod 由构建/运行时注入。
- `vite.config.ts`：dev server `port:5173`，`proxy` 把 `/api`+`/connect` 转 `https://localhost:44394`（`changeOrigin:true, secure:false`）。
- npm scripts：`dev`(vite) / `build`(`tsc -b && vite build`) / `lint`(eslint) / `preview`。

## 测试
- **基线门禁**：TS strict + `tsc -b` + eslint 通过。
- **单测（Vitest + RTL）** 聚焦非 UI 逻辑：`authStore`(token 存取/静默 refresh)、`api.ts` 401→refresh→重放 拦截器（mock axios/adapter）、`homeworkService` 各调用（mock axios，断言 URL/verb/body/返回映射）、关键表单校验（如 PIN `^\d{4}$`、grade 1-12）。
- **冒烟**：起 vite dev + 后端（44394），脚本或手动跑通关键链路「注册→登录→建孩子→建每周模板→每日看板撤销/恢复→建家庭目标看进度」。不追求全组件 TDD（低 ROI）。

## Acceptance criteria
- `console/` 独立可 `npm run dev` 起在 5173，`tsc -b` + `eslint` 绿。
- 未登录访问受保护路由 → 跳 `/login`；能**注册**新家长（含同意勾选门禁）并自动登录；能**登录**既有家长（demo/`1q2w3E*`）。
- 登录后：**孩子** 增删改 + 设/清 PIN；**每周模板** 按孩子按星期 CRUD；**每日看板** 选日期、撤销/恢复、手动增删改、显示星星/满勤/休息日；**家庭目标** CRUD + 进度条；**首页** 汇总今日看板 + 目标进度。
- 401 触发 refresh 自动续期、对家长透明；登出清 token。
- 账号归属可见性正确：家长只看到/操作自己名下的孩子与数据（后端已保证，前端不越权请求）。

## Out of scope（本子项目不做）
运营 admin 分析面板（需先做后端埋点/聚合 API）；多日历史/日历/趋势视图（需后端批量评分端点）；2FA；孩子账号绑定 / 孩子游戏端（④）；PWA/离线；服务端同意强制与上线安全（`DEPLOY.md`）；部署（docker/nginx）。官网 Astro（③）。

## Open items to confirm at implementation
- 从 port-shield `console` **精确移植**的文件清单（`api.ts`/`authStore.ts`/`components/ui/*`/`AppLayout.tsx`/`i18n/config.ts`/`lib/utils.ts`/build 配置）与需**删改**的点（租户/2FA/workspace/`/api/public/login`/billing）。
- `@theme` 具体色值 + 字体 + 头像素材（avatarKey 预设集）。
- JWT 解析取用户信息的方式（轻量自解 base64 vs 引 `jwt-decode`）。
- 每周模板「网格」交互细节（拖拽排序 vs 上下箭头改 order）——MVP 可先用简单排序。
- 注册后邮箱确认在 dev 是否开启（默认关；影响自动登录能否立即成功）。
- prod 的 `VITE_API_BASE_URL` / CORS 生产源（部署事项，占位）。
