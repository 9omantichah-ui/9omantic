"use client";

import { DailyPlanItem } from "@/lib/types";

interface PlanTaskCardProps {
  item: DailyPlanItem;
  // 是否展示时段标签（今日视图按项目聚合时展示；计划区分时段则不需要）
  showSlot?: boolean;
  onUpdateStatus?: (itemId: string, status: string) => void;
  onRemove?: (itemId: string) => void;
  // 传入 dragHandle 相关 props 时整卡可拖拽
  dragging?: boolean;
}

const SLOT_LABEL: Record<string, string> = { morning: "上午", afternoon: "下午", evening: "晚上" };

// 今日视图与当日计划区共用的待办卡片，格式以今日视图为准
export default function PlanTaskCard({ item, showSlot, onUpdateStatus, onRemove, dragging }: PlanTaskCardProps) {
  const todo = item.todo;
  const isDone = item.status === "completed";

  return (
    <div
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border transition-all ${
        dragging ? "shadow-lg border-blue-300 bg-white" :
        isDone ? "bg-gray-50/40 border-gray-100 opacity-60" :
        "bg-white border-gray-100 hover:border-gray-200"
      }`}
    >
      {/* 勾选圆圈：勾选=已完成，取消=未开始 */}
      <button
        onClick={() => onUpdateStatus?.(item.id, isDone ? "pending" : "completed")}
        onMouseDown={e => e.stopPropagation()}
        className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
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
        <span className={`block text-[13px] font-medium leading-snug ${isDone ? "line-through text-gray-400" : "text-gray-700"}`}>
          {todo?.title ?? "（待办已删除）"}
        </span>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {todo?.project ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: todo.project.color }} />
              {todo.project.name}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300">未分类</span>
          )}
          {todo?.task && (
            <span className="text-[10px] text-gray-300">· {todo.task.name}</span>
          )}
          {showSlot && (
            <span className="text-[10px] text-gray-300">· {SLOT_LABEL[item.timeSlot] ?? "上午"}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
        {onRemove && (
          <button onClick={() => onRemove(item.id)} onMouseDown={e => e.stopPropagation()}
            className="p-0.5 text-gray-300 hover:text-red-500 transition-colors" title="移出计划">
           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}