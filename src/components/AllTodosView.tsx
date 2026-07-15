"use client";

import { useState, useMemo } from "react";
import { Todo, Project, DailyPlanItem } from "@/lib/types";
import TodoItem from "./TodoItem";

interface AllTodosViewProps {
  todos: Todo[];
  projects: Project[];
  planItems: DailyPlanItem[];
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onAddToPlan: (todoId: string) => void;
  onSelectProject: (projectId: string) => void;
  // 快速安排：把待办安排到指定日期与时段
  onQuickSchedule: (todoId: string, date: string, timeSlot: "morning" | "afternoon" | "evening") => void;
}

type TabKey = "all" | "unscheduled";

// 「全部待办」视图：Tab 切换 —— 全部（按项目聚合） / 未安排（跨项目聚合尚未进入计划的）
export default function AllTodosView({
  todos, projects, planItems, onToggle, onUpdate, onDelete, onAddToPlan, onSelectProject, onQuickSchedule,
}: AllTodosViewProps) {
  const [tab, setTab] = useState<TabKey>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(false);
  // 当前展开「安排」菜单的待办 id
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>("");

  const toggleCollapse = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const groupOf = (pid: string | null) => todos.filter(t => t.projectId === pid);
  const totalPending = todos.filter(t => !t.completed).length;
  const totalDone = todos.filter(t => t.completed).length;

  // 「未安排」= 未完成 且 不在任何 DailyPlanItem 中
  const scheduledTodoIds = useMemo(() => new Set(planItems.map(i => i.todoId)), [planItems]);
  const unscheduled = useMemo(
    () => todos.filter(t => !t.completed && !scheduledTodoIds.has(t.id)),
    [todos, scheduledTodoIds]
  );

  // 未安排按「项目 → 分类」聚合，便于识别归属
  const unscheduledGroups = useMemo(() => {
    const byProject = new Map<string, Todo[]>();
    unscheduled.forEach(t => {
      const key = t.projectId ?? "__inbox__";
      const arr = byProject.get(key) ?? [];
      arr.push(t);
      byProject.set(key, arr);
    });
    return byProject;
  }, [unscheduled]);

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  const doSchedule = (todoId: string, date: string, slot: "morning" | "afternoon" | "evening") => {
    onQuickSchedule(todoId, date, slot);
    setScheduleFor(null);
    setCustomDate("");
  };

  // 单条未安排行
  const renderUnscheduledRow = (todo: Todo) => {
    const open = scheduleFor === todo.id;
    return (
      <div key={todo.id} className="group flex items-start gap-3 px-2 py-2 border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
        <button
          onClick={() => onToggle(todo.id, true)}
          className="mt-1 w-4 h-4 rounded-full border border-gray-300 hover:border-emerald-400 flex-shrink-0"
          title="标为已完成"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-gray-800 leading-snug truncate">{todo.title}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
            {todo.project ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: todo.project.color }} />
                {todo.project.name}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">收件箱</span>
            )}
            {todo.task && <span className="text-gray-400">{todo.task.name}</span>}
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setScheduleFor(open ? null : todo.id)}
            className="opacity-60 group-hover:opacity-100 px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-[12px] font-medium hover:bg-blue-100 transition-all"
          >
            安排 ▾
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setScheduleFor(null)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <div className="px-3 py-1.5 text-[11px] text-gray-400 font-medium">今天</div>
                <button onClick={() => doSchedule(todo.id, todayStr, "morning")}
                  className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-blue-50">🌅 上午</button>
                <button onClick={() => doSchedule(todo.id, todayStr, "afternoon")}
                  className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-blue-50">☀️ 下午</button>
                <button onClick={() => doSchedule(todo.id, todayStr, "evening")}
                  className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-blue-50">🌙 晚上</button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => doSchedule(todo.id, tomorrowStr, "morning")}
                  className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-blue-50">➡️ 明天上午</button>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-3 py-1.5 flex items-center gap-1.5">
                  <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                    className="flex-1 px-1.5 py-0.5 border border-gray-200 rounded text-[12px] focus:outline-none focus:border-blue-400" />
                  <button
                    disabled={!customDate}
                    onClick={() => doSchedule(todo.id, customDate, "morning")}
                    className="px-2 py-0.5 rounded text-[11px] bg-blue-600 text-white disabled:bg-gray-200 disabled:text-gray-400"
                  >定日期</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // 全部 Tab：单个项目分组
  const renderProjectGroup = (key: string, name: string, color: string | null, projectId: string | null) => {
    const list = groupOf(projectId);
    if (list.length === 0) return null;
    const pending = list.filter(t => !t.completed).sort((a, b) => a.order - b.order);
    const done = list.filter(t => t.completed).sort((a, b) => a.order - b.order);
    const visible = showDone ? [...pending, ...done] : pending;
    if (visible.length === 0) return null;
    const isCollapsed = collapsed.has(key);

    return (
      <div key={key} className="mb-4">
        <div className="group/hdr flex items-center gap-2 px-1 py-1.5 mb-1.5 sticky top-0 bg-white z-10">
          <button onClick={() => toggleCollapse(key)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isCollapsed ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {color
              ? <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-300" />}
            <span className="text-[14px] font-semibold text-gray-800 truncate">{name}</span>
            <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0">
              {pending.length}{done.length > 0 ? ` · ${done.length}已完成` : ""}
            </span>
          </button>
          {projectId && (
            <button
              onClick={() => onSelectProject(projectId)}
              className="opacity-0 group-hover/hdr:opacity-100 text-[11px] text-blue-600 hover:text-blue-500 px-1.5 py-0.5 rounded transition-all flex-shrink-0"
              title="进入该项目"
            >进入 →</button>
          )}
        </div>
        {!isCollapsed && (
          <div className="pl-1 space-y-0.5">
            {visible.map(todo => (
              <TodoItem key={todo.id} todo={todo} projects={projects} compact hideProject
                onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} onAddToPlan={onAddToPlan} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">全部待办</h1>
          {tab === "all" && (
            <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}
                className="rounded border-gray-300" />
              显示已完成
            </label>
          )}
        </div>
        {/* 二级 Tab */}
        <div className="flex items-center gap-1 mt-3 -mb-3">
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 text-[13px] font-medium border-b-2 transition-colors ${
              tab === "all" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            全部 <span className="text-[11px] text-gray-400 tabular-nums">{totalPending}/{totalPending + totalDone}</span>
          </button>
          <button
            onClick={() => setTab("unscheduled")}
            className={`px-3 py-1.5 text-[13px] font-medium border-b-2 transition-colors ${
              tab === "unscheduled" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            未安排 <span className="text-[11px] text-gray-400 tabular-nums">{unscheduled.length}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "all" ? (
          <>
            {projects.map(p => renderProjectGroup(p.id, p.name, p.color, p.id))}
            {renderProjectGroup("inbox", "收件箱", null, null)}
            {todos.length === 0 && (
              <div className="py-10 text-center text-[13px] text-gray-300">还没有任何待办</div>
            )}
          </>
        ) : (
          <>
            {unscheduled.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-gray-300">
                太好了，所有待办都已经安排进计划 🎉
              </div>
            ) : (
              <>
                <p className="px-2 pb-2 text-[12px] text-gray-400">
                  以下 {unscheduled.length} 条待办尚未加入任何日期的计划，可直接安排到今天或未来某天
                </p>
                {/* 按项目分组呈现，同项目内待办连续排列，便于识别归属 */}
                {projects.map(p => {
                  const list = unscheduledGroups.get(p.id) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <div key={p.id} className="mb-4">
                      <div className="flex items-center gap-2 px-1 py-1.5 sticky top-0 bg-white z-10">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-[13px] font-semibold text-gray-700 truncate">{p.name}</span>
                        <span className="text-[11px] text-gray-400 tabular-nums">{list.length}</span>
                      </div>
                      {list.map(renderUnscheduledRow)}
                    </div>
                  );
                })}
                {(unscheduledGroups.get("__inbox__") ?? []).length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-1 py-1.5 sticky top-0 bg-white z-10">
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                      <span className="text-[13px] font-semibold text-gray-700">收件箱</span>
                      <span className="text-[11px] text-gray-400 tabular-nums">{(unscheduledGroups.get("__inbox__") ?? []).length}</span>
                    </div>
                    {(unscheduledGroups.get("__inbox__") ?? []).map(renderUnscheduledRow)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}