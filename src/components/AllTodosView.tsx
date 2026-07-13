"use client";

import { useState } from "react";
import { Todo, Project } from "@/lib/types";
import TodoItem from "./TodoItem";

interface AllTodosViewProps {
  todos: Todo[];
  projects: Project[];
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onAddToPlan: (todoId: string) => void;
  onSelectProject: (projectId: string) => void;
}

// 全部待办视图：把所有待办按「项目」维度聚合展示（含收件箱=无项目）
export default function AllTodosView({
  todos, projects, onToggle, onUpdate, onDelete, onAddToPlan, onSelectProject,
}: AllTodosViewProps) {
  // 折叠状态：key = projectId 或 "inbox"，默认全部展开
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // 是否显示已完成
  const [showDone, setShowDone] = useState(false);

  const toggleCollapse = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  // 按项目分组
  const groupOf = (pid: string | null) => todos.filter(t => t.projectId === pid);

  const totalPending = todos.filter(t => !t.completed).length;
  const totalDone = todos.filter(t => t.completed).length;

  // 渲染单个项目分组
  const renderGroup = (key: string, name: string, color: string | null, projectId: string | null) => {
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
            >
              进入 →
            </button>
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
      {/* 标题区 */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-bold text-gray-900">全部待办</h1>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[12px] text-gray-400">
            共 {totalPending} 项进行中 · {totalDone} 项已完成，按项目聚合
          </p>
          <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}
              className="rounded border-gray-300" />
            显示已完成
          </label>
        </div>
      </div>

      {/* 分组列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {projects.map(p => renderGroup(p.id, p.name, p.color, p.id))}
        {renderGroup("inbox", "收件箱", null, null)}
        {todos.length === 0 && (
          <div className="py-10 text-center text-[13px] text-gray-300">还没有任何待办</div>
        )}
      </div>
    </section>
  );
}