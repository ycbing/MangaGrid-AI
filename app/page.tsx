import Link from "next/link";
import {
  BookOpen,
  Wand2,
  Users,
  MessageCircle,
  LayoutGrid,
  Share2,
  ArrowRight,
  Sparkles,
  Check,
  PenLine,
  Palette,
  Rocket,
} from "lucide-react";

/* ============================================================
   漫格 MangaGrid — Landing Page
   设计语言：亮色 + AI 紫(#7C3AED) 品牌色 + 青绿(#06B6D4) 点缀
   结构：Nav → Hero(光效+mock) → 价值对比 → 功能 → 流程 → 模板 → CTA → Footer
   ============================================================ */

const FEATURES = [
  {
    icon: BookOpen,
    title: "网文一键漫改",
    desc: "粘贴小说章节或一句话创意，AI 自动拆解为漫画脚本：分幕、分格、台词、旁白全部排好。",
    tint: "bg-violet-50 text-violet-600",
  },
  {
    icon: Users,
    title: "角色卡锁定形象",
    desc: "AI 提取角色生成参考图，每格生图自动注入，跨格不串脸——不用学 LoRA 炼丹。",
    tint: "bg-fuchsia-50 text-fuchsia-600",
  },
  {
    icon: MessageCircle,
    title: "中文气泡自动排版",
    desc: "图字分离：台词渲染成漫画气泡、旁白独立成框，绕开 AI 画不出清晰中文的难题。",
    tint: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: LayoutGrid,
    title: "条漫 / 页漫双版式",
    desc: "竖屏条漫适配抖音小红书，横版页漫用于平台连载，一键切换。",
    tint: "bg-amber-50 text-amber-600",
  },
  {
    icon: Palette,
    title: "六种画风",
    desc: "国漫厚涂、日漫、水墨国风、水彩、赛博朋克、Q版——覆盖主流题材审美。",
    tint: "bg-rose-50 text-rose-600",
  },
  {
    icon: Share2,
    title: "生成即分享",
    desc: "公开阅读链接 + 分享计数，作品一键发给读者，支持后续导出 PDF 整话。",
    tint: "bg-emerald-50 text-emerald-600",
  },
];

const STEPS = [
  { n: "01", t: "输入创意", d: "粘贴网文章节，或直接用热门模板", icon: PenLine },
  { n: "02", t: "AI 出脚本", d: "自动分幕分格，生成角色卡与台词", icon: Sparkles },
  { n: "03", t: "锁定角色", d: "一键生成参考图，形象不再漂移", icon: Users },
  { n: "04", t: "批量生图", d: "逐格生成，失败单格可重试", icon: Palette },
  { n: "05", t: "气泡成稿", d: "台词气泡 + 旁白自动排版", icon: MessageCircle },
  { n: "06", t: "阅读分享", d: "条漫阅读器，链接一键分享", icon: Share2 },
];

const TEMPLATES = [
  { emoji: "🐉", title: "修仙逆袭", chip: "玄幻 · 热门", theme: "废柴少年偶得神镜，器灵少女相伴逆袭", grad: "from-violet-500/10 to-fuchsia-500/10" },
  { emoji: "🏙️", title: "穿书女配", chip: "都市 · 甜爽", theme: "社畜穿成恶毒女配，绑定吐槽系统", grad: "from-cyan-500/10 to-blue-500/10" },
  { emoji: "🏮", title: "古风探案", chip: "古风 · 悬疑", theme: "纨绔世子暗藏锦衣卫身份查悬案", grad: "from-amber-500/10 to-orange-500/10" },
  { emoji: "🔍", title: "都市怪谈", chip: "悬疑 · 惊悚", theme: "深夜便利店的红裙女人，每晚十二点准时出现", grad: "from-slate-500/10 to-gray-500/10" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#F3EEFF_0%,#FFFFFF_55%)] text-[#221740] overflow-x-hidden">
      {/* ================= Nav ================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-violet-100/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200 group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[17px] tracking-tight">漫格 MangaGrid</div>
              <div className="text-[10px] text-violet-400 font-medium tracking-widest">AI COMIC STUDIO</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-violet-600 transition">功能</a>
            <a href="#how" className="hover:text-violet-600 transition">创作流程</a>
            <a href="#templates" className="hover:text-violet-600 transition">题材模板</a>
            <Link href="/dashboard" className="hover:text-violet-600 transition">我的作品</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="hidden sm:block text-sm text-gray-500 hover:text-violet-600 transition">
              登录
            </Link>
            <Link
              href="/comic/new"
              className="bg-gradient-to-r from-violet-600 to-purple-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all"
            >
              开始创作
            </Link>
          </div>
        </div>
      </header>

      {/* ================= Hero ================= */}
      <section className="relative max-w-6xl mx-auto px-4 pt-20 pb-24">
        {/* 背景装饰 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-violet-300/30 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/5 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-40 bg-gradient-to-r from-transparent via-violet-200/40 to-transparent blur-2xl" />
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* 文案侧 */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-violet-200 text-violet-700 text-[13px] font-medium shadow-sm mb-7 animate-[fadeUp_.6s_ease]">
              <Sparkles className="w-3.5 h-3.5" />
              AI 漫画创作平台 · 内测上线
            </div>
            <h1 className="text-[44px] sm:text-[56px] leading-[1.08] font-black tracking-tight animate-[fadeUp_.6s_.05s_ease_both]">
              把你的小说
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
                变成漫画
              </span>
            </h1>
            <p className="mt-6 text-[17px] leading-relaxed text-gray-500 max-w-md animate-[fadeUp_.6s_.1s_ease_both]">
              输入创意或粘贴小说章节，AI 自动生成脚本、锁定角色形象、批量画出分镜，
              中文台词气泡自动排版——零绘画基础，也能做自己的条漫。
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3.5 animate-[fadeUp_.6s_.15s_ease_both]">
              <Link
                href="/comic/new"
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all"
              >
                免费开始创作
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 bg-white border border-violet-200 px-8 py-4 rounded-2xl font-semibold text-gray-700 hover:border-violet-400 hover:text-violet-700 transition"
              >
                看看怎么用
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-gray-400 animate-[fadeUp_.6s_.2s_ease_both]">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 注册送 200 积分</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 一话成本低至 1 元</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 生成即分享</span>
            </div>
          </div>

          {/* 产品 mock 侧 */}
          <div className="relative animate-[fadeUp_.8s_.15s_ease_both]">
            {/* 条漫卡片堆叠 */}
            <div className="relative mx-auto max-w-[340px]">
              {/* 背景卡片 */}
              <div className="absolute inset-0 translate-x-5 translate-y-5 bg-gradient-to-br from-violet-200 to-purple-200 rounded-[28px] opacity-60" />
              <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 bg-white rounded-[28px] shadow-xl shadow-violet-100" />
              {/* 主卡片 */}
              <div className="relative bg-white rounded-[28px] p-4 shadow-2xl shadow-violet-200/60 border border-violet-50">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-400" />
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">镜中仙缘 · 第一话</span>
                </div>
                {/* 漫画格预览（竖排） */}
                <div className="space-y-2.5">
                  {[
                    { bg: "from-violet-400/80 to-purple-500/80", txt: "传说…山巅之上，封印着上古神镜", bubble: "top" },
                    { bg: "from-fuchsia-400/70 to-pink-400/70", txt: "就算是万丈悬崖，我也要爬上去！", bubble: "bottom" },
                    { bg: "from-cyan-400/70 to-sky-500/70", txt: "这镜子…在发光？", bubble: "right" },
                  ].map((p, i) => (
                    <div key={i} className={`relative h-[92px] rounded-2xl bg-gradient-to-br ${p.bg} overflow-hidden`}>
                      {/* 模拟角色剪影 */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-t-full bg-white/25" />
                      <div
                        className={`absolute ${p.bubble === "top" ? "top-2 left-1/2 -translate-x-1/2" : p.bubble === "right" ? "right-2 top-1/2 -translate-y-1/2" : "bottom-2 left-1/2 -translate-x-1/2"} max-w-[75%]`}
                      >
                        <div className={`bg-white/95 text-[10px] text-gray-800 font-medium px-2.5 py-1 rounded-lg shadow-sm ${p.bubble === "right" ? "" : "text-center"}`}>
                          {p.txt}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">AI 生成 · 3 分钟</span>
                  <span className="text-[10px] text-gray-300">▲ 滑屏阅读</span>
                </div>
              </div>
            </div>
            {/* 漂浮角标 */}
            <div className="absolute -left-4 top-10 bg-white rounded-2xl shadow-xl shadow-violet-100 px-4 py-3 border border-violet-50 animate-float">
              <div className="text-[10px] text-gray-400">角色锁定</div>
              <div className="text-sm font-bold text-violet-600 flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> 12/12 格</div>
            </div>
            <div className="absolute -right-3 bottom-14 bg-white rounded-2xl shadow-xl shadow-violet-100 px-4 py-3 border border-violet-50 animate-float-delay">
              <div className="text-[10px] text-gray-400">单话成本</div>
              <div className="text-sm font-bold text-emerald-600">¥1.2</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 成本对比 ================= */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "传统漫画", cost: "¥3,000+", unit: "一话 · 数周制作周期", cls: "border-gray-200", bar: "w-4/5 bg-gray-300" },
            { label: "AI 短剧", cost: "¥50+", unit: "一集 · 视频链路复杂", cls: "border-amber-200", bar: "w-2/5 bg-amber-300" },
            { label: "漫格 AI 漫画", cost: "¥1.2", unit: "一话 · 5 分钟出稿", cls: "border-violet-300 bg-violet-50/50 ring-2 ring-violet-100", bar: "w-1/12 bg-gradient-to-r from-violet-500 to-purple-400", highlight: true },
          ].map((c) => (
            <div key={c.label} className={`rounded-2xl border p-6 ${c.cls} ${c.highlight ? "" : "bg-white"}`}>
              <div className="text-sm text-gray-400 mb-2">{c.label}</div>
              <div className={`text-3xl font-black tracking-tight ${c.highlight ? "text-violet-600" : ""}`}>{c.cost}</div>
              <div className="text-xs text-gray-400 mt-1.5 mb-4">{c.unit}</div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${c.bar}`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 功能 ================= */}
      <section id="features" className="max-w-6xl mx-auto px-4 pb-24 scroll-mt-20">
        <div className="text-center mb-14">
          <div className="text-sm font-semibold text-violet-600 tracking-widest mb-3">WHY MANGA GRID</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">大厂在拼单张生图，我们做整条生产线</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">从文字到成稿，六步全自动；别人解决不了的角色一致性和中文气泡，是漫格的看家本领</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group bg-white rounded-3xl border border-violet-100/70 p-7 hover:shadow-2xl hover:shadow-violet-100 hover:-translate-y-1.5 hover:border-violet-200 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-2xl ${f.tint} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 流程 ================= */}
      <section id="how" className="bg-white border-y border-violet-100/60 py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="text-sm font-semibold text-violet-600 tracking-widest mb-3">HOW IT WORKS</div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">六步出稿，全程 AI 代劳</h2>
            <p className="text-gray-500 mt-4">你只负责提供故事，剩下的交给漫格</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-12">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative text-center group">
                {/* 连接线 */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[calc(50%+28px)] right-[calc(-50%+28px)] h-px bg-gradient-to-r from-violet-200 to-violet-100" />
                )}
                <div className="relative inline-flex">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200 group-hover:scale-110 group-hover:rotate-3 transition-all">
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-violet-200 text-[11px] font-bold text-violet-600 flex items-center justify-center shadow-sm">
                    {s.n}
                  </span>
                </div>
                <h3 className="font-bold mt-4">{s.t}</h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 模板 ================= */}
      <section id="templates" className="max-w-6xl mx-auto px-4 py-24 scroll-mt-20">
        <div className="text-center mb-14">
          <div className="text-sm font-semibold text-violet-600 tracking-widest mb-3">HOT TEMPLATES</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">不会写？模板直接开画</h2>
          <p className="text-gray-500 mt-4">内置热门题材，点击即可一键生成第一话</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TEMPLATES.map((t) => (
            <Link
              key={t.title}
              href="/comic/templates"
              className={`group relative bg-gradient-to-br ${t.grad} rounded-3xl border border-violet-100/70 p-7 hover:shadow-xl hover:-translate-y-1.5 transition-all`}
            >
              <span className="text-[42px] block mb-5 group-hover:scale-110 group-hover:-rotate-6 transition-transform origin-left">{t.emoji}</span>
              <div className="flex items-center gap-2 mb-2.5">
                <h3 className="font-bold text-lg">{t.title}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-violet-600 font-medium">{t.chip}</span>
              </div>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t.theme}</p>
              <div className="mt-5 text-[13px] font-medium text-violet-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                去模板市场看看 <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            href="/comic/templates"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 hover:underline"
          >
            查看全部模板 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="relative bg-[#1B1035] rounded-[32px] p-12 sm:p-16 text-center text-white overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[280px] bg-violet-600/40 blur-3xl rounded-full" />
          <div className="absolute -bottom-40 -right-20 w-96 h-96 bg-fuchsia-500/20 blur-3xl rounded-full" />
          <div className="relative">
            <Rocket className="w-10 h-10 text-violet-300 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5">你的故事，值得被画出来</h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-10">
              网文作者、推文创作者、漫画爱好者——注册即送 200 积分，先画一话试试
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/comic/new"
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-10 py-4 rounded-2xl font-bold shadow-xl shadow-violet-900/40 hover:shadow-fuchsia-900/40 hover:-translate-y-0.5 transition-all"
              >
                立即开始创作
              </Link>
              <Link
                href="/sign-up"
                className="bg-white/10 border border-white/20 px-10 py-4 rounded-2xl font-bold hover:bg-white/20 transition"
              >
                注册账号
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Footer ================= */}
      <footer className="border-t border-violet-100/60">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-600">漫格 MangaGrid</span>
            <span className="text-xs">© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-violet-600 transition">我的作品</Link>
            <Link href="/comic/new" className="hover:text-violet-600 transition">开始创作</Link>
            <span className="flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              AI 漫画创作平台
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}