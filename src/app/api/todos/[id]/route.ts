import { NextRequest, NextResponse } from "next/server";
import makePrisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prisma = await makePrisma();
    const todo = await prisma.todo.findUnique({
      where: { id: params.id },
      include: { project: true },
    });
    if (!todo) {
      return NextResponse.json({ error: "待办事项不存在" }, { status: 404 });
    }
    return NextResponse.json(todo);
  } catch (error) {
    return NextResponse.json({ error: "获取待办事项失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prisma = await makePrisma();
    const body = await request.json();
    const { title, description, completed, priority, projectId, zone, order, scheduledDate } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (completed !== undefined) data.completed = completed;
    if (priority !== undefined) data.priority = priority;
    if (projectId !== undefined) data.projectId = projectId || null;
    if (zone !== undefined) data.zone = zone;
    if (order !== undefined) data.order = order;
    if (scheduledDate !== undefined) data.scheduledDate = scheduledDate || null;

    const todo = await prisma.todo.update({
      where: { id: params.id },
      data,
      include: { project: true },
    });

    return NextResponse.json(todo);
  } catch (error) {
    return NextResponse.json({ error: "更新待办事项失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prisma = await makePrisma();
    await prisma.todo.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    return NextResponse.json({ error: "删除待办事项失败" }, { status: 500 });
  }
}