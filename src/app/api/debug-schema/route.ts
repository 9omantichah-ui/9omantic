import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export async function GET() {
  try {
    const cols = await queryAll("PRAGMA table_info(Todo)");
    return NextResponse.json({ columns: cols });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}