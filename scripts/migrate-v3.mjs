/**
 * 数据库迁移脚本 v3：
 * Todo 表新增 parentId 字段，支持子待办（subtodo）
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function migrate() {
  console.log("[migrate-v3] Starting migration...");
  console.log("[migrate-v3] DB URL:", url.substring(0, 40) + "...");

  try {
    await client.execute(`ALTER TABLE Todo ADD COLUMN parentId TEXT`);
    console.log("[migrate-v3] ✓ Todo.parentId added");
  } catch (e) {
    if (String(e).includes("duplicate column")) {
      console.log("[migrate-v3] ⊘ Todo.parentId already exists");
    } else { throw e; }
  }

  console.log("[migrate-v3] Migration completed successfully!");
}

migrate().catch(e => {
  console.error("[migrate-v3] Migration failed:", e);
  process.exit(1);
});