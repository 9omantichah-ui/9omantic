import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default db;

// 简化的数据库操作
export async function queryAll(sql: string, args: unknown[] = []) {
  const result = await db.execute({ sql, args: args as never[] });
  return result.rows;
}

export async function queryOne(sql: string, args: unknown[] = []) {
  const result = await db.execute({ sql, args: args as never[] });
  return result.rows[0] || null;
}

export async function execute(sql: string, args: unknown[] = []) {
  return await db.execute({ sql, args: args as never[] });
}

// ID 生成
export function cuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}