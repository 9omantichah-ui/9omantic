"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Todo, Project, DailyPlanItem } from "@/lib/types";
import PlanTaskCard from "./PlanTaskCard";

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

  const renderPlanItem = (item: DailyPlanItem, index: number) => (
    <Draggable key={item.id} draggableId={`plan-item-${item.id}`} index={index}>
      {(prov, snap) => (
        <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
          <PlanTaskCard
            item={item}
            dragging={snap.isDragging}
            onUpdateStatus={onUpdateStatus}
            onRemove={onRemove}
          />
        </div>
      )}
    </Draggable>
  );

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

      <div className="flex flex-col gap-3">
        {TIME_SLOTS.map(slot => {
          const slotItems = planItems.filter(i => (i.timeSlot || "morning") === slot.id)
            .sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0));
          return (
            <div key={slot.id} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slot.accent }} />
                  <span className="text-xs font-semibold text-gray-700">{slot.icon} {slot.name}</span>
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums">{slotItems.length} 项</span>
              </div>
              <div className="p-2 flex-1 overflow-y-auto max-h-[32vh] min-h-[6rem]">
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