<div align="center">

# 漫格 MangaGrid 🎨

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js)](package.json)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](package.json)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](lib/db/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F)](drizzle/)
![Status](https://img.shields.io/badge/status-production-22c55e)

### 📖 网文一键漫改，AI 漫画创作平台

**从一行创意到成品条漫/页漫：AI 编剧分镜 → 角色卡锁定形象 → 批量生图 → 中文气泡 → 阅读/导出/分享**

[🚀 快速开始](#-快速开始) · [📖 功能介绍](#-功能特性) · [🏗️ 项目架构](#-项目架构) · [🗺️ Roadmap](#-roadmap)

---

</div>

## 📸 效果概览

> **一张图看懂漫格的工作流：**

```mermaid
flowchart LR
    A["💡 输入创意<br/>小说章节 / 一句话创意"] --> B["🤖 AI 漫画脚本<br/>分幕分格 + 台词旁白 JSON"]
    B --> C["🎭 角色卡<br/>提取角色 + 生成参考图"]
    C --> D["🗂️ 分格确认<br/>条漫/页漫网格，可编辑"]
    D --> E["🖼️ 批量生图<br/>每格注入角色参考图"]
    E --> F["💬 气泡渲染 + 导出<br/>阅读器 / PNG+PDF / 分享"]

    style A fill:#7C3AED,color:#fff
    style B fill:#6366F1,color:#fff
    style C fill:#C026D3,color:#fff
    style D fill:#06B6D4,color:#fff
    style E fill:#10B981,color:#fff
    style F fill:#F59E0B,color:#222
```

## 🎯 为什么做漫格?

市面上的"漫画生成器"拼单图画质，但**网文 → 条漫**的关键工序（分镜、台词气泡、角色跨格一致）没人打通。漫格专注 **网文条漫生产线**：

- 🎭 **剧本** → 需要编剧拆解能力
- 🗂️ **分镜分格** → 需要导演/分镜师能力
- 🎨 **生图** → 需要美术 + 跨格角色一致性
- 💬 **台词气泡** → 需要排版（中文在 AI 生成图里几乎无法清晰呈现）

**漫格把这 4 步全部自动化。** 你只需要粘贴小说章节或一个创意，其余交给 AI。

---

## ✨ 功能特性

### 📖 网文一键漫改
- 粘贴小说章节 / 一句话创意 / 模板 → AI 自动拆解为**分幕分格脚本**
- 每格 = 场景描述 + 出场角色 + 台词 + 旁白 + 气泡方位（结构化 JSON）
- 支持玄幻/都市/古风/悬疑/恋爱/科幻等多种题材

### 🎭 角色卡锁定形象（跨格一致性）
- AI 自动提取角色 + 外貌描述 → 生成**参考图**锁定形象
- 每格生图自动注入角色参考图，**跨格不串脸**——开箱即用，无需学 LoRA 炼丹

### 🗂️ 分格确认与编辑
- 条漫(strip) / 页漫(page) 网格布局，分镜按话分组
- 可编辑台词 / 场景 / 顺序，"换一张"单格重试，角色重生成不回退状态

### 🖼️ 批量生图
- 逐格带角色参考图生成，进度跟踪 + 单格重试
- 阿里百炼 **qwen-image-3.0** 真实生图，2 并发池 + 429 限流重试

### 💬 中文气泡自动排版
- **图字分离**：台词渲染成漫画气泡、旁白独立成框，绕开 AI 画不出清晰中文的难题

### 📤 阅读 / 导出 / 分享
- 阅读器：章节切换、返回顶部、懒加载、气泡渲染
- 导出 PDF（逐格拼版，规划中，见 Roadmap）
- 公开分享页（只读）+ 分享计数

### ⚙️ 平台功能
- 🔐 **NextAuth JWT 登录**（邮箱 + 密码）
- 💰 **积分系统**（注册送 200：脚本 2 / 角色参考图 2 / 每格生图 1）
- 🎨 **多漫画风格**（日式漫画/古风/水彩/赛博朋克等）
- 📊 **创作看板**（作品卡片网格，封面/进度/操作）
- 🗑️ **作品管理**（编辑 / 删除 / 续写下一话）

---

## 🏗️ 项目架构

```
MangaGrid-AI/
├── app/                          # Next.js 16 App Router
│   ├── api/comics/               # 漫画 API
│   │   ├── route.ts              #   创建/列表
│   │   └── [comicId]/            #   详情/更新/删除、角色卡、批量生图
│   ├── api/share-comic/[token]   # 分享数据
│   ├── api/auth/                 # 认证（NextAuth v5）
│   ├── api/user/                 # 用户/积分/模型配置
│   ├── comic/
│   │   ├── new/                  # 创建向导（创意→脚本→角色→分格→生图→气泡）
│   │   ├── [comicId]/            # 编辑工作台
│   │   └── [comicId]/read/       # 阅读器（气泡渲染）
│   ├── dashboard/                # 创作看板（作品网格）
│   ├── share-comic/[token]       # 公开分享页
│   └── settings/                 # 积分/模型/统计
├── lib/ai/                       # AI 核心引擎
│   ├── comic-script-generator.ts #   漫画脚本生成（分幕分格 JSON）
│   ├── glm-client.ts             #   智谱 GLM / Qwen 调用
│   ├── wan-image-generator.ts    #   阿里百炼生图（qwen-image-3.0）
│   ├── image-generator.ts        #   生图路由/模型选择
│   ├── cos-storage.ts            #   腾讯云 COS
│   └── model-resolver.ts         #   模型配置解析
├── lib/db/
│   ├── schema.ts                 # 用户/认证/积分表
│   └── comic-schema.ts           # 漫画领域表（comics/characters/chapters/panels）
├── drizzle/                      # Drizzle 迁移
├── scripts/                      # init-db 等脚本
└── uploads/                      # 本地文件缓存
```

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **前端** | Next.js 16 (App Router) + React 19 |
| **UI** | Tailwind CSS v4 + shadcn/ui（亮色，AI 紫品牌色） |
| **数据库** | PostgreSQL + Drizzle ORM（新库 `manga_ai`） |
| **认证** | NextAuth.js v5 (JWT, Credentials) |
| **AI 编剧** | 智谱 GLM / Qwen（`qwen-plus` 结构化 JSON） |
| **AI 生图** | 阿里百炼 qwen-image-3.0 / wan2.7-image |
| **存储** | 腾讯云 COS（私有桶 + 签名 URL） |
| **部署** | PM2（端口 3010）+ Nginx（子路径 `/manga` 或独立域名） |

---

## 🚀 快速开始

### 前置条件

```bash
# 必需
Node.js >= 18
PostgreSQL >= 14

# 可选
# 阿里百炼 API Key（生图，qwen-image-3.0）
# 智谱 API Key（漫画脚本生成）
# 腾讯云 COS（云存储）
```

### 安装

```bash
# 1. 克隆
git clone https://github.com/ycbing/MangaGrid-AI.git
cd MangaGrid-AI

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，至少配置 DATABASE_URL 和 DASHSCOPE_API_KEY（或 GLM_API_KEY）

# 4. 初始化数据库
npm run db:push

# 5. 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 🎉

### 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接地址（建议指向 `manga_ai` 库） |
| `NEXTAUTH_SECRET` | ✅ | JWT 加密密钥 |
| `NEXTAUTH_URL` | ✅ | 站点地址（默认 `http://localhost:3000`） |
| `DASHSCOPE_API_KEY` | ✅* | 阿里百炼密钥（生图，qwen-image-3.0） |
| `GLM_API_KEY` | ⭕ | 智谱密钥（脚本生成，可选，否则用百炼 Qwen） |
| `COS_SECRET_ID` | ❌ | 腾讯云 COS SecretId |
| `COS_SECRET_KEY` | ❌ | 腾讯云 COS SecretKey |
| `COS_BUCKET` | ❌ | COS 存储桶 |
| `COS_REGION` | ❌ | COS 地域（默认 `ap-guangzhou`） |

> `DASHSCOPE_API_KEY` 与 `GLM_API_KEY` 至少配置其一即可跑通核心流程；COS 未配置时生图结果存本地 `uploads/`。

---

## 🧬 数据模型（简）

```
comics            → 漫画作品（标题/风格/布局 strip|page/状态/封面/分享token）
comic_characters  → 角色卡（外貌描述 + 参考图，跨格一致性核心）
comic_chapters    → 话（script_content: scenes[].panels[] 结构化脚本）
comic_panels      → 格（场景描述/角色/台词/旁白/气泡方位/生图URL/重试次数）
```

复用 `users` / `user_passwords` / `usage_logs` 等平台表。

---

## 🗺️ Roadmap

- [x] M1 骨架：建库 + schema + 布局 / 认证跑通
- [x] M2 脚本引擎：AI 漫画脚本生成（场景/分格/台词 JSON）
- [x] M3 角色卡 + 参考图生图（一致性提示词注入）
- [x] M4 分格编辑器 + 批量生图（进度/单格重试）
- [x] M5 气泡引擎（图字分离）+ 阅读器
- [x] M6 导出 + 分享页 + Dashboard
- [ ] 部署上线（3010 + PM2 + Nginx）
- [ ] 页漫(page) 布局完善
- [ ] 模板市场（预设漫改模板）
- [x] 续写下一话：复用角色卡跨话连载（角色档案持久化）

---

## 📄 许可证

MIT License — see [LICENSE](LICENSE)

---

<div align="center">

**Built with ❤️**

[![GitHub stars](https://img.shields.io/github/stars/ycbing/MangaGrid-AI?style=social)](https://github.com/ycbing/MangaGrid-AI/stargazers)

</div>
