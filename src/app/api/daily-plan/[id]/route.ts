import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

// DELETE /api/daily-plan/[id] - 从当日计划中移除
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await execute("DELETE FROM DailyPlanItem WHERE id = ? AND userId = ?", [params.id, userId]);
    return NextResponse.json({ message: "移除成功" });
  } catch (error) {
    console.error("DELETE /api/daily-plan/[id] error:", error);
    return NextResponse.json({ error: "移除失败" }, { status: 500 });
  }
}