import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, cuid } from "@/lib/db";
import { createToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { nickname, password } = await request.json();
    if (!nickname?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "昵称和密码不能为空" }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "密码至少4个字符" }, { status: 400 });
    }
    const existing = await queryOne("SELECT id FROM User WHERE nickname = ?", [nickname.trim()]);
    if (existing) {
      return NextResponse.json({ error: "该昵称已被使用" }, { status: 409 });
    }
    const id = cuid();
    const now = new Date().toISOString();
    const hashedPwd = await bcrypt.hash(password, 10);
    await execute("INSERT INTO User (id, nickname, password, createdAt) VALUES (?,?,?,?)", [id, nickname.trim(), hashedPwd, now]);
    const token = await createToken(id);
    const res = NextResponse.json({ id, nickname: nickname.trim() }, { status: 201 });
    res.cookies.set("auth_token", token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return res;
  } catch (error) {
    console.error("register error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}