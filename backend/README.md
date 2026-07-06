# Backend

这里存放 Homework.today 的 ABP / .NET 后端。

## 目录

- `src/`：应用源码
- `test/`：xUnit 测试工程
- `Homework.slnx`：后端 solution
- `common.props` / `NuGet.Config`：共享构建配置
- `.runtime/`：本地运行时产物（不提交）

## 环境要求

- 需要 .NET SDK 10 预览版
- 建议在仓库根目录执行 `dotnet --version`，确认命中 `global.json` 指定的 SDK
- 首次 `restore` / `build` 需要访问 NuGet

## 常用命令

### 构建

```powershell
cd backend
dotnet build Homework.slnx
```

### 迁移与播种

```powershell
cd backend/src/Homework.DbMigrator
dotnet run
```

### 启动 API

```powershell
cd backend/src/Homework.HttpApi.Host
dotnet run
```

Swagger：`https://localhost:44394/swagger`

### 测试

```powershell
cd backend
dotnet test test/Homework.Domain.Tests/Homework.Domain.Tests.csproj
dotnet test test/Homework.Application.Tests/Homework.Application.Tests.csproj
dotnet test test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj
```
