import { NextRequest } from "next/server";
import { execute, queryAll } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuthParams, dec, apiOk, apiError } from "@/lib/helpers";

// 更新单个项目（名称/颜色/分组）
export const PUT = withAuthParams(async (request: NextRequest, userId: string, params: { id: string }) => {
  const body = await request.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.name !== undefined) { sets.push("name = ?"); vals.push(encrypt(body.name.trim())); }
  if (body.color !== undefined) { sets.push("color = ?"); vals.push(body.color); }
  if (body.groupId !== undefined) { sets.push("groupId = ?"); vals.push(body.groupId); }
  if (sets.length === 0) return apiError("无更新内容", 400);
  vals.push(params.id); vals.push(userId);
  await execute(`UPDATE Project SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
  const row = await queryAll("SELECT * FROM Project WHERE id = ?", [params.id]);
  const p = row[0] as Record<string, unknown>;
  return apiOk({ ...p, name: dec(p.name) });
});

// 删除项目：连同该项目下的待办（含子待办）及其每日计划引用一并删除
export const DELETE = withAuthParams(async (_request: NextRequest, userId: string, params: { id: string }) => {
  // 该项目下的所有待办 id
  const todoRows = await queryAll("SELECT id FROM Todo WHERE projectId = ? AND userId = ?", [params.id, userId]);
  const todoIds = todoRows.map(r => (r as Record<string, unknown>).id as string);

  if (todoIds.length > 0) {
    const placeholders = todoIds.map(() => "?").join(",");
    // 清理每日计划中对这些待办（含其子待办）的引用
    await execute(
      `DELETE FROM DailyPlanItem WHERE (todoId IN (${placeholders}) OR todoId IN (SELECT id FROM Todo WHERE parentId IN (${placeholders}))) AND userId = ?`,
      [...todoIds, ...todoIds, userId]
    );
    // 删除子待办（parentId 指向本项目待办的）
    await execute(
      `DELETE FROM Todo WHERE parentId IN (${placeholders}) AND userId = ?`,
      [...todoIds, userId]
    );
  }

  // 删除该项目的待办
  await execute("DELETE FROM Todo WHERE projectId = ? AND userId = ?", [params.id, userId]);
  // 删除项目本身
  await execute("DELETE FROM Project WHERE id = ? AND userId = ?", [params.id, userId]);

  return apiOk({ message: "删除成功" });
});