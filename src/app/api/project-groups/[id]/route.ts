import { NextRequest } from "next/server";
import { execute, queryAll } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuthParams, dec, apiOk, apiError } from "@/lib/helpers";

export const PUT = withAuthParams(async (request: NextRequest, userId: string, params: { id: string }) => {
  const body = await request.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.name !== undefined) { sets.push("name = ?"); vals.push(encrypt(body.name.trim())); }
  if (body.order !== undefined) { sets.push('"order" = ?'); vals.push(body.order); }
  if (body.collapsed !== undefined) { sets.push("collapsed = ?"); vals.push(body.collapsed ? 1 : 0); }
  if (sets.length === 0) return apiError("无更新内容", 400);
  vals.push(params.id); vals.push(userId);
  await execute(`UPDATE ProjectGroup SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
  const row = await queryAll("SELECT * FROM ProjectGroup WHERE id = ?", [params.id]);
  const g = row[0] as Record<string, unknown>;
  return apiOk({ ...g, name: dec(g.name), collapsed: Boolean(g.collapsed) });
});

export const DELETE = withAuthParams(async (_request: NextRequest, userId: string, params: { id: string }) => {
  await execute("UPDATE Project SET groupId = NULL WHERE groupId = ? AND userId = ?", [params.id, userId]);
  await execute("DELETE FROM ProjectGroup WHERE id = ? AND userId = ?", [params.id, userId]);
  return apiOk({ message: "删除成功" });
});