/**
 * 数据库迁移脚本 v5：当日计划支持时段拆分（上午/下午/晚上）
 * 给 DailyPlanItem 增加 timeSlot 字段：morning / afternoon / evening，默认 morning。
 * 幂等：可重复执行。
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function hasColumn(table, column) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  return info.rows.some(r => r.name === column);
}

async function migrate() {
  console.log("[migrate-v5] Starting migration...");
  console.log("[migrate-v5] DB URL:", url.substring(0, 40) + "...");

  if (await hasColumn("DailyPlanItem", "timeSlot")) {
    console.log("[migrate-v5] ⊘ DailyPlanItem.timeSlot already exists");
  } else {
    await client.execute(`ALTER TABLE DailyPlanItem ADD COLUMN timeSlot TEXT NOT NULL DEFAULT 'morning'`);
    console.log("[migrate-v5] ✓ DailyPlanItem.timeSlot added (default 'morning')");
  }

  console.log("[migrate-v5] Migration completed successfully!");
}

migrate().catch(e => {
  console.error("[migrate-v5] Migration failed:", e);
  process.exit(1);
});