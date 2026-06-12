/**
 * 数据库迁移脚本 v2：
 * 1. 新增 ProjectGroup 表（项目分组）
 * 2. Project 表新增 groupId, order 字段
 * 3. 新增 DailyPlan 表（当日计划）
 * 4. 新增 DailyPlanItem 表（计划条目）
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function migrate() {
  console.log("[migrate-v2] Starting migration...");
  console.log("[migrate-v2] DB URL:", url.substring(0, 40) + "...");

  // 1. 创建 ProjectGroup 表
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ProjectGroup (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      collapsed INTEGER NOT NULL DEFAULT 0,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log("[migrate-v2] ✓ ProjectGroup table created");

  // 2. Project 表新增 groupId, order 字段
  try {
    await client.execute(`ALTER TABLE Project ADD COLUMN groupId TEXT`);
    console.log("[migrate-v2] ✓ Project.groupId added");
  } catch (e) {
    if (String(e).includes("duplicate column")) {
      console.log("[migrate-v2] ⊘ Project.groupId already exists");
    } else { throw e; }
  }

  try {
    await client.execute(`ALTER TABLE Project ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0`);
    console.log("[migrate-v2] ✓ Project.order added");
  } catch (e) {
    if (String(e).includes("duplicate column")) {
      console.log("[migrate-v2] ⊘ Project.order already exists");
    } else { throw e; }
  }

  // 3. 创建 DailyPlan 表
  await client.execute(`
    CREATE TABLE IF NOT EXISTS DailyPlan (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, userId)
    )
  `);
  console.log("[migrate-v2] ✓ DailyPlan table created");

  // 4. 创建 DailyPlanItem 表
  await client.execute(`
    CREATE TABLE IF NOT EXISTS DailyPlanItem (
      id TEXT PRIMARY KEY,
      planId TEXT NOT NULL,
      todoId TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (planId) REFERENCES DailyPlan(id) ON DELETE CASCADE,
      FOREIGN KEY (todoId) REFERENCES Todo(id) ON DELETE CASCADE
    )
  `);
  console.log("[migrate-v2] ✓ DailyPlanItem table created");

  console.log("[migrate-v2] Migration completed successfully!");
}

migrate().catch(e => {
  console.error("[migrate-v2] Migration failed:", e);
  process.exit(1);
});