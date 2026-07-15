import { NextRequest } from "next/server";
import { queryAll } from "@/lib/db";
import { withAuth, apiOk } from "@/lib/helpers";

// 返回该用户所有已被安排到任意 DailyPlan（任意日期、任意状态）中的 todoId 集合。
// 用于「未安排」聚合视图判定，避免只看当日 planItems 导致"安排到明天后仍显示未安排"的问题。
export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const rows = await queryAll(
    "SELECT DISTINCT todoId FROM DailyPlanItem WHERE userId = ?",
    [userId]
  );
  const ids = rows.map((r: Record<string, unknown>) => r.todoId as string);
  return apiOk({ ids });
});