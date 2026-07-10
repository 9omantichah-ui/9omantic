"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import{ Todo, Project, DailyPlanItem } from "@/lib/types";

const STATUS_CONFIG = {
  pending: { label: "未开始", cls: "bg-gray-100 text-gray-500" },
  in_progress: { label: "进行中", cls: "bg-blue-100 text-blue-600 ring-2 ring-blue-200" },
  completed: { label: "已完成", cls: "bg-emerald-100 text-emerald-600" },
};

const ZONE_NAME: Record<number, string> = { 0: "未整理", 1: "优先做", 2: "稍后做", 3: "晚点做" };

export const TIME_SLOTS: { id: "morning" | "afternoon" | "evening"; name: string; icon: string; accent: string }[] = [
  { id: "morning", name: "上午", icon: "🌅", accent: "#f59e0b" },
  { id: "afternoon", name: "下午", icon: "☀️", accent: "#3b82f6" },
  { id: "evening", name: "晚上", icon: "🌙", accent: "#8b5cf6" },
];

interface DailyPlanSectionProps {
  todos: Todo[];
  projects: Project[];
  planItems: DailyPlanItem[];
  selectedDate: string;
  onNavigateDate: (offset: number) => void;
  onSetToday: () => void;
  onUpdateStatus: (itemId: string, status: string) => void;
  onRemove: (itemId: string) => void;
  onAddToPlan: (todoId: string, timeSlot: "morning" | "afternoon" | "evening") => void;
}

export default function DailyPlanSection({
  todos, planItems, selectedDate, onNavigateDate, onSetToday, onUpdateStatus, onRemove, onAddToPlan,
}: DailyPlanSectionProps) {
  const [addPickerSlot, setAddPickerSlot] = useState<"morning" | "afternoon" | "evening" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const planTodoIds = new Set(planItems.map(i => i.todoId));
  const availableTodos = todos.filter(t =>
    !t.completed && !planTodoIds.has(t.id) &&
    (searchTerm === "" || t.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const completed = planItems.filter(i => i.status === "completed").length;
  const total = planItems.length;

  const renderPlanItem = (item: DailyPlanItem, index: number) => {
    const todo = item.todo;
    const statusConfig = STATUS_CONFIG[item.status];
    const isInProgress = item.status === "in_progress";
    return (
      <Draggable key={item.id} draggableId={`plan-item-${item.id}`} index={index}>
        {(prov, snap) => (
          <div
            ref={prov.innerRef}
            {...prov.draggableProps}
            {...prov.dragHandleProps}
            className={`flex items-start gap-2 px-3 py-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
              snap.isDragging ? "shadow-lg border-blue-300 bg-white" :
              isInProgress ? "border-blue-200 bg-blue-50/60 shadow-sm" :
              item.status === "completed" ? "border-gray-100 bg-gray-50/50 opacity-60" :
              "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <div className="flex-1 min-w-0">
              <span className={`text-[13px] font-medium ${item.status === "completed" ? "line-through text-gray-400" : "text-gray-800"}`}>
                {todo?.title || "已删除的待办"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {todo?.project && (
                  <span className="px-1.5 py-[1px] rounded text-[9px] font-medium text-white" style={{ backgroundColor: todo.project.color }}>
                    {todo.project.name}
                  </span>
                )}
                {todo?.task && (
                  <span
                    className="px-1.5 py-[1px] rounded text-[9px] font-medium"
                    style={{ backgroundColor: `${todo.project?.color || "#94a3b8"}22`, color: todo.project?.color || "#64748b" }}
                  >
                    {todo.task.name}
                  </span>
                )}
                {todo && <span className="text-[9px] px-1 py-[0.5px] rounded bg-gray-100 text-gray-400">{ZONE_NAME[todo.zone]}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <select
                value={item.status}
                onChange={e => onUpdateStatus(item.id, e.target.value)}
                onClick={e => e.stopPropagation()}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border-0 ${statusConfig.cls} cursor-pointer focus:outline-none`}
              >
                <option value="pending">未开始</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
              <button onClick={() => onRemove(item.id)} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors" title="移出计划">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">当日计划</h2>
          {total > 0 && <span className="text-[11px] text-gray-400">{completed}/{total} 已完成</span>}
          <span className="text-[11px] text-gray-400">· 可将待办拖入下方时段</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onNavigateDate(-1)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onSetToday}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${isToday ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {isToday ? "今天" : selectedDate}
          </button>
          <button onClick={() => onNavigateDate(1)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIME_SLOTS.map(slot => {
          const slotItems = planItems.filter(i => (i.timeSlot || "morning") === slot.id);
          return (
            <div key={slot.id} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slot.accent }} />
                  <span className="text-xs font-semibold text-gray-700">{slot.icon} {slot.name}</span>
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums">{slotItems.length} 项</span>
              </div>
              <div className="p-2 flex-1 overflow-y-auto max-h-[45vh] min-h-[8rem]">
                <Droppable droppableId={`plan-${slot.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-1.5 min-h-[6rem] rounded-lg p-1.5 transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : ""}`}
                    >
                      {slotItems.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-6 text-xs text-gray-300">拖待办到这里，或点下方添加</div>
                      )}
                      {slotItems.map((item, i) => renderPlanItem(item, i))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* 添加待办 */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  {addPickerSlot === slot.id ? (
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
                        <button onClick={() => { setAddPickerSlot(null); setSearchTerm(""); }} className="text-[11px] text-gray-400 hover:text-gray-600">取消</button>
                      </div>
                      <div className="max-h-[160px] overflow-y-auto space-y-1">
                        {availableTodos.length === 0 ? (
                          <div className="text-center py-2 text-[11px] text-gray-300">没有可添加的待办</div>
                        ) : availableTodos.slice(0, 20).map(todo => (
                          <button
                            key={todo.id}
                            onClick={() => { onAddToPlan(todo.id, slot.id); setAddPickerSlot(null); setSearchTerm(""); }}
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
                      onClick={() => setAddPickerSlot(slot.id)}
                      className="w-full py-1.5 text-[11px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      + 添加待办
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}