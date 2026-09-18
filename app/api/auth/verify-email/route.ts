import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { consumeToken } from "@/lib/services/mail";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth-api");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "缺少验证令牌" }, { status: 400 });
    }

    const email = await consumeToken(token, "verify_email");
    if (!email) {
      return NextResponse.json(
        { error: "验证链接无效或已过期，请重新获取" },
        { status: 400 }
      );
    }

    // Mark email as verified
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.email, email));

    return NextResponse.json({ message: "邮箱验证成功", email });
  } catch (error) {
    log.error("Verify email failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
}
