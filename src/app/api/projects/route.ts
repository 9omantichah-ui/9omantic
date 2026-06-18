import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { withAuth, dec, apiOk } from "@/lib/helpers";

export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const projects = await queryAll(
    'SELECT * FROM Project WHERE userId = ? ORDER BY "order" ASC, createdAt ASC',
    [userId]
  );
  return apiOk(projects.map((p: Record<string, unknown>) => ({ ...p, name: dec(p.name) })));
});

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const { name, color, groupId } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "项目名不能为空" }, { status: 400 });
  }
  const id = cuid();
  const now = new Date().toISOString();
  const encName = encrypt(name.trim());
  const maxRow = await queryAll('SELECT MAX("order") as maxOrd FROM Project WHERE userId = ?', [userId]);
  const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;
  await execute(
    'INSERT INTO Project (id, name, color, groupId, "order", createdAt, userId) VALUES (?,?,?,?,?,?,?)',
    [id, encName, color || "#6366f1", groupId || null, maxOrd + 1, now, userId]
  );
  const project = await queryAll("SELECT * FROM Project WHERE id = ?", [id]);
  const p = project[0] as Record<string, unknown>;
  return NextResponse.json({ ...p, name: dec(p.name) }, { status: 201 });
});

export const PUT = withAuth(async (request: NextRequest, userId: string) => {
  const { items } = await request.json() as { items: { id: string; order: number; groupId?: string | null }[] };
  for (const item of items) {
    const sets = ['"order" = ?'];
    const vals: unknown[] = [item.order];
    if (item.groupId !== undefined) { sets.push("groupId = ?"); vals.push(item.groupId); }
    vals.push(item.id); vals.push(userId);
    await execute(`UPDATE Project SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
  }
  return apiOk({ message: "更新成功" });
});