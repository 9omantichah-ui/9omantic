import { NextRequest, NextResponse } from "next/server";
import { execute, queryAll } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encrypt";

function dec(v: unknown): string | null {
  if (!v || typeof v !== "string") return v as string | null;
  try { return decrypt(v); } catch { return v; }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const body = await request.json();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (body.name !== undefined) { sets.push("name = ?"); vals.push(encrypt(body.name.trim())); }
    if (body.order !== undefined) { sets.push('"order" = ?'); vals.push(body.order); }
    if (body.collapsed !== undefined) { sets.push("collapsed = ?"); vals.push(body.collapsed ? 1 : 0); }
    if (sets.length === 0) return NextResponse.json({ error: "无更新内容" }, { status: 400 });
    vals.push(id); vals.push(userId);
    await execute(`UPDATE ProjectGroup SET ${sets.join(", ")} WHERE id = ? AND userId = ?`, vals);
    const row = await queryAll("SELECT * FROM ProjectGroup WHERE id = ?", [id]);
    const g = row[0] as Record<string, unknown>;
    return NextResponse.json({ ...g, name: dec(g.name), collapsed: Boolean(g.collapsed) });
  } catch (error) {
    console.error("PUT /api/project-groups/[id] error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    // 将该组下的项目设置为未分组
    await execute("UPDATE Project SET groupId = NULL WHERE groupId = ? AND userId = ?", [id, userId]);
    await execute("DELETE FROM ProjectGroup WHERE id = ? AND userId = ?", [id, userId]);
    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("DELETE /api/project-groups/[id] error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}