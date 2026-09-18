// ============================================
// 漫格 MangaGrid - 账号自服务邮件服务
// 邮箱验证 + 忘记/重置密码 的统一 token 与邮件能力
// SMTP 已配置 → nodemailer 真实发送；未配置 → mock（日志打印 + 回传链接）
// ============================================

import crypto from "crypto";
import { db } from "@/lib/db";
import { verificationTokens } from "@/lib/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("mail");

export type AuthTokenType = "verify_email" | "reset_password";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** 获取站内基础地址，用于拼接邮件中的操作链接 */
export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** 生成随机 token */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * 创建验证/重置 token 并落库
 * @returns token 字符串
 */
export async function createToken(
  email: string,
  type: AuthTokenType
): Promise<string> {
  const token = generateToken();
  await db.insert(verificationTokens).values({
    id: crypto.randomUUID(),
    email,
    token,
    type,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return token;
}

/**
 * 校验并消费 token。
 * 有效则删除该 token 并返回关联 email；无效/过期返回 null。
 */
export async function consumeToken(
  token: string,
  type: AuthTokenType
): Promise<string | null> {
  if (!token) return null;

  const rows = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, token), eq(verificationTokens.type, type)))
    .limit(1);

  if (!rows.length) return null;

  const record = rows[0];
  const now = Date.now();
  const valid = new Date(record.expiresAt).getTime() > now;

  // 无论是否过期，一次性 token 都删除
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.token, token));

  return valid ? record.email : null;
}

/** 根据 token 类型构造前端操作链接 */
export function buildActionLink(type: AuthTokenType, token: string): string {
  const base = getBaseUrl();
  if (type === "verify_email") {
    return `${base}/verify-email?token=${token}`;
  }
  return `${base}/reset-password?token=${token}`;
}

/** 构造邮件 HTML 正文 */
function buildMailHtml(
  type: AuthTokenType,
  actionLink: string,
  email: string
): { subject: string; html: string } {
  if (type === "verify_email") {
    return {
      subject: "漫格 MangaGrid - 邮箱验证",
      html: `
        <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#7c3aed;margin:0 0 16px;">验证你的邮箱</h2>
          <p style="color:#374151;line-height:1.7;">你好，<strong>${email}</strong>：</p>
          <p style="color:#374151;line-height:1.7;">感谢注册 <strong>漫格 MangaGrid</strong>。请点击下方按钮验证你的邮箱地址，本链接 1 小时内有效。</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${actionLink}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">验证邮箱</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;line-height:1.6;">如果按钮无法点击，请复制以下链接到浏览器打开：<br/><a href="${actionLink}" style="color:#7c3aed;word-break:break-all;">${actionLink}</a></p>
          <p style="color:#9ca3af;font-size:12px;">如果不是你本人操作，请忽略本邮件。</p>
        </div>`,
    };
  }
  return {
    subject: "漫格 MangaGrid - 重置密码",
    html: `
      <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#7c3aed;margin:0 0 16px;">重置你的密码</h2>
        <p style="color:#374151;line-height:1.7;">你好，<strong>${email}</strong>：</p>
        <p style="color:#374151;line-height:1.7;">我们收到了重置密码的请求。请点击下方按钮设置新密码，本链接 1 小时内有效。</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${actionLink}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">重置密码</a>
        </div>
        <p style="color:#9ca3af;font-size:12px;line-height:1.6;">如果按钮无法点击，请复制以下链接到浏览器打开：<br/><a href="${actionLink}" style="color:#7c3aed;word-break:break-all;">${actionLink}</a></p>
        <p style="color:#9ca3af;font-size:12px;">如果不是你本人操作，请忽略本邮件。</p>
      </div>`,
  };
}

/** 判断是否配置了真实 SMTP */
export function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * 发送认证邮件（验证/重置）。
 * @returns 返回 actionLink（mock 模式下供前端展示/走查；真实模式仍返回以便调试）
 */
export async function sendAuthMail(
  email: string,
  type: AuthTokenType,
  token: string
): Promise<string> {
  const actionLink = buildActionLink(type, token);

  if (isSmtpConfigured()) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      const { subject, html } = buildMailHtml(type, actionLink, email);
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "漫格 MangaGrid"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject,
        html,
      });
      log.info(`Auth mail sent (${type}) to ${email}`);
    } catch (error) {
      log.error("SMTP send failed, falling back to mock", {
        error: error instanceof Error ? error.message : String(error),
      });
      // 真实发送失败时降级到 mock，保证开发走查可用
    }
  } else {
    log.info(`[MOCK MAIL] type=${type} to=${email} actionLink=${actionLink}`);
  }

  return actionLink;
}
