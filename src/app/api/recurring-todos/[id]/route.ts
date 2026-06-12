import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encrypt";

function dec(v: unknown): string | null {
  if (!v || typeof v !== "string") return v as string | null;
  try { return decrypt(v); } catch { return v; }
}

function parseRow(r: Record<string, unknown>) {
  return {
    id: r.id, title: dec(r.title), projectId: r.projectId,
    project: r.p_id ? { id: r.p_id, name: dec(r.p_name), color: r.p_color } : null,
    repeatDays: JSON.parse((r.repeatDays as string) || "[]"),
    note: dec(r.note),
    completedDates: JSON.parse((r.completedDates as string) || "[]"),
    generatedDates: JSON.parse((r.generatedDates as string) || "[]"),
    userId: r.userId, createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const now = new Date().toISOString();

    // Check if updating completedDates or generatedDates (mark complete / generate instance)
    if (body.completedDates !== undefined) {
      await execute(
        `UPDATE RecurringTodo SET completedDates = ?, updatedAt = ? WHERE id = ? AND userId = ?`,
        [JSON.stringify(body.completedDates), now, id, userId]
      );
    }
    if (body.generatedDates !== undefined) {
      await execute(
        `UPDATE RecurringTodo SET generatedDates = ?, updatedAt = ? WHERE id = ? AND userId = ?`,
        [JSON.stringify(body.generatedDates), now, id, userId]
      );
    }
    // Edit fields
    if (body.title !== undefined || body.projectId !== undefined || body.repeatDays !== undefined || body.note !== undefined) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (body.title !== undefined) { sets.push("title = ?"); vals.push(encrypt(body.title.trim())); }
      if (body.projectId !== undefined) { sets.push("projectId = ?"); vals.push(body.projectId || null); }
      if (body.repeatDays !== undefined) { sets.push("repeatDays = ?"); vals.push(JSON.stringify(body.repeatDays)); }
      if (body.note !== undefined) { sets.push("note = ?"); vals.push(body.note?.trim() ? encrypt(body.note.trim()) : null); }
      sets.push("updatedAt = ?"); vals.push(now);
      vals.push(id, userId);
      await execute(`UPDATE RecurringTodo SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
    }

    const rows = await queryAll(
      `SELECT r.*, p.id as p_id, p.name as p_name, p.color as p_color
       FROM RecurringTodo r LEFT JOIN Project p ON r.projectId = p.id WHERE r.id = ?`, [id]
    );
    if (!rows.length) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(parseRow(rows[0] as Record<string, unknown>));
  } catch (error) {
    console.error("PUT /api/recurring-todos/[id] error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    await execute(`DELETE FROM RecurringTodo WHERE id = ? AND userId = ?`, [id, userId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recurring-todos/[id] error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}