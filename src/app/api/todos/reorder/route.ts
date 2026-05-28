import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(request: NextRequest) {
  try {
    const { items } = await request.json() as { items: { id: string; zone: number; order: number }[] };
    const now = new Date().toISOString();
    const stmts = items.map(item => ({
      sql: 'UPDATE Todo SET zone = ?, "order" = ?, updatedAt = ? WHERE id = ?',
      args: [item.zone, item.order, now, item.id] as unknown[],
    }));
    await db.batch(stmts as never[]);
    return NextResponse.json({ message: "排序更新成功" });
  } catch (error) {
    console.error("reorder error:", error);
    return NextResponse.json({ error: "更新排序失败" }, { status: 500 });
  }
}