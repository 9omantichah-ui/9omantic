import { NextRequest, NextResponse } from "next/server";
import makePrisma from "@/lib/prisma";

// PUT - 批量更新待办顺序
export async function PUT(request: NextRequest) {
  try {
    const prisma = await makePrisma();
    const body = await request.json();
    const { items } = body as {
      items: { id: string; zone: number; order: number }[];
    };

    const updates = items.map((item) =>
      prisma.todo.update({
        where: { id: item.id },
        data: { zone: item.zone, order: item.order },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ message: "排序更新成功" });
  } catch (error) {
    return NextResponse.json(
      { error: "更新排序失败" },
      { status: 500 }
    );
  }
}