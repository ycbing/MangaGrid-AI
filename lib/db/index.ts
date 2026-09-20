import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as appSchema from "./schema";
import * as comicSchema from "./comic-schema";
import * as comicTemplateSchema from "./comic-template-schema";
import { modelConfigs, userModelConfigs } from "./model-config-schema";
export { modelConfigs, userModelConfigs } from "./model-config-schema";
export type { ModelConfig, NewModelConfig, UserModelConfig, NewUserModelConfig } from "./model-config-schema";
export * from "./comic-schema";
export * from "./comic-template-schema";

export const allSchema = { ...appSchema, ...comicSchema, ...comicTemplateSchema };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema: allSchema });
