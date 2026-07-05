# 部署与上线清单（homework.today）

本项目从"家庭自部署雏形"转向**公开产品**（Phase 4 起）：家长自助注册、单一全局实例、数据按家长归属隔离。下面是**公网上线前必做**的安全/运维项——**Phase 4 只把注册跑通并留下这份清单，具体加固在临上线时做。**

## 本地运行（开发）
1. PostgreSQL 跑在 `localhost:5433`（`postgres`/`postgres`，库 `Homework`）。
2. 建库 + 迁移 + 播种（示例家庭 demo + 哥哥/弟弟，Parent 默认角色）：
   `cd src/Homework.DbMigrator && dotnet run`
3. 起 API 宿主：`cd src/Homework.HttpApi.Host && dotnet run` → https://localhost:44394（Swagger 在 /swagger）
   - 前端（家长端/孩子端，各自子项目）通过该 API 的 `/connect/token` 密码流登录、`/api/app/*` 调用。
   - 后端已 headless：无 Razor 页面；注册走 `POST /api/account/register`。
4. 账号：运营超管 `admin` / `1q2w3E*`；示例家长 `demo`（demo@homework.today）/ `1q2w3E*`。
> DbMigrator / Homework.HttpApi.Host 必须**在各自项目目录**下运行，否则读不到 `appsettings.json`（见记忆 `abp-postgres-stack`）。

## 上线前必做（安全加固——尚未实现）
- [ ] **HTTPS / 正式证书**：换掉 dev 证书；OpenIddict 用正式加密/签名证书（`openiddict.pfx`，已有非 dev 分支，配好口令来源）。
- [ ] **密钥移出明文**：`appsettings*.json` 里的数据库连接串口令、证书口令等，改用 **user-secrets / 环境变量 / 密钥库**，不入库、不进镜像。
- [ ] **注册防滥用**：注册接口加**限流 + 验证码**（防批量刷号）；考虑域名/邮箱黑名单。
- [ ] **邮箱验证**：开启注册**邮箱确认**（`Abp.Account.IsEmailConfirmationRequiredForLogin` 等设置 + 配 SMTP）。
- [ ] **同意的服务端校验**：目前家长同意勾选是**客户端**门禁（`/Account/Register` 的复选框 + 脚本）；上线需**服务端强制**（未成年人数据合规），并留存同意记录/时间戳。
- [ ] **错误页**：生产环境用 `UseErrorPage`（已有非 dev 分支），关掉 DeveloperExceptionPage，不外泄堆栈。
- [ ] **安全响应头 / CORS / Cookie**：HSTS、安全 Cookie、按需 CORS。
- [ ] **审计与监控**：ABP 审计已开；接日志/告警。
- [ ] **数据隐私**：孩子档案含姓名/年级等——最小化收集；隐私政策/家长同意声明落地成真实页面（现为占位文案）。

## 合规提示
面向儿童的公开产品需满足**可验证的家长同意**（COPPA / 未成年人个人信息保护）。当前模型已把"家长账号在上、孩子是其名下档案、孩子不自助注册"作为地基；上线前务必补齐服务端同意校验、隐私声明、数据留存/删除策略。
