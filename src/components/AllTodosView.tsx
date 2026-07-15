"use client";

import { useState, useMemo } from "react";
import { Todo, Project, DailyPlanItem } from "@/lib/types";

interface AllTodosViewProps {
  todos: Todo[];
  projects: Project[];
  planItems: DailyPlanItem[];
  /** 跨日期已被安排的 todoId 集合（未安排 Tab 判定的真值来源） */
  scheduledIds?: Set<string>;
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onAddToPlan: (todoId: string) => void;
  onSelectProject: (projectId: string) => void;
  // 快速安排：把待办安排到指定日期与时段
  onQuickSchedule: (todoId: string, date: string, timeSlot: "morning" | "afternoon" | "evening") => void;
}

type TabKey = "all" | "unscheduled";
type Slot = "morning" | "afternoon" | "evening";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

// 「全部待办」视图：Tab 切换 —— 全部（按项目聚合） / 未安排（跨项目聚合尚未进入计划的）
export default function AllTodosView({
  todos, projects, planItems, scheduledIds, onToggle, onUpdate, onDelete,
  onSelectProject, onQuickSchedule,
}: AllTodosViewProps) {
  const [tab, setTab] = useState<TabKey>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>("");
  const [customSlot, setCustomSlot] = useState<Slot>("morning");
  const [editingTitle, setEditingTitle] = useState<{ id: string; value: string } | null>(null);

  const toggleCollapse = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const groupOf = (pid: string | null) => todos.filter(t => t.projectId === pid);
  const totalPending = todos.filter(t => !t.completed).length;
  const totalDone = todos.filter(t => t.completed).length;

  // 「未安排」= 未完成 且 不在任何 DailyPlanItem 中（优先用全局 scheduledIds，退化时用当日 planItems）
  const effectiveScheduled = useMemo(() => {
    if (scheduledIds && scheduledIds.size >= 0) return scheduledIds;
    return new Set(planItems.map(i => i.todoId));
  }, [scheduledIds, planItems]);

  const unscheduled = useMemo(
    () => todos.filter(t => !t.completed && !effectiveScheduled.has(t.id)),
    [todos, effectiveScheduled]
  );

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

  // 计算日期辅助
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayStr = toDateStr(today);
  const tomorrowStr = toDateStr(addDays(today, 1));
  // 本周剩余日期：从后天开始到本周日（周日 = day 0，但我们把周日视为本周结束）
  const weekAheadDates = useMemo(() => {
    const items: { date: string; label: string }[] = [];
    // 从 +2 开始（后天）
    for (let i = 2; i <= 7; i++) {
      const d = addDays(today, i);
      const dow = d.getDay();
      items.push({
        date: toDateStr(d),
        label: `${WEEKDAY_LABELS[dow]} · ${d.getMonth() + 1}/${d.getDate()}`,
      });
      // 遇到周日后停止（周日是本周最后一天）
      if (dow === 0) break;
    }
    return items;
  }, [today]);

  const doSchedule = (todoId: string, date: string, slot: Slot) => {
    onQuickSchedule(todoId, date, slot);
    setScheduleFor(null);
    setCustomDate("");
    setCustomSlot("morning");
  };

  // 快速安排下拉菜单（今日 / 明日 / 本周 / 自定义）
  const renderScheduleMenu = (todoId: string) => (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setScheduleFor(null)} />
      <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-[70vh] overflow-y-auto">
        {/* 今日 */}
        <div className="px-3 pt-1.5 pb-0.5 text-[11px] text-gray-400 font-medium">今日</div>
        <div className="grid grid-cols-3 gap-0.5 px-2 pb-1">
          <button onClick={() => doSchedule(todoId, todayStr, "morning")}
            className="px-1.5 py-1 rounded text-[12px] text-gray-700 hover:bg-blue-50">🌅 上午</button>
          <button onClick={() => doSchedule(todoId, todayStr, "afternoon")}
            className="px-1.5 py-1 rounded text-[12px] text-gray-700 hover:bg-blue-50">☀️ 下午</button>
          <button onClick={() => doSchedule(todoId, todayStr, "evening")}
            className="px-1.5 py-1 rounded text-[12px] text-gray-700 hover:bg-blue-50">🌙 晚上</button>
        </div>
        <div className="border-t border-gray-100" />
        {/* 明日 */}
        <div className="px-3 pt-1.5 pb-0.5 text-[11px] text-gray-400 font-medium">明日</div>
        <div className="grid grid-cols-3 gap-0.5 px-2 pb-1">
          <button onClick={() => doSchedule(todoId, tomorrowStr, "morning")}
            className="px-1.5 py-1 rounded text-[12px] text-gray-700 hover:bg-blue-50">🌅 上午</button>
          <button onClick={() => doSchedule(todoId, tomorrowStr, "afternoon")}
            className="px-1.5 py-1 rounded text-[12px] text-gray-700 hover:bg-blue-50">☀️ 下午</button>
          <button onClick={() => doSchedule(todoId, tomorrowStr, "evening")}
            className="px-1.5 py-1 rounded text-[12px] text-gray-700 hover:bg-blue-50">🌙 晚上</button>
        </div>
        {/* 本周 */}
        {weekAheadDates.length > 0 && (
          <>
            <div className="border-t border-gray-100" />
            <div className="px-3 pt-1.5 pb-0.5 text-[11px] text-gray-400 font-medium">本周</div>
            <div className="pb-1">
              {weekAheadDates.map(({ date, label }) => (
                <button
                  key={date}
                  onClick={() => doSchedule(todoId, date, "morning")}
                  className="w-full text-left px-3 py-1 text-[12px] text-gray-700 hover:bg-blue-50"
                >
                  {label} <span className="text-gray-400">· 上午</span>
                </button>
              ))}
            </div>
          </>
        )}
        {/* 自定义 */}
        <div className="border-t border-gray-100" />
        <div className="px-3 pt-1.5 pb-0.5 text-[11px] text-gray-400 font-medium">自定义</div>
        <div className="px-2 pb-1.5 flex items-center gap-1">
          <input
            type="date"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
            className="flex-1 min-w-0 px-1.5 py-0.5 border border-gray-200 rounded text-[12px] focus:outline-none focus:border-blue-400"
          />
          <select
            value={customSlot}
            onChange={e => setCustomSlot(e.target.value as Slot)}
            className="px-1 py-0.5 border border-gray-200 rounded text-[12px] focus:outline-none focus:border-blue-400"
          >
            <option value="morning">上午</option>
            <option value="afternoon">下午</option>
            <option value="evening">晚上</option>
          </select>
          <button
            disabled={!customDate}
            onClick={() => doSchedule(todoId, customDate, customSlot)}
            className="px-2 py-0.5 rounded text-[11px] bg-blue-600 text-white disabled:bg-gray-200 disabled:text-gray-400"
          >确定</button>
        </div>
      </div>
    </>
  );

  // 统一行样式：全部 Tab 与 未安排 Tab 共用
  const renderTodoRow = (todo: Todo, opts: { showSchedule: boolean; showProject: boolean }) => {
    const open = scheduleFor === todo.id;
    const isEditing = editingTitle?.id === todo.id;
    return (
      <div
        key={todo.id}
        className="group flex items-start gap-3 px-2 py-2 border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
      >
        <button
          onClick={() => onToggle(todo.id, !todo.completed)}
          className={`mt-1 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
            todo.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-emerald-400"
          }`}
          title={todo.completed ? "标为未完成" : "标为已完成"}
        >
          {todo.completed && (
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editingTitle!.value}
              onChange={e => setEditingTitle({ id: todo.id, value: e.target.value })}
              onBlur={() => {
                const v = editingTitle!.value.trim();
                if (v && v !== todo.title) onUpdate(todo.id, { title: v });
                setEditingTitle(null);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingTitle(null);
              }}
              className="w-full text-[14px] text-gray-800 leading-snug border-b border-blue-300 focus:outline-none bg-transparent"
            />
          ) : (
            <div
              onDoubleClick={() => setEditingTitle({ id: todo.id, value: todo.title })}
              className={`text-[14px] leading-snug truncate cursor-text ${
                todo.completed ? "text-gray-400 line-through" : "text-gray-800"
              }`}
            >
              {todo.title}
            </div>
          )}
          {opts.showProject && (
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
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {opts.showSchedule && !todo.completed && (
            <div className="relative">
              <button
                onClick={() => setScheduleFor(open ? null : todo.id)}
                className="opacity-60 group-hover:opacity-100 px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-[12px] font-medium hover:bg-blue-100 transition-all"
              >
                安排 ▾
              </button>
              {open && renderScheduleMenu(todo.id)}
            </div>
          )}
          <button
            onClick={() => {
              if (confirm(`确定删除待办「${todo.title}」？`)) onDelete(todo.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
            title="删除"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // 全部 Tab：项目分组头（统一列表行样式）
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
        <div className="group/hdr flex items-center gap-2 px-1 py-1.5 mb-0.5 sticky top-0 bg-white z-10">
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
          <div>
            {visible.map(todo => renderTodoRow(todo, { showSchedule: true, showProject: false }))}
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
                      {list.map(todo => renderTodoRow(todo, { showSchedule: true, showProject: false }))}
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
                    {(unscheduledGroups.get("__inbox__") ?? []).map(todo => renderTodoRow(todo, { showSchedule: true, showProject: false }))}
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