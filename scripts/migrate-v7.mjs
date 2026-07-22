/**
 * 数据库迁移脚本 v7：为 DailyPlanItem 增加半小时粒度时间字段。
 *   - startAt      TEXT     "HH:mm" 具体开始时间；NULL 表示"未定时"
 *   - durationMin  INTEGER  持续分钟数，默认 30
 * 幂等：可重复执行。
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function hasColumn(table, column) {
  const result = await client.execute(`PRAGMA table_info(${table})`);
  return result.rows.some(row => row.name === column);
}

async function migrate() {
  console.log("[migrate-v7] Starting migration...");
  console.log("[migrate-v7] DB URL:", url.substring(0, 40) + "...");

  if (await hasColumn("DailyPlanItem", "startAt")) {
    console.log("[migrate-v7] ⊘ DailyPlanItem.startAt already exists");
  } else {
    await client.execute(`ALTER TABLE DailyPlanItem ADD COLUMN startAt TEXT`);
    console.log("[migrate-v7] ✓ DailyPlanItem.startAt added (nullable)");
  }

  if (await hasColumn("DailyPlanItem", "durationMin")) {
    console.log("[migrate-v7] ⊘ DailyPlanItem.durationMin already exists");
  } else {
    await client.execute(`ALTER TABLE DailyPlanItem ADD COLUMN durationMin INTEGER NOT NULL DEFAULT 30`);
    console.log("[migrate-v7] ✓ DailyPlanItem.durationMin added (default 30)");
  }

  console.log("[migrate-v7] Migration completed successfully!");
}

migrate().catch(e => {
  console.error("[migrate-v7] Migration failed:", e);
  process.exit(1);
});