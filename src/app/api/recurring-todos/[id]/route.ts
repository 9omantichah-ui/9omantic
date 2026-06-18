import { NextRequest } from "next/server";
import { queryAll, execute } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuthParams, dec, apiOk, apiError } from "@/lib/helpers";

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

export const PUT = withAuthParams(async (request: NextRequest, userId: string, params: { id: string }) => {
  const body = await request.json();
  const now = new Date().toISOString();

  if (body.completedDates !== undefined) {
    await execute(
      `UPDATE RecurringTodo SET completedDates = ?, updatedAt = ? WHERE id = ? AND userId = ?`,
      [JSON.stringify(body.completedDates), now, params.id, userId]
    );
  }
  if (body.generatedDates !== undefined) {
    await execute(
      `UPDATE RecurringTodo SET generatedDates = ?, updatedAt = ? WHERE id = ? AND userId = ?`,
      [JSON.stringify(body.generatedDates), now, params.id, userId]
    );
  }
  if (body.title !== undefined || body.projectId !== undefined || body.repeatDays !== undefined || body.note !== undefined) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (body.title !== undefined) { sets.push("title = ?"); vals.push(encrypt(body.title.trim())); }
    if (body.projectId !== undefined) { sets.push("projectId = ?"); vals.push(body.projectId || null); }
    if (body.repeatDays !== undefined) { sets.push("repeatDays = ?"); vals.push(JSON.stringify(body.repeatDays)); }
    if (body.note !== undefined) { sets.push("note = ?"); vals.push(body.note?.trim() ? encrypt(body.note.trim()) : null); }
    sets.push("updatedAt = ?"); vals.push(now);
    vals.push(params.id, userId);
    await execute(`UPDATE RecurringTodo SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
  }

  const rows = await queryAll(
    `SELECT r.*, p.id as p_id, p.name as p_name, p.color as p_color
     FROM RecurringTodo r LEFT JOIN Project p ON r.projectId = p.id WHERE r.id = ?`,
    [params.id]
  );
  if (!rows.length) return apiError("未找到", 404);
  return apiOk(parseRow(rows[0] as Record<string, unknown>));
});

export const DELETE = withAuthParams(async (_request: NextRequest, userId: string, params: { id: string }) => {
  await execute(`DELETE FROM RecurringTodo WHERE id = ? AND userId = ?`, [params.id, userId]);
  return apiOk({ success: true });
});