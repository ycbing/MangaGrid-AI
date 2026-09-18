import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isCosConfigured, uploadToCos } from "@/lib/ai/cos-storage";
import { createLogger } from "@/lib/logger";

const log = createLogger("avatar-api");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "缺少头像文件" }, { status: 400 });
    }

    const mime = file.type || "";
    const ext = ALLOWED_MIME[mime];
    if (!ext) {
      return NextResponse.json(
        { error: "仅支持 JPG / PNG / WebP 格式图片" },
        { status: 400 }
      );
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "头像图片大小不能超过 2MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarFileName = `${userId}${ext}`;

    let avatarUrl: string;

    if (isCosConfigured()) {
      // 先写本地临时，再传 COS（uploadToCos 接受本地路径）
      const tmpPath = path.resolve(UPLOAD_DIR, "avatars", avatarFileName);
      await fs.mkdir(path.dirname(tmpPath), { recursive: true });
      await fs.writeFile(tmpPath, buffer);
      const cosUrl = await uploadToCos(tmpPath, `avatars/${avatarFileName}`);
      if (cosUrl) {
        avatarUrl = cosUrl;
      } else {
        avatarUrl = `/api/uploads/avatars/${avatarFileName}`;
      }
    } else {
      // 本地存储
      const savePath = path.resolve(UPLOAD_DIR, "avatars", avatarFileName);
      // 路径安全校验：确保在 UPLOAD_DIR 内
      if (!savePath.startsWith(path.resolve(UPLOAD_DIR))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath, buffer);
      avatarUrl = `/api/uploads/avatars/${avatarFileName}`;
    }

    await db
      .update(users)
      .set({ avatarUrl })
      .where(eq(users.id, userId));

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    log.error("Avatar upload failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "头像上传失败，请稍后重试" }, { status: 500 });
  }
}
