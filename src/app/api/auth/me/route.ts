import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ user: null });
  }
  const user = await queryOne("SELECT id, nickname FROM User WHERE id = ?", [userId]);
  return NextResponse.json({ user });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}