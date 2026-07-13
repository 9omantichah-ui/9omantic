"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Project, Task, DailyPlanItem } from "@/lib/types";
import PlanTaskCard from "./PlanTaskCard";

interface TodayViewProps {
  planItems: DailyPlanItem[];
  projects: Project[];
  tasks: Task[];
  onUpdateStatus: (itemId: string, status: string) => void;
  onRemove: (itemId: string) => void;
  // 今日快捷新增：创建待办并加入当日计划
  onQuickAddToday: (title: string, projectId: string | null, taskId: string | null, timeSlot: "morning" | "afternoon" | "evening") => void;
  onDeferToTomorrow: (itemId: string) => void;
}

const SLOTS: { id: "morning" | "afternoon" | "evening"; name: string; icon: string; accent: string }[] = [
  { id: "morning", name: "上午", icon: "🌅", accent: "#f59e0b" },
  { id: "afternoon", name: "下午", icon: "☀️", accent: "#3b82f6" },
  { id: "evening", name: "晚上", icon: "🌙", accent: "#8b5cf6" },
];

export default function TodayView({ planItems, projects, tasks, onUpdateStatus, onRemove, onQuickAddToday, onDeferToTomorrow }: TodayViewProps) {
  const [addingSlot, setAddingSlot] = useState<"morning" | "afternoon" | "evening" | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");

  const projectTasks = tasks.filter(t => t.projectId === (projectId || null));

  const total = planItems.length;
  const done = planItems.filter(i => i.status === "completed").length;

  const submit = (slot: "morning" | "afternoon" | "evening") => {
    const t = title.trim();
    if (!t) { setAddingSlot(null); return; }
    onQuickAddToday(t, projectId || null, taskId || null, slot);
    setTitle("");
    setTaskId("");
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-gray-900">今日</h1>
          {total > 0 && <span className="text-[12px] text-gray-400 tabular-nums">{done}/{total} 已完成</span>}
        </div>
        <p className="text-[12px] text-gray-400 mt-1">今天要执行的事，按上午 / 下午 / 晚上分时段安排，可拖拽调整</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {total === 0 && (
          <div className="text-center py-4 text-[12px] text-gray-300">
            今天还没有计划，在下方各时段新增，或在项目视图把待办加入计划
          </div>
        )}
        {SLOTS.map(slot => {
          const slotItems = planItems
            .filter(i => (i.timeSlot || "morning") === slot.id)
            .sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0));
          return (
            <div key={slot.id} className="bg-gray-50/60 rounded-xl border border-gray-100">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slot.accent }} />
                  <span className="text-[13px] font-semibold text-gray-700">{slot.icon} {slot.name}</span>
                  <span className="text-[11px] text-gray-300 tabular-nums">{slotItems.length}</span>
                </div>
                <button
                  onClick={() => { setAddingSlot(addingSlot === slot.id ? null : slot.id); setTitle(""); }}
                  className="px-2 py-0.5 rounded-md bg-white text-blue-600 text-[11px] font-medium border border-blue-100 hover:bg-blue-50 transition-colors">
                  ＋ 新增
                </button>
              </div>

              {addingSlot === slot.id && (
                <div className="px-4 pb-2 space-y-2">
                  <input
                    autoFocus
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submit(slot.id); if (e.key === "Escape") { setAddingSlot(null); setTitle(""); } }}
                    placeholder={`${slot.name}要做的事…`}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={projectId} onChange={e => { setProjectId(e.target.value); setTaskId(""); }}
                      className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:border-blue-400">
                      <option value="">未分类</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={taskId} onChange={e => setTaskId(e.target.value)}
                      disabled={!projectId || projectTasks.length === 0}
                      className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:border-blue-400 disabled:opacity-50">
                      <option value="">{projectId ? "选择任务" : "先选项目"}</option>
                      {projectTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button onClick={() => submit(slot.id)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-500">添加</button>
                  </div>
                </div>
              )}

              <Droppable droppableId={`plan-${slot.id}`}>
                {(provided, snapshot) => (
               <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`px-2 pb-2 space-y-1.5 min-h-[3.5rem] rounded-lg transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : ""}`}>
                    {slotItems.length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center py-4 text-[11px] text-gray-300">拖待办到这里</div>
                    )}
                    {slotItems.map((item, i) => (
                      <Draggable key={item.id} draggableId={`today-item-${item.id}`} index={i}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing">
                            <PlanTaskCard item={item} dragging={snap.isDragging}
                              onUpdateStatus={onUpdateStatus} onRemove={onRemove} onDeferToTomorrow={onDeferToTomorrow} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </section>
  );
}