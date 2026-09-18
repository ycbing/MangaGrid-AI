import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { userPasswords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { consumeToken } from "@/lib/services/mail";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth-api");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json({ error: "缺少重置令牌" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const email = await consumeToken(token, "reset_password");
    if (!email) {
      return NextResponse.json(
        { error: "重置链接无效或已过期，请重新获取" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // userPasswords 表用 email 关联，更新密码
    const result = await db
      .update(userPasswords)
      .set({ passwordHash })
      .where(eq(userPasswords.email, email));

    return NextResponse.json({ message: "密码重置成功，请用新密码登录", email });
  } catch (error) {
    log.error("Reset password failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "重置失败，请稍后重试" }, { status: 500 });
  }
}
