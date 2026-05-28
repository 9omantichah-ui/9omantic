"use client";

import { useState } from "react";
import { Todo, Project } from "@/lib/types";
import TodoForm from "./TodoForm";

interface TodoItemProps {
  todo: Todo;
  projects: Project[];
  compact?: boolean;
  showZoneBadge?: boolean;
  hideProject?: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: object;
}

const ZONE_LABELS: Record<number, { text: string; cls: string }> = {
  0: { text: "待分配", cls: "bg-gray-100 text-gray-500" },
  1: { text: "P1", cls: "bg-red-50 text-red-600 ring-1 ring-red-200" },
  2: { text: "P2", cls: "bg-orange-50 text-orange-600 ring-1 ring-orange-200" },
  3: { text: "P3", cls: "bg-blue-50 text-blue-600 ring-1 ring-blue-200" },
};

export default function TodoItem({
  todo, projects, compact, showZoneBadge, hideProject, onToggle, onUpdate, onDelete, dragHandleProps,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  if (isEditing) {
    return (
      <div className="p-3 border border-blue-200 rounded-xl bg-blue-50/40 shadow-sm">
        <TodoForm
          todo={todo}
          projects={projects}
          onSubmit={(data) => { onUpdate(todo.id, data); setIsEditing(false); }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const isDone = todo.completed;
  const zoneInfo = ZONE_LABELS[todo.zone] || ZONE_LABELS[0];

  return (
    <div className={`group flex items-start gap-2 ${compact ? "px-2.5 py-2" : "px-3 py-2.5"} rounded-lg border transition-all ${
      isDone
        ? "bg-gray-50/80 border-gray-100 opacity-55"
        : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
    }`}>
      {/* 拖拽手柄 */}
      {dragHandleProps && (
        <div {...dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 flex-shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
        </div>
      )}

      {/* 完成按钮 */}
      <button
        onClick={() => onToggle(todo.id, !isDone)}
        className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 内容区 */}
      <div className="flex-1 min-w-0">
        {/* 标题行 */}
        <p className={`${compact ? "text-[13px]" : "text-sm"} font-medium leading-snug ${
          isDone ? "line-through text-gray-400" : "text-gray-800"
        }`}>{todo.title}</p>

        {/* 标签行：项目 + 顺位 */}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {!hideProject && todo.project && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded text-[10px] font-medium text-white" style={{ backgroundColor: todo.project.color }}>
              {todo.project.name}
            </span>
          )}
          {!hideProject && !todo.project && !compact && (
            <span className="px-1.5 py-[1px] rounded text-[10px] font-medium bg-gray-100 text-gray-400">未分类</span>
          )}
          {showZoneBadge && (
            <span className={`px-1.5 py-[1px] rounded text-[10px] font-semibold ${zoneInfo.cls}`}>{zoneInfo.text}</span>
          )}
        </div>

        {/* 描述折叠 */}
        {todo.description && (
          <div className="mt-1">
            {descExpanded ? (
              <div className={`text-xs leading-relaxed whitespace-pre-wrap ${isDone ? "text-gray-400" : "text-gray-500"}`}>
                {todo.description}
                <button onClick={() => setDescExpanded(false)} className="ml-1.5 text-blue-500 hover:text-blue-600 font-medium">收起</button>
              </div>
            ) : (
              <button
                onClick={() => setDescExpanded(true)}
                className="text-[11px] text-gray-400 hover:text-gray-500 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="truncate max-w-[160px]">{todo.description}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          title="编辑"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="删除"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}