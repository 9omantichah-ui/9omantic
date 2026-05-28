import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;

function getClient(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  console.log("[db] Connecting to:", url.substring(0, 40) + "...");
  _client = createClient({ url, authToken });
  return _client;
}

export default { get: getClient };

export async function queryAll(sql: string, args: unknown[] = []) {
  try {
    const result = await getClient().execute({ sql, args: args as never[] });
    return result.rows;
  } catch (error) {
    console.error("[db] queryAll error:", sql, error);
    throw error;
  }
}

export async function execute(sql: string, args: unknown[] = []) {
  try {
    return await getClient().execute({ sql, args: args as never[] });
  } catch (error) {
    console.error("[db] execute error:", sql, error);
    throw error;
  }
}

export function cuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}