// ============================================
// 模板管理（仅管理员）
// GET    /api/admin/templates — 全量列表（含下架）
// POST   /api/admin/templates — 新建
// PUT    /api/admin/templates — 更新（body.id 必填）
// DELETE /api/admin/templates?id= — 删除（建议运营上优先下架）
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comicTemplates } from "@/lib/db/comic-template-schema";
import { asc, desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "@/lib/logger";
import { isAdminUser } from "@/lib/admin";
import { TEMPLATE_GRADIENTS } from "@/lib/constants";

const log = createLogger("admin-templates-api");

const VALID_GENRES = ["fantasy", "urban", "ancient", "mystery", "romance", "scifi"];
const VALID_STYLES = ["manhua", "manga", "ink", "watercolor", "cyberpunk", "cartoon"];
const VALID_LAYOUTS = ["strip", "page"];

// 从 body 提取可更新字段（POST/PUT 共用），非法值回退/忽略
function extractFields(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  if (body.title !== undefined) fields.title = String(body.title).trim();
  if (body.description !== undefined) fields.description = String(body.description).trim();
  if (body.content !== undefined) fields.content = String(body.content);
  if (body.genre !== undefined) fields.genre = String(body.genre);
  if (body.style !== undefined)
    fields.style = VALID_STYLES.includes(String(body.style)) ? String(body.style) : null;
  if (body.layoutType !== undefined)
    fields.layoutType = VALID_LAYOUTS.includes(String(body.layoutType)) ? String(body.layoutType) : null;
  if (body.panelCount !== undefined)
    fields.panelCount = body.panelCount
      ? Math.max(1, Math.min(50, Number(body.panelCount) || 0)) || null
      : null;
  if (body.emoji !== undefined) fields.emoji = String(body.emoji).trim() || "✨";
  if (body.grad !== undefined)
    fields.grad = TEMPLATE_GRADIENTS[String(body.grad)] ? String(body.grad) : "violet";
  if (body.tags !== undefined) fields.tags = body.tags ? String(body.tags).trim() : null;
  if (body.sortOrder !== undefined) fields.sortOrder = Number(body.sortOrder) || 0;
  if (body.enabled !== undefined) fields.enabled = !!body.enabled;
  return fields;
}

// GET — 全量列表（含下架，管理端用）
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    if (!isAdminUser(session.user.id)) return NextResponse.json({ error: "无权限" }, { status: 403 });

    const rows = await db
      .select()
      .from(comicTemplates)
      .orderBy(asc(comicTemplates.sortOrder), desc(comicTemplates.createdAt));

    return NextResponse.json({ templates: rows });
  } catch (error) {
    log.error("GET /api/admin/templates failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "获取模板列表失败" }, { status: 500 });
  }
}

// POST — 新建模板
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    if (!isAdminUser(session.user.id)) return NextResponse.json({ error: "无权限" }, { status: 403 });

    const body = await request.json();
    const fields = extractFields(body);

    if (!fields.title || !fields.description || !fields.content || !fields.genre) {
      return NextResponse.json(
        { error: "缺少必填字段: title, description, content, genre" },
        { status: 400 }
      );
    }
    if (!VALID_GENRES.includes(fields.genre as string)) {
      return NextResponse.json({ error: "无效的题材 genre" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(comicTemplates)
      .values({ id: uuidv4(), ...fields } as typeof comicTemplates.$inferInsert)
      .returning();

    log.info("创建模板", { id: inserted.id, title: inserted.title, adminId: session.user.id });
    return NextResponse.json({ template: inserted });
  } catch (error) {
    log.error("POST /api/admin/templates failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "创建模板失败" }, { status: 500 });
  }
}

// PUT — 更新模板
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    if (!isAdminUser(session.user.id)) return NextResponse.json({ error: "无权限" }, { status: 403 });

    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "缺少模板 ID" }, { status: 400 });

    const fields = extractFields(body);
    if (fields.genre !== undefined && !VALID_GENRES.includes(fields.genre as string)) {
      return NextResponse.json({ error: "无效的题材 genre" }, { status: 400 });
    }

    const [updated] = await db
      .update(comicTemplates)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(comicTemplates.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "模板不存在" }, { status: 404 });

    log.info("更新模板", { id, adminId: session.user.id });
    return NextResponse.json({ template: updated });
  } catch (error) {
    log.error("PUT /api/admin/templates failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "更新模板失败" }, { status: 500 });
  }
}

// DELETE — 删除模板
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    if (!isAdminUser(session.user.id)) return NextResponse.json({ error: "无权限" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少模板 ID" }, { status: 400 });

    const [deleted] = await db
      .delete(comicTemplates)
      .where(eq(comicTemplates.id, id))
      .returning({ id: comicTemplates.id, title: comicTemplates.title });

    if (!deleted) return NextResponse.json({ error: "模板不存在" }, { status: 404 });

    log.info("删除模板", { id: deleted.id, title: deleted.title, adminId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("DELETE /api/admin/templates failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "删除模板失败" }, { status: 500 });
  }
}
