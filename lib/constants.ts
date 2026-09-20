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
