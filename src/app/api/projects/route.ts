import { NextRequest, NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const projects = await queryAll("SELECT * FROM Project WHERE userId = ? ORDER BY createdAt ASC", [userId]);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { name, color } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "项目名不能为空" }, { status: 400 });
    const id = cuid();
    const now = new Date().toISOString();
    await execute("INSERT INTO Project (id, name, color, createdAt, userId) VALUES (?,?,?,?,?)", [id, name.trim(), color || "#6366f1", now, userId]);
    const project = await queryAll("SELECT * FROM Project WHERE id = ?", [id]);
    return NextResponse.json(project[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "创建项目失败" }, { status: 500 });
  }
}