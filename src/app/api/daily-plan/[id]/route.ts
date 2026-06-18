import { NextRequest } from "next/server";
import { execute } from "@/lib/db";
import { withAuthParams, apiOk } from "@/lib/helpers";

export const DELETE = withAuthParams(async (_request: NextRequest, userId: string, params: { id: string }) => {
  await execute("DELETE FROM DailyPlanItem WHERE id = ? AND userId = ?", [params.id, userId]);
  return apiOk({ message: "移除成功" });
});