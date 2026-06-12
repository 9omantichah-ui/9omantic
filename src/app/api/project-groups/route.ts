import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encrypt";

function dec(v: unknown): string | null {
  if (!v || typeof v !== "string") return v as string | null;
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const groups = await queryAll(
      'SELECT * FROM ProjectGroup WHERE userId = ? ORDER BY "order" ASC, createdAt ASC',
      [userId]
    );
    // 获取每个组下的项目
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
    // 也返回未分组的项目
    const ungrouped = projects
      .filter((p: Record<string, unknown>) => !p.groupId)
      .map((p: Record<string, unknown>) => ({ ...p, name: dec(p.name) }));
    return NextResponse.json({ groups: result, ungrouped });
  } catch (error) {
    console.error("GET /api/project-groups error:", error);
    return NextResponse.json({ error: "获取项目组失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "组名不能为空" }, { status: 400 });
    const id = cuid();
    const now = new Date().toISOString();
    const encName = encrypt(name.trim());
    // 获取最大 order
    const maxRow = await queryAll('SELECT MAX("order") as maxOrd FROM ProjectGroup WHERE userId = ?', [userId]);
    const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;
    await execute(
      'INSERT INTO ProjectGroup (id, name, "order", collapsed, userId, createdAt) VALUES (?,?,?,0,?,?)',
      [id, encName, maxOrd + 1, userId, now]
    );
    const row = await queryAll("SELECT * FROM ProjectGroup WHERE id = ?", [id]);
    const g = row[0] as Record<string, unknown>;
    return NextResponse.json({ ...g, name: dec(g.name), collapsed: Boolean(g.collapsed), projects: [] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/project-groups error:", error);
    return NextResponse.json({ error: "创建项目组失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { items } = await request.json() as { items: { id: string; order: number; collapsed?: boolean }[] };
    for (const item of items) {
      const sets = ['"order" = ?'];
      const vals: unknown[] = [item.order];
      if (item.collapsed !== undefined) { sets.push("collapsed = ?"); vals.push(item.collapsed ? 1 : 0); }
      vals.push(item.id); vals.push(userId);
      await execute(`UPDATE ProjectGroup SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
    }
    return NextResponse.json({ message: "更新成功" });
  } catch (error) {
    console.error("PUT /api/project-groups error:", error);
    return NextResponse.json({ error: "更新项目组失败" }, { status: 500 });
  }
}