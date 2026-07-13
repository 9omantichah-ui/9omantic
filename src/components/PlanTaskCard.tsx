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

const STATUS_DOT: Record<string, string> = {
  pending: "bg-gray-300",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

const STATUS_SELECT: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  in_progress: "bg-blue-100 text-blue-600 ring-2 ring-blue-200",
  completed: "bg-emerald-100 text-emerald-600",
};

// 今日视图与当日计划区共用的待办卡片，格式以今日视图为准
export default function PlanTaskCard({ item, showSlot, onUpdateStatus, onRemove, dragging }: PlanTaskCardProps) {
  const todo = item.todo;
  const isDone = item.status === "completed";

  return (
    <div
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border transition-all ${
        dragging ? "shadow-lg border-blue-300 bg-white" :
        isDone ? "bg-green-50/50 border-green-100" :
        item.status === "in_progress" ? "bg-blue-50/60 border-blue-200 shadow-sm" :
        "bg-gray-50/60 border-gray-100 hover:border-gray-200"
      }`}
    >
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[item.status]}`} />

      <div className="flex-1 min-w-0">
        <span className={`block text-[13px] font-medium leading-snug ${isDone ? "line-through text-gray-400" : "text-gray-700"}`}>
          {todo?.title ?? "（待办已删除）"}
        </span>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {todo?.project ? (
            <span className="px-1.5 py-[1px] rounded text-[10px] font-medium text-white" style={{ backgroundColor: todo.project.color }}>
              {todo.project.name}
            </span>
          ) : (
            <span className="px-1.5 py-[1px] rounded text-[10px] font-medium bg-gray-100 text-gray-400">未分类</span>
          )}
          {todo?.task && (
            <span className="px-1.5 py-[1px] rounded text-[10px] font-medium"
              style={{ backgroundColor: `${todo.project?.color || "#94a3b8"}22`, color: todo.project?.color || "#64748b" }}>
              {todo.task.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
        {onUpdateStatus && (
          <select
            value={item.status}
            onChange={e => onUpdateStatus(item.id, e.target.value)}
            onClick={e => e.stopPropagation()}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${STATUS_SELECT[item.status]}`}
          >
            <option value="pending">未开始</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
          </select>
        )}
        {showSlot && (
          <span className="text-[10px] text-gray-400 px-1">{SLOT_LABEL[item.timeSlot] ?? "上午"}</span>
        )}
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