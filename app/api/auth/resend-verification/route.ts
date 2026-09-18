import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createToken, sendAuthMail } from "@/lib/services/mail";
import { checkRateLimit } from "@/lib/rate-limiter";
import { createLogger } from "@/lib/logger";
import { NextRequest } from "next/server";

const log = createLogger("auth-api");

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = checkRateLimit(`resend-verify:${ip}`, 5, 3600_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const token = await createToken(session.user.email, "verify_email");
    const actionLink = await sendAuthMail(session.user.email, "verify_email", token);

    return NextResponse.json({ message: "验证邮件已发送", actionLink });
  } catch (error) {
    log.error("Resend verification failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 });
  }
}
