"use client";

import { useState } from "react";
import { Todo } from "@/lib/types";

export type TodoRowAction =
  | "schedule"     // 「安排 ▾」按钮（弹出快速安排菜单）
  | "reschedule"   // 「改时间 ▾」按钮（重新安排到今日的其他时段）
  | "defer"        // 「顺延到明天」按钮
  | "unplan"       // 「移出计划」按钮
  | "delete";      // 「删除」按钮

export interface TodoRowConfig {
  showProjectChip?: boolean;   // 行内是否显示项目 chip（分组页面通常关闭）
  showTaskName?: boolean;      // 行内是否显示任务名（次要）
  showPriority?: boolean;      // 是否显示优先级小旗（high 时才显示）
  showStartAt?: boolean;       // 是否显示 "10:30" 时间胶囊
  editableTitle?: boolean;     // 双击标题进入编辑
  actions?: TodoRowAction[];   // 右侧显示哪些按钮（按顺序）
  compact?: boolean;           // 紧凑行距
}

export interface TodoRowHandlers {
  onToggleComplete: (id: string, completed: boolean) => void;
  onUpdate?: (id: string, patch: Partial<Todo>) => void;
  onDelete?: (id: string) => void;
  onSchedule?: (id: string) => void;    // 打开快速安排菜单（父级弹层）
  onReschedule?: (id: string) => void;  // 打开改时间菜单
  onDefer?: (id: string) => void;       // 顺延到明日
  onUnplan?: (id: string) => void;      // 移出当日计划
}

export interface TodoRowProps {
  todo: Todo;
  startAt?: string | null;    // 若传入，配合 showStartAt=true 显示 HH:mm 胶囊
  config?: TodoRowConfig;
  handlers: TodoRowHandlers;
  /** 允许外部覆盖右侧操作区（如插入自定义的下拉菜单弹层锚点） */
  extraRight?: React.ReactNode;
}

const PRIORITY_STYLE: Record<string, { label: string; className: string }> = {
  high: { label: "!高", className: "bg-red-50 text-red-500" },
  medium: { label: "", className: "" },
  low: { label: "", className: "" },
};

export default function TodoRow({
  todo,
  startAt,
  config = {},
  handlers,
  extraRight,
}: TodoRowProps) {
  const {
    showProjectChip = false,
    showTaskName = false,
    showPriority = true,
    showStartAt = false,
    editableTitle = true,
    actions = [],
    compact = false,
  } = config;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== todo.title && handlers.onUpdate) {
      handlers.onUpdate(todo.id, { title: v });
    }
    setEditing(false);
  };

  const priority = PRIORITY_STYLE[todo.priority] ?? PRIORITY_STYLE.medium;

  return (
    <div
      className={`group flex items-start gap-3 px-2 border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${
        compact ? "py-1.5" : "py-2"
      }`}
    >
      {/* 完成圆钮 */}
      <button
        onClick={() => handlers.onToggleComplete(todo.id, !todo.completed)}
        className={`mt-1 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
          todo.completed
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-gray-300 hover:border-emerald-400"
        }`}
        title={todo.completed ? "标为未完成" : "标为已完成"}
      >
        {todo.completed && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 时间胶囊 */}
      {showStartAt && startAt && (
        <span className="mt-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[11px] font-mono flex-shrink-0">
          {startAt}
        </span>
      )}

      {/* 标题 + 副行 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {showPriority && priority.label && (
            <span className={`px-1 rounded text-[10px] font-medium flex-shrink-0 ${priority.className}`}>
              {priority.label}
            </span>
          )}
          {editing && editableTitle ? (
           <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setDraft(todo.title);
                  setEditing(false);
                }
              }}
              className="flex-1 text-[14px] text-gray-800 leading-snug border-b border-blue-300 focus:outline-none bg-transparent"
            />
          ) : (
            <div
              onDoubleClick={() => {
                if (editableTitle) {
                  setDraft(todo.title);
                  setEditing(true);
                }
              }}
              className={`flex-1 text-[14px] leading-snug truncate ${
                editableTitle ? "cursor-text" : ""
              } ${todo.completed ? "text-gray-400 line-through" : "text-gray-800"}`}
            >
              {todo.title}
            </div>
          )}
        </div>
        {(showProjectChip || showTaskName) && (
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
            {showProjectChip && (
              todo.project ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${todo.project.color}18`, color: todo.project.color }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: todo.project.color }} />
                  {todo.project.name}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">收件箱</span>
              )
            )}
            {showTaskName && todo.task && (
              <span className="text-gray-400">{todo.task.name}</span>
            )}
          </div>
        )}
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {extraRight}
        {!todo.completed && actions.includes("schedule") && handlers.onSchedule && (
          <button
            onClick={() => handlers.onSchedule!(todo.id)}
            className="opacity-60 group-hover:opacity-100 px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-[12px] font-medium hover:bg-blue-100 transition-all"
          >
            安排 ▾
          </button>
        )}
        {!todo.completed && actions.includes("reschedule") && handlers.onReschedule && (
          <button
            onClick={() => handlers.onReschedule!(todo.id)}
            className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md text-gray-500 text-[12px] hover:bg-gray-100 transition-all"
            title="改时间"
          >
            改时间 ▾
          </button>
        )}
        {!todo.completed && actions.includes("defer") && handlers.onDefer && (
          <button
            onClick={() => handlers.onDefer!(todo.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
            title="顺延到明天"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {actions.includes("unplan") && handlers.onUnplan && (
          <button
            onClick={() => handlers.onUnplan!(todo.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-all"
            title="移出计划"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {actions.includes("delete") && handlers.onDelete && (
          <button
            onClick={() => {
              if (confirm(`确定删除待办「${todo.title}」？`)) handlers.onDelete!(todo.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
            title="删除"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}