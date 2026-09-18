import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPasswords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createToken, sendAuthMail } from "@/lib/services/mail";
import { checkRateLimit } from "@/lib/rate-limiter";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth-api");

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = checkRateLimit(`forgot:${ip}`, 5, 3600_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    // 无论邮箱是否存在，都返回统一提示，避免枚举
    const existing = await db
      .select({ email: userPasswords.email })
      .from(userPasswords)
      .where(eq(userPasswords.email, email))
      .limit(1);

    let actionLink: string | null = null;
    if (existing.length > 0) {
      try {
        const token = await createToken(email, "reset_password");
        actionLink = await sendAuthMail(email, "reset_password", token);
      } catch (mailError) {
        log.error("Failed to send reset email", {
          error: mailError instanceof Error ? mailError.message : String(mailError),
        });
      }
    }

    return NextResponse.json({
      message: "如果该邮箱已注册，重置密码邮件将发送到你的邮箱",
      actionLink, // mock 模式下供走查
    });
  } catch (error) {
    log.error("Forgot password failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "请求失败，请稍后重试" }, { status: 500 });
  }
}
