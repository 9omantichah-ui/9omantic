import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuth, dec, apiOk } from "@/lib/helpers";

type TodoDTO = Record<string, unknown> & { id?: unknown };

function toTodo(t: Record<string, unknown>): TodoDTO {
  return {
    ...t,
    completed: Boolean(t.completed),
    completedAt: t.completedAt || null,
    taskId: t.taskId || null,
    title: dec(t.title),
    description: dec(t.description),
    project: t.p_id ? { id: t.p_id, name: dec(t.p_name), color: t.p_color } : null,
    task: t.tk_id ? { id: t.tk_id, name: dec(t.tk_name) } : null,
  };
}

export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const rows = await queryAll(`
    SELECT t.*, p.id as p_id, p.name as p_name, p.color as p_color,
           tk.id as tk_id, tk.name as tk_name
    FROM Todo t
    LEFT JOIN Project p ON t.projectId = p.id
    LEFT JOIN Task tk ON t.taskId = tk.id
    WHERE t.userId = ?
    ORDER BY t.zone ASC, t."order" ASC, t.createdAt DESC
  `, [userId]);
  return apiOk(rows.map((t) => toTodo(t as Record<string, unknown>)));
});

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const { title, description, priority, projectId, zone, scheduledDate, taskId } = await request.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const id = cuid();
  const now = new Date().toISOString();
  const targetZone = zone ?? 0;
  const maxRow = await queryAll(
    'SELECT MAX("order") as maxOrd FROM Todo WHERE zone = ? AND userId = ?',
    [targetZone, userId]
  );
  const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;

  const encTitle = encrypt(title.trim());
  const encDesc = description?.trim() ? encrypt(description.trim()) : null;

  await execute(
    'INSERT INTO Todo (id, title, description, completed, priority, zone, "order", scheduledDate, projectId, taskId, createdAt, updatedAt, userId) VALUES (?,?,?,0,?,?,?,?,?,?,?,?,?)',
    [id, encTitle, encDesc, priority || "medium", targetZone, maxOrd + 1, scheduledDate || null, projectId || null, taskId || null, now, now, userId]
  );

  const todos = await queryAll(
    "SELECT t.*, p.id as p_id, p.name as p_name, p.color as p_color FROM Todo t LEFT JOIN Project p ON t.projectId = p.id WHERE t.id = ?",
    [id]
  );
  return NextResponse.json(toTodo(todos[0] as Record<string, unknown>), { status: 201 });
});