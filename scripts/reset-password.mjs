// 重置某个用户的登录密码（密码为 bcrypt 哈希，无法找回原文，只能重置）
//
// 用法：
//   1) 列出所有用户昵称：
//        node scripts/reset-password.mjs
//   2) 重置指定用户的密码：
//        node scripts/reset-password.mjs "你的昵称" "新密码"
//
// 会自动读取 .env 里的 TURSO 配置；若未配置则回退到本地 prisma/dev.db。

import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

// 简易读取 .env（避免额外依赖 dotenv）
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

loadEnv();

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  const [nickname, newPassword] = process.argv.slice(2);

  console.log("→ 数据库:", url.substring(0, 40) + (url.length > 40 ? "..." : ""));

  if (!nickname) {
    const rows = await client.execute("SELECT nickname, createdAt FROM User ORDER BY createdAt ASC");
    if (rows.rows.length === 0) {
      console.log("没有找到任何用户。");
    } else {
      console.log("现有用户：");
      for (const r of rows.rows) console.log("  -", r.nickname);
    }
    console.log('\n重置命令： node scripts/reset-password.mjs "昵称" "新密码"');
    return;
  }

  if (!newPassword) {
    console.error("❌ 请同时提供新密码： node scripts/reset-password.mjs \"" + nickname + "\" \"新密码\"");
    process.exit(1);
  }
  if (newPassword.length < 4) {
    console.error("❌ 密码至少 4 个字符");
    process.exit(1);
  }

  const user = await client.execute({ sql: "SELECT id FROM User WHERE nickname = ?", args: [nickname] });
  if (user.rows.length === 0) {
    console.error(`❌ 未找到昵称为「${nickname}」的用户。先运行不带参数的命令查看现有用户。`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await client.execute({ sql: "UPDATE User SET password = ? WHERE nickname = ?", args: [hashed, nickname] });

  console.log(`✅ 已重置用户「${nickname}」的密码，现在可用新密码登录。`);
}

main().catch((e) => { console.error(e); process.exit(1); });