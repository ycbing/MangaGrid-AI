# MangaGrid AI 部署指南（PM2 + Nginx）

> 目标环境：Linux 服务器（Ubuntu/Debian 为例），单机部署 Next.js 生产模式 + Nginx 反代 + 独立 PostgreSQL。
> 完成后架构：`用户 → Nginx(80/443) → Next.js(PM2, 127.0.0.1:3010) → PostgreSQL(127.0.0.1:5432)`

## 1. 服务器要求

| 项 | 最低 | 推荐 |
|---|---|---|
| CPU / 内存 | 1C / 2G | 2C / 4G（批量生图 + PDF 拼版吃内存，PM2 限 1G 自动重启） |
| 磁盘 | 40G | 80G+（未接 COS 时图片存本地 `uploads/`，按量增长） |
| 系统 | Ubuntu 22.04 | 同左 |
| 软件 | Node.js ≥ 20、PostgreSQL ≥ 15、Nginx | |

> `middleware.ts` 与部分依赖要求 Node ≥ 18，建议直接装 20 LTS：`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`

## 2. 安装基础软件

```bash
sudo apt update
sudo apt install -y postgresql nginx git
sudo npm i -g pm2
```

## 3. 初始化 PostgreSQL

生产使用系统级 PostgreSQL（不要用开发期的便携版 `.localdb/`）：

```bash
sudo -u postgres psql <<'SQL'
CREATE USER mangagrid WITH PASSWORD '强密码-自己生成';
CREATE DATABASE mangagrid OWNER mangagrid;
SQL
```

## 4. 拉取代码并配置环境

```bash
sudo mkdir -p /var/www/mangagrid && sudo chown $USER /var/www/mangagrid
cd /var/www/mangagrid
git clone <你的仓库地址> .
npm ci            # 默认含 devDependencies（构建需要 tailwind/typescript）
```

创建 `.env.local`（**生产清单如下，逐项核对**）：

```bash
cat > .env.local <<'EOF'
# ---- 必填 ----
DATABASE_URL=postgresql://mangagrid:密码@127.0.0.1:5432/mangagrid
NEXTAUTH_URL=https://your-domain.com        # 必须是最终访问域名，含 https
NEXTAUTH_SECRET=openssl rand -hex 32 的输出
GLM_API_KEY=你的百炼/智谱 Key               # LLM 脚本 + 生图共用（见 lib/ai/model-resolver.ts）
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
UPLOAD_DIR=/var/www/mangagrid/uploads

# ---- 生产必须关闭 mock ----
# MOCK_IMAGES / MOCK_SCRIPT：不设置即默认关闭（走真实 AI）
# MOCK_PAYMENT：【默认是开启的！】必须显式设为 0，否则线上走模拟支付
MOCK_PAYMENT=0

# ---- 推荐：COS 对象存储（多机/扩容必须；不配则图片落本地 uploads/）----
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=ap-guangzhou

# ---- 推荐：SMTP（开启邮箱验证 / 忘记密码邮件）----
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_FROM_NAME=MangaGrid

# ---- 可选 ----
PANEL_CONCURRENCY=2          # 批量生图并发数，按供应商限流调整
ADMIN_USER_IDS=              # 模型配置管理页白名单（用户 id，逗号分隔）
PDF_FONT_PATH=               # 留空则自动探测，Linux 需安装: apt install fonts-noto-cjk
EOF
```

**生产注意事项（务必读）：**

1. **`ENCRYPTION_KEY` 不要手工设置**：首次运行会自动生成并写回 `.env.local`（见 `lib/crypto.ts`），用于加密数据库中保存的模型 API Key。**部署完成后立即备份整个 `.env.local`**——丢失该 Key 后 DB 里的模型配置将无法解密。
2. **mock 开关必须关闭**：`MOCK_IMAGES`/`MOCK_SCRIPT` 不设置即为关闭；`MOCK_PAYMENT` 语义相反——**默认开启**（`lib/constants.ts` 判断 `!== "0"`），生产必须显式设置 `MOCK_PAYMENT=0`，否则充值全是模拟支付。
3. **`uploads/` 目录要持久化**：未接 COS 时它是唯一图片存储，部署更新不要删除；接 COS 后可忽略。
4. **中文字体**：PDF 导出依赖系统中文字体，`sudo apt install -y fonts-noto-cjk` 即可命中自动探测路径。

## 5. 建表与构建

```bash
npx drizzle-kit push        # 同步 schema 到生产库（首次执行；升级前先 pg_dump 备份）
npx tsx scripts/init-db.ts  # 初始化基础数据
npm run build
```

## 6. PM2 启动

```bash
pm2 start ecosystem.config.js   # 以 production 模式拉起，端口 3010
pm2 save                        # 保存进程列表
pm2 startup                     # 开机自启（按输出提示执行 sudo env ... 那条命令）
```

常用运维命令：

```bash
pm2 logs manga-ai          # 实时日志
pm2 restart manga-ai       # 重启
pm2 monit                  # 资源监控
```

## 7. Nginx 反代 + HTTPS

```bash
sudo cp /var/www/mangagrid/deploy/nginx.conf /etc/nginx/sites-available/mangagrid
sudo sed -i 's/your-domain.com/你的域名/g' /etc/nginx/sites-available/mangagrid
# 若未配置 COS（本地图片模式），确认配置中 /uploads/ 的 alias 路径与 UPLOAD_DIR 一致
sudo ln -s /etc/nginx/sites-available/mangagrid /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com    # 签发后自动改写 443 配置并续期
```

> 启用 HTTPS 后确认 `.env.local` 的 `NEXTAUTH_URL` 已是 `https://` 前缀，否则认证回调会跳错。

## 8. 上线验证

```bash
curl -s http://127.0.0.1:3010/api/health | jq
```

期望 `status: "healthy"`（database/cos/glm_api 三项全 ok；cos 未配置为 ok=false 属预期，此时走本地存储）。随后浏览器走一遍主流程：注册 → 创建作品 → 生图 → 阅读 → 导出 PDF。

## 9. 后续更新发布

```bash
cd /var/www/mangagrid
git pull
npm ci
npx drizzle-kit push       # 有 schema 变更时；先 pg_dump 备份
npm run build
pm2 restart manga-ai
```

回滚：`git checkout <上一个发布 commit>` 后重复 build + restart。

## 附注

- `server/ws-server.ts` 为 shortify 遗留的进度推送服务，漫画流程未使用（`src` 中无引用），**无需**随生产启动。
- `docker-compose.yml` 保留了容器化部署路径，但其默认环境变量仍是 shortify 时期的 GLM/VIDEO 默认值，采用前需按上文生产清单改写。
