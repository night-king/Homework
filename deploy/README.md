# 裸机部署（Ubuntu + supervisor + nginx + .NET 10 runtime，Cloudflare 小橙云 + 灵活SSL）

面向单实例小流量自部署。前端两站都是**静态包**（无 Node 常驻），真正的服务只有 **PostgreSQL + ABP API 宿主**。

两个域名、两个 nginx 站点，互不影响：
- **`homework.today`（＋`www`）＝官网**：`frontend/site` 的 Astro 静态站（宣传/SEO）。
- **`app.homework.today`＝应用**：家长端 SPA（`frontend/parent-web`）＋ 反代 API（`/api /connect /blob /swagger`）。孩子游戏端也在这个 SPA 里（`/play/*`）。

Cloudflare SSL 都用**灵活(Flexible)**：边缘对访客是 https，回源走 http:80，**源站只监听 80、不需要证书**。

```
                          ┌─ homework.today / www ──http:80──> nginx(官网) ── 静态 dist/ (Astro 官网)
浏览器 ──https──> Cloudflare┤
        (橙云,边缘缓存,灵活SSL)└─ app.homework.today ──http:80──> nginx(应用) ┬─ 静态 dist/ (家长端 SPA)
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
  web/          <- frontend/parent-web/dist/*   （应用：app.homework.today）
  site/         <- frontend/site/dist/*         （官网：homework.today）
/var/log/homework/     <- supervisor 日志
```

---

## 0. 先决：三处代码级要点（本仓库已处理，说明原因）

- **OpenIddict 证书**：Production 下 Host 用 `AddProductionEncryptionAndSigningCertificate("openiddict.pfx", …)`，**缺文件就崩**。用 `deploy/gen-openiddict-pfx.sh` 生成（口令已与源码对齐）。
- **反代 https 识别**：Host 已加 `UseForwardedHeaders`（读 `X-Forwarded-Proto`）。灵活模式下 CF↔源站是 http，所以 nginx **固定发 `X-Forwarded-Proto: https`**（公网访客始终 https），否则 OpenIddict 判定非安全传输、拒绝 `/connect/token`（登录/刷新全废）。
- **资产 /blob**：`/blob/{key}` 端点已放开到生产，配合 `AssetCdnBaseUrl=https://app.homework.today/blob` 同域名出图（CF 会缓存）。想用 OSS 就把 `Aliyun` 配置填上、`AssetCdnBaseUrl` 指到 OSS/CDN，此端点自动闲置。

> 改了 Host 代码后**必须重新 publish**（本仓库 `output/HttpApiHost` 已是修复后版本）。发布命令：
> `dotnet publish backend/src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj -c Release -r linux-x64 --no-self-contained -o output/HttpApiHost`

---

## 1. Cloudflare 设置（灵活 / Flexible SSL）

1. DNS 记录都指向服务器 IP、**代理开启（橙云）**：
   - `homework.today`（根 / apex）—— 官网
   - `www`（CNAME/A 到同 IP，或在 CF 加规则 301 到根域）—— 官网
   - `app`（A/AAAA）—— 应用
2. SSL/TLS → 概览：模式 **灵活 (Flexible)**。边缘对访客 https、回源 http:80 —— **源站只监听 80、不装证书**。（整个 zone 生效，官网与应用同一模式。）
3. SSL/TLS → 边缘证书：开启 **Always Use HTTPS**（把 http 访客在边缘跳 https，保证后端始终认作 https）。
4. （可选）缓存 → 页面规则：对 `app.homework.today/api/*`、`/connect/*` 设 **Bypass Cache**，避免误缓存接口。
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

sudo mkdir -p /var/www/homework/{api,dbmigrator,web,site} /var/log/homework
sudo chown -R www-data:www-data /var/www/homework /var/log/homework
```

内存兜底（4G 机器建议加 2G swap）：
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. PostgreSQL 建库

逐条执行（比 heredoc 稳，粘贴不会断行）。数据库名 **`"Homework"` 必须带双引号**——ABP 连接串是 `Database=Homework`，不带引号 PG 会折成小写 `homework`、对不上。

```bash
sudo -u postgres psql -c "CREATE USER homework WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c 'CREATE DATABASE "Homework" OWNER homework;'
```

让 `homework` 当库 owner，PG 15/16/17 下对 `public` schema 自动有建表权限，两条即可。PG 较老或想显式补权限，再跑（幂等）：

```bash
sudo -u postgres psql -c 'GRANT ALL PRIVILEGES ON DATABASE "Homework" TO homework;'
sudo -u postgres psql -d Homework -c 'GRANT ALL ON SCHEMA public TO homework;'
```

> 引号：外层用单引号让 SQL 的 `"Homework"` 原样传入；建用户那条密码是单引号，故外层改双引号。密码别含 `$` `` ` `` 等 shell 特殊字符。
> 验证：`sudo -u postgres psql -c '\l' | grep -i homework`。
> （默认端口 5432。`shared_buffers` 保持默认或 ~256MB 即可，别跟 .NET 抢内存。）

---

## 4. 上传产物

先在本地构建两个前端（Node 环境，服务器上不需要 Node）：
```bash
# 官网（Astro 静态站）
cd frontend/site && npm ci && npm run build      # 产出 frontend/site/dist

# 家长端 SPA
cd frontend/parent-web && npm ci && npm run build # 产出 frontend/parent-web/dist
```

把四份产物传上去（scp/rsync）：
```
output/HttpApiHost/*          -> /var/www/homework/api/
output/DbMigrator/*           -> /var/www/homework/dbmigrator/
frontend/parent-web/dist/*    -> /var/www/homework/web/    （应用）
frontend/site/dist/*          -> /var/www/homework/site/   （官网）
```

---

## 5. 生成 OpenIddict 证书

```bash
cd /var/www/homework/api
# 把 deploy/gen-openiddict-pfx.sh 传上来或直接粘贴
bash gen-openiddict-pfx.sh          # 产出 ./openiddict.pfx（供 supervisor 的 directory= 加载）

# ⚠️ 关键：脚本 chmod 600 使证书只有【属主】可读。若你用 root 生成，属主就是 root，
#    而 Host 进程以 www-data 运行 → 读不到证书会崩（CryptographicException: Permission denied → 登录 502）。
#    生成后务必把属主改回 www-data：
sudo chown www-data:www-data /var/www/homework/api/openiddict.pfx
```

> 保险起见，凡是以 root 在 `/var/www/homework` 下建过文件（pfx、appsettings、App_Data/blobs 等），都统一归还给运行用户：
> `sudo chown -R www-data:www-data /var/www/homework`

---

## 6. 改配置

supervisor 已设 `ASPNETCORE_ENVIRONMENT=Production`，Host 启动会自动用 `appsettings.Production.json` **覆盖** `appsettings.json`。所以**别动发布出来的 `appsettings.json`**，只放一份 Production 覆盖文件（重新 publish 时不会被冲掉，密钥也不进 base 文件）：

```bash
cp deploy/appsettings.Production.sample.json /var/www/homework/api/appsettings.Production.json
# 编辑它，删掉 _comment 行，填：
```
- `ConnectionStrings:Default` → 指向本机 Postgres（用户 `homework` / 你的密码）。
- `App:SelfUrl`、`App:CorsOrigins` → `https://app.homework.today`。
- `App:AssetCdnBaseUrl` → `https://app.homework.today/blob`（同域名出图）。
- `StringEncryption:DefaultPassPhrase` → 换成稳定且保密的串（**别改来改去**，改了解不开旧数据）。
- `Seed`（可选）→ 首次布种宠物时用，见 7.5 节；平时保持 `PlayDemo:"false"`。

> ⚠️ **DbMigrator 不吃 `appsettings.Production.json`**（它没设 Production 环境变量）。所以 dbmigrator 目录要**直接改它自己的 `appsettings.json`** 的 `ConnectionStrings:Default`（与 api 一致），或跑之前 `export ASPNETCORE_ENVIRONMENT=Production` 并放一份 Production 覆盖。
>
> 更稳妥的做法是把连接串/口令放环境变量或 user-secrets，而非明文 json（见根 `DEPLOY.md`）。

---

## 7. 迁移数据库（跑一次）

```bash
cd /var/www/homework/dbmigrator
dotnet Homework.DbMigrator.dll
```
建表 + 种子（运营超管 `admin`、示例家长 `demo`、角色）。完成即退出。

> DbMigrator 只种账号/角色，**不种宠物**。孩子端要有伙伴可选，见下节布种。

---

## 7.5 布种初始宠物（可选，但孩子端要玩就得有）

初始两只宠物（火龙 / 光之英雄）由 Host 的 `PlayDemoSeeder` 种入，**需要美术文件**且靠 `Seed:PlayDemo` 开关触发（默认关，幂等）。

1. 把仓库里的美术目录传到服务器（约 20 个 png/mp4）：
   ```
   frontend/child-web-prototype/assets/pets/*   ->   /var/www/homework/api/pet-art/
   ```
   传完归属给运行用户：`sudo chown -R www-data:www-data /var/www/homework/api/pet-art`
2. 在 `/var/www/homework/api/appsettings.Production.json` 打开开关（参考 sample 的 `Seed` 段）：
   ```json
   "Seed": { "PlayDemo": "true", "PetArtDir": "/var/www/homework/api/pet-art" }
   ```
3. 重启 Host 触发布种（要先做完第 8 节起服）：`sudo supervisorctl restart homework-api`，
   看日志出现「已种物种 火龙 / 光之英雄」：`grep 已种物种 /var/www/homework/api/Logs/logs.txt`。
4. **种完把 `PlayDemo` 改回 `"false"`** 再 `restart`（避免每次重启都跑；幂等所以留着也无害，但关掉更干净）。

> 定位美术目录的优先级：`Seed:PetArtDir` → Host 运行目录旁的 `pet-art/` → dev 的 `.git` 仓库路径。所以你也可以直接把美术放到 `/var/www/homework/api/pet-art` 而不配 `PetArtDir`。
> 之后想加更多宠物：登录 `admin` 在「图鉴管理 → 宠物」手动建、传素材、激活即可。

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

# 应用：app.homework.today（家长端 SPA + 反代 API）
sudo cp deploy/nginx/homework.conf /etc/nginx/sites-available/homework
sudo ln -s /etc/nginx/sites-available/homework /etc/nginx/sites-enabled/

# 官网：homework.today + www（Astro 静态站）
sudo cp deploy/nginx/homework-site.conf /etc/nginx/sites-available/homework-site
sudo ln -s /etc/nginx/sites-available/homework-site /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

---

## 10. 验证

- `https://homework.today/` → 官网首页加载；点内页（`/how` `/safety` `/faq` `/about` 及 `/legal/*`）都通；页面里的 CTA 跳到 `https://app.homework.today`。
- `https://app.homework.today/` → 家长端加载、能登录（`admin` / `1q2w3E*` 或 `demo` / `1q2w3E*`，见根 DEPLOY.md）。
- 登录后能创建旅程、设置孩子 PIN；进孩子模式 PIN 生效。
- `https://app.homework.today/swagger` 可访问（如不想暴露可在 nginx 屏蔽 `/swagger`）。

---

## 11. 更新发版

- **官网**：本地 `cd frontend/site && npm run build` → 传 `dist/` 覆盖 `/var/www/homework/site/`（CF 记得 Purge 缓存）。纯静态，不用重启任何服务。
- **家长端**：本地 `cd frontend/parent-web && npm run build` → 传 `dist/` 覆盖 `/var/www/homework/web/`（CF 记得 Purge 缓存，或给 index.html 已设 no-cache）。
- **后端**：本地 `dotnet publish …` → 传覆盖 `/var/www/homework/api/` → `sudo supervisorctl restart homework-api`。有新迁移则先在 dbmigrator 目录跑一次 DbMigrator。
  - **覆盖时别删这些运行期文件**（它们不在 publish 产物里）：`openiddict.pfx`、`appsettings.Production.json`、`App_Data/blobs/`（本地资产图）、`pet-art/`（若用它布过种）。用 `rsync` 时对这些加 `--exclude`，或干脆只覆盖 dll/依赖。
  - 覆盖后若有 root 建的新文件，记得 `sudo chown -R www-data:www-data /var/www/homework/api`。

---

## 12. 上线加固清单

见仓库根 `DEPLOY.md`（HTTPS/证书、密钥移出明文、注册防滥用、邮箱验证、家长同意服务端校验、生产错误页、安全响应头、儿童数据合规）。本目录只覆盖“把它跑起来”，加固项请务必逐条过——尤其把 Flexible 升级为 Full(strict)、以及只放行 CF IP 段。
