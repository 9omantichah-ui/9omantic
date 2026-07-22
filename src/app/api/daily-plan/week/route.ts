import { NextRequest } from "next/server";
import { queryAll } from "@/lib/db";
import { withAuth, dec, apiOk } from "@/lib/helpers";

/**
 * GET /api/daily-plan/week?start=YYYY-MM-DD
 * 返回从 start(周一) 起 7 天以及 date='NEXT_WEEK' 的所有 DailyPlanItem。
 * 不存在的 DailyPlan 不会自动创建（读多写少，写在 POST 里按需 upsert）。
 */
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const start = request.nextUrl.searchParams.get("start");
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return apiOk({ items: [], start: null });
  }

  // 生成 7 天日期 + 特殊 NEXT_WEEK
  const dates: string[] = [];
  const d = new Date(start + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    dates.push(nd.toISOString().split("T")[0]);
  }
  const allDates = [...dates, "NEXT_WEEK"];
  const placeholders = allDates.map(() => "?").join(",");

  const items = await queryAll(`
    SELECT di.*, dp.date as plan_date,
           t.title as t_title, t.description as t_desc, t.completed as t_completed,
           t.zone as t_zone, t.projectId as t_projectId,
           p.id as p_id, p.name as p_name, p.color as p_color,
           tk.id as tk_id, tk.name as tk_name
    FROM DailyPlanItem di
    LEFT JOIN DailyPlan dp ON di.planId = dp.id
    LEFT JOIN Todo t ON di.todoId = t.id
    LEFT JOIN Project p ON t.projectId = p.id
    LEFT JOIN Task tk ON t.taskId = tk.id
    WHERE di.userId = ? AND dp.date IN (${placeholders})
    ORDER BY di."order" ASC
  `, [userId, ...allDates]);

  const resultItems = items.map((item: Record<string, unknown>) => ({
    id: item.id,
    planId: item.planId,
    todoId: item.todoId,
    order: item.order,
    status: item.status,
    timeSlot: item.timeSlot || "morning",
    startAt: (item.startAt as string | null) ?? null,
    durationMin: (item.durationMin as number | null) ?? 30,
    userId: item.userId,
    createdAt: item.createdAt,
    date: item.plan_date, // 挂上具体日期，前端按 date+slot 分桶
    todo: item.t_title ? {
      id: item.todoId,
      title: dec(item.t_title),
      description: dec(item.t_desc),
      completed: Boolean(item.t_completed),
      zone: item.t_zone,
      projectId: item.t_projectId,
      project: item.p_id ? { id: item.p_id, name: dec(item.p_name), color: item.p_color } : null,
      task: item.tk_id ? { id: item.tk_id, name: dec(item.tk_name) } : null,
    } : null,
  }));

  return apiOk({ start, items: resultItems });
});