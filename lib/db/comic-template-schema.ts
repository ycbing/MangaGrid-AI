// ============================================
// 漫格 MangaGrid - 模板市场 Schema
// 预设漫改模板（管理员运营），供 /comic/templates 市场页与创建向导使用
// ============================================

import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// 漫改模板
export const comicTemplates = pgTable(
  "comic_templates",
  {
    id: text("id").primaryKey(), // UUID（API 层生成；种子脚本用固定可读 id 保证幂等）
    title: varchar("title", { length: 100 }).notNull(),
    description: varchar("description", { length: 200 }).notNull(), // 一句话简介（卡片副标题）
    content: text("content").notNull(), // 创意文案，填入创建向导 sourceText
    genre: varchar("genre", { length: 20 }).notNull(), // fantasy/urban/ancient/mystery/romance/scifi
    style: varchar("style", { length: 20 }), // 建议画风，空 = 跟随向导默认
    layoutType: varchar("layout_type", { length: 10 }), // strip | page，空 = 跟随向导默认
    panelCount: integer("panel_count"), // 建议格数，空按 20 展示
    emoji: varchar("emoji", { length: 8 }).notNull().default("✨"),
    grad: varchar("grad", { length: 20 }).notNull().default("violet"), // 渐变主题 key（class 见 lib/constants.ts TEMPLATE_GRADIENTS）
    tags: varchar("tags", { length: 100 }), // 逗号分隔标签
    useCount: integer("use_count").notNull().default(0), // 使用次数（运营指标）
    sortOrder: integer("sort_order").notNull().default(0), // 小者靠前
    enabled: boolean("enabled").notNull().default(true), // 上下架
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("comic_templates_genre_idx").on(table.genre),
    index("comic_templates_enabled_sort_idx").on(table.enabled, table.sortOrder),
  ]
);

// Types
export type ComicTemplate = typeof comicTemplates.$inferSelect;
export type NewComicTemplate = typeof comicTemplates.$inferInsert;
