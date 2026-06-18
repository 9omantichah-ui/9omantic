import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { decrypt } from "@/lib/encrypt";

/**
 * 解密字段值，兼容未加密的旧数据
 */
export function dec(v: unknown): string | null {
  if (!v || typeof v !== "string") return v as string | null;
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

/**
 * 统一 API 错误响应格式
 */
export function apiError(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * 统一 API 成功响应
 */
export function apiOk(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 认证中间件包装器 — 自动处理认证校验
 * 使用方式：export const GET = withAuth(async (request, userId) => { ... })
 */
export function withAuth(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      return apiError("未登录", 401);
    }
    try {
      return await handler(request, userId);
    } catch (error) {
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error);
      return apiError("服务器内部错误", 500);
    }
  };
}

/**
 * 带动态路由参数的认证中间件
 */
export function withAuthParams<T extends Record<string, string>>(
  handler: (request: NextRequest, userId: string, params: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      return apiError("未登录", 401);
    }
    try {
      const params = await context.params;
      return await handler(request, userId, params);
    } catch (error) {
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error);
      return apiError("服务器内部错误", 500);
    }
  };
}