import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE "Project" ADD COLUMN "userId" TEXT DEFAULT ''`,
  `ALTER TABLE "Todo" ADD COLUMN "userId" TEXT DEFAULT ''`,
];

async function main() {
  for (const sql of statements) {
    try {
      await client.execute(sql);
      console.log("✓", sql.substring(0, 50));
    } catch (e) {
      console.log("⚠ skipped (may already exist):", sql.substring(0, 50));
    }
  }
  console.log("✅ Done!");
}

main().catch(console.error);