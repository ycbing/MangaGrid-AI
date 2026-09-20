// ============================================
// 漫格 MangaGrid - 漫画拼版导出 PDF
// strip（条漫）：每个分格一页（竖版），图片适配页宽，
//   页脚标注 标题 · 第N话 · 格X/Y。
// page（页漫）：每张 A4 按 3-4 格拼版（与阅读器翻页视图同一套节奏，
//   见 components/comic/page-layout.ts），格子内叠加气泡/旁白，
//   页脚标注 第X/Y页。
// 按 bubble_side 叠加台词气泡 + 旁白（图字分离）。
// 中文字体：系统黑体/雅黑（env PDF_FONT_PATH 可覆盖）。
// ============================================

import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { imageSize } from "image-size";
import { db } from "@/lib/db";
import { comics, comicChapters, comicPanels } from "@/lib/db/comic-schema";
import { eq, and } from "drizzle-orm";
import {
  isCosUrl,
  cosKeyFromUrl,
  getSignedCosUrl,
} from "@/lib/ai/cos-storage";
import { createLogger } from "@/lib/logger";
import { groupPanelsIntoPages } from "@/components/comic/page-layout";

const log = createLogger("comic-pdf");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// ---- 图片下载 -------------------------------------------------------------

/** 仅接受 pdfkit 可嵌入的图片格式（JPEG/PNG/GIF），其余（如 placehold SVG）降级为文字 */
function isPdfSupportedImage(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // GIF: "GIF"
  if (buf.toString("ascii", 0, 3) === "GIF") return true;
  return false;
}

/** 统一解析分格图片：COS 签名 / 本地 UPLOAD_DIR / 外部 https；仅返回 pdfkit 可嵌入的位图 */
async function resolvePanelImageBuffer(imageUrl: string | null): Promise<Buffer | null> {
  if (!imageUrl) return null;
  let buf: Buffer | null = null;
  try {
    // COS 签名下载
    if (isCosUrl(imageUrl)) {
      const cosKey = cosKeyFromUrl(imageUrl);
      if (cosKey) {
        const signed = getSignedCosUrl(cosKey, 3600);
        const res = await fetch(signed);
        if (res.ok) buf = Buffer.from(await res.arrayBuffer());
      }
    } else if (imageUrl.startsWith("/api/uploads/")) {
      // 本地代理路径 /api/uploads/<relative>
      const rel = imageUrl.replace(/^\/api\/uploads\//, "");
      const full = path.resolve(UPLOAD_DIR, rel);
      if (full.startsWith(path.resolve(UPLOAD_DIR))) buf = await readFile(full);
    } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      // 外部 http(s)
      const res = await fetch(imageUrl);
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    } else {
      // 相对 UPLOAD_DIR 的本地路径
      const full = path.resolve(UPLOAD_DIR, imageUrl);
      buf = await readFile(full);
    }
  } catch (error) {
    log.warn("resolve panel image failed", {
      url: imageUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
  if (!buf) return null;
  if (!isPdfSupportedImage(buf)) {
    log.warn("unsupported panel image format, fallback to text", { url: imageUrl });
    return null;
  }
  return buf;
}

// ---- 中文字体 -------------------------------------------------------------

/** 探测系统中文字体路径；找不到返回 null（文字降级跳过） */
export function getChineseFontPath(): string | null {
  const fromEnv = process.env.PDF_FONT_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    "C:/Windows/Fonts/simhei.ttf",
    "C:/Windows/Fonts/msyh.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// ---- 排版工具 -------------------------------------------------------------

interface ExportPanel {
  panelNumber: number;
  imageUrl: string | null;
  sceneDesc: string;
  dialogue: string | null;
  narration: string | null;
  bubbleSide: string | null;
}

/** 台词/旁白自适应字号 */
function fontSizeFor(len: number): number {
  if (len > 24) return 11;
  if (len > 14) return 13;
  return 16;
}

/** 按当前字体/字号手动换行 */
function wrapText(doc: PDFKit.PDFDocument, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    const test = cur + ch;
    if (cur && doc.widthOfString(test) > maxWidth) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 绘制台词气泡（白底圆角 + 深色边框 + 黑字） */
function drawBubble(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  sizeOverride?: number
): void {
  const size = sizeOverride ?? fontSizeFor(text.length);
  doc.font("CJK").fontSize(size);
  const padX = 10;
  const padY = 7;
  const lineH = size * 1.4;
  const innerW = Math.max(maxWidth - padX * 2, 20);
  const lines = wrapText(doc, text, innerW);
  const w = maxWidth;
  const h = lines.length * lineH + padY * 2;

  doc.save();
  doc.roundedRect(x, y, w, h, 8).fill("#ffffff");
  doc.roundedRect(x, y, w, h, 8).stroke("#1f2937");
  doc.fillColor("#111827");
  lines.forEach((line, i) => {
    const tw = doc.widthOfString(line);
    doc.text(line, x + (w - tw) / 2, y + padY + i * lineH, {
      lineBreak: false,
      width: 0,
    });
  });
  doc.restore();
}

/** 绘制旁白（顶部居中，黑底白字） */
function drawNarration(
  doc: PDFKit.PDFDocument,
  text: string,
  imgRect: { x: number; y: number; w: number; h: number },
  sizeOverride?: number
): void {
  const size = sizeOverride ?? fontSizeFor(text.length);
  doc.font("CJK").fontSize(size);
  const maxW = Math.min(imgRect.w - 20, 300);
  const padX = 10;
  const padY = 5;
  const lineH = size * 1.4;
  const lines = wrapText(doc, text, maxW - padX * 2);
  const w = maxW;
  const h = lines.length * lineH + padY * 2;
  const x = imgRect.x + (imgRect.w - w) / 2;
  const y = imgRect.y + 8;

  doc.save();
  doc.roundedRect(x, y, w, h, 6).fill("#000000").opacity(0.78);
  doc.fillColor("#ffffff");
  lines.forEach((line, i) => {
    const tw = doc.widthOfString(line);
    doc.text(line, x + (w - tw) / 2, y + padY + i * lineH, {
      lineBreak: false,
      width: 0,
    });
  });
  doc.restore();
}

/** 在图片上叠加台词气泡 + 旁白（格子越小字号越小，保证小格可读） */
function drawTextOverlays(
  doc: PDFKit.PDFDocument,
  panel: ExportPanel,
  imgRect: { x: number; y: number; w: number; h: number },
  fontPath: string | null
): void {
  if (!fontPath) return;

  const dialogue = panel.dialogue?.trim();
  const narration = panel.narration?.trim();
  const side = panel.bubbleSide || "bottom";

  // 相对整页图宽（547.28pt）的缩放：半宽格 ≈0.6 下限
  const fontScale = Math.max(0.6, Math.min(1, imgRect.w / 547.28));

  // 旁白：顶部居中
  if (narration) {
    drawNarration(
      doc,
      narration,
      imgRect,
      Math.max(8, Math.round(fontSizeFor(narration.length) * fontScale))
    );
  }

  // 台词气泡：按 bubble_side 定位
  if (dialogue) {
    const maxW = Math.max(imgRect.w * 0.7, 80);
    const size = Math.max(8, Math.round(fontSizeFor(dialogue.length) * fontScale));
    doc.font("CJK").fontSize(size);
    const innerW = Math.max(maxW - 20, 20);
    const lines = wrapText(doc, dialogue, innerW);
    const lineH = size * 1.4;
    const w = maxW;
    const h = lines.length * lineH + 14;

    let bx: number;
    let by: number;
    if (side === "left") {
      bx = imgRect.x + 8;
      by = imgRect.y + (imgRect.h - h) / 2;
    } else if (side === "right") {
      bx = imgRect.x + imgRect.w - 8 - w;
      by = imgRect.y + (imgRect.h - h) / 2;
    } else if (side === "top") {
      bx = imgRect.x + (imgRect.w - w) / 2;
      by = imgRect.y + 30 * fontScale;
    } else if (side === "center") {
      bx = imgRect.x + (imgRect.w - w) / 2;
      by = imgRect.y + (imgRect.h - h) / 2;
    } else {
      // bottom
      bx = imgRect.x + (imgRect.w - w) / 2;
      by = imgRect.y + imgRect.h - h - 8;
    }
    drawBubble(doc, dialogue, bx, by, w, size);
  }
}

/** 图片下载失败时的降级块：展示场景 + 台词/旁白文字（rect 缺省为整页） */
function drawFallbackText(
  doc: PDFKit.PDFDocument,
  panel: ExportPanel,
  fontPath: string | null,
  rect?: { x: number; y: number; w: number; h: number }
): void {
  const rc = rect ?? { x: 24, y: 24, w: 547.28, h: 793.89 };
  const textW = Math.max(rc.w - 32, 60);
  const useCjk = !!fontPath;
  doc.save();
  doc.roundedRect(rc.x, rc.y, rc.w, rc.h, 8).fill("#f5f3ff");
  doc.font(useCjk ? "CJK" : "Helvetica");
  doc.fillColor("#111827").fontSize(18);
  doc.text(`分格 ${panel.panelNumber}`, rc.x + 16, rc.y + 24, { width: textW });
  doc.fontSize(12).fillColor("#374151");
  const scene = `画面：${panel.sceneDesc || "（无画面描述）"}`;
  const sceneLines = wrapText(doc, scene, textW);
  sceneLines.forEach((l, i) =>
    doc.text(l, rc.x + 16, rc.y + 64 + i * 20, { lineBreak: false, width: 0 })
  );
  let ty = rc.y + 64 + sceneLines.length * 20 + 12;
  if (panel.dialogue) {
    doc.fillColor("#111827").fontSize(13);
    doc.text(`台词：${panel.dialogue}`, rc.x + 16, ty, { width: textW });
    ty += 40;
  }
  if (panel.narration) {
    doc.fillColor("#4b5563").fontSize(12);
    doc.text(`旁白：${panel.narration}`, rc.x + 16, ty, { width: textW });
  }
  doc.restore();
}

// ---- 主生成逻辑 -------------------------------------------------------------

interface ResolvedPanel {
  panel: ExportPanel;
  imgBuf: Buffer | null;
  dim: { width: number; height: number } | null;
}

/** 在格子矩形内 contain 绘制图片并叠加气泡/旁白；无图降级为文字块 */
function drawSlot(
  doc: PDFKit.PDFDocument,
  r: ResolvedPanel,
  x: number,
  y: number,
  w: number,
  h: number,
  fontPath: string | null
): void {
  if (r.imgBuf && r.dim && r.dim.width > 0 && r.dim.height > 0) {
    const scale = Math.min(w / r.dim.width, h / r.dim.height);
    const iw = r.dim.width * scale;
    const ih = r.dim.height * scale;
    const ix = x + (w - iw) / 2;
    const iy = y + (h - ih) / 2;
    doc.image(r.imgBuf, ix, iy, { width: iw, height: ih });
    drawTextOverlays(doc, r.panel, { x: ix, y: iy, w: iw, h: ih }, fontPath);
  } else {
    drawFallbackText(doc, r.panel, fontPath, { x, y, w, h });
  }
}

/**
 * 页漫拼版：每张 A4 按 groupPanelsIntoPages 的节奏排 3-4 格（与阅读器翻页视图一致）。
 * 行高按图片真实比例计算，超页高预算时整页等比压缩、垂直居中，图片不裁切。
 */
function buildPageLayoutPdf(
  doc: PDFKit.PDFDocument,
  resolved: ResolvedPanel[],
  opts: BuildPdfOptions,
  fontPath: string | null,
  PAGE_W: number,
  MAX_H: number,
  PAD: number
): void {
  const GAP = 10;
  const footerH = 22;
  const contentW = PAGE_W - PAD * 2;
  const contentH = MAX_H - PAD * 2 - footerH;
  const halfW = (contentW - GAP) / 2;

  const layoutPages = groupPanelsIntoPages(resolved.length);

  layoutPages.forEach((page, pi) => {
    if (pi > 0) doc.addPage({ size: [PAGE_W, MAX_H], margin: 0 });

    // 行自然高：full 行按 contentW 比例；half 行取两格较矮者（高者 contain 留白）
    const rowHeights = page.rows.map((row) => {
      if (row.slots.length === 1) {
        const r = resolved[row.slots[0].panelIndex];
        return r.dim && r.dim.width > 0
          ? contentW * (r.dim.height / r.dim.width)
          : contentW * 0.75;
      }
      const hs = row.slots.map((s) => {
        const r = resolved[s.panelIndex];
        return r.dim && r.dim.width > 0
          ? halfW * (r.dim.height / r.dim.width)
          : halfW * 0.75;
      });
      return Math.min(hs[0], hs[1] ?? hs[0]);
    });

    // 超预算整页等比压缩，整块垂直居中
    const naturalTotal =
      rowHeights.reduce((a, b) => a + b, 0) + GAP * (rowHeights.length - 1);
    const scaleFactor = naturalTotal > contentH ? contentH / naturalTotal : 1;
    const drawHs = rowHeights.map((h) => h * scaleFactor);
    const totalH = drawHs.reduce((a, b) => a + b, 0) + GAP * (rowHeights.length - 1);
    let y = PAD + (contentH - totalH) / 2;

    page.rows.forEach((row, ri) => {
      const rowH = drawHs[ri];
      if (row.slots.length === 1) {
        drawSlot(doc, resolved[row.slots[0].panelIndex], PAD, y, contentW, rowH, fontPath);
      } else {
        row.slots.forEach((s, si) => {
          drawSlot(doc, resolved[s.panelIndex], PAD + si * (halfW + GAP), y, halfW, rowH, fontPath);
        });
      }
      y += rowH + GAP;
    });

    // 页脚
    const label = `${opts.title} · 第${opts.chapterNumber}话 · 第${pi + 1}/${layoutPages.length}页`;
    doc.save();
    doc.font(fontPath ? "CJK" : "Helvetica").fontSize(9).fillColor("#9ca3af");
    const tw = doc.widthOfString(label);
    doc.text(label, (PAGE_W - tw) / 2, MAX_H - 16, { lineBreak: false, width: 0 });
    doc.restore();
  });
}

export interface BuildPdfOptions {
  title: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  panels: ExportPanel[];
  /** 版式：page 走 A4 多格拼版，缺省/strip 走一格一页 */
  layoutType?: string | null;
}

/** 生成逐格拼版 PDF，返回 Buffer */
export async function buildComicPdf(opts: BuildPdfOptions): Promise<Buffer> {
  const fontPath = getChineseFontPath();
  if (!fontPath) {
    log.warn("未找到中文字体，PDF 文字将降级为 Helvetica（中文可能乱码）");
  }

  const PAGE_W = 595.28; // A4 宽（pt）
  const MAX_H = 841.89; // A4 高（pt）
  const PAD = 24;

  const panels = opts.panels.slice().sort((a, b) => a.panelNumber - b.panelNumber);

  // 预解析所有分格的图片与页面高度，供首页尺寸与逐页拼版使用
  const resolved: {
    panel: ExportPanel;
    imgBuf: Buffer | null;
    dim: { width: number; height: number } | null;
    pageH: number;
  }[] = [];
  for (const panel of panels) {
    const imgBuf = await resolvePanelImageBuffer(panel.imageUrl);
    let dim: { width: number; height: number } | null = null;
    if (imgBuf) {
      try {
        const s = imageSize(imgBuf);
        if (s?.width && s?.height) dim = { width: s.width, height: s.height };
      } catch {
        // 无法解析尺寸，用 A4 兜底
      }
    }
    let pageH = MAX_H;
    if (dim && dim.width > 0 && dim.height > 0) {
      pageH = Math.min(Math.max(PAGE_W * (dim.height / dim.width), 400), MAX_H);
    }
    resolved.push({ panel, imgBuf, dim, pageH });
  }

  const doc = new PDFDocument({
    // 页漫画册固定 A4；strip 沿用首格比例的自适应页高
    size:
      opts.layoutType === "page" || !resolved.length
        ? [PAGE_W, MAX_H]
        : [PAGE_W, resolved[0].pageH],
    margin: 0,
    bufferPages: true,
  });
  if (fontPath) {
    try {
      doc.registerFont("CJK", fontPath);
    } catch (error) {
      log.warn("中文字体注册失败，文字将降级", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  if (resolved.length === 0) {
    doc.font(fontPath ? "CJK" : "Helvetica").fontSize(18);
    doc.text("该章节暂无已生成的分格图，无法导出", PAD, PAD, { width: PAGE_W - PAD * 2 });
  }

  // 页漫：A4 多格拼版路径（与阅读器翻页视图同一套节奏）
  if (opts.layoutType === "page" && resolved.length > 0) {
    buildPageLayoutPdf(doc, resolved, opts, fontPath, PAGE_W, MAX_H, PAD);
    doc.end();
    return done;
  }

  resolved.forEach((r, i) => {
    if (i > 0) doc.addPage({ size: [PAGE_W, r.pageH], margin: 0 });
    const { panel, imgBuf, dim } = r;
    const contentW = PAGE_W - PAD * 2;
    const contentH = r.pageH - PAD * 2;

    if (imgBuf && dim && dim.width > 0 && dim.height > 0) {
      const scale = Math.min(contentW / dim.width, contentH / dim.height);
      const iw = dim.width * scale;
      const ih = dim.height * scale;
      const ix = (PAGE_W - iw) / 2;
      const iy = PAD;
      doc.image(imgBuf, ix, iy, { width: iw, height: ih });
      drawTextOverlays(doc, panel, { x: ix, y: iy, w: iw, h: ih }, fontPath);
    } else {
      drawFallbackText(doc, panel, fontPath);
    }

    // 页脚
    const label = `${opts.title} · 第${opts.chapterNumber}话 · ${panel.panelNumber}/${panels.length}`;
    doc.save();
    doc.font(fontPath ? "CJK" : "Helvetica").fontSize(9).fillColor("#9ca3af");
    const tw = doc.widthOfString(label);
    doc.text(label, (PAGE_W - tw) / 2, r.pageH - 16, { lineBreak: false, width: 0 });
    doc.restore();
  });

  doc.end();
  return done;
}

// ---- 查库组装 -------------------------------------------------------------

export interface ComicPdfResult {
  buffer: Buffer;
  title: string;
  chapterNumber: number;
  panelCount: number;
}

/** 导出指定话的 PDF：查库组装数据并生成 */
export async function exportComicChapterPdf(
  comicId: string,
  chapterNumber: number,
  userId: string
): Promise<ComicPdfResult | null> {
  const comicRows = await db
    .select()
    .from(comics)
    .where(eq(comics.id, comicId))
    .limit(1);

  if (!comicRows.length || comicRows[0].userId !== userId) return null;

  const comic = comicRows[0];

  const chapterRows = await db
    .select()
    .from(comicChapters)
    .where(
      and(
        eq(comicChapters.comicId, comicId),
        eq(comicChapters.chapterNumber, chapterNumber)
      )
    )
    .limit(1);

  if (!chapterRows.length) return null;
  const chapter = chapterRows[0];

  const panelRows = await db
    .select()
    .from(comicPanels)
    .where(eq(comicPanels.chapterId, chapter.id));

  const panels: ExportPanel[] = panelRows
    .filter((p) => p.status === "done" && p.imageUrl)
    .map((p) => ({
      panelNumber: p.panelNumber,
      imageUrl: p.imageUrl,
      sceneDesc: p.sceneDesc || "",
      dialogue: p.dialogue,
      narration: p.narration,
      bubbleSide: p.bubbleSide,
    }));

  if (!panels.length) return null;

  const buffer = await buildComicPdf({
    title: comic.title || "未命名漫画",
    chapterNumber: chapter.chapterNumber,
    chapterTitle: chapter.title,
    panels,
    layoutType: comic.layoutType,
  });

  return {
    buffer,
    title: comic.title || "未命名漫画",
    chapterNumber: chapter.chapterNumber,
    panelCount: panels.length,
  };
}
