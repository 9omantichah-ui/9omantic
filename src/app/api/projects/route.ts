import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - 获取所有项目
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { todos: true } } },
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}

// POST - 创建项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "项目名不能为空" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        color: color || "#6366f1",
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "创建项目失败" }, { status: 500 });
  }
}