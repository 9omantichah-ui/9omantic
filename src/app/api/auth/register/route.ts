import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, cuid } from "@/lib/db";
import { createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { nickname, password } = await request.json();
    if (!nickname?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "昵称和密码不能为空" }, { status: 400 });
    }
    const existing = await queryOne("SELECT id FROM User WHERE nickname = ?", [nickname.trim()]);
    if (existing) {
      return NextResponse.json({ error: "该昵称已被使用" }, { status: 409 });
    }
    const id = cuid();
    const now = new Date().toISOString();
    // 简单 hash 密码（生产环境应用 bcrypt）
    const hashedPwd = Buffer.from(password).toString("base64");
    await execute("INSERT INTO User (id, nickname, password, createdAt) VALUES (?,?,?,?)", [id, nickname.trim(), hashedPwd, now]);
    const token = createToken(id);
    const res = NextResponse.json({ id, nickname: nickname.trim() }, { status: 201 });
    res.cookies.set("auth_token", token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return res;
  } catch (error) {
    console.error("register error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}