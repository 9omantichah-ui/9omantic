"use client";

import { DailyPlanItem } from "@/lib/types";

interface PlanTaskCardProps {
  item: DailyPlanItem;
  // 是否展示时段标签（今日视图按项目聚合时展示；计划区分时段则不需要）
  showSlot?: boolean;
  onUpdateStatus?: (itemId: string, status: string) => void;
  onRemove?: (itemId: string) => void;
  // 顺延到明日（仅今日视图提供）
  onDeferToTomorrow?: (itemId: string) => void;
  // 传入 dragHandle 相关 props 时整卡可拖拽
  dragging?: boolean;
}

const SLOT_LABEL: Record<string, string> = { morning: "上午", afternoon: "下午", evening: "晚上" };

// 今日视图与当日计划区共用的待办列表行：极浅分割线 + 两级层次 + hover 才显操作
export default function PlanTaskCard({ item, showSlot, onUpdateStatus, onRemove, onDeferToTomorrow, dragging }: PlanTaskCardProps) {
  const todo = item.todo;
  const isDone = item.status === "completed";

  return (
    <div
      className={`group flex items-center gap-2.5 px-3 py-2 border-b border-gray-50 last:border-b-0 transition-colors ${
        dragging ? "shadow-md ring-1 ring-blue-200 bg-white rounded-md" :
        isDone ? "bg-transparent" :
        "bg-white hover:bg-gray-50/60"
      }`}
    >
      {/* 勾选圆圈：勾选=已完成，取消=未开始 */}
      <button
        onClick={() => onUpdateStatus?.(item.id, isDone ? "pending" : "completed")}
        onMouseDown={e => e.stopPropagation()}
        className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
          isDone ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-emerald-400"
        }`}
        title={isDone ? "标为未完成" : "标为已完成"}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* 主标题：14-15px 深色 */}
        <div className={`text-[14px] leading-snug truncate ${isDone ? "line-through text-gray-400" : "text-gray-800 font-medium"}`}>
          {todo?.title ?? "（待办已删除）"}
        </div>
        {/* 次信息：项目彩色标签 + 分类灰字 */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {todo?.project ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[10px]"
              style={{ backgroundColor: `${todo.project.color}18`, color: todo.project.color }}
            >
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: todo.project.color }} />
              {todo.project.name}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300">未分类</span>
          )}
          {todo?.task && (
            <span className="text-[10px] text-gray-400">{todo.task.name}</span>
          )}
          {showSlot && (
            <span className="text-[10px] text-gray-300">· {SLOT_LABEL[item.timeSlot] ?? "上午"}</span>
          )}
        </div>
      </div>

      {/* 操作区：hover 才显现 */}
      <div
        className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        onMouseDown={e => e.stopPropagation()}
      >
        {onDeferToTomorrow && !isDone && (
          <button
            onClick={() => onDeferToTomorrow(item.id)}
            onMouseDown={e => e.stopPropagation()}
            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="顺延到明日"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            onMouseDown={e => e.stopPropagation()}
            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="移出计划"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
          </button>
        )}
      </div>
    </div>
  );
}