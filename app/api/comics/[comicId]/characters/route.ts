import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicCharacters } from "@/lib/db/comic-schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { generateImage, downloadImage } from "@/lib/ai/image-generator";
import { uploadFileToCos } from "@/lib/ai/cos-storage";
import { deductCredits, refundCredits } from "@/lib/credits";
import { createLogger } from "@/lib/logger";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

const log = createLogger("comic-chars-api");
const MOCK_IMAGES = process.env.MOCK_IMAGES === "1";

const STYLE_PROMPT: Record<string, string> = {
  manga: "日式漫画风格，黑白网点，清晰线条，美型人物",
  manhua: "国漫厚涂风格，彩色，光影丰富，精美插画",
  ink: "水墨国风风格，传统水墨渲染，留白构图",
  watercolor: "水彩风格，柔和晕染，清新治愈",
  cyberpunk: "赛博朋克风格，霓虹配色，高对比",
  cartoon: "Q版卡通风格，圆润可爱，夸张表情",
};

// POST /api/comics/[comicId]/characters — 为角色生成参考图（锁定形象）
export async function POST(request: NextRequest, { params }: { params: Promise<{ comicId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { comicId } = await params;

  try {
    const comicRow = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!comicRow.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (comicRow[0].userId !== session.user.id) return NextResponse.json({ error: "无权访问" }, { status: 403 });

    const chars = await db.select().from(comicCharacters).where(eq(comicCharacters.comicId, comicId));
    if (!chars.length) return NextResponse.json({ error: "没有角色，请先生成脚本" }, { status: 400 });

    const stylePrompt = STYLE_PROMPT[comicRow[0].style || "manhua"] || STYLE_PROMPT.manhua;
    const results: { id: string; name: string; referenceImageUrl: string | null; status: string }[] = [];

    // 角色数量少（3-6），直接全量并发
    const genOne = async (c: any) => {
      // 已生成过的跳过
      if (c.referenceImageUrl) {
        results.push({ id: c.id, name: c.name, referenceImageUrl: c.referenceImageUrl, status: "skipped" });
        return;
      }

      const prompt = `${c.appearance}。角色设定立绘，${stylePrompt}，半身像，正面朝向，居中构图，纯色简单背景，突出人物特征`;

      let imageUrl: string | null = null;
      try {
        if (MOCK_IMAGES) {
          imageUrl = `https://placehold.co/1024x1024/6C5CE7/white?text=${encodeURIComponent(c.name)}`;
        } else {
          const generated = await generateImage(prompt, "anime", "1024x1024" as any, {
            userId: session.user.id,
          });
          // 下载并上传 COS（私有桶）
          const tmpDir = await mkdtemp(path.join(tmpdir(), "manga-char-"));
          const localPath = path.join(tmpDir, `${c.id}.png`);
          await downloadImage(generated, localPath);
          const cosKey = `${comicId}/characters/${c.id}.png`;
          const cosUrl = await uploadFileToCos(localPath, cosKey);
          await rm(tmpDir, { recursive: true, force: true });
          imageUrl = cosUrl || generated;
        }

        await db
          .update(comicCharacters)
          .set({ referenceImageUrl: imageUrl })
          .where(eq(comicCharacters.id, c.id));

        // 扣积分（每个角色 2 分，生成成功才扣）
        await deductCredits(session.user.id, "comicCharRef", 2, undefined, `角色参考图: ${c.name}`);
        results.push({ id: c.id, name: c.name, referenceImageUrl: imageUrl, status: "done" });
      } catch (err: any) {
        log.error(`角色参考图生成失败: ${c.name}`, err);
        results.push({ id: c.id, name: c.name, referenceImageUrl: null, status: `failed: ${err.message}` });
      }
    };

    await Promise.all(chars.map(genOne));

    const failed = results.filter((r) => r.status.startsWith("failed"));
    // 全部失败 → 退款提示（每张扣在循环里，失败未扣）
    const status = failed.length === 0 ? (comicRow[0].status === "panels_ready" ? "panels_ready" : "chars_ready") : comicRow[0].status;
    await db.update(comics).set({ status, updatedAt: new Date() }).where(eq(comics.id, comicId));

    return NextResponse.json({
      results,
      summary: { total: results.length, done: results.filter((r) => r.status === "done").length, failed: failed.length },
    });
  } catch (err: any) {
    log.error("characters API failed", err);
    return NextResponse.json({ error: err?.message || "生成角色参考图失败" }, { status: 500 });
  }
}