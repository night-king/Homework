# 部署与上线清单（homework.today）

本项目从“家庭自部署雏形”转向公开产品：家长自助注册、单一全局实例、数据按家长归属隔离。下面是公网上线前必做的安全与运维项。

## 本地运行（开发）

1. PostgreSQL 跑在 `localhost:5433`（`postgres` / `postgres`，库 `Homework`）。
2. 建库、迁移、播种（示例家庭 demo + 哥哥/弟弟，Parent 默认角色）：
   `cd backend/src/Homework.DbMigrator && dotnet run`
3. 启动 API 宿主：
   `cd backend/src/Homework.HttpApi.Host && dotnet run`
   - 地址：`https://localhost:44394`
   - Swagger：`/swagger`
4. 家长端开发：
   `cd frontend/parent-web && npm run dev`
5. 孩子端原型：
   直接打开 `frontend/child-web-prototype/child-homepage.html`
6. 账号：
   - 运营超管：`admin` / `1q2w3E*`
   - 示例家长：`demo` / `1q2w3E*`

> `DbMigrator` 和 `Homework.HttpApi.Host` 必须在各自项目目录下运行，否则读不到对应的 `appsettings.json`。

## 上线前必做（安全加固）

- [ ] **HTTPS / 正式证书**：换掉 dev 证书；OpenIddict 使用正式加密/签名证书。
- [ ] **密钥移出明文**：数据库连接串、证书口令等改用 user-secrets、环境变量或密钥库。
- [ ] **注册防滥用**：增加限流、验证码、邮箱黑名单策略。
- [ ] **邮箱验证**：开启注册邮箱确认并接入真实邮件服务。
- [ ] **家长同意服务端校验**：当前同意勾选主要是客户端门禁；上线前必须服务端强制并留痕。
- [ ] **生产错误页与日志**：关闭 DeveloperExceptionPage，接入日志与告警。
- [ ] **安全响应头 / CORS / Cookie**：按生产环境收紧。
- [ ] **隐私与儿童数据合规**：完善隐私政策、同意记录、删除策略。

## 合规提示

面向儿童的公开产品需满足可验证的家长同意要求。当前系统已采用“家长账号在上、孩子为家长名下档案”的模型；上线前仍需补齐服务端同意、隐私声明、数据留存与删除流程。
