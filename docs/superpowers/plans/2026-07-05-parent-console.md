# 家长端 React Console Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在仓库根 `console/` 建一个 React SPA 家长后台，消费已完成的 headless API（`https://localhost:44394`），实现注册/登录、孩子档案、每周模板、每日看板(审阅/撤销)、家庭目标、首页汇总。

**Architecture:** Vite + React 19 + TS(strict)。对标 `D:\WorkSpaces\lehmansoft\port-shield\console` 移植通用管道（axios 401-refresh 拦截器、zustand authStore、shadcn UI 原语、AppLayout 路由守卫、i18next），去掉租户/2FA/workspace/billing。TanStack Query 包 axios 服务函数；zustand 管认证；Tailwind 4 `@theme inline`（温暖亲和调色板）。逻辑用 Vitest TDD，页面靠 `tsc -b`+eslint+冒烟。

**Tech Stack:** React 19 · Vite 6 · TypeScript(strict) · React Router 7 · TanStack Query 5 · Axios · Zustand 5 · Tailwind 4 (`@tailwindcss/vite`) · Radix/shadcn · i18next · Vitest + React Testing Library · sonner · lucide-react · CVA/clsx/tailwind-merge。

**Spec:** `docs/superpowers/specs/2026-07-05-parent-console-design.md`

---

## Context & invariants（零上下文实现者必读）

- **仓库根有一个 .NET ABP solution**（`src/ test/ Homework.slnx`）。本项目在**新目录 `console/`**（与 `src/` 平级），是**独立的 Node 前端**，**不进 `Homework.slnx`**、不被 .NET 构建。所有前端命令在 `console/` 目录里跑（`cd console && npm ...`）。
- **直接提交到 `main`**（单人项目惯例，无 feature 分支）。每个 Task 末尾 `git commit`；不 push。
- **后端已就绪且必须在跑**（联调/冒烟时）：`cd src/Homework.HttpApi.Host && dotnet run` → `https://localhost:44394`；本地 PostgreSQL 在 `localhost:5433`，DbMigrator 已播种（demo 家长 `demo`/`1q2w3E*`、`Homework_App` 公共客户端）。dev 必须 HTTPS。
- **认证**：`POST /connect/token`（form-urlencoded，`grant_type=password`/`refresh_token`，`client_id=Homework_App`，`scope="Homework offline_access"`）。注册 `POST /api/account/register`。所有 `/api/app/*` 需 `Authorization: Bearer`；未认证后端返 **401**（不是 302）。
- **参照模板**：`D:\WorkSpaces\lehmansoft\port-shield\console\src` 的 `services/api.ts`、`stores/authStore.ts`、`components/ui/*`、`components/layout/AppLayout.tsx`、`i18n/config.ts`、`lib/utils.ts`、`vite.config.ts` 是骨架来源——**移植并按本计划改**（换 `client_id`、去租户/2FA/workspace/`/api/public/login`/billing）。实现者可读它们取标准写法。
- **API 面**（家长向，服务端已按 `ParentId==CurrentUser.Id` 归属过滤）见 spec 表；DTO 字段见 spec「关键 DTO」。
- **风格 = 温暖亲和**：brand 珊瑚橙 `#FF7A59`、accent 暖蓝绿 `#2BB3A3`、paper `#FAF6F0`、ink `#3A3230`、star `#FFC24B`；大圆角 + 柔和阴影 + 圆润字体。
- **测试**：`cd console && npx vitest run`（逻辑单测）；`npx tsc -b`（类型）；`npm run lint`。UI 不强制 TDD。

## File structure（console/ 内）

```
console/
  package.json  vite.config.ts  tsconfig.json  tsconfig.app.json  tsconfig.node.json
  eslint.config.js  index.html  vitest.config.ts  .gitignore  .env.example
  public/favicon.svg  public/locales/{zh-CN,en}/translation.json
  src/
    main.tsx                      # React 挂载 + i18n import + QueryClientProvider
    App.tsx                       # 路由（公共/受保护）+ Toaster
    index.css                     # Tailwind import + @theme(温暖亲和 tokens)
    vite-env.d.ts
    lib/utils.ts                  # cn()
    i18n/config.ts                # i18next 初始化
    types/homework.ts             # 所有 DTO/enum 类型
    services/
      api.ts                      # axios + 拦截器 + 401 refresh + tokenStore + getErrorMessage
      authService.ts              # token(password/refresh)、register、my-profile、change/reset password
      homeworkService.ts          # 4 服务的调用封装
    stores/authStore.ts           # zustand：认证 + 权限
    components/
      ui/{button,card,input,label,textarea,select,switch,badge,separator,dialog,dropdown-menu,table,scroll-area}.tsx
      layout/AppLayout.tsx        # 侧栏+顶栏+守卫
      ConfirmDialog.tsx  LanguageSwitcher.tsx  UserMenu.tsx  StarRating.tsx  ProgressBar.tsx
    features/
      auth/{LoginPage,RegisterPage,ForgotPasswordPage,ResetPasswordPage}.tsx
      home/HomePage.tsx
      children/{ChildrenPage,ChildFormDialog,SetPinDialog}.tsx
      schedule/{WeeklyTemplatePage,TemplateItemDialog}.tsx
      board/{DailyBoardPage,DailyTaskDialog}.tsx
      goals/{FamilyGoalsPage,GoalFormDialog}.tsx
      account/{ProfileDialog,ChangePasswordDialog}.tsx
    hooks/                        # react-query hooks per feature（useChildren, useWeeklyTemplates, ...）
```

---

## Chunk 1: Scaffold + tooling + theme

目标：`console/` 起得来、`tsc -b`/eslint/vitest 绿、Tailwind 温暖亲和主题生效。此 chunk 无领域逻辑。

### Task 1.1: 初始化 Vite React-TS 工程

**Files:** Create `console/package.json`, `console/index.html`, `console/vite.config.ts`, `console/tsconfig*.json`, `console/vitest.config.ts`, `console/.gitignore`, `console/.env.example`, `console/eslint.config.js`, `console/src/vite-env.d.ts`, `console/src/main.tsx`, `console/src/App.tsx`, `console/src/index.css`, `console/src/lib/utils.ts`.

- [ ] **Step 1: 创建 `console/package.json`**

```json
{
  "name": "homework-console",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc -b --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-scroll-area": "^1.2.6",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-switch": "^1.1.3",
    "@tanstack/react-query": "^5.66.0",
    "axios": "^1.7.9",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "i18next": "^24.2.2",
    "i18next-browser-languagedetector": "^8.0.4",
    "i18next-http-backend": "^3.0.2",
    "lucide-react": "^0.475.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": "^15.4.1",
    "react-router-dom": "^7.1.5",
    "sonner": "^1.7.4",
    "tailwind-merge": "^3.0.1",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@eslint/js": "^9.20.0",
    "@tailwindcss/vite": "^4.0.6",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.20.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^15.14.0",
    "jsdom": "^26.0.0",
    "tailwindcss": "^4.0.6",
    "typescript": "~5.7.3",
    "typescript-eslint": "^8.24.0",
    "vite": "^6.1.0",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 2: `console/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>学习小伙伴 · 家长后台</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: `console/vite.config.ts`**（dev 5173，代理到后端 44394）

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://localhost:44394', changeOrigin: true, secure: false },
      '/connect': { target: 'https://localhost:44394', changeOrigin: true, secure: false },
    },
  },
})
```

- [ ] **Step 4: `console/tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```
`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```
`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 5: `console/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { globals: true, environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] },
})
```
And create `console/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 6: `console/.gitignore`, `.env.example`, `src/vite-env.d.ts`**

`.gitignore`:
```
node_modules
dist
*.local
.env
```
`.env.example`:
```
# dev 留空（走 vite 代理）；prod 注入后端源，例如 https://api.homework.today
VITE_API_BASE_URL=
```
`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_API_BASE_URL?: string }
interface ImportMeta { readonly env: ImportMetaEnv }
```

- [ ] **Step 7: `console/eslint.config.js`**（标准 vite react-ts flat config；可对标 port-shield 的 `eslint.config.js`）

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
```
> `globals` 与 `@eslint/js` 已在 devDependencies（见 Task 1.1 Step 1）。若解析冲突，就近取 port-shield 已验证的等价版本。

- [ ] **Step 8: `src/index.css`**（Tailwind 4 + 温暖亲和 @theme）

```css
@import "tailwindcss";

/* 用普通 @theme（非 inline）：既注册工具类（bg-brand-500/text-ink/...），
   又把 token 作为 :root 自定义属性 emit，故下方 body 里的 var(--color-*) 运行时可用。
   @theme inline 会把值内联进工具类、不 emit :root 变量，导致 var() 为空——不要用 inline。 */
@theme {
  --color-brand-50:  #fff2ee;
  --color-brand-500: #ff7a59;
  --color-brand-600: #ef5f3b;
  --color-accent-500: #2bb3a3;
  --color-accent-600: #1f9488;
  --color-paper: #faf6f0;
  --color-ink: #3a3230;
  --color-muted: #8a807a;
  --color-star: #ffc24b;
  --color-success-500: #3fa66a;
  --color-error-500: #e5533d;

  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
  --shadow-soft: 0 6px 20px -8px rgba(58, 50, 48, 0.18);

  --font-sans: "Nunito", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}

@layer base {
  html, body, #root { height: 100%; }
  body { background: var(--color-paper); color: var(--color-ink); font-family: var(--font-sans); }
}
```

- [ ] **Step 9: `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

- [ ] **Step 10: minimal `src/main.tsx` + `src/App.tsx`**（占位，Chunk 3 填路由）

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './i18n/config'
import App from './App'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
```
`src/App.tsx`（占位）:
```tsx
export default function App() {
  return <div className="p-8 text-2xl font-bold text-brand-600">学习小伙伴 · 家长后台</div>
}
```
> `main.tsx`（及 Chunk 2 的 `api.ts`）都会 `import i18n from '@/i18n/config'` 并读 `i18n.language`。**本 chunk 先建带类型的占位** `src/i18n/config.ts`：
> ```ts
> const i18n = { language: 'zh-CN' as string }
> export default i18n
> ```
> 这样 `main.tsx` 的 `import './i18n/config'` 与 `api.ts` 的 `i18n.language` 在 Chunk 2 之前也能编译通过。Task 2.5 再把它替换成真正的 i18next 实例（同样 `export default`、同样有 `.language`）。**`main.tsx` 里的 `import './i18n/config'` 全程保留不动。**

- [ ] **Step 11: 安装依赖并验证起服 + typecheck**

Run:
```bash
cd console && npm install
npx tsc -b
npm run dev
```
Expected: `npm install` 成功；`tsc -b` 0 error；`npm run dev` 起在 `http://localhost:5173`，浏览器显示「学习小伙伴 · 家长后台」标题（珊瑚橙色）。Ctrl-C 停。

- [ ] **Step 12: 冒烟一个占位 Vitest 确保测试框架通**

Create `console/src/lib/utils.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { cn } from './utils'
describe('cn', () => {
  it('merges + dedupes tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-ink', false && 'hidden', 'font-bold')).toBe('text-ink font-bold')
  })
})
```
Run: `cd console && npx vitest run`
Expected: 1 passed.

- [ ] **Step 13: 提交**

```bash
cd console && git add -A && cd .. && git add console/.gitignore
git commit -m "feat(console): scaffold Vite React-TS + Tailwind4 warm theme + tooling"
```
> 根 `.gitignore` 已忽略 `node_modules`；确认 `console/node_modules` 未被提交（`git status` 检查）。

---

## Chunk 2: 类型 + API/Auth 管道（TDD 逻辑核心）

目标：`types/homework.ts`（全 DTO）、`services/api.ts`（axios+401 refresh）、`services/authService.ts`、`stores/authStore.ts`、`i18n/config.ts`——**逻辑用 Vitest 测**。

### Task 2.1: `src/types/homework.ts`（DTO + enum 类型）

**Files:** Create `console/src/types/homework.ts`.

- [ ] **Step 1: 写全部类型**（据 spec「关键 DTO」+ API 面）

```ts
export interface ListResult<T> { items: T[] }

// ---- Child ----
export interface ChildProfileDto { id: string; displayName: string; grade: number; avatarKey?: string | null; hasPin: boolean }
export interface CreateChildDto { displayName: string; grade: number; avatarKey?: string | null }
export interface UpdateChildProfileDto { displayName: string; grade: number; avatarKey?: string | null }
export interface SetChildPinDto { pin?: string | null }  // "^\d{4}$" or null/empty to clear

// ---- Weekly template ----
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6  // Sun..Sat
export interface WeeklyTaskTemplateItemDto { id: string; childId: string; dayOfWeek: DayOfWeek; title: string; subject?: string | null; order: number; estimatedMinutes?: number | null; isActive: boolean }
export interface CreateWeeklyTaskTemplateItemDto { childId: string; dayOfWeek: DayOfWeek; title: string; subject?: string | null; order: number; estimatedMinutes?: number | null }
export interface UpdateWeeklyTaskTemplateItemDto { title: string; subject?: string | null; order: number; estimatedMinutes?: number | null; isActive: boolean }
export interface GetWeeklyTemplateInput { childId: string; dayOfWeek?: DayOfWeek }

// ---- Daily task / board ----
export type TaskReviewState = 0 | 1  // Normal | Revoked
export interface DailyTaskDto { id: string; childId: string; date: string; title: string; subject?: string | null; order: number; isCompleted: boolean; completedTime?: string | null; reviewState: TaskReviewState; countsAsCompleted: boolean; sourceTemplateItemId?: string | null }
export interface CreateDailyTaskDto { childId: string; date: string; title: string; subject?: string | null; order: number }
export interface UpdateDailyTaskDto { title: string; subject?: string | null; order: number }
export interface GetDailyBoardInput { childId: string; date: string }
export interface DailyBoardDto { childId: string; date: string; tasks: DailyTaskDto[]; tasksTotal: number; tasksCompleted: number; stars: number; isFull: boolean; isRestDay: boolean }

// ---- Family goal ----
export interface FamilyGoalDto { id: string; title: string; targetStars: number; rewardText?: string | null; startDate: string; endDate: string; achievedTime?: string | null; currentStars: number; isAchieved: boolean; progressPercent: number }
export interface CreateUpdateFamilyGoalDto { title: string; targetStars: number; rewardText?: string | null; startDate: string; endDate: string }

// ---- Auth ----
export interface AppUser { id: string; userName: string; email?: string }
export interface TokenResponse { access_token: string; refresh_token: string; expires_in: number; token_type: string }
```
> `date` 用 ISO `YYYY-MM-DD`（后端 `DateOnly` 序列化成该格式）。

- [ ] **Step 2: typecheck** — Run `cd console && npx tsc -b`；Expected 0 error。
- [ ] **Step 3: commit** — `git add console/src/types && git commit -m "feat(console): homework DTO types"`

### Task 2.2: `src/services/api.ts`（axios + 401 refresh，TDD）

**Files:** Create `console/src/services/api.ts`, Test `console/src/services/api.test.ts`.

- [ ] **Step 1: 写 api.ts**（移植自 port-shield，换 client_id/scope；用事件解耦登出）

```ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import i18n from '@/i18n/config'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
export const CLIENT_ID = 'Homework_App'
export const SCOPE = 'Homework offline_access'
export const TOKEN_URL = `${API_BASE_URL}/connect/token`

export const tokenStore = {
  get access() { return localStorage.getItem('accessToken') },
  get refresh() { return localStorage.getItem('refreshToken') },
  set(access: string, refresh: string) { localStorage.setItem('accessToken', access); localStorage.setItem('refreshToken', refresh) },
  clear() { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken') },
}

export const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['Accept-Language'] = i18n.language || 'zh-CN'
  return config
})

let refreshing: Promise<string> | null = null
async function doRefresh(): Promise<string> {
  const refreshToken = tokenStore.refresh
  if (!refreshToken) throw new Error('no_refresh_token')
  const body = new URLSearchParams({ grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: refreshToken, scope: SCOPE })
  const resp = await axios.post(TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  tokenStore.set(resp.data.access_token, resp.data.refresh_token)
  return resp.data.access_token
}
// 共享同一次在途刷新（并发 401 只刷一次）；authStore.initialize() 也用它做过期静默刷新。
export function refreshAccessToken(): Promise<string> {
  refreshing ??= doRefresh().finally(() => { refreshing = null })
  return refreshing
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status
    if (status === 401 && original && !original._retry && !original.url?.includes('/connect/token')) {
      original._retry = true
      try {
        const newToken = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        tokenStore.clear()
        window.dispatchEvent(new Event('auth:logout'))
      }
    }
    return Promise.reject(error)
  },
)

interface AbpError { error?: { message?: string; details?: string; validationErrors?: { message: string }[] } }
export function getErrorMessage(error: unknown, fallback = '出错了，请稍后再试'): string {
  const data = (error as AxiosError<AbpError>)?.response?.data?.error
  if (data?.message) {
    if (data.validationErrors?.length) return data.validationErrors.map((v) => v.message).join('；')
    return data.details ? `${data.message}：${data.details}` : data.message
  }
  return fallback
}
```

- [ ] **Step 2: 写失败测试 `api.test.ts`**（401 → refresh → 重放；getErrorMessage 解析 ABP 信封）

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getErrorMessage } from './api'

describe('getErrorMessage', () => {
  it('reads ABP error envelope message', () => {
    const err = { response: { data: { error: { message: '名称已存在' } } } }
    expect(getErrorMessage(err)).toBe('名称已存在')
  })
  it('joins validation errors', () => {
    const err = { response: { data: { error: { message: 'x', validationErrors: [{ message: 'A' }, { message: 'B' }] } } } }
    expect(getErrorMessage(err)).toBe('A；B')
  })
  it('falls back when no envelope', () => {
    expect(getErrorMessage({}, 'FB')).toBe('FB')
  })
})
```
> 401-refresh 拦截器的完整测试较重（需 mock axios adapter）。**先测 `getErrorMessage`**（纯函数）作为本 Task 的 red/green；401-refresh 逻辑靠 Chunk 2 末尾的 authStore 测 + 联调冒烟覆盖。若实现者愿意，可加一个用 `vi.spyOn(axios,'post')` + 自定义 adapter 模拟 401→refresh→retry 的集成测，非强制。

- [ ] **Step 3: 跑测试** — `cd console && npx vitest run src/services/api.test.ts`；Expected: 3 passed（先确认 import 前 red：把 `getErrorMessage` 改名跑一次看 fail，再改回 green）。
- [ ] **Step 4: commit** — `git add console/src/services/api.ts console/src/services/api.test.ts && git commit -m "feat(console): axios client + 401 refresh interceptor + ABP error parsing"`

### Task 2.3: `src/services/authService.ts`

**Files:** Create `console/src/services/authService.ts`.

- [ ] **Step 1: 写 authService**

```ts
import axios from 'axios'
import { api, CLIENT_ID, SCOPE, TOKEN_URL, tokenStore } from './api'
import type { TokenResponse, AppUser } from '@/types/homework'

export async function passwordLogin(username: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ grant_type: 'password', client_id: CLIENT_ID, scope: SCOPE, username, password })
  const resp = await axios.post<TokenResponse>(TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  tokenStore.set(resp.data.access_token, resp.data.refresh_token)
  return resp.data
}

export interface RegisterInput { userName: string; emailAddress: string; password: string }
export async function register(input: RegisterInput): Promise<void> {
  await api.post('/api/account/register', { ...input, appName: CLIENT_ID })
}

export interface GrantedPolicies { [key: string]: boolean }
export async function getApplicationConfiguration(): Promise<GrantedPolicies> {
  const resp = await api.get('/api/abp/application-configuration')
  return resp.data?.auth?.grantedPolicies ?? {}
}

// JWT 是 base64url（-/_，可能无 padding），必须先转普通 base64 再 atob，并按 UTF-8 解码。atob 不认 -/_。
function parseJwt(token: string): Record<string, string | number> {
  const seg = token.split('.')[1] ?? ''
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(b64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
  )
  return JSON.parse(json)
}
export function decodeUser(accessToken: string): AppUser {
  const p = parseJwt(accessToken)
  return {
    id: String(p.sub ?? ''),
    userName: String(p.unique_name ?? p.preferred_username ?? p.name ?? ''),
    email: p.email != null ? String(p.email) : undefined,
  }
}
export function isTokenExpired(accessToken: string): boolean {
  try { const exp = Number(parseJwt(accessToken).exp); return !exp || Date.now() >= exp * 1000 } catch { return true }
}

// ABP account endpoints
export const myProfile = () => api.get('/api/account/my-profile').then((r) => r.data)
export const updateMyProfile = (dto: unknown) => api.put('/api/account/my-profile', dto).then((r) => r.data)
export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/api/account/change-password', { currentPassword, newPassword })
export const sendPasswordResetLink = (email: string, appName = CLIENT_ID) =>
  api.post('/api/account/send-password-reset-link', { email, appName, returnUrl: `${location.origin}/reset-password` })
export const resetPassword = (userId: string, resetToken: string, password: string) =>
  api.post('/api/account/reset-password', { userId, resetToken, password })
```

- [ ] **Step 2: 测 `decodeUser`**（纯函数，可测）— Create `authService.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { decodeUser, isTokenExpired } from './authService'
describe('decodeUser / isTokenExpired', () => {
  it('extracts id/userName/email from JWT payload', () => {
    const payload = { sub: 'abc', unique_name: 'demo', email: 'demo@homework.today' }
    const jwt = `x.${btoa(JSON.stringify(payload))}.y`
    expect(decodeUser(jwt)).toEqual({ id: 'abc', userName: 'demo', email: 'demo@homework.today' })
  })
  it('isTokenExpired: true when exp in past, false when future', () => {
    const now = Math.floor(Date.now() / 1000)
    const mk = (exp: number) => `x.${btoa(JSON.stringify({ sub: 'a', exp }))}.y`
    expect(isTokenExpired(mk(now - 60))).toBe(true)
    expect(isTokenExpired(mk(now + 3600))).toBe(false)
  })
})
```
Run `npx vitest run src/services/authService.test.ts` → 2 passed（先改名看 red 再改回）。
- [ ] **Step 3: commit** — `git commit -m "feat(console): authService (token/register/profile/reset + JWT decode)"`

### Task 2.4: `src/stores/authStore.ts`（zustand，TDD 关键路径）

**Files:** Create `console/src/stores/authStore.ts`, Test `console/src/stores/authStore.test.ts`.

- [ ] **Step 1: 写 authStore**

```ts
import { create } from 'zustand'
import { tokenStore, refreshAccessToken } from '@/services/api'
import { passwordLogin, register as registerApi, getApplicationConfiguration, decodeUser, isTokenExpired, type RegisterInput } from '@/services/authService'
import type { AppUser } from '@/types/homework'

interface AuthState {
  user: AppUser | null
  permissions: Record<string, boolean>
  isAuthenticated: boolean
  isInitializing: boolean
  login: (username: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  hasPermission: (name: string) => boolean
  loadPermissions: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: {},
  isAuthenticated: false,
  isInitializing: true,
  login: async (username, password) => {
    const tok = await passwordLogin(username, password)
    set({ user: decodeUser(tok.access_token), isAuthenticated: true })
    await get().loadPermissions()
  },
  register: async (input) => {
    await registerApi(input)
    await get().login(input.userName, input.password)
  },
  logout: () => { tokenStore.clear(); set({ user: null, permissions: {}, isAuthenticated: false }) },
  hasPermission: (name) => !!get().permissions[name],
  loadPermissions: async () => { try { set({ permissions: await getApplicationConfiguration() }) } catch { /* ignore */ } },
  initialize: async () => {
    const token = tokenStore.access
    if (token) {
      try {
        let active = token
        if (isTokenExpired(token)) {
          if (tokenStore.refresh) active = await refreshAccessToken()
          else throw new Error('expired_no_refresh')
        }
        set({ user: decodeUser(active), isAuthenticated: true })
        void get().loadPermissions()
      } catch { tokenStore.clear(); set({ user: null, isAuthenticated: false }) }
    }
    set({ isInitializing: false })
  },
}))

// api.ts 在 refresh 失败时派发 'auth:logout'
if (typeof window !== 'undefined') window.addEventListener('auth:logout', () => useAuthStore.getState().logout())
```

- [ ] **Step 2: 失败测试**（login 存 user+权限；logout 清；initialize 从 token 复原）— `authStore.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('@/services/authService', () => ({
  passwordLogin: vi.fn(async () => ({ access_token: `x.${btoa(JSON.stringify({ sub: '1', unique_name: 'demo' }))}.y`, refresh_token: 'r' })),
  register: vi.fn(async () => {}),
  getApplicationConfiguration: vi.fn(async () => ({ 'Homework.ParentAdmin': true })),
  decodeUser: (t: string) => JSON.parse(atob(t.split('.')[1])),
  isTokenExpired: () => false,
}))
import { useAuthStore } from './authStore'

beforeEach(() => { localStorage.clear(); useAuthStore.setState({ user: null, permissions: {}, isAuthenticated: false, isInitializing: true }) })

describe('authStore', () => {
  it('login sets user + permissions', async () => {
    await useAuthStore.getState().login('demo', '1q2w3E*')
    const s = useAuthStore.getState()
    expect(s.isAuthenticated).toBe(true)
    expect(s.hasPermission('Homework.ParentAdmin')).toBe(true)
  })
  it('logout clears state', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: '1', userName: 'x' }, permissions: { a: true } })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
```
> `decodeUser` mock 返回 `{sub, unique_name}`——断言用 `hasPermission`/`isAuthenticated` 即可（不依赖 user 具体形状）。
- [ ] **Step 3: 跑测试** — `npx vitest run src/stores/authStore.test.ts` → 2 passed（先 red 后 green）。
- [ ] **Step 4: commit** — `git commit -m "feat(console): zustand authStore (login/register/logout/initialize + permissions)"`

### Task 2.5: `src/i18n/config.ts` + 接入 main.tsx

**Files:** Create/replace `console/src/i18n/config.ts`; Modify `console/src/main.tsx`; Create `console/public/locales/{zh-CN,en}/translation.json`.

- [ ] **Step 1: `i18n/config.ts`**

```ts
import i18n from 'i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n.use(HttpBackend).use(LanguageDetector).use(initReactI18next).init({
  fallbackLng: 'zh-CN',
  supportedLngs: ['zh-CN', 'en'],
  interpolation: { escapeValue: false },
  backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
})
export default i18n
```

- [ ] **Step 2: 初始翻译文件**（键随各 chunk 增补；先放骨架）

`public/locales/zh-CN/translation.json`:
```json
{ "app": { "name": "学习小伙伴 · 家长后台" }, "common": { "save": "保存", "cancel": "取消", "delete": "删除", "edit": "编辑", "create": "新建", "confirm": "确定" }, "auth": { "login": "登录", "register": "注册", "logout": "退出" } }
```
`public/locales/en/translation.json`:
```json
{ "app": { "name": "Homework · Parent Console" }, "common": { "save": "Save", "cancel": "Cancel", "delete": "Delete", "edit": "Edit", "create": "New", "confirm": "OK" }, "auth": { "login": "Log in", "register": "Sign up", "logout": "Log out" } }
```

- [ ] **Step 3: 接入 main.tsx** — 确认 `main.tsx` 顶部有 `import './i18n/config'`（Chunk 1 若用了占位，现替换为真实 import，删除占位 `export {}`）。
- [ ] **Step 4: 验证** — `cd console && npx tsc -b && npm run dev`，浏览器无报错、i18n 正常加载（控制台无 404 缺 locale）。
- [ ] **Step 5: commit** — `git commit -m "feat(console): i18next (zh-CN default, en) + base translations"`

---

## Chunk 3: UI 原语 + 布局 + 路由 + 认证页

目标：shadcn 风格 `components/ui/*`（套温暖亲和主题）、`AppLayout`（侧栏+守卫）、`App.tsx` 路由、认证四页。冒烟：注册→登录→落地首页占位。

### Task 3.1: shadcn 风格 UI 原语（`components/ui/*`）

**Files:** Create `console/src/components/ui/{button,card,input,label,textarea,select,switch,badge,separator,dialog,dropdown-menu,table,scroll-area}.tsx`.

- [ ] **Step 1: `button.tsx`（范式，其余同法）**

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-brand-500 text-white hover:bg-brand-600 shadow-soft',
        accent: 'bg-accent-500 text-white hover:bg-accent-600',
        outline: 'border border-ink/15 bg-white hover:bg-paper text-ink',
        ghost: 'hover:bg-ink/5 text-ink',
        destructive: 'bg-error-500 text-white hover:opacity-90',
      },
      size: { default: 'h-11 px-5', sm: 'h-9 px-3 text-sm', icon: 'h-10 w-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
export { buttonVariants }
```

- [ ] **Step 2: 其余原语**：`card`(rounded-xl bg-white shadow-soft)、`input`/`textarea`/`label`(表单)、`select`/`switch`/`dialog`/`dropdown-menu`(Radix 封装)、`badge`/`separator`/`table`/`scroll-area`。**照 `D:\WorkSpaces\lehmansoft\port-shield\console\src\components\ui\*.tsx` 的 shadcn 写法**，把颜色换成本主题 token（brand/accent/paper/ink/star）。每个文件一个职责、用 `cn()`。

- [ ] **Step 3: typecheck** — `cd console && npx tsc -b`；Expected 0 error。
- [ ] **Step 4: commit** — `git commit -m "feat(console): shadcn-style UI primitives themed warm"`

### Task 3.2: `AppLayout` + `App.tsx` 路由

**Files:** Create `console/src/components/layout/AppLayout.tsx`; Modify `console/src/App.tsx`; Create `console/src/components/{LanguageSwitcher,UserMenu}.tsx`.

- [ ] **Step 1: `AppLayout.tsx`**（守卫 + 侧栏 + 顶栏 + `<Outlet/>`）

```tsx
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { UserMenu } from '@/components/UserMenu'
import { Home, Users, CalendarDays, ClipboardCheck, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const nav = [
  { to: '/home', icon: Home, key: 'nav.home' },
  { to: '/children', icon: Users, key: 'nav.children' },
  { to: '/schedule', icon: CalendarDays, key: 'nav.schedule' },
  { to: '/board', icon: ClipboardCheck, key: 'nav.board' },
  { to: '/goals', icon: Target, key: 'nav.goals' },
]

export function AppLayout() {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  if (isInitializing) return <div className="grid h-full place-items-center text-muted">加载中…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex h-full">
      <aside className="hidden w-60 flex-col gap-1 border-r border-ink/10 bg-white p-4 lg:flex">
        <div className="mb-4 px-2 text-lg font-bold text-brand-600">学习小伙伴</div>
        {nav.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 font-medium ${isActive ? 'bg-brand-50 text-brand-600' : 'text-ink hover:bg-ink/5'}`}>
            <Icon size={18} /> {t(key)}
          </NavLink>
        ))}
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-end gap-3 border-b border-ink/10 bg-white px-6 py-3">
          <LanguageSwitcher /> <UserMenu />
        </header>
        <main className="flex-1 overflow-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `LanguageSwitcher.tsx` + `UserMenu.tsx`**（简单：语言下拉 zh-CN/en 存 localStorage；用户菜单显示 `user.userName` + 资料/改密/退出，触发 `ProfileDialog`/`ChangePasswordDialog`（Chunk 6 建，先留占位按钮）+ `useAuthStore().logout()`）。

- [ ] **Step 3: `App.tsx` 路由**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { HomePage } from '@/features/home/HomePage'
import { ChildrenPage } from '@/features/children/ChildrenPage'
import { WeeklyTemplatePage } from '@/features/schedule/WeeklyTemplatePage'
import { DailyBoardPage } from '@/features/board/DailyBoardPage'
import { FamilyGoalsPage } from '@/features/goals/FamilyGoalsPage'

export default function App() {
  useEffect(() => { useAuthStore.getState().initialize() }, [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/schedule" element={<WeeklyTemplatePage />} />
          <Route path="/board" element={<DailyBoardPage />} />
          <Route path="/goals" element={<FamilyGoalsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  )
}
```
> 上面 import 的页面组件在 Chunk 3.3 + 4/5/6 建。**为让本 chunk 可编译，先为每个未建页面放一个最小占位**（如 `export function HomePage(){return <div>首页</div>}`），后续 chunk 替换实现。

- [ ] **Step 4: typecheck + 起服** — `npx tsc -b && npm run dev`；未登录访问 `/` → 跳 `/login`。
- [ ] **Step 5: commit** — `git commit -m "feat(console): AppLayout guard + router + shell"`

### Task 3.3: 认证四页

**Files:** Create `console/src/features/auth/{LoginPage,RegisterPage,ForgotPasswordPage,ResetPasswordPage}.tsx`.

- [ ] **Step 1: `LoginPage.tsx`**（用户名+密码 → `authStore.login` → 跳 `/home`；错误 toast）

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const nav = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    try { await login(userName, password); nav('/home') }
    catch (err) { toast.error(getErrorMessage(err, '登录失败，请检查账号密码')) }
    finally { setBusy(false) }
  }
  return (
    <div className="grid h-full place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold text-brand-600">登录</h1>
        <div className="space-y-1"><Label>用户名</Label><Input value={userName} onChange={(e) => setUserName(e.target.value)} required /></div>
        <div className="space-y-1"><Label>密码</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? '登录中…' : '登录'}</Button>
        <div className="flex justify-between text-sm text-muted">
          <Link to="/register" className="hover:text-brand-600">注册家长号</Link>
          <Link to="/forgot-password" className="hover:text-brand-600">忘记密码？</Link>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: `RegisterPage.tsx`**（用户名/邮箱/密码 + **同意勾选**门禁 → `authStore.register` → 跳 `/home`；捕获邮箱确认分支）

```tsx
// 关键点：
// - 同意勾选 consent（useState false）；未勾选时提交按钮 disabled。
// - onSubmit: await register({ userName, emailAddress, password })
//   成功 → nav('/home')
//   catch → 若错误提示指向"邮箱确认/未激活"，toast.info('注册成功，请查收邮件完成验证后再登录') 并 nav('/login')；
//           否则 toast.error(getErrorMessage(err))
// 结构同 LoginPage：加 emailAddress 字段 + <input type="checkbox" checked={consent}> + 同意文案链接。
```
> 完整 JSX 照 LoginPage 范式扩展。同意文案："我已阅读并同意《儿童隐私与家长同意声明》"（占位链接；服务端强制留 DEPLOY）。

- [ ] **Step 3: `ForgotPasswordPage.tsx`**（邮箱 → `sendPasswordResetLink(email)` → toast「若邮箱存在已发送重置链接」）。

- [ ] **Step 4: `ResetPasswordPage.tsx`**（从 `useSearchParams()` 读 `userId`+`token`；新密码 → `resetPassword(userId, token, password)` → toast 成功 → 跳 `/login`）。

- [ ] **Step 5: typecheck** — `npx tsc -b` 0 error。
- [ ] **Step 6: 冒烟（需后端在跑）**：`npm run dev`，`/register` 注册一个新家长（勾同意）→ 应自动登录跳 `/home`；退出后 `/login` 用该号或 `demo`/`1q2w3E*` 登录成功。
- [ ] **Step 7: commit** — `git commit -m "feat(console): auth pages (login/register+consent/forgot/reset)"`

---

## Chunk 4: `homeworkService`（全量）+ 孩子特性（CRUD 范式）

目标：一次写全 4 个服务的调用封装；把「孩子」特性做全，确立 react-query 列表/表单/删除确认/toast 的**范式**，后续特性照抄。

### Task 4.1: `src/services/homeworkService.ts`（4 服务全部调用）

**Files:** Create `console/src/services/homeworkService.ts`.

- [ ] **Step 1: 写全部封装**（URL/verb/body 对齐 spec API 面）

```ts
import { api } from './api'
import type {
  ListResult, ChildProfileDto, CreateChildDto, UpdateChildProfileDto, SetChildPinDto,
  WeeklyTaskTemplateItemDto, CreateWeeklyTaskTemplateItemDto, UpdateWeeklyTaskTemplateItemDto, GetWeeklyTemplateInput,
  DailyTaskDto, CreateDailyTaskDto, UpdateDailyTaskDto, GetDailyBoardInput, DailyBoardDto,
  FamilyGoalDto, CreateUpdateFamilyGoalDto,
} from '@/types/homework'

// ---- child-profile ----
export const listChildren = () => api.get<ListResult<ChildProfileDto>>('/api/app/child-profile').then((r) => r.data.items)
export const getChild = (id: string) => api.get<ChildProfileDto>(`/api/app/child-profile/${id}`).then((r) => r.data)
export const createChild = (dto: CreateChildDto) => api.post<ChildProfileDto>('/api/app/child-profile', dto).then((r) => r.data)
export const updateChild = (id: string, dto: UpdateChildProfileDto) => api.put<ChildProfileDto>(`/api/app/child-profile/${id}`, dto).then((r) => r.data)
export const deleteChild = (id: string) => api.delete(`/api/app/child-profile/${id}`)
export const setChildPin = (id: string, dto: SetChildPinDto) => api.post(`/api/app/child-profile/${id}/set-pin`, dto)

// ---- weekly-task-template ----
export const listWeeklyTemplates = (input: GetWeeklyTemplateInput) =>
  api.get<ListResult<WeeklyTaskTemplateItemDto>>('/api/app/weekly-task-template', { params: input }).then((r) => r.data.items)
export const createWeeklyTemplate = (dto: CreateWeeklyTaskTemplateItemDto) => api.post<WeeklyTaskTemplateItemDto>('/api/app/weekly-task-template', dto).then((r) => r.data)
export const updateWeeklyTemplate = (id: string, dto: UpdateWeeklyTaskTemplateItemDto) => api.put<WeeklyTaskTemplateItemDto>(`/api/app/weekly-task-template/${id}`, dto).then((r) => r.data)
export const deleteWeeklyTemplate = (id: string) => api.delete(`/api/app/weekly-task-template/${id}`)

// ---- daily-task ----
export const getDailyBoard = (input: GetDailyBoardInput) => api.post<DailyBoardDto>('/api/app/daily-task/get-board', input).then((r) => r.data)
export const createDailyTask = (dto: CreateDailyTaskDto) => api.post<DailyTaskDto>('/api/app/daily-task', dto).then((r) => r.data)
export const updateDailyTask = (id: string, dto: UpdateDailyTaskDto) => api.put<DailyTaskDto>(`/api/app/daily-task/${id}`, dto).then((r) => r.data)
export const deleteDailyTask = (id: string) => api.delete(`/api/app/daily-task/${id}`)
export const revokeDailyTask = (id: string) => api.post(`/api/app/daily-task/${id}/revoke`)
export const restoreDailyTask = (id: string) => api.post(`/api/app/daily-task/${id}/restore`)

// ---- family-goal ----
export const listGoals = () => api.get<ListResult<FamilyGoalDto>>('/api/app/family-goal').then((r) => r.data.items)
export const getGoal = (id: string) => api.get<FamilyGoalDto>(`/api/app/family-goal/${id}`).then((r) => r.data)
export const createGoal = (dto: CreateUpdateFamilyGoalDto) => api.post<FamilyGoalDto>('/api/app/family-goal', dto).then((r) => r.data)
export const updateGoal = (id: string, dto: CreateUpdateFamilyGoalDto) => api.put<FamilyGoalDto>(`/api/app/family-goal/${id}`, dto).then((r) => r.data)
export const deleteGoal = (id: string) => api.delete(`/api/app/family-goal/${id}`)
```

- [ ] **Step 2: 单测**（mock `./api`，断言 URL/verb/body/返回映射）— `homeworkService.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
import { api } from './api'
import { listChildren, createChild, getDailyBoard, revokeDailyTask } from './homeworkService'

beforeEach(() => vi.clearAllMocks())
describe('homeworkService', () => {
  it('listChildren unwraps items', async () => {
    ;(api.get as any).mockResolvedValue({ data: { items: [{ id: '1' }] } })
    expect(await listChildren()).toEqual([{ id: '1' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/child-profile')
  })
  it('createChild posts dto', async () => {
    ;(api.post as any).mockResolvedValue({ data: { id: 'x' } })
    await createChild({ displayName: '哥哥', grade: 3 })
    expect(api.post).toHaveBeenCalledWith('/api/app/child-profile', { displayName: '哥哥', grade: 3 })
  })
  it('getDailyBoard posts to /get-board', async () => {
    ;(api.post as any).mockResolvedValue({ data: { stars: 3 } })
    await getDailyBoard({ childId: 'c', date: '2026-07-05' })
    expect(api.post).toHaveBeenCalledWith('/api/app/daily-task/get-board', { childId: 'c', date: '2026-07-05' })
  })
  it('revokeDailyTask posts to /{id}/revoke', async () => {
    await revokeDailyTask('t1'); expect(api.post).toHaveBeenCalledWith('/api/app/daily-task/t1/revoke')
  })
})
```
Run `npx vitest run src/services/homeworkService.test.ts` → 4 passed（先 red 后 green）。
- [ ] **Step 3: commit** — `git commit -m "feat(console): homeworkService (4 app services wrappers) + tests"`

### Task 4.2: `ConfirmDialog` + `useChildren` hooks + `ChildrenPage`（范式）

**Files:** Create `console/src/components/ConfirmDialog.tsx`, `console/src/hooks/useChildren.ts`, `console/src/features/children/{ChildrenPage,ChildFormDialog,SetPinDialog}.tsx`.

- [ ] **Step 1: `ConfirmDialog.tsx`**（`useConfirm()` 返回 `(title,msg)=>Promise<boolean>`；对标 port-shield `ConfirmDialog.tsx`）。用于删除确认。

- [ ] **Step 2: `hooks/useChildren.ts`**（react-query 范式）

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listChildren, createChild, updateChild, deleteChild, setChildPin } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateChildDto, UpdateChildProfileDto, SetChildPinDto } from '@/types/homework'

const KEY = ['children']
export const useChildren = () => useQuery({ queryKey: KEY, queryFn: listChildren })

export function useChildMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateChildDto) => createChild(d), onSuccess: () => { invalidate(); toast.success('已添加') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: UpdateChildProfileDto }) => updateChild(a.id, a.dto), onSuccess: () => { invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteChild(id), onSuccess: () => { invalidate(); toast.success('已删除') }, onError: onErr }),
    setPin: useMutation({ mutationFn: (a: { id: string; dto: SetChildPinDto }) => setChildPin(a.id, a.dto), onSuccess: () => { invalidate(); toast.success('PIN 已更新') }, onError: onErr }),
  }
}
```

- [ ] **Step 3: `ChildrenPage.tsx`**（列表卡片/表格 + 新建按钮 + 每行 编辑/设PIN/删除）

```tsx
// 结构：
// const { data: children = [], isLoading } = useChildren()
// const m = useChildMutations(); const confirm = useConfirm()
// 顶部：标题「孩子」+ <Button onClick={()=>openForm()}>新建</Button>
// 列表：children.map -> Card{ displayName, `${grade}年级`, hasPin?'已设PIN':'未设PIN',
//        操作: [编辑->openForm(child)] [设PIN->openPin(child)] [删除-> if(await confirm('删除孩子？','将移除该孩子及其数据'))(m.remove.mutate(id))] }
// <ChildFormDialog/> 受控：新建->m.create.mutate(dto)；编辑->m.update.mutate({id,dto})
// <SetPinDialog/>：4 位数字校验 ^\d{4}$，或清除(空)-> m.setPin.mutate({id,dto:{pin}})
// isLoading -> 骨架/「加载中…」；空 -> 引导「先添加一个孩子」
```

- [ ] **Step 4: `ChildFormDialog.tsx`**（displayName 必填≤32、grade 1-12 select、avatarKey 预设头像选择可选）+ `SetPinDialog.tsx`（pin 输入，校验 `^\d{4}$`，含「清除 PIN」）。表单本地校验 + 提交回调由父页传入。

- [ ] **Step 5: typecheck + 冒烟**（后端在跑）：`npx tsc -b`；`npm run dev` 登录 demo → `/children` 看到「哥哥/弟弟」；新建一个孩子、编辑、设/清 PIN、删除，均即时刷新 + toast。
- [ ] **Step 6: commit** — `git commit -m "feat(console): children feature (CRUD + set-pin) — reference pattern"`

---

## Chunk 5: 每周模板 + 每日看板

照 Chunk 4 范式（`hooks/use*` + `*Page` + `*Dialog` + `useConfirm` + toast）。两特性都先选一个孩子（顶部 child 选择器；从 `useChildren()` 取）。

### Task 5.1: 每周模板（`schedule/`）

**Files:** Create `console/src/hooks/useWeeklyTemplates.ts`, `console/src/features/schedule/{WeeklyTemplatePage,TemplateItemDialog}.tsx`.

- [ ] **Step 1: `useWeeklyTemplates.ts`**：`useWeeklyTemplates(childId)` → `useQuery(['weekly',childId], ()=>listWeeklyTemplates({childId}))`（enabled: !!childId）。`useWeeklyMutations(childId)`：create/update/delete，`onSuccess` invalidate `['weekly',childId]` + toast（同 useChildren 范式）。
- [ ] **Step 2: `WeeklyTemplatePage.tsx`**：
  - 顶部：child 选择器（下拉，默认首个孩子）。
  - 主体：**按星期分 7 列/7 段**（周一~周日，`DayOfWeek` 1..6,0）。每段列出该天的模板项（按 `order`），每项显示 `title`、`subject`、`estimatedMinutes`、`isActive` 开关。
  - 操作：每段「+ 添加」→ `TemplateItemDialog`（预置该 dayOfWeek）；每项「编辑/删除」；`isActive` 用 `Switch` 直接 `update`（把整项 DTO 带上，翻转 isActive）。
  - 排序 MVP：用「上移/下移」按钮改 `order`（±1，两项交换后各 `update`）；不做拖拽。
- [ ] **Step 3: `TemplateItemDialog.tsx`**：字段 dayOfWeek(新建时预置/可改)、title(必填≤128)、subject?(≤64)、order(数字)、estimatedMinutes?(1..600)、isActive(编辑时)。校验后回调父页。
- [ ] **Step 4: typecheck + 冒烟**：选中「哥哥」→ 某天加 2 个任务 → 编辑 → 切 isActive → 上移/删除，均即时刷新。
- [ ] **Step 5: commit** — `git commit -m "feat(console): weekly task template feature (per-child weekly grid)"`

### Task 5.2: 每日看板（`board/`）

**Files:** Create `console/src/hooks/useDailyBoard.ts`, `console/src/features/board/{DailyBoardPage,DailyTaskDialog}.tsx`, `console/src/components/StarRating.tsx`.

- [ ] **Step 1: `StarRating.tsx`**：入参 `stars`(0-5)，渲染 5 个星（实心用 `--color-star` 金黄，空心灰）。lucide `Star`。
- [ ] **Step 2: `useDailyBoard.ts`**：`useDailyBoard(childId,date)` → `useQuery(['board',childId,date], ()=>getDailyBoard({childId,date}))`（enabled: !!childId）。`useBoardMutations(childId,date)`：create/update/delete/**revoke/restore**，全部 `onSuccess` invalidate `['board',childId,date]` + toast（撤销/恢复文案：「已撤销」「已恢复」）。
- [ ] **Step 3: `DailyBoardPage.tsx`**：
  - 顶部：child 选择器 + **日期选择器**（`<input type="date">`，默认今天 `new Date().toISOString().slice(0,10)`）。
  - 汇总条：`<StarRating stars={board.stars}/>` + 「X/Y 完成」；`isRestDay` → 显示「休息日」；`isFull` → 高亮「满勤 🎉」（文字即可，不做重动效）。
  - 任务列表：每项显示 `title`/`subject`/`order`；状态徽标：`countsAsCompleted` → 绿「已完成」；`isCompleted && reviewState===1(Revoked)` → 灰「已撤销」；未完成 → 「未完成」。
  - 操作：完成且未撤销的项 → 「撤销」(`revoke`)；已撤销 → 「恢复」(`restore`)；每项「编辑/删除」；顶部「+ 手动添加任务」→ `DailyTaskDialog`（预置当前 childId+date）。
  - 说明：家长**不能**代孩子标记完成（无此 API）；完成由孩子游戏端做。撤销/恢复即家长的「审阅」。
- [ ] **Step 4: `DailyTaskDialog.tsx`**：title(必填≤128)、subject?、order。create→`createDailyTask({childId,date,...})`；edit→`updateDailyTask(id,{...})`。
- [ ] **Step 5: typecheck + 冒烟**：选「哥哥」+ 今天 → 看到由每周模板懒生成的任务 + 星星；对某完成项「撤销」→ 星星/完成数即时变化 → 「恢复」还原；手动加一个任务。
- [ ] **Step 6: commit** — `git commit -m "feat(console): daily board feature (get-board + revoke/restore + stars)"`

---

## Chunk 6: 家庭目标 + 首页 + 账户 + 翻译 + 终测

### Task 6.1: 家庭目标（`goals/`）+ `ProgressBar`

**Files:** Create `console/src/components/ProgressBar.tsx`, `console/src/hooks/useGoals.ts`, `console/src/features/goals/{FamilyGoalsPage,GoalFormDialog}.tsx`.

- [ ] **Step 1: `ProgressBar.tsx`**：入参 `percent`(0-100)，圆角进度条（填充用 brand/accent 渐变），旁显 `xx%`。
- [ ] **Step 2: `useGoals.ts`**：`useGoals()` → `useQuery(['goals'], listGoals)`；`useGoalMutations()`：create/update/delete（范式同前）。
- [ ] **Step 3: `FamilyGoalsPage.tsx`**：列表卡片，每张显示 `title`、`<ProgressBar percent={goal.progressPercent}/>`、`currentStars/targetStars ★`、`rewardText`、周期 `startDate~endDate`、`isAchieved` → 「已达成 🎉」徽标。操作：新建/编辑/删除。
- [ ] **Step 4: `GoalFormDialog.tsx`**：title(必填≤128)、targetStars(≥1 数字)、rewardText?(≤256)、startDate/endDate(`type=date`，校验 end≥start)。create/update 用同一个 `CreateUpdateFamilyGoalDto`。
- [ ] **Step 5: typecheck + 冒烟**：建一个目标（目标 20 星、本周）→ 进度条按 `currentStars` 显示。
- [ ] **Step 6: commit** — `git commit -m "feat(console): family goals feature (CRUD + progress)"`

### Task 6.2: 首页（`home/`）

**Files:** Create `console/src/features/home/HomePage.tsx`.

- [ ] **Step 1: `HomePage.tsx`**（汇总，不引入新端点）：
  - `const { data: children=[] } = useChildren()`；`const today = new Date().toISOString().slice(0,10)`。
  - **每个孩子一张卡**：卡内用 `useDailyBoard(child.id, today)`（或对 children 循环渲染子组件 `<ChildTodayCard child today/>`，各自 `useDailyBoard`）显示 `<StarRating stars={board.stars}/>` + 「今日 X/Y」+ 快捷「查看看板」(跳 `/board` 带该 child)。
  - **家庭目标区**：`useGoals()` → 列出各目标 `<ProgressBar/>`。
  - 说明：无历史/日历（spec 决策）；每孩子今日 board 是 1 次 `get-board` 调用（N 个孩子 = N 次，孩子数很小，可接受）。
- [ ] **Step 2: typecheck + 冒烟**：登录 demo → `/home` 显示哥哥/弟弟今日星星 + 目标进度。
- [ ] **Step 3: commit** — `git commit -m "feat(console): home dashboard (today boards + goals)"`

### Task 6.3: 账户弹窗（`account/`）+ 接入 UserMenu

**Files:** Create `console/src/features/account/{ProfileDialog,ChangePasswordDialog}.tsx`; Modify `console/src/components/UserMenu.tsx`.

- [ ] **Step 1: `ProfileDialog.tsx`**：`GET /api/account/my-profile` 取（userName/email/name/surname + `concurrencyStamp`）→ 可编辑表单 → `PUT /api/account/my-profile`（带回 `concurrencyStamp`）→ toast。
- [ ] **Step 2: `ChangePasswordDialog.tsx`**：currentPassword + newPassword → `changePassword` → toast。
- [ ] **Step 3: `UserMenu.tsx`**：把 Chunk 3 的占位换成真实——下拉含「资料」(开 ProfileDialog)、「修改密码」(开 ChangePasswordDialog)、「退出」(`logout()` → 跳 `/login`)。
- [ ] **Step 4: typecheck + 冒烟**：改资料/改密走通（改密后用新密码重登）。
- [ ] **Step 5: commit** — `git commit -m "feat(console): account (profile/change-password) + user menu"`

### Task 6.4: 补全翻译 + eslint + 全量终测

- [ ] **Step 1: 补 `public/locales/{zh-CN,en}/translation.json`** 各页用到的键（nav.*、children.*、schedule.*、board.*、goals.*、account.* 等）。UI 文案尽量走 `t()`；至少 zh-CN 完整，en 可后补但键要在（避免缺键报错）。
- [ ] **Step 2: 全量检查** — `cd console && npx tsc -b && npm run lint && npx vitest run`；Expected：0 type error、lint 通过（warning 可接受）、全部单测 passed。
- [ ] **Step 3: 端到端冒烟（后端在跑）**：`npm run dev`，走完整链路——注册新家长（含同意勾选）→ 自动登录 → 建孩子 → 该孩子建每周模板 → 每日看板看到懒生成任务、撤销/恢复看星星变化 → 建家庭目标看进度 → 首页汇总 → 改资料/改密 → 退出。全程无 401 弹登录（refresh 生效）、错误有 toast。
- [ ] **Step 4: commit** — `git commit -m "feat(console): complete translations; typecheck+lint+tests green"`

---

## Acceptance criteria（对齐 spec）

- [ ] `cd console && npm run dev` 起在 5173；`npx tsc -b`、`npm run lint`、`npx vitest run` 全绿。
- [ ] 未登录访问受保护路由 → `/login`；能注册（含同意门禁）并自动登录；能用 `demo`/`1q2w3E*` 登录。
- [ ] 孩子 CRUD + 设/清 PIN；每周模板按孩子按星期 CRUD/启停/排序；每日看板选日期、撤销/恢复、手动增删改、显示星星/满勤/休息日；家庭目标 CRUD + 进度条；首页汇总今日看板 + 目标进度。
- [ ] 401 触发 refresh 自动续期、对用户透明；登出清 token。
- [ ] 家长只见自己名下数据（后端保证；前端不发越权请求）。
- [ ] 温暖亲和主题生效（珊瑚橙/暖蓝绿/金黄星星/大圆角/柔阴影）。

## Out of scope
运营 admin 分析面板、多日历史/日历视图、2FA、孩子账号绑定/孩子游戏端(④)、PWA、服务端同意强制、部署、官网(③)。

## Open items to confirm at implementation
- shadcn 原语从 port-shield 逐个移植时的具体 Radix 版本/属性差异（以能编译+主题正确为准）。
- 头像 `avatarKey` 预设集（先用 4-6 个 emoji/色块占位）。
- 依赖版本若 `npm install` 解析冲突，就近取可用稳定版（React 19 生态；对齐 port-shield 已验证的版本更稳）。
- en 翻译可后补，但键要齐。

