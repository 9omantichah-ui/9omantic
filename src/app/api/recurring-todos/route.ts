import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const rows = await queryAll(
      `SELECT r.*, p.id as p_id, p.name as p_name, p.color as p_color
       FROM RecurringTodo r LEFT JOIN Project p ON r.projectId = p.id
       WHERE r.userId = ? ORDER BY r.createdAt DESC`,
      [userId]
    );
    const result = rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      title: r.title,
      projectId: r.projectId,
      project: r.p_id ? { id: r.p_id, name: r.p_name, color: r.p_color } : null,
      repeatDays: JSON.parse((r.repeatDays as string) || "[]"),
      note: r.note,
      completedDates: JSON.parse((r.completedDates as string) || "[]"),
      generatedDates: JSON.parse((r.generatedDates as string) || "[]"),
      userId: r.userId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/recurring-todos error:", error);
    return NextResponse.json({ error: "获取循环待办失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { title, projectId, repeatDays, note } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    if (!repeatDays?.length) return NextResponse.json({ error: "请至少选择一天" }, { status: 400 });

    const id = cuid();
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO RecurringTodo (id, title, projectId, repeatDays, note, completedDates, generatedDates, userId, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, title.trim(), projectId || null, JSON.stringify(repeatDays), note?.trim() || null, "[]", "[]", userId, now, now]
    );

    const rows = await queryAll(
      `SELECT r.*, p.id as p_id, p.name as p_name, p.color as p_color
       FROM RecurringTodo r LEFT JOIN Project p ON r.projectId = p.id WHERE r.id = ?`,
      [id]
    );
    const r = rows[0] as Record<string, unknown>;
    return NextResponse.json({
      id: r.id, title: r.title, projectId: r.projectId,
      project: r.p_id ? { id: r.p_id, name: r.p_name, color: r.p_color } : null,
      repeatDays: JSON.parse((r.repeatDays as string) || "[]"),
      note: r.note, completedDates: [], generatedDates: [],
      userId: r.userId, createdAt: r.createdAt, updatedAt: r.updatedAt,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring-todos error:", error);
    return NextResponse.json({ error: "创建循环待办失败" }, { status: 500 });
  }
}