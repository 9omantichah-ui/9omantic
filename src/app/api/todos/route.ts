import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const todos = await queryAll(`
      SELECT t.*, p.id as p_id, p.name as p_name, p.color as p_color
      FROM Todo t LEFT JOIN Project p ON t.projectId = p.id
      ORDER BY t.zone ASC, t."order" ASC, t.createdAt DESC
    `);
    const result = todos.map((t: Record<string, unknown>) => ({
      ...t,
      completed: Boolean(t.completed),
      project: t.p_id ? { id: t.p_id, name: t.p_name, color: t.p_color } : null,
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/todos error:", error);
    return NextResponse.json({ error: "获取待办事项失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, priority, projectId, zone, scheduledDate } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });

    const id = cuid();
    const now = new Date().toISOString();
    const targetZone = zone ?? 0;

    const maxRow = await queryAll('SELECT MAX("order") as maxOrd FROM Todo WHERE zone = ?', [targetZone]);
    const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;

    await execute(
      'INSERT INTO Todo (id, title, description, completed, priority, zone, "order", scheduledDate, projectId, createdAt, updatedAt) VALUES (?,?,?,0,?,?,?,?,?,?,?)',
      [id, title.trim(), description?.trim() || null, priority || "medium", targetZone, maxOrd + 1, scheduledDate || null, projectId || null, now, now]
    );

    // 返回完整数据
    const todos = await queryAll("SELECT t.*, p.id as p_id, p.name as p_name, p.color as p_color FROM Todo t LEFT JOIN Project p ON t.projectId = p.id WHERE t.id = ?", [id]);
    const t = todos[0] as Record<string, unknown>;
    const result = { ...t, completed: Boolean(t.completed), project: t.p_id ? { id: t.p_id, name: t.p_name, color: t.p_color } : null };
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/todos error:", error);
    return NextResponse.json({ error: "创建待办事项失败" }, { status: 500 });
  }
}