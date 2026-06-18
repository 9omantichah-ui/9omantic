import { NextRequest } from "next/server";
import { execute } from "@/lib/db";
import { withAuth, apiOk } from "@/lib/helpers";

export const PUT = withAuth(async (request: NextRequest, userId: string) => {
  const { items } = await request.json() as { items: { id: string; zone: number; order: number }[] };
  const now = new Date().toISOString();
  for (const item of items) {
    await execute(
      'UPDATE Todo SET zone = ?, "order" = ?, updatedAt = ? WHERE id = ? AND userId = ?',
      [item.zone, item.order, now, item.id, userId]
    );
  }
  return apiOk({ message: "排序更新成功" });
});