import { NextResponse } from "next/server";
import { queryAll, execute, cuid } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { encrypt } from "@/lib/encrypt";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const cols = await queryAll("PRAGMA table_info(Todo)");
    
    // 测试 MAX order 查询
    const maxRow = await queryAll('SELECT MAX("order") as maxOrd FROM Todo WHERE zone = ? AND userId = ?', [0, userId || ""]);
    const maxOrd = (maxRow[0]?.maxOrd as number) ?? -1;
    
    // 尝试做一次真实 INSERT 看具体报错
    let insertError = null;
    let insertResult = null;
    try {
      const testId = "test_" + cuid();
      const encTitle = encrypt("调试测试-可删除");
      const now = new Date().toISOString();
      await execute(
        'INSERT INTO Todo (id, title, description, completed, priority, zone, "order", scheduledDate, projectId, createdAt, updatedAt, userId) VALUES (?,?,?,0,?,?,?,?,?,?,?,?)',
        [testId, encTitle, null, "medium", 0, maxOrd + 1, null, null, now, now, userId || ""]
      );
      insertResult = { success: true, id: testId };
      // 清理测试数据
      await execute("DELETE FROM Todo WHERE id = ?", [testId]);
    } catch (e) {
      insertError = String(e);
    }
    
    return NextResponse.json({ 
      columns: cols, 
      userId,
      maxRow: maxRow[0],
      maxOrd,
      insertTest: insertError ? { error: insertError } : insertResult
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}