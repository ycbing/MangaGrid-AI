export const INITIAL_USER_CREDITS = 200;

// Credit recharge tiers: [credits, priceCNY]
export const RECHARGE_TIERS: { credits: number; price: number; bonus?: number }[] = [
  { credits: 100, price: 6, bonus: 0 },
  { credits: 300, price: 16, bonus: 30 },
  { credits: 1000, price: 50, bonus: 150 },
  { credits: 3000, price: 138, bonus: 600 },
];
export const MOCK_PAYMENT = process.env.MOCK_PAYMENT !== "0"; // 模拟支付开关

// 漫画模块积分定价（纯常量，客户端组件可安全 import；服务端 lib/credits.ts 引用同一份）
export const COMIC_CREDIT_COSTS = {
  comicScript: 2, // 生成漫画脚本（每话）
  comicCharRef: 2, // 角色参考图（每张）
  comicPanel: 1, // 漫画分格生图（每格）
} as const;

// 模板市场题材元信息（comic_templates.genre 的展示名与 emoji）
export const GENRE_META: Record<string, { name: string; emoji: string }> = {
  fantasy: { name: "玄幻", emoji: "🐉" },
  urban: { name: "都市", emoji: "🏙️" },
  ancient: { name: "古风", emoji: "🏮" },
  mystery: { name: "悬疑", emoji: "🔍" },
  romance: { name: "恋爱", emoji: "💕" },
  scifi: { name: "科幻", emoji: "🚀" },
};

// 模板卡片渐变主题：DB 只存 key，class 必须以字面量出现在源码才能被 Tailwind 扫描到
export const TEMPLATE_GRADIENTS: Record<string, string> = {
  violet: "from-violet-500/10 to-fuchsia-500/10",
  cyan: "from-cyan-500/10 to-blue-500/10",
  amber: "from-amber-500/10 to-orange-500/10",
  slate: "from-slate-500/10 to-gray-500/10",
  emerald: "from-emerald-500/10 to-teal-500/10",
  rose: "from-rose-500/10 to-pink-500/10",
  indigo: "from-indigo-500/10 to-purple-500/10",
  fuchsia: "from-fuchsia-500/10 to-violet-500/10",
};
