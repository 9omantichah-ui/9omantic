import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { items } = await request.json() as { items: { id: string; zone: number; order: number }[] };
    const now = new Date().toISOString();
    for (const item of items) {
      await execute('UPDATE Todo SET zone = ?, "order" = ?, updatedAt = ? WHERE id = ? AND userId = ?', [item.zone, item.order, now, item.id, userId]);
    }
    return NextResponse.json({ message: "排序更新成功" });
  } catch (error) {
    console.error("reorder error:", error);
    return NextResponse.json({ error: "更新排序失败" }, { status: 500 });
  }
}