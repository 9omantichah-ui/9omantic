import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";

const TOKEN_SECRET = process.env.TOKEN_SECRET || "todo-app-secret-2026";

// 简单 token：base64(userId:timestamp:hash)
export function createToken(userId: string): string {
  const ts = Date.now().toString(36);
  const raw = `${userId}:${ts}`;
  const hash = Buffer.from(raw + TOKEN_SECRET).toString("base64").slice(0, 12);
  return Buffer.from(`${raw}:${hash}`).toString("base64");
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [userId, ts, hash] = decoded.split(":");
    const expected = Buffer.from(`${userId}:${ts}${TOKEN_SECRET}`).toString("base64").slice(0, 12);
    if (hash !== expected) return null;
    return userId;
  } catch {
    return null;
  }
}

// 从 cookie 获取当前用户 ID
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;
  const user = await queryOne("SELECT id FROM User WHERE id = ?", [userId]);
  return user ? (user.id as string) : null;
}