import { NextRequest } from "next/server";
import { execute, queryAll } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuthParams, dec, apiOk, apiError } from "@/lib/helpers";

// 更新任务（改名 / 换项目 / 排序）
export const PUT = withAuthParams(async (request: NextRequest, userId: string, params: { id: string }) => {
  const body = await request.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.name !== undefined) { sets.push("name = ?"); vals.push(encrypt(body.name.trim())); }
  if (body.projectId !== undefined) { sets.push("projectId = ?"); vals.push(body.projectId); }
  if (body.order !== undefined) { sets.push('"order" = ?'); vals.push(body.order); }
  if (sets.length === 0) return apiError("无更新内容", 400);
  vals.push(params.id); vals.push(userId);
  await execute(`UPDATE Task SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
  const row = await queryAll("SELECT * FROM Task WHERE id = ?", [params.id]);
  const t = row[0] as Record<string, unknown>;
  return apiOk({ ...t, name: dec(t.name) });
});

// 删除任务：默认级联删除其下待办；?keepTodos=1 时仅解除归属（taskId 置空）
export const DELETE = withAuthParams(async (request: NextRequest, userId: string, params: { id: string }) => {
  const keepTodos = request.nextUrl.searchParams.get("keepTodos") === "1";
  if (keepTodos) {
    await execute("UPDATE Todo SET taskId = NULL WHERE taskId = ? AND userId = ?", [params.id, userId]);
  } else {
    // 清理每日计划引用后删待办
    await execute(
      "DELETE FROM DailyPlanItem WHERE todoId IN (SELECT id FROM Todo WHERE taskId = ?) AND userId = ?",
      [params.id, userId]
    );
    await execute("DELETE FROM Todo WHERE taskId = ? AND userId = ?", [params.id, userId]);
  }
  await execute("DELETE FROM Task WHERE id = ? AND userId = ?", [params.id, userId]);
  return apiOk({ message: "删除成功" });
});