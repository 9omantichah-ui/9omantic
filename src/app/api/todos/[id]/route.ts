import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

function toTodo(t: Record<string, unknown>) {
  return { ...t, completed: Boolean(t.completed), completedAt: t.completedAt || null, project: t.p_id ? { id: t.p_id, name: t.p_name, color: t.p_color } : null };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const rows = await queryAll("SELECT t.*, p.id as p_id, p.name as p_name, p.color as p_color FROM Todo t LEFT JOIN Project p ON t.projectId = p.id WHERE t.id = ? AND t.userId = ?", [params.id, userId]);
    if (!rows[0]) return NextResponse.json({ error: "不存在" }, { status: 404 });
    return NextResponse.json(toTodo(rows[0] as Record<string, unknown>));
  } catch (error) {
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const body = await request.json();
    const sets: string[] = [];
    const vals: unknown[] = [];
    const fields: Record<string, string> = {
      title: "title", description: "description", completed: "completed",
      priority: "priority", projectId: "projectId", zone: "zone",
      order: '"order"', scheduledDate: "scheduledDate",
    };
    for (const [key, col] of Object.entries(fields)) {
      if (body[key] !== undefined) { sets.push(`${col} = ?`); vals.push(body[key] === "" ? null : body[key]); }
    }
    // 勾选完成时记录 completedAt，取消完成时清空
    if (body.completed === true) { sets.push("completedAt = ?"); vals.push(new Date().toISOString()); }
    else if (body.completed === false) { sets.push("completedAt = ?"); vals.push(null); }
    sets.push("updatedAt = ?"); vals.push(new Date().toISOString());
    vals.push(params.id); vals.push(userId);
    await execute(`UPDATE Todo SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
    const rows = await queryAll("SELECT t.*, p.id as p_id, p.name as p_name, p.color as p_color FROM Todo t LEFT JOIN Project p ON t.projectId = p.id WHERE t.id = ?", [params.id]);
    return NextResponse.json(toTodo(rows[0] as Record<string, unknown>));
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await execute("DELETE FROM Todo WHERE id = ? AND userId = ?", [params.id, userId]);
    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}