# Homework.today

一个面向小学生家庭的作业激励产品仓库，目标是用“今日事今日毕 + 电子宠物激励”减轻家长陪作业负担。

## 仓库结构

- `backend/`：ABP / .NET 后端，包含 solution、源码、测试、DbMigrator、HttpApi.Host
- `frontend/parent-web/`：家长端 React + Vite 应用
- `frontend/child-web-prototype/`：孩子端高保真原型
- `docs/`：产品、工程、营销与归档文档

## 快速开始

### 开发环境

- 需要 .NET SDK 10 预览版；在仓库根目录运行 `dotnet --version` 应命中 `global.json` 指定的 10.0 SDK
- 首次还原/构建需要可访问 NuGet

### 后端

```powershell
dotnet build backend/Homework.slnx
cd backend/src/Homework.DbMigrator
dotnet run

# 另开一个终端
cd backend/src/Homework.HttpApi.Host
dotnet run
```

API 默认开发地址：`https://localhost:44394`

### 家长端

```powershell
cd frontend/parent-web
npm install
npm run dev
```

### 孩子端原型

直接打开：`frontend/child-web-prototype/child-homepage.html`

## 文档索引

- 产品愿景：`docs/product/vision/2026-07-04-kids-homework-pet-game-design.md`
- 产品 backlog：`docs/product/backlog.md`
- 当前后端设计：`docs/engineering/specs/backend/`
- 当前前端设计：`docs/engineering/specs/frontend/`
- 当前工程文档说明：`docs/engineering/README.md`
- 营销文案：`docs/marketing/site-content.md`
- 历史实现资料：`docs/archive/`

## 说明

- 旧的 ABP 根级 `src/` / `test/` 已下沉到 `backend/`
- 可运行原型已从 `docs/` 移到 `frontend/`
- 已完成的实施计划会持续归档到 `docs/archive/`
- 仓库根目录的 `global.json` 用于固定后端所需的 .NET SDK 版本
- 详细部署与上线注意事项见 `DEPLOY.md`
