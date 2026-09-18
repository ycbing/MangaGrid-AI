// ============================================
// 漫格 MangaGrid - Database Schema
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
import { INITIAL_USER_CREDITS } from "@/lib/constants";

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  credits: integer("credits").default(INITIAL_USER_CREDITS),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// User passwords (credential auth)
export const userPasswords = pgTable(
  "user_passwords",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("user_passwords_email_idx").on(table.email)]
);

// Usage logs (credits consumption tracking)
export const usageLogs = pgTable(
  "usage_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // script/storyboard/voiceover/compose/video
    creditsUsed: integer("credits_used").notNull(),
    dramaId: text("drama_id"), // 保留列（历史关联已随短剧模块清理移除外键）
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("usage_logs_user_id_idx").on(table.userId),
    index("usage_logs_drama_id_idx").on(table.dramaId),
  ]
);

// Verification tokens (email verification + password reset)
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    type: text("type").notNull(), // verify_email | reset_password
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("verification_tokens_token_idx").on(table.token),
    index("verification_tokens_email_idx").on(table.email),
  ]
);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
// Credit recharge orders (simulated payment for now)
export const creditRecharges = pgTable(
  "credit_recharges",
  {
    id: text("id").primaryKey(), // UUID order id
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderNo: text("order_no").notNull().unique(), // human-readable order number
    credits: integer("credits").notNull(), // credits added
    amount: integer("amount").notNull(), // price in CNY (yuan)
    provider: text("provider").default("mock"), // mock | wechat | alipay | stripe
    status: text("status").default("paid"), // pending | paid | failed | refunded
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [index("credit_recharges_user_id_idx").on(table.userId)]
);

export type CreditRecharge = typeof creditRecharges.$inferSelect;
export type NewCreditRecharge = typeof creditRecharges.$inferInsert;
