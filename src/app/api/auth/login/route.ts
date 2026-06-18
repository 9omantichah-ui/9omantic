import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { createToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { nickname, password } = await request.json();
    if (!nickname?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "昵称和密码不能为空" }, { status: 400 });
    }
    const user = await queryOne("SELECT id, nickname, password FROM User WHERE nickname = ?", [nickname.trim()]);
    if (!user) {
      return NextResponse.json({ error: "昵称或密码错误" }, { status: 401 });
    }
    // 兼容旧的 Base64 密码和新的 bcrypt 密码
    const storedPwd = user.password as string;
    let valid = false;
    if (storedPwd.startsWith("$2a$") || storedPwd.startsWith("$2b$")) {
      // bcrypt hash
      valid = await bcrypt.compare(password, storedPwd);
    } else {
      // 旧 Base64 格式 — 兼容期间仍可登录
      valid = storedPwd === Buffer.from(password).toString("base64");
    }
    if (!valid) {
      return NextResponse.json({ error: "昵称或密码错误" }, { status: 401 });
    }
    const token = await createToken(user.id as string);
    const res = NextResponse.json({ id: user.id, nickname: user.nickname });
    res.cookies.set("auth_token", token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return res;
  } catch (error) {
    console.error("login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}