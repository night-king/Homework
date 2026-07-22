# 裸机部署（Ubuntu + supervisor + nginx + .NET 10 runtime，Cloudflare 小橙云 + 灵活SSL）

面向单实例小流量自部署。前端是**静态包**（无 Node 常驻），真正的服务只有 **PostgreSQL + ABP API 宿主**。
域名：**homework.today**。Cloudflare SSL 用**灵活(Flexible)**：边缘对访客是 https，回源走 http:80，**源站只监听 80、不需要证书**。

```
浏览器 ──https──> Cloudflare(橙云,边缘缓存,灵活SSL) ──http:80──> nginx(源站) ┬─ 静态 dist/ (家长端)
                                                                        ├─ /api /connect /blob /swagger ──http(127.0.0.1:5000)──> Kestrel(supervisor)
                                                                        └─ 其余 → index.html (SPA 回退)
Kestrel ──> PostgreSQL(127.0.0.1:5432)
DbMigrator：一次性跑，建表+种子，不进 supervisor
```

目录约定：
```
/var/www/homework/
  api/          <- output/HttpApiHost/*  ＋ openiddict.pfx  ＋ 改过的 appsettings.json
  dbmigrator/   <- output/DbMigrator/*   ＋ 改过的 appsettings.json（连接串与 api 一致）
  web/          <- frontend/parent-web/dist/*
/var/log/homework/     <- supervisor 日志
```

---

## 0. 先决：三处代码级要点（本仓库已处理，说明原因）

- **OpenIddict 证书**：Production 下 Host 用 `AddProductionEncryptionAndSigningCertificate("openiddict.pfx", …)`，**缺文件就崩**。用 `deploy/gen-openiddict-pfx.sh` 生成（口令已与源码对齐）。
- **反代 https 识别**：Host 已加 `UseForwardedHeaders`（读 `X-Forwarded-Proto`）。灵活模式下 CF↔源站是 http，所以 nginx **固定发 `X-Forwarded-Proto: https`**（公网访客始终 https），否则 OpenIddict 判定非安全传输、拒绝 `/connect/token`（登录/刷新全废）。
- **资产 /blob**：`/blob/{key}` 端点已放开到生产，配合 `AssetCdnBaseUrl=https://homework.today/blob` 同域名出图（CF 会缓存）。想用 OSS 就把 `Aliyun` 配置填上、`AssetCdnBaseUrl` 指到 OSS/CDN，此端点自动闲置。

> 改了 Host 代码后**必须重新 publish**（本仓库 `output/HttpApiHost` 已是修复后版本）。发布命令：
> `dotnet publish backend/src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj -c Release -r linux-x64 --no-self-contained -o output/HttpApiHost`

---

## 1. Cloudflare 设置（灵活 / Flexible SSL）

1. DNS 把 `homework.today` 的 A/AAAA 记录指向服务器 IP，**代理开启（橙云）**。
2. SSL/TLS → 概览：模式 **灵活 (Flexible)**。边缘对访客 https、回源 http:80 —— **源站只监听 80、不装证书**。
3. SSL/TLS → 边缘证书：开启 **Always Use HTTPS**（把 http 访客在边缘跳 https，保证后端始终认作 https）。
4. （可选）缓存 → 页面规则：对 `homework.today/api/*`、`/connect/*` 设 **Bypass Cache**，避免误缓存接口。
5. **（强烈建议）安全**：Flexible 下源站是明文 http，务必用防火墙/安全组**只放行 Cloudflare IP 段**访问 80（IP 段见 `deploy/nginx/cloudflare-realip.conf`），杜绝有人直连源 IP 走明文。

> ⚠️ 灵活模式下 **CF↔源站是明文 http（经公网）**，令牌/密码在这一段不加密。面向儿童数据+登录的产品，建议尽快升级到 **Full (strict) + Cloudflare 源证书**（成本极低：nginx 改监听 443 + 装源证书即可，git 历史里有对应配置）。

---

## 2. 服务器准备（Ubuntu）

```bash
sudo apt update
sudo apt install -y nginx supervisor postgresql

# .NET 10 ASP.NET Core 运行时（Ubuntu 24.04 示例；换成你的版本号）
wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O /tmp/pmc.deb
sudo dpkg -i /tmp/pmc.deb && sudo apt update
sudo apt install -y aspnetcore-runtime-10.0
# 若源里暂时没有 10.0，用官方脚本：
#   curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0 --runtime aspnetcore --install-dir /usr/share/dotnet
#   sudo ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet
dotnet --list-runtimes   # 应看到 Microsoft.AspNetCore.App 10.0.x

sudo mkdir -p /var/www/homework/{api,dbmigrator,web} /var/log/homework
sudo chown -R www-data:www-data /var/www/homework /var/log/homework
```

内存兜底（4G 机器建议加 2G swap）：
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. PostgreSQL 建库

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE "Homework";
CREATE USER homework WITH PASSWORD 'CHANGE_ME';
GRANT ALL PRIVILEGES ON DATABASE "Homework" TO homework;
\c Homework
GRANT ALL ON SCHEMA public TO homework;
SQL
```
（默认端口 5432。`shared_buffers` 保持默认或 ~256MB 即可，别跟 .NET 抢内存。）

---

## 4. 上传产物

把本地构建好的三份传上去（scp/rsync）：
```
output/HttpApiHost/*          -> /var/www/homework/api/
output/DbMigrator/*           -> /var/www/homework/dbmigrator/
frontend/parent-web/dist/*    -> /var/www/homework/web/
```

---

## 5. 生成 OpenIddict 证书

```bash
cd /var/www/homework/api
# 把 deploy/gen-openiddict-pfx.sh 传上来或直接粘贴
bash gen-openiddict-pfx.sh          # 产出 ./openiddict.pfx（供 supervisor 的 directory= 加载）
```

---

## 6. 改配置

编辑 `/var/www/homework/api/appsettings.json`（参考 `deploy/appsettings.Production.sample.json`）：
- `ConnectionStrings:Default` → 指向本机 Postgres（用户 `homework` / 你的密码）。
- `App:SelfUrl`、`App:CorsOrigins` → `https://homework.today`。
- `App:AssetCdnBaseUrl` → `https://homework.today/blob`（同域名出图）。
- `StringEncryption:DefaultPassPhrase` → 换成稳定且保密的串（**别改来改去**，改了解不开旧数据）。

同样修改 `/var/www/homework/dbmigrator/appsettings.json` 的 `ConnectionStrings:Default`（与 api 一致）。

> 更稳妥的做法是把连接串/口令放环境变量或 user-secrets，而非明文 json（见根 `DEPLOY.md`）。

---

## 7. 迁移数据库（跑一次）

```bash
cd /var/www/homework/dbmigrator
dotnet Homework.DbMigrator.dll
```
建表 + 种子（运营超管 `admin`、示例家长 `demo`、角色）。完成即退出。

> 注意：生产不会自动种宠物（PlayDemoSeeder 仅 Development）。宠物物种要登录后在图鉴后台手动建并激活，孩子端才有伙伴可选。

---

## 8. 起 API（supervisor）

```bash
sudo cp deploy/supervisor/homework-api.conf /etc/supervisor/conf.d/
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl start homework-api
sudo supervisorctl status homework-api          # RUNNING
tail -f /var/log/homework/api.err.log           # 看启动日志（Serilog 也写 api 目录 Logs/logs.txt）
```
本机自测：`curl -s http://127.0.0.1:5000/api/abp/application-configuration | head -c 200`

---

## 9. 配 nginx

```bash
sudo cp deploy/nginx/cloudflare-realip.conf /etc/nginx/snippets/
sudo cp deploy/nginx/homework.conf /etc/nginx/sites-available/homework   # 已按 homework.today + 灵活模式(80) 配好
sudo ln -s /etc/nginx/sites-available/homework /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 10. 验证

- `https://homework.today/` → 家长端加载、能登录（`admin` / `1q2w3E*` 或 `demo` / `1q2w3E*`，见根 DEPLOY.md）。
- 登录后能创建旅程、设置孩子 PIN；进孩子模式 PIN 生效。
- `https://homework.today/swagger` 可访问（如不想暴露可在 nginx 屏蔽 `/swagger`）。

---

## 11. 更新发版

- **前端**：本地 `npm run build` → 传 `dist/` 覆盖 `/var/www/homework/web/`（CF 记得 Purge 缓存，或给 index.html 已设 no-cache）。
- **后端**：本地 `dotnet publish …` → 传覆盖 `/var/www/homework/api/`（保留 `openiddict.pfx` 和你改过的 `appsettings.json`）→ `sudo supervisorctl restart homework-api`。有新迁移则先在 dbmigrator 目录跑一次 DbMigrator。

---

## 12. 上线加固清单

见仓库根 `DEPLOY.md`（HTTPS/证书、密钥移出明文、注册防滥用、邮箱验证、家长同意服务端校验、生产错误页、安全响应头、儿童数据合规）。本目录只覆盖“把它跑起来”，加固项请务必逐条过——尤其把 Flexible 升级为 Full(strict)、以及只放行 CF IP 段。
