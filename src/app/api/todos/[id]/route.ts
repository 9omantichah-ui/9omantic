import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuthParams, dec, apiOk, apiError } from "@/lib/helpers";

function toTodo(t: Record<string, unknown>) {
  return {
    ...t,
    completed: Boolean(t.completed),
    completedAt: t.completedAt || null,
    title: dec(t.title),
    description: dec(t.description),
    project: t.p_id ? { id: t.p_id, name: dec(t.p_name), color: t.p_color } : null,
  };
}

export const GET = withAuthParams(async (_request: NextRequest, userId: string, params: { id: string }) => {
  const rows = await queryAll(
    "SELECT t.*, p.id as p_id, p.name as p_name, p.color as p_color FROM Todo t LEFT JOIN Project p ON t.projectId = p.id WHERE t.id = ? AND t.userId = ?",
    [params.id, userId]
  );
  if (!rows[0]) return apiError("不存在", 404);
  return apiOk(toTodo(rows[0] as Record<string, unknown>));
});

export const PUT = withAuthParams(async (request: NextRequest, userId: string, params: { id: string }) => {
  const body = await request.json();
  const sets: string[] = [];
  const vals: unknown[] = [];

  const encFields: Record<string, string> = { title: "title", description: "description" };
  const plainFields: Record<string, string> = {
    completed: "completed", priority: "priority", projectId: "projectId",
    zone: "zone", order: '"order"', scheduledDate: "scheduledDate", taskId: "taskId",
  };

  for (const [key, col] of Object.entries(encFields)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(body[key] && String(body[key]).trim() ? encrypt(String(body[key]).trim()) : null);
    }
  }
  for (const [key, col] of Object.entries(plainFields)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(body[key] === "" ? null : body[key]);
    }
  }
  if (body.completed === true) { sets.push("completedAt = ?"); vals.push(new Date().toISOString()); }
  else if (body.completed === false) { sets.push("completedAt = ?"); vals.push(null); }

  sets.push("updatedAt = ?"); vals.push(new Date().toISOString());
  vals.push(params.id); vals.push(userId);
  await execute(`UPDATE Todo SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);

  const rows = await queryAll(
    "SELECT t.*, p.id as p_id, p.name as p_name, p.color as p_color FROM Todo t LEFT JOIN Project p ON t.projectId = p.id WHERE t.id = ?",
    [params.id]
  );
  return apiOk(toTodo(rows[0] as Record<string, unknown>));
});

export const DELETE = withAuthParams(async (_request: NextRequest, userId: string, params: { id: string }) => {
  await execute("DELETE FROM Todo WHERE id = ? AND userId = ?", [params.id, userId]);
  return apiOk({ message: "删除成功" });
});