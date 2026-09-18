# 漫格 MangaGrid — AI 漫画创作平台

> 派生自 shortify-ai（复用认证/积分/COS/生图基础设施），专注 **网文 → 条漫/页漫** 垂直流水线。
> 当前版本已从 shortify 短剧（dramas）全面切换到漫画（comics）领域。

## 定位

不做"漫画生成器"（大厂拼画质），做 **网文条漫生产线**：

- 输入小说章节/创意 → 角色卡 → 分格脚本 → 批量生图 → 气泡文字 → 阅读/分享/续写
- 差异化：① 中文对话气泡自动排版（图字分离）② 跨格角色一致性开箱即用（角色卡+参考图）③ 存量网文一键漫改 ④ 跨话长连载（续写复用角色卡，形象不漂移）

## 核心工作流

```
Step1 输入创意       → 粘贴小说章节 / 一句话创意 / 模板（/comic/new）
Step2 AI 漫画脚本    → 分幕分格：每格 = 场景 + 角色 + 台词 + 旁白（JSON，扣 2 积分）
Step3 角色卡         → AI 提取角色 + 外貌描述 → 每角色生成参考图（锁定形象，扣 2/张）
Step4 分格确认       → 工作台网格布局，可编辑台词/场景/顺序/气泡方位
Step5 批量生图       → 每格带角色参考图生成，进度跟踪 + 单格重试（扣 1/格）
Step6 续写 / 阅读    → 续写下一话（复用角色卡，chapter_number+1）/ 阅读器（气泡渲染）/ 分享
```

## 当前技术栈与运行

| 类别 | 现状 |
|------|------|
| 框架 | Next.js 16 + React 19 + Tailwind v4 + shadcn/ui（亮色 AI 紫） |
| 数据库 | PostgreSQL + Drizzle ORM（库 `shortify_ai`，便携版 `.localdb/` 管理） |
| 认证 | NextAuth v5（邮箱+密码，JWT） |
| 编剧 | 智谱 GLM / Qwen 结构化 JSON（`MOCK_SCRIPT=1` 走查用 mock） |
| 生图 | 阿里百炼 qwen-image-3.0 / wan2.7-image（模型可配，`MOCK_IMAGES=1` 走查用占位图） |
| 存储 | 腾讯云 COS 私有桶 + 签名 URL 代理；未配置则存本地 `uploads/` |
| 积分 | 注册送 200，脚本 2 / 角色参考图 2 / 每格生图 1；充值档位见 `lib/constants.ts`（模拟支付，预留真实支付字段） |

## 数据模型（lib/db/comic-schema.ts）

```
comics            作品（id, user_id, title, description, source, source_text, genre, style,
                   layout_type(strip|page), status, chapter_count, cover_url, share_token, share_count）
comic_characters  角色卡（id, comic_id, name, role(protagonist|supporting|villain), gender,
                  age, appearance, personality, reference_image_url）—— 跨格一致性核心
comic_chapters    话（id, comic_id, chapter_number(每作品唯一), title, script_content(jsonb), status）
comic_panels      格（id, chapter_id, panel_number(每话唯一), scene_desc, characters, dialogue,
                  narration, bubble_side, image_url, regen_count, status）
```

- 复用平台表：`users` / `user_passwords` / `usage_logs` / `credit_recharges`（充值订单）
- 一次性续写：`comic_chapters.chapter_number` = 当前最大 + 1，角色卡复用不重建

## 页面结构（实际）

```
/                        → Landing（SaaS 风）
/sign-in /sign-up        → 认证
/dashboard               → 作品列表（卡片网格，封面/进度/删除）
/comic/new               → 创建向导（创意→题材→画风→版式）
/comic/[comicId]         → 编辑工作台（角色卡 / 分镜编辑 / 批量生图 / 续写下一话）
/comic/[comicId]/read    → 阅读器（气泡渲染，章节切换）
/share-comic/[token]     → 公开分享页（只读 + 分享计数）
/settings                → 积分/充值/模型配置/统计
```

## API（实际）

```
POST/GET  /api/comics                    创建作品（扣脚本积分，异步生成脚本）/ 列表
GET/PATCH/DELETE /api/comics/[comicId]   详情 / 更新 / 删除
POST /api/comics/[comicId]/characters    生成角色卡（AI 提取 + 参考图）
POST /api/comics/[comicId]/panels        批量生图（逐格，带参考图）
POST /api/comics/[comicId]/panels/reorder  分格顺序重排（事务）
PATCH /api/comics/[comicId]/panels/[panelId]  单格编辑（场景/台词/旁白/气泡方位）
POST /api/comics/[comicId]/chapters      续写下一话（复用角色卡，扣 2 积分，chapter_number+1）
GET  /api/share-comic/[token]            分享数据
GET/POST /api/user/credits...            积分查询 / 充值（模拟支付）
GET  /api/user/model-configs / api/model-configs  模型配置
/api/uploads/[...path]                   静态/代理
/api/auth/...                            认证
```

## 开发里程碑

- [x] M1 骨架：建库 + schema + 布局 / 认证跑通
- [x] M2 脚本引擎：AI 漫画脚本生成（分幕分格 JSON）
- [x] M3 角色卡 + 参考图生图（一致性提示词注入）
- [x] M4 分格编辑器 + 批量生图（进度 / 单格重试 / 顺序重排）
- [x] M5 气泡引擎 + 阅读器
- [x] M6 分享页 + Dashboard + 积分充值闭环（模拟支付）
- [x] M7 续写下一话（跨话连载，复用角色卡）

**待办（Roadmap）**
- [ ] 部署上线（PM2 + Nginx）
- [ ] 页漫(page) 布局完善
- [ ] 模板市场（预设漫改模板）
- [x] 导出 PDF（逐格拼版）
- [x] 账号自服务（忘记密码 / 邮箱验证 / 头像）
- [ ] Dashboard 编辑/复制、作品搜索/排序、生图成本提示

## 成本核算（单话 20 格，估算）

| 项 | 单价 | 小计 |
|---|---|---|
| 脚本（GLM） | ~0.1 | 0.1 |
| 角色卡参考图 3 张 | ~0.1 × 3 | 0.3 |
| 分格生图 20 张 | ~0.1 × 20 | 2.0 |
| **合计** | | **≈ 2.4 元/话** |

> 开发/走查阶段可用 `MOCK_IMAGES=1` + `MOCK_SCRIPT=1` 零成本联调；真实生图建议接入 GLM-Image（0.1 元/张，中文渲染强）控本。

## 竞品差异

- vs 即梦/可灵：他们卖单图/单视频能力，无网文→条漫流水线
- vs Liblib：LoRA 门槛高（要炼丹），我们角色卡开箱即用
- vs 剪映图文成片：无 AI 剧本和批量；模板非原创漫剧
