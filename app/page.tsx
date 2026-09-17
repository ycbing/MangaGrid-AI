import Link from "next/link";
import { BookOpen, Wand2, Users, MessageCircle, LayoutGrid, Share2, Rocket, Sparkles, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    title: "网文一键漫改",
    desc: "粘贴小说章节或一句话创意，AI 自动拆解成漫画脚本：分幕、分格、台词、旁白全给你排好",
  },
  {
    icon: Users,
    title: "角色卡锁定形象",
    desc: "AI 提取角色并生成参考图，后续每格生图自动注入，跨格不串脸——不用学 LoRA 炼丹",
  },
  {
    icon: MessageCircle,
    title: "中文气泡自动排版",
    desc: "图字分离：台词渲染成漫画气泡、旁白独立成框，AI 画不出清晰中文的问题绕过去了",
  },
  {
    icon: LayoutGrid,
    title: "条漫 / 页漫双版式",
    desc: "竖屏条漫适合抖音小红书，横版页漫适合平台连载，一键切换",
  },
  {
    icon: Wand2,
    title: "多画风可选",
    desc: "国漫厚涂、日漫、水墨国风、水彩、赛博朋克、Q版——6 种风格覆盖主流题材",
  },
  {
    icon: Share2,
    title: "生成即分享",
    desc: "公开阅读链接 + 分享计数，作品一键发给读者，支持后续导出 PDF 整话",
  },
];

const STEPS = [
  { n: "01", t: "输入创意", d: "粘贴网文章节，或直接用内置热门模板" },
  { n: "02", t: "AI 出脚本", d: "自动分幕分格，生成角色卡与台词，约 30 秒" },
  { n: "03", t: "锁定角色", d: "一键生成角色参考图，形象从此不再漂移" },
  { n: "04", t: "批量生图", d: "每格漫画图自动带参考图生成，失败单格可重试" },
  { n: "05", t: "气泡成稿", d: "台词气泡 + 旁白自动排版，漫画感拉满" },
  { n: "06", t: "阅读分享", d: "条漫阅读器阅读，公开链接一键分享" },
];

const TEMPLATES = [
  { emoji: "🐉", title: "修仙逆袭", theme: "废柴少年偶得神镜，器灵少女相伴逆袭" },
  { emoji: "🏙️", title: "穿书女配", theme: "社畜穿成恶毒女配，绑定吐槽系统" },
  { emoji: "🏮", title: "古风探案", theme: "纨绔世子暗藏锦衣卫身份查悬案" },
  { emoji: "🔍", title: "都市怪谈", theme: "深夜便利店的红裙女人，每晚十二点准时出现" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-white to-white">
      {/* ===== Hero ===== */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          从网文到漫画，只需 5 分钟
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight">
          把你的小说
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> 变成漫画</span>
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">
          输入创意或粘贴小说章节，AI 自动生成漫画脚本、锁定角色形象、批量画出分镜，
          中文台词气泡自动排版——零绘画基础也能做自己的条漫。
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/comic/new"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition shadow-lg shadow-indigo-200"
          >
            免费开始创作 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#how"
            className="bg-white border px-8 py-3.5 rounded-xl font-semibold text-gray-700 hover:border-indigo-300 transition"
          >
            看看怎么用
          </Link>
        </div>
        <div className="mt-10 flex items-center justify-center gap-6 text-sm text-gray-400">
          <span>✨ 注册送 200 积分</span>
          <span>🖼️ 每格低至 1 积分</span>
          <span>🔗 生成即分享</span>
        </div>
      </section>

      {/* ===== 示例工作流 ===== */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full" />
          <div className="absolute -bottom-24 -left-10 w-72 h-72 bg-white/5 rounded-full" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">零门槛漫画家</h2>
              <p className="opacity-90 leading-relaxed mb-6">
                传统漫画一话成本数千元起步、周期数周。漫格把「编剧 → 角色设定 →
                分镜绘制 → 台词排版」全部 AI 化，一话成本压到几块钱、几分钟出稿。
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2.5">
                  <Check /> 存量网文直接漫改，无需重写故事
                </li>
                <li className="flex items-center gap-2.5">
                  <Check /> 角色形象跨格锁定，告别「每格换张脸」
                </li>
                <li className="flex items-center gap-2.5">
                  <Check /> 中文气泡清晰排版，AI 绘画的通病被绕开
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`aspect-[3/4] rounded-xl bg-white/15 border border-white/20 flex items-end p-2 text-[10px] opacity-90 ${
                    i === 5 ? "col-start-3" : ""
                  }`}
                >
                  <span className="bg-white/25 rounded px-1.5 py-0.5">P{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 功能 ===== */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-center mb-3">为什么用漫格</h2>
        <p className="text-gray-500 text-center mb-10">大厂在拼单张生图，我们做整条漫画生产线</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border p-6 hover:shadow-lg transition group">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition">
                <f.icon className="w-5 h-5 text-indigo-600 group-hover:text-white transition" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 流程 ===== */}
      <section id="how" className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-center mb-3">六步出稿</h2>
        <p className="text-gray-500 text-center mb-10">全程 AI 代劳，你只负责提供故事</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="relative">
              <div className="text-3xl font-black text-indigo-100">{s.n}</div>
              <h3 className="font-semibold mt-1">{s.t}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 模板 ===== */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-center mb-3">热门题材模板</h2>
        <p className="text-gray-500 text-center mb-10">点一下直接开画</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((t) => (
            <Link
              key={t.title}
              href="/comic/new"
              className="bg-white rounded-2xl border p-5 hover:border-indigo-400 hover:shadow-lg transition group"
            >
              <span className="text-3xl mb-3 block">{t.emoji}</span>
              <h3 className="font-semibold group-hover:text-indigo-600 transition">{t.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.theme}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="bg-gray-900 rounded-3xl p-10 sm:p-14 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-indigo-600/30 blur-3xl rounded-full" />
          <div className="relative">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">你的故事，值得被画出来</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              网文作者、推文创作者、漫画爱好者——注册即送 200 积分，先画一话试试
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/comic/new"
                className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-3.5 rounded-xl font-semibold hover:opacity-95 transition"
              >
                立即开始创作
              </Link>
              <Link
                href="/sign-up"
                className="bg-white/10 border border-white/20 px-8 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition"
              >
                注册账号
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-medium text-gray-600">漫格 MangaGrid</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="hover:text-gray-600">我的作品</Link>
            <Link href="/comic/new" className="hover:text-gray-600">开始创作</Link>
            <span className="flex items-center gap-1">
              <Rocket className="w-3.5 h-3.5" /> AI 漫画创作平台
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Check() {
  return (
    <span className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
      <svg className="w-3 h-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}