"use client";

import { DailyPlanItem, Todo } from "@/lib/types";
import TodoRow, { TodoRowAction } from "./TodoRow";

interface PlanTaskCardProps {
  item: DailyPlanItem;
  // 是否展示时段标签（今日视图按项目聚合时展示；计划区分时段则不需要）
  showSlot?: boolean;
  onUpdateStatus?: (itemId: string, status: string) => void;
  onRemove?: (itemId: string) => void;
  // 顺延到明日（仅今日视图提供）
  onDeferToTomorrow?: (itemId: string) => void;
  // 传入时整卡拖拽时显示 shadow
  dragging?: boolean;
}

const SLOT_LABEL: Record<string, string> = { morning: "上午", afternoon: "下午", evening: "晚上" };

// 今日视图与当日计划区共用的待办列表行：基于 TodoRow 组件包装
export default function PlanTaskCard({ item, showSlot, onUpdateStatus, onRemove, onDeferToTomorrow, dragging }: PlanTaskCardProps) {
  const todo = item.todo;
  const isDone = item.status === "completed";

  // 兜底：todo 已删除
  if (!todo) {
    return (
      <div className="px-3 py-2 border-b border-gray-50 text-[13px] text-gray-400 italic">
        （待办已删除）
      </div>
    );
  }

  // 构造供 TodoRow 使用的 pseudo Todo：completed 状态映射自 item.status
  const pseudoTodo: Todo = { ...todo, completed: isDone };

  const actions: TodoRowAction[] = [];
  if (onDeferToTomorrow) actions.push("defer");
  if (onRemove) actions.push("unplan");

  return (
    <div
      className={`${dragging ? "shadow-md ring-1 ring-blue-200 bg-white rounded-md" : ""}`}
      onMouseDown={e => e.stopPropagation()}
    >
      <TodoRow
        todo={pseudoTodo}
        startAt={item.startAt}
        config={{
          showProjectChip: true,
          showTaskName: true,
          showPriority: true,
          showStartAt: !!item.startAt,
          editableTitle: false,   // 计划视图内暂不支持编辑标题
          actions,
          compact: true,
        }}
        handlers={{
          onToggleComplete: () => onUpdateStatus?.(item.id, isDone ? "pending" : "completed"),
          onDefer: () => onDeferToTomorrow?.(item.id),
          onUnplan: () => onRemove?.(item.id),
        }}
        extraRight={
          showSlot ? (
            <span className="text-[10px] text-gray-300 mr-1">
              {SLOT_LABEL[item.timeSlot] ?? "上午"}
            </span>
          ) : null
        }
      />
    </div>
  );
}