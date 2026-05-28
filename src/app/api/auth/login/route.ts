import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { nickname, password } = await request.json();
    if (!nickname?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "昵称和密码不能为空" }, { status: 400 });
    }
    const hashedPwd = Buffer.from(password).toString("base64");
    const user = await queryOne("SELECT id, nickname FROM User WHERE nickname = ? AND password = ?", [nickname.trim(), hashedPwd]);
    if (!user) {
      return NextResponse.json({ error: "昵称或密码错误" }, { status: 401 });
    }
    const token = createToken(user.id as string);
    const res = NextResponse.json({ id: user.id, nickname: user.nickname });
    res.cookies.set("auth_token", token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return res;
  } catch (error) {
    console.error("login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}