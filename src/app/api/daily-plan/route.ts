import { NextRequest, NextResponse } from "next/server";
import { queryAll, queryOne, execute, cuid } from "@/lib/db";
import { withAuth, dec, apiOk } from "@/lib/helpers";

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];

  let plan = await queryOne("SELECT * FROM DailyPlan WHERE date = ? AND userId = ?", [date, userId]);
  if (!plan) {
    const id = cuid();
    const now = new Date().toISOString();
    await execute("INSERT INTO DailyPlan (id, date, userId, createdAt) VALUES (?,?,?,?)", [id, date, userId, now]);
    plan = await queryOne("SELECT * FROM DailyPlan WHERE id = ?", [id]);
  }

  const items = await queryAll(`
    SELECT di.*, t.title as t_title, t.description as t_desc, t.completed as t_completed,
           t.zone as t_zone, t.projectId as t_projectId,
           p.id as p_id, p.name as p_name, p.color as p_color
    FROM DailyPlanItem di
    LEFT JOIN Todo t ON di.todoId = t.id
    LEFT JOIN Project p ON t.projectId = p.id
    WHERE di.planId = ? AND di.userId = ?
    ORDER BY di."order" ASC
  `, [plan!.id, userId]);

  const resultItems = items.map((item: Record<string, unknown>) => ({
    id: item.id,
    planId: item.planId,
    todoId: item.todoId,
    order: item.order,
    status: item.status,
    userId: item.userId,
    createdAt: item.createdAt,
    todo: item.t_title ? {
      id: item.todoId,
      title: dec(item.t_title),
      description: dec(item.t_desc),
      completed: Boolean(item.t_completed),
      zone: item.t_zone,
      projectId: item.t_projectId,
      project: item.p_id ? { id: item.p_id, name: dec(item.p_name), color: item.p_color } : null,
    } : null,
  }));

  return apiOk({ id: plan!.id, date: plan!.date, items: resultItems });
});

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const { todoId, date } = await request.json();
  if (!todoId) {
    return NextResponse.json({ error: "todoId 不能为空" }, { status: 400 });
  }

  const planDate = date || new Date().toISOString().split("T")[0];

  let plan = await queryOne("SELECT * FROM DailyPlan WHERE date = ? AND userId = ?", [planDate, userId]);
  if (!plan) {
    const id = cuid();
    const now = new Date().toISOString();
    await execute("INSERT INTO DailyPlan (id, date, userId, createdAt) VALUES (?,?,?,?)", [id, planDate, userId, now]);
    plan = await queryOne("SELECT * FROM DailyPlan WHERE id = ?", [id]);
  }

  const existing = await queryOne(
    "SELECT * FROM DailyPlanItem WHERE planId = ? AND todoId = ? AND userId = ?",
    [plan!.id, todoId, userId]
  );
  if (existing) {
    return NextResponse.json({ error: "该待办已在当日计划中" }, { status: 400 });
  }

  const maxRow = await queryAll('SELECT MAX("order") as maxOrd FROM DailyPlanItem WHERE planId = ?', [plan!.id]);
  const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;

  const id = cuid();
  const now = new Date().toISOString();
  await execute(
    'INSERT INTO DailyPlanItem (id, planId, todoId, "order", status, userId, createdAt) VALUES (?,?,?,?,?,?,?)',
    [id, plan!.id, todoId, maxOrd + 1, "pending", userId, now]
  );

  return NextResponse.json({ id, planId: plan!.id, todoId, order: maxOrd + 1, status: "pending" }, { status: 201 });
});

export const PUT = withAuth(async (request: NextRequest, userId: string) => {
  const { items } = await request.json() as { items: { id: string; order?: number; status?: string }[] };
  for (const item of items) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (item.order !== undefined) { sets.push('"order" = ?'); vals.push(item.order); }
    if (item.status !== undefined) { sets.push("status = ?"); vals.push(item.status); }
   if (sets.length === 0) continue;
    vals.push(item.id); vals.push(userId);
    await execute(`UPDATE DailyPlanItem SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
  }
  return apiOk({ message: "更新成功" });
});