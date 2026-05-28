import { NextRequest, NextResponse } from "next/server";
import makePrisma from "@/lib/prisma";

// GET - 获取待办事项（支持日期过滤）
export async function GET(request: NextRequest) {
  try {
    const prisma = await makePrisma();
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("showAll") === "true";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const where = showAll
      ? {}
      : {
          OR: [
            { scheduledDate: null },
            { scheduledDate: { lte: today } },
          ],
        };

    const todos = await prisma.todo.findMany({
      where,
      orderBy: [{ zone: "asc" }, { order: "asc" }, { createdAt: "desc" }],
      include: { project: true },
    });
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json({ error: "获取待办事项失败" }, { status: 500 });
  }
}

// POST - 创建新的待办事项
export async function POST(request: NextRequest) {
  try {
    const prisma = await makePrisma();
    const body = await request.json();
    const { title, description, priority, projectId, zone, scheduledDate } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    const targetZone = zone ?? 0;

    // 获取当前zone的最大order
    const maxOrder = await prisma.todo.aggregate({
      where: { zone: targetZone },
      _max: { order: true },
    });

    const todo = await prisma.todo.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "medium",
        projectId: projectId || null,
        zone: targetZone,
        order: (maxOrder._max.order ?? -1) + 1,
        scheduledDate: scheduledDate || null,
      },
      include: { project: true },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "创建待办事项失败" }, { status: 500 });
  }
}