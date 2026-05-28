import { NextRequest, NextResponse } from "next/server";
import makePrisma from "@/lib/prisma";

export async function GET() {
  try {
    const prisma = await makePrisma();
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { todos: true } } },
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const prisma = await makePrisma();
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