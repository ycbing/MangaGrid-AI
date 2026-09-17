# 漫格 MangaGrid — AI 漫画创作平台

> 派生自 shortify-ai（复用认证/积分/COS/生图基础设施），专注 **网文 → 条漫/页漫** 垂直流水线。

## 定位

不做"漫画生成器"（大厂拼画质），做 **网文条漫生产线**：
- 输入小说章节/创意 → 角色卡 → 分格脚本 → 批量生图 → 气泡文字 → 阅读/导出/分享
- 差异化：① 中文对话气泡自动排版（图字分离）② 跨格角色一致性开箱即用（角色卡+参考图）③ 存量网文一键漫改

## 核心工作流（6 步）

```
Step1 输入创意       → 粘贴小说章节 / 一句话创意 / 模板
Step2 AI 漫画脚本    → 分幕分格：每格 = 场景 + 角色 + 台词 + 旁白（JSON）
Step3 角色卡         → AI 提取角色 + 外貌描述 → 每角色生成参考图（锁定形象）
Step4 分格确认       → 网格布局（条漫/页漫模板），可编辑台词/场景/顺序
Step5 批量生图       → 每格带角色参考图生成，保持跨格一致
Step6 气泡+导出      → 角色台词渲染成对话气泡 → 阅读器 / 导出 PNG+PDF / 分享
```

## 技术方案

- **框架**: Next.js 16 + Tailwind v4 + shadcn/ui（从 shortify-ai 继承）
- **数据库**: PostgreSQL (story-craft-pg 容器) + Drizzle ORM，新库 `manga_ai`
- **认证**: NextAuth v5（邮箱+密码，JWT），用户/积分/密码表复用
- **生图**: 智谱 cogview-3-plus / wan2.7-image（模型可配，model-resolver 复用）
- **存储**: 腾讯云 COS 私有桶 + 签名 URL 代理（复用 cos-storage）
- **积分**: 注册送 100，脚本 2 / 角色参考图 2 / 每格生图 1
- **部署**: PM2，端口 **3010**，nginx 子路径 `/manga` 或独立域名

## 数据模型

```sql
comics            -- 漫画作品
  id, user_id, title, description, source(原创|网文|模板),
  style(漫画风格), layout_type(strip|page), status(draft|script_ready|...|completed),
  cover_url, share_token, share_count, created_at, updated_at

comic_characters  -- 角色卡（一致性核心）
  id, comic_id, name, role(主角|配角), gender, appearance(外貌描述),
  reference_image_url(参考图，生图时注入), voice_hint

comic_chapters    -- 话
  id, comic_id, chapter_number, title,
  script_content(jsonb: scenes[] {scene_id, desc, panels[]}), status, created_at

comic_panels      -- 格（生图单元）
  id, chapter_id, panel_number, scene_desc, character_names[],
  dialogue(台词), narration(旁白), bubble_side(left|right|top|bottom|center),
  image_url, local_path, regen_count, created_at

-- 复用: users / user_passwords / usage_logs / generation_tasks(可选)
```

## 页面结构

```
/                     → Landing（SaaS 风，复用 shortify 设计语言）
/sign-in /sign-up     → 认证（复用）
/dashboard            → 作品列表（卡片网格，封面/进度/操作）
/create               → Step1 创意输入（粘贴章节/创意/模板）
/create?step=2        → Step2 脚本确认（分幕分格展示，可改）
/create?step=3        → Step3 角色卡（提取角色+外貌，生成参考图）
/create?step=4        → Step4 分格编辑器（网格/列表，编辑台词场景）
/create?step=5        → Step5 批量生图（逐格进度，重试单格）
/create?step=6        → Step6 气泡预览 + 导出（阅读器/PNG/PDF/分享）
/comic/[id]           → 阅读器（条漫滚动/页漫翻页，气泡渲染）
/share/[token]        → 公开分享页（只读，shareCount）
/settings             → 积分/模型配置/统计（复用）
```

## API

```
POST /api/comics                   创建作品（扣脚本积分，异步生成脚本）
GET  /api/comics                   列表
GET  /api/comics/[id]              详情（含章节/角色）
PATCH/DELETE /api/comics/[id]
POST /api/comics/[id]/characters   生成角色卡（AI 提取 + 参考图）
POST /api/comics/[id]/panels       批量生图（逐格，带参考图）
POST /api/comics/[id]/export       导出 PDF（逐格拼版）
POST /api/comics/[id]/clone        复制作品
/api/uploads/[...path]             静态/代理（复用）
/api/share/[token]                 分享数据
```

## 开发里程碑

- [ ] M1 骨架：建库 + schema + 依赖清理 + 布局/认证跑通
- [ ] M2 脚本引擎：AI 漫画脚本生成（GLM，场景/分格/台词 JSON）
- [ ] M3 角色卡 + 参考图生图（一致性提示词注入）
- [ ] M4 分格编辑器 + 批量生图（进度/重试）
- [ ] M5 气泡引擎（图字分离，SVG/canvas 渲染）+ 阅读器
- [ ] M6 导出（PNG 单格/PDF 整话）+ 分享页 + Dashboard
- [ ] M7 部署（3010 + PM2 + nginx）

## 成本核算（单话 20 格）

| 项 | 单价 | 小计 |
|---|---|---|
| 脚本 (GLM) | ~0.05 | 0.05 |
| 角色卡参考图 3 张 | 0.04 × 3 | 0.12 |
| 分格生图 20 张 | 0.04 × 20 | 0.80 |
| **合计** | | **≈ 1 元/话** |

## 竞品差异（摘自 COMPETITOR-ANALYSIS）

- vs 即梦/可灵：他们卖单图/单视频能力，无网文→条漫流水线
- vs Liblib：LoRA 门槛高（要炼丹），我们角色卡开箱即用
- vs 剪映图文成片：无 AI 剧本和批量；模板非原创漫剧