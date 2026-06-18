import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.TOKEN_SECRET || "todo-app-secret-2026-change-me"
);
const JWT_ISSUER = "actionflow";
const JWT_EXPIRY = "30d";

/**
 * 创建 JWT token
 */
export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * 验证 JWT token，返回 userId 或 null
 */
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

/**
 * 从 cookie 获取当前用户 ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  const user = await queryOne("SELECT id FROM User WHERE id = ?", [userId]);
  return user ? (user.id as string) : null;
}

/**
 * 设置 auth cookie 到 response
 */
export function setAuthCookie(res: Response, token: string): void {
  // 由调用方使用 NextResponse.cookies.set 来处理
}