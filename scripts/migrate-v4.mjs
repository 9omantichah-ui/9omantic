/**
 * 数据库迁移脚本 v4：三层结构 项目 → 任务 → 待办
 * 1. 新建 Task 表（id/name/projectId/order/userId/createdAt）
 * 2. Todo 新增 taskId 字段
 * 3. 老数据归位：
 *  - 有 parentId 的子待办 → 其父待办升级为 Task，子待办 taskId 指向新 Task 并清空 parentId
 *    - 项目下无 taskId 的散待办 → 归入该项目的「未分类」默认 Task
 * 幂等：可重复执行。
 */
import { createClient } from "@libsql/client";
import crypto from "crypto";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

// 与 src/lib/encrypt.ts 对齐：aes-256-gcm + scrypt，输出 base64 "iv:authTag:cipher"
// 未配置 ENCRYPTION_KEY 时降级为明文（与线上行为一致）
function encrypt(text) {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return text;
  const key = crypto.scryptSync(secret, "actionflow-salt", 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${enc.toString("base64")}`;
}

function cuid() {
  return "c" + crypto.randomBytes(12).toString("hex");
}

// 检测某表是否含指定列（兼容旧单用户库无 userId 的情况）
async function hasColumn(table, column) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  return info.rows.some(r => r.name === column);
}


async function migrate() {
  console.log("[migrate-v4] Starting migration...");
  console.log("[migrate-v4] DB URL:", url.substring(0, 40) + "...");

  const projectHasUserId = await hasColumn("Project", "userId");
  const todoHasUserId = await hasColumn("Todo", "userId");
  console.log(`[migrate-v4] userId columns — Project:${projectHasUserId} Todo:${todoHasUserId}`);

  // 1. 新建 Task 表
  await client.execute(`
    CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      projectId TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      userId TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    )
  `);
  console.log("[migrate-v4] ✓ Task table ready");

  // 2. Todo 加 taskId
  try {
    await client.execute(`ALTER TABLE Todo ADD COLUMN taskId TEXT`);
    console.log("[migrate-v4] ✓ Todo.taskId added");
  } catch (e) {
    if (String(e).includes("duplicate column")) {
      console.log("[migrate-v4] ⊘ Todo.taskId already exists");
    } else { throw e; }
  }

  // 3a. 子待办升级：父待办 -> Task
  const parents = await client.execute(`
    SELECT DISTINCT parentId FROM Todo
    WHERE parentId IS NOT NULL AND parentId != '' AND (taskId IS NULL OR taskId = '')
  `);
  for (const row of parents.rows) {
    const pid = row.parentId;
    // 找父待办本体
    const p = await client.execute({ sql: `SELECT * FROM Todo WHERE id = ?`, args: [pid] });
    if (p.rows.length === 0) continue;
    const parent = p.rows[0];
    const taskId = cuid();
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO Task (id, name, projectId, "order", userId, createdAt) VALUES (?,?,?,?,?,?)`,
      args: [taskId, parent.title, parent.projectId || null, parent.order || 0, parent.userId || "", now],
    });
    // 子待办挂到新 Task，清 parentId
    await client.execute({
      sql: `UPDATE Todo SET taskId = ?, parentId = NULL WHERE parentId = ?`,
      args: [taskId, pid],
    });
    // 父待办本身不再作为待办展示：也归入该 Task（作为一条普通待办保留数据）
    await client.execute({
      sql: `UPDATE Todo SET taskId = ? WHERE id = ?`,
      args: [taskId, pid],
    });
    console.log(`[migrate-v4] ✓ Parent todo ${pid} -> Task ${taskId}`);
  }

  // 3b. 项目下无 taskId 的散待办 -> 该项目「未分类」默认 Task
  const projects = await client.execute(
    projectHasUserId ? `SELECT id, userId FROM Project` : `SELECT id FROM Project`
  );
  for (const proj of projects.rows) {
    const projectId = proj.id;
    const userId = (projectHasUserId ? proj.userId : "") || "";
    // 该项目下有没有游离待办
    const orphans = await client.execute({
      sql: `SELECT COUNT(*) as c FROM Todo WHERE projectId = ? AND (taskId IS NULL OR taskId = '')`,
      args: [projectId],
    });
    if ((orphans.rows[0].c || 0) === 0) continue;

    // 用 order = -1 作为「未分类」默认任务的约定标记（name 加密后无法按内容比对）
    let defaultTaskId;
    const marker = await client.execute({
      sql: `SELECT id FROM Task WHERE projectId = ? AND "order" = -1`,
      args: [projectId],
    });
    if (marker.rows.length > 0) {
      defaultTaskId = marker.rows[0].id;
    } else {
      defaultTaskId = cuid();
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO Task (id, name, projectId, "order", userId, createdAt) VALUES (?,?,?,?,?,?)`,
        args: [defaultTaskId, encrypt("未分类"), projectId, -1, userId, now],
      });
    }
    await client.execute({
      sql: `UPDATE Todo SET taskId = ? WHERE projectId = ? AND (taskId IS NULL OR taskId = '')`,
      args: [defaultTaskId, projectId],
    });
    console.log(`[migrate-v4] ✓ Project ${projectId} orphan todos -> default Task ${defaultTaskId}`);
  }

  console.log("[migrate-v4] Migration completed successfully!");
}

migrate().catch(e => {
  console.error("[migrate-v4] Migration failed:", e);
  process.exit(1);
});