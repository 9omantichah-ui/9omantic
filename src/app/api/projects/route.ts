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
    const projects = await queryAll('SELECT * FROM Project WHERE userId = ? ORDER BY "order" ASC, createdAt ASC', [userId]);
    const result = projects.map((p: Record<string, unknown>) => ({ ...p, name: dec(p.name) }));
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { name, color, groupId } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "项目名不能为空" }, { status: 400 });
    const id = cuid();
    const now = new Date().toISOString();
    const encName = encrypt(name.trim());
    // 获取最大 order
    const maxRow = await queryAll('SELECT MAX("order") as maxOrd FROM Project WHERE userId = ?', [userId]);
    const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;
    await execute(
      'INSERT INTO Project (id, name, color, groupId, "order", createdAt, userId) VALUES (?,?,?,?,?,?,?)',
      [id, encName, color || "#6366f1", groupId || null, maxOrd + 1, now, userId]
    );
    const project = await queryAll("SELECT * FROM Project WHERE id = ?", [id]);
    const p = project[0] as Record<string, unknown>;
    return NextResponse.json({ ...p, name: dec(p.name) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "创项目失败" }, { status: 500 });
  }
}

// 批量更新项目排序和分组
export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { items } = await request.json() as { items: { id: string; order: number; groupId?: string | null }[] };
    for (const item of items) {
      const sets = ['"order" = ?'];
      const vals: unknown[] = [item.order];
      if (item.groupId !== undefined) { sets.push("groupId = ?"); vals.push(item.groupId); }
      vals.push(item.id); vals.push(userId);
      await execute(`UPDATE Project SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
    }
    return NextResponse.json({ message: "更新成功" });
  } catch (error) {
    console.error("PUT /api/projects error:", error);
    return NextResponse.json({ error: "更新排序失败" }, { status: 500 });
  }
}