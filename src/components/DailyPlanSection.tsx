"use client";

import { useState, useEffect, useCallback } from "react";
import { Todo, Project, DailyPlanItem } from "@/lib/types";

const STATUS_CONFIG = {
  pending: { label: "未开始", cls: "bg-gray-100 text-gray-500", icon: "○" },
  in_progress: { label: "进行中", cls: "bg-blue-100 text-blue-600 ring-2 ring-blue-200", icon: "◉" },
  completed: { label: "已完成", cls: "bg-emerald-100 text-emerald-600", icon: "✓" },
};

const ZONE_NAME: Record<number, string> = { 0: "未整理", 1: "优先做", 2: "稍后做", 3: "晚点做" };

interface DailyPlanSectionProps {
  todos: Todo[];
  projects: Project[];
}

export default function DailyPlanSection({ todos, projects }: DailyPlanSectionProps) {
  const [planItems, setPlanItems] = useState<DailyPlanItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const fetchPlan = useCallback(async () => {
    try {
      const data = await (await fetch(`/api/daily-plan?date=${selectedDate}`)).json();
      if (data.items) setPlanItems(data.items);
    } catch (e) { console.error(e); }
  }, [selectedDate]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const addToPlan = async (todoId: string) => {
    try {
      const r = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId, date: selectedDate }),
      });
      if (r.ok) { fetchPlan(); setShowAddPicker(false); setSearchTerm(""); }
    } catch (e) { console.error(e); }
  };

  const removeFromPlan = async (itemId: string) => {
    try {
      const r = await fetch(`/api/daily-plan/${itemId}`, { method: "DELETE" });
      if (r.ok) setPlanItems(prev => prev.filter(i => i.id !== itemId));
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (itemId: string, status: string) => {
    try {
      await fetch("/api/daily-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: itemId, status }] }),
      });
      setPlanItems(prev => prev.map(i => i.id === itemId ? { ...i, status: status as DailyPlanItem["status"] } : i));
    } catch (e) { console.error(e); }
  };

  const moveItem = async (itemId: string, direction: "up" | "down") => {
    const idx = planItems.findIndex(i => i.id === itemId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= planItems.length) return;
    const newItems = [...planItems];
    [newItems[idx], newItems[newIdx]] = [newItems[newIdx], newItems[idx]];
    setPlanItems(newItems);
    try {
      await fetch("/api/daily-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems.map((item, i) => ({ id: item.id, order: i })) }),
      });
    } catch (e) { console.error(e); }
  };

  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // 可添加的待办列表（排除已在计划中的）
  const planTodoIds = new Set(planItems.map(i => i.todoId));
  const availableTodos = todos.filter(t =>
    !t.completed && !planTodoIds.has(t.id) &&
    (searchTerm === "" || t.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const completed = planItems.filter(i => i.status === "completed").length;
  const total = planItems.length;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">当日计划</h2>
          {total > 0 &&(
            <span className="text-[11px] text-gray-400">{completed}/{total} 已完成</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigateDate(-1)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              isToday ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isToday ? "今天" : selectedDate}
          </button>
          <button onClick={() => navigateDate(1)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        {planItems.length === 0 ? (
          <div className="text-center py-5 text-sm text-gray-300">
            {isToday ? "还没安排今天的任务，点击下方添加" : "该日没有计划"}
          </div>
        ) : (
          <div className="space-y-1.5">
            {planItems.map((item, idx) => {
              const todo = item.todo;
              const statusConfig = STATUS_CONFIG[item.status];
              const isInProgress = item.status === "in_progress";
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isInProgress
                      ? "border-blue-200 bg-blue-50/60 shadow-sm"
                      : item.status === "completed"
                      ? "border-gray-100 bg-gray-50/50 opacity-60"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  {/* 排序按钮 */}
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <button
                      onClick={() => moveItem(item.id, "up")}
                      disabled={idx === 0}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-30"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveItem(item.id, "down")}
                      disabled={idx === planItems.length - 1}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-30"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* 内容区 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-medium ${item.status === "completed" ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {todo?.title || "已删除的待办"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {todo?.project && (
                        <span className="px-1.5 py-[1px] rounded text-[9px] font-medium text-white" style={{ backgroundColor: todo.project.color }}>
                          {todo.project.name}
                        </span>
                      )}
                      {todo && (
                        <span className="text-[9px] px-1 py-[0.5px] rounded bg-gray-100 text-gray-400">
                          {ZONE_NAME[todo.zone]}
                        </span>
                      )}
                      {todo?.description && (
                        <span className="text-[9px] text-gray-400 truncate max-w-[120px]">{todo.description}</span>
                      )}
                    </div>
                  </div>

                  {/* 状态切换 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <select
                      value={item.status}
                      onChange={e => updateStatus(item.id, e.target.value)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border-0 ${statusConfig.cls} cursor-pointer focus:outline-none`}
                    >
                      <option value="pending">未开始</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                    </select>
                    <button
                      onClick={() => removeFromPlan(item.id)}
                      className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                      title="移出计划"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 添加待办到计划 */}
        <div className="mt-3 pt-2 border-t border-gray-100">
          {showAddPicker ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="搜索待办..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  autoFocus
                />
                <button onClick={() => { setShowAddPicker(false); setSearchTerm(""); }} className="text-[11px] text-gray-400 hover:text-gray-600">取消</button>
              </div>
              <div className="max-h-[160px] overflow-y-auto space-y-1">
                {availableTodos.length === 0 ? (
                  <div className="text-center py-2 text-[11px] text-gray-300">没有可添加的待办</div>
                ) : availableTodos.slice(0, 20).map(todo => (
                  <button
                    key={todo.id}
                    onClick={() => addToPlan(todo.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-blue-50 text-left transition-colors"
                  >
                    <span className="text-[12px] text-gray-700 truncate flex-1">{todo.title}</span>
                    {todo.project && (
                      <span className="px-1 py-[0.5px] rounded text-[9px] font-medium text-white flex-shrink-0" style={{ backgroundColor: todo.project.color }}>
                        {todo.project.name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddPicker(true)}
              className="w-full py-1.5 text-[11px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              + 添加待办到{isToday ? "今日" : "该日"}计划
            </button>
          )}
        </div>
      </div>
    </section>
  );
}