// ============================================
// 漫格 MangaGrid - 漫画领域 Schema
// ============================================

import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// 漫画作品
export const comics = pgTable(
  "comics",
  {
    id: text("id").primaryKey(), // UUID
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    source: text("source").default("original"), // original | novel | template
    sourceText: text("source_text"), // 用户粘贴的小说章节原文
    genre: text("genre"), // 玄幻/都市/古风/悬疑...
    style: text("style").default("manga"), // 漫画风格: manga/manhua/watercolor/...
    layoutType: text("layout_type").default("strip"), // strip(条漫) | page(页漫)
    status: text("status").default("draft"), // draft/script_ready/chars_ready/panels_ready/exported/error
    chapterCount: integer("chapter_count").default(1),
    coverUrl: text("cover_url"),
    shareToken: text("share_token"),
    shareCount: integer("share_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("comics_user_id_idx").on(table.userId)]
);

// 角色卡（跨格一致性核心）
export const comicCharacters = pgTable(
  "comic_characters",
  {
    id: text("id").primaryKey(),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role").default("supporting"), // protagonist | supporting | villain
    gender: text("gender"),
    age: text("age"),
    appearance: text("appearance").notNull(), // 外貌特征描述（注入生图提示词）
    personality: text("personality"),
    referenceImageUrl: text("reference_image_url"), // 参考图（锁定形象）
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("comic_chars_comic_idx").on(table.comicId)]
);

// 话
export const comicChapters = pgTable(
  "comic_chapters",
  {
    id: text("id").primaryKey(),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    title: text("title"),
    // scenes: [{ id, scene_desc, location, panels: [{ scene_desc, characters[], dialogue, narration, bubble_side }] }]
    scriptContent: jsonb("script_content"),
    status: text("status").default("draft"), // draft/scripted/images_done
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("comic_chapters_comic_idx").on(table.comicId),
    uniqueIndex("comic_chapters_num_idx").on(table.comicId, table.chapterNumber),
  ]
);

// 格（生图单元）
export const comicPanels = pgTable(
  "comic_panels",
  {
    id: text("id").primaryKey(),
    chapterId: text("chapter_id")
      .notNull()
      .references(() => comicChapters.id, { onDelete: "cascade" }),
    panelNumber: integer("panel_number").notNull(),
    sceneDesc: text("scene_desc").notNull(), // 画面描述
    characters: jsonb("characters"), // [{ name, appearance }]
    dialogue: text("dialogue"), // 台词（气泡）
    narration: text("narration"), // 旁白
    bubbleSide: text("bubble_side").default("bottom"), // left|right|top|bottom|center
    imageUrl: text("image_url"), // 生成图（COS）
    imagePrompt: text("image_prompt"), // 最终生图提示词（含角色描述）
    regenCount: integer("regen_count").default(0),
    status: text("status").default("pending"), // pending/generating/done/failed
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("comic_panels_chapter_idx").on(table.chapterId),
    uniqueIndex("comic_panels_num_idx").on(table.chapterId, table.panelNumber),
  ]
);

// Types
export type Comic = typeof comics.$inferSelect;
export type NewComic = typeof comics.$inferInsert;
export type ComicCharacter = typeof comicCharacters.$inferSelect;
export type NewComicCharacter = typeof comicCharacters.$inferInsert;
export type ComicChapter = typeof comicChapters.$inferSelect;
export type NewComicChapter = typeof comicChapters.$inferInsert;
export type ComicPanel = typeof comicPanels.$inferSelect;
export type NewComicPanel = typeof comicPanels.$inferInsert;