import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuth, dec, apiOk } from "@/lib/helpers";

function parseRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: dec(r.title),
    projectId: r.projectId,
    project: r.p_id ? { id: r.p_id, name: dec(r.p_name), color: r.p_color } : null,
    repeatDays: JSON.parse((r.repeatDays as string) || "[]"),
    note: dec(r.note),
    completedDates: JSON.parse((r.completedDates as string) || "[]"),
    generatedDates: JSON.parse((r.generatedDates as string) || "[]"),
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const rows = await queryAll(
    `SELECT r.*, p.id as p_id, p.name as p_name, p.color as p_color
     FROM RecurringTodo r LEFT JOIN Project p ON r.projectId = p.id
     WHERE r.userId = ? ORDER BY r.createdAt DESC`,
    [userId]
  );
  return apiOk(rows.map((r) => parseRow(r as Record<string, unknown>)));
});

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const { title, projectId, repeatDays, note } = await request.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }
  if (!repeatDays?.length) {
    return NextResponse.json({ error: "请至少选择一天" }, { status: 400 });
  }

  const id = cuid();
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO RecurringTodo (id, title, projectId, repeatDays, note, completedDates, generatedDates, userId, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, encrypt(title.trim()), projectId || null, JSON.stringify(repeatDays), note?.trim() ? encrypt(note.trim()) : null, "[]", "[]", userId, now, now]
  );

  const rows = await queryAll(
    `SELECT r.*, p.id as p_id, p.name as p_name, p.color as p_color
     FROM RecurringTodo r LEFT JOIN Project p ON r.projectId = p.id WHERE r.id = ?`,
    [id]
  );
  return NextResponse.json(parseRow(rows[0] as Record<string, unknown>), { status: 201 });
});