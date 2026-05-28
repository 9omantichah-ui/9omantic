import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export async function GET() {
  try {
    const tables = await queryAll("SELECT name FROM sqlite_master WHERE type='table'");
    const userCount = await queryAll("SELECT COUNT(*) as count FROM User");
    return NextResponse.json({ tables, userCount, env: !!process.env.TURSO_DATABASE_URL });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg });
  }
}