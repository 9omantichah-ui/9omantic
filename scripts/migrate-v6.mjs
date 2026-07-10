/**
 * 数据库迁移脚本 v6：移除子待办概念，把所有子待办转为普通待办。
 * 将所有 parentId 非空的 Todo 的 parentId 置空，使其成为顶层普通待办。
 * 幂等：可重复执行。
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function migrate() {
  console.log("[migrate-v6] Starting migration...");
  console.log("[migrate-v6] DB URL:", url.substring(0, 40) + "...");

  const before = await client.execute(
    `SELECT COUNT(*) as cnt FROM Todo WHERE parentId IS NOT NULL AND parentId != ''`
  );
  const cnt = before.rows[0]?.cnt ?? 0;

  if (cnt === 0) {
    console.log("[migrate-v6] ⊘ No subtodos to convert");
  } else {
    await client.execute(`UPDATE Todo SET parentId = NULL WHERE parentId IS NOT NULL AND parentId != ''`);
    console.log(`[migrate-v6] ✓ Converted ${cnt} subtodo(s) to top-level todos`);
  }

  console.log("[migrate-v6] Migration completed successfully!");
}

migrate().catch(e => {
  console.error("[migrate-v6] Migration failed:", e);
  process.exit(1);
});