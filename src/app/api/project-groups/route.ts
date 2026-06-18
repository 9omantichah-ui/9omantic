import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuth, dec, apiOk } from "@/lib/helpers";

export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const groups = await queryAll(
    'SELECT * FROM ProjectGroup WHERE userId = ? ORDER BY "order" ASC, createdAt ASC',
    [userId]
  );
  const projects = await queryAll(
    'SELECT * FROM Project WHERE userId = ? ORDER BY "order" ASC, createdAt ASC',
    [userId]
  );
  const result = groups.map((g: Record<string, unknown>) => ({
    ...g,
    name: dec(g.name),
    collapsed: Boolean(g.collapsed),
    projects: projects
      .filter((p: Record<string, unknown>) => p.groupId === g.id)
      .map((p: Record<string, unknown>) => ({ ...p, name: dec(p.name) })),
  }));
  const ungrouped = projects
    .filter((p: Record<string, unknown>) => !p.groupId)
    .map((p: Record<string, unknown>) => ({ ...p, name: dec(p.name) }));
  return apiOk({ groups: result, ungrouped });
});

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "组名不能为空" }, { status: 400 });
  }
  const id = cuid();
  const now = new Date().toISOString();
  const encName = encrypt(name.trim());
  const maxRow = await queryAll('SELECT MAX("order") as maxOrd FROM ProjectGroup WHERE userId = ?', [userId]);
  const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;
  await execute(
    'INSERT INTO ProjectGroup (id, name, "order", collapsed, userId, createdAt) VALUES (?,?,?,0,?,?)',
    [id, encName, maxOrd + 1, userId, now]
  );
  const row = await queryAll("SELECT * FROM ProjectGroup WHERE id = ?", [id]);
  const g = row[0] as Record<string, unknown>;
  return NextResponse.json(
    { ...g, name: dec(g.name), collapsed: Boolean(g.collapsed), projects: [] },
    { status: 201 }
  );
});

export const PUT = withAuth(async (request: NextRequest, userId: string) => {
  const { items } = await request.json() as { items: { id: string; order: number; collapsed?: boolean }[] };
  for (const item of items) {
    const sets = ['"order" = ?'];
    const vals: unknown[] = [item.order];
    if (item.collapsed !== undefined) { sets.push("collapsed = ?"); vals.push(item.collapsed ? 1 : 0); }
    vals.push(item.id); vals.push(userId);
    await execute(`UPDATE ProjectGroup SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
  }
  return apiOk({ message: "更新成功" });
});