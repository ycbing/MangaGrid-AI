import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, creditRecharges, usageLogs } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { RECHARGE_TIERS, MOCK_PAYMENT } from "@/lib/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("credits-recharge-api");

function genOrderNo(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `RC${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.floor(Math.random() * 900 + 100)}`;
}

/**
 * POST /api/user/credits/recharge
 * 创建充值订单并模拟支付到账。
 * body: { tierIndex: number }  命中 RECHARGE_TIERS 档位
 * 模拟支付模式(MOCK_PAYMENT)下立即到账；真实接入时替换为创建待支付订单 + 支付回调。
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const tierIndex = body.tierIndex;
    if (!Number.isInteger(tierIndex) || tierIndex < 0 || tierIndex >= RECHARGE_TIERS.length) {
      return NextResponse.json({ error: "无效的充值档位" }, { status: 400 });
    }
    const tier = RECHARGE_TIERS[tierIndex];

    if (!MOCK_PAYMENT) {
      // 真实支付预留：此处创建 pending 订单并返回支付参数（对接微信/支付宝/Stripe）
      return NextResponse.json({ error: "支付通道尚未配置，请启用模拟支付" }, { status: 501 });
    }

    const creditsToAdd = tier.credits + (tier.bonus || 0);
    const orderNo = genOrderNo();
    const orderId = uuidv4();

    const result = await db.transaction(async (tx) => {
      // 1. 加积分
      const [updated] = await tx
        .update(users)
        .set({ credits: sql`${users.credits} + ${creditsToAdd}` })
        .where(eq(users.id, session.user.id))
        .returning({ credits: users.credits });

      // 2. 写充值订单
      await tx.insert(creditRecharges).values({
        id: orderId,
        userId: session.user.id,
        orderNo,
        credits: creditsToAdd,
        amount: tier.price,
        provider: "mock",
        status: "paid",
        paidAt: new Date(),
      });

      // 3. 写积分流水（正数=充值）
      await tx.insert(usageLogs).values({
        id: uuidv4(),
        userId: session.user.id,
        type: "recharge",
        creditsUsed: creditsToAdd,
        description: `充值 ${tier.credits} 积分${tier.bonus ? `（赠送 ${tier.bonus}）` : ""} · 订单 ${orderNo}`,
      });

      return updated;
    });

    return NextResponse.json({
      ok: true,
      orderNo,
      creditsAdded: creditsToAdd,
      balance: result?.credits ?? 0,
      message: `充值成功，到账 ${creditsToAdd} 积分`,
    });
  } catch (err: any) {
    log.error("recharge failed", err);
    return NextResponse.json({ error: err?.message || "充值失败" }, { status: 500 });
  }
}

/**
 * GET /api/user/credits/recharge — 查询充值记录
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const records = await db
      .select()
      .from(creditRecharges)
      .where(eq(creditRecharges.userId, session.user.id))
      .orderBy(desc(creditRecharges.createdAt))
      .limit(20);
    return NextResponse.json({ records });
  } catch (err: any) {
    log.error("get recharges failed", err);
    return NextResponse.json({ error: err?.message || "获取充值记录失败" }, { status: 500 });
  }
}
