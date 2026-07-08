import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuth, dec, apiOk } from "@/lib/helpers";

// 任务列表（按项目/排序）
export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const rows = await queryAll(
    'SELECT * FROM Task WHERE userId = ? ORDER BY "order" ASC, createdAt ASC',
    [userId]
  );
  return apiOk(rows.map((t: Record<string, unknown>) => ({ ...t, name: dec(t.name) })));
});

// 创建任务
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const { name, projectId } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "任务名不能为空" }, { status: 400 });
  }
  const id = cuid();
  const now = new Date().toISOString();
  const encName = encrypt(name.trim());
  const maxRow = await queryAll(
    'SELECT MAX("order") as maxOrd FROM Task WHERE projectId = ? AND userId = ?',
    [projectId || null, userId]
  );
  const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;
  await execute(
    'INSERT INTO Task (id, name, projectId, "order", userId, createdAt) VALUES (?,?,?,?,?,?)',
    [id, encName, projectId || null, maxOrd + 1, userId, now]
  );
  const row = await queryAll("SELECT * FROM Task WHERE id = ?", [id]);
  const t = row[0] as Record<string, unknown>;
  return NextResponse.json({ ...t, name: dec(t.name) }, { status: 201 });
});

// 批量排序 / 移动到其他项目
export const PUT = withAuth(async (request: NextRequest, userId: string) => {
  const { items } = await request.json() as { items: { id: string; order: number; projectId?: string | null }[] };
  for (const item of items) {
    const sets = ['"order" = ?'];
    const vals: unknown[] = [item.order];
    if (item.projectId !== undefined) { sets.push("projectId = ?"); vals.push(item.projectId); }
    vals.push(item.id); vals.push(userId);
    await execute(`UPDATE Task SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
  }
  return apiOk({ message: "更新成功" });
});