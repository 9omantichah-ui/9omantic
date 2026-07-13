"use client";

import { useState, useMemo } from "react";
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
}

const SLOTS: { id: "morning" | "afternoon" | "evening"; name: string }[] = [
  { id: "morning", name: "上午" },
  { id: "afternoon", name: "下午" },
  { id: "evening", name: "晚上" },
];

// 项目聚合分组：key = projectId ?? "none"
interface Group {
  key: string;
  name: string;
  color: string | null;
  items: DailyPlanItem[];
}

export default function TodayView({ planItems, projects, tasks, onUpdateStatus, onRemove, onQuickAddToday }: TodayViewProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [slot, setSlot] = useState<"morning" | "afternoon" | "evening">("morning");

  const projectTasks = tasks.filter(t => t.projectId === (projectId || null));

  // 按项目聚合分组
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    planItems.forEach(item => {
      const pid = item.todo?.project?.id ?? "none";
      if (!map.has(pid)) {
        map.set(pid, {
          key: pid,
          name: item.todo?.project?.name ?? "未分类",
          color: item.todo?.project?.color ?? null,
          items: [],
        });
      }
      map.get(pid)!.items.push(item);
    });
    // 组内：已完成沉底
    map.forEach(g => g.items.sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0)));
    // 未分类组排最后
    return [...map.values()].sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : 0));
  }, [planItems]);

  const total = planItems.length;
  const done = planItems.filter(i => i.status === "completed").length;

  const submit = () => {
    const t = title.trim();
    if (!t) { setAdding(false); return; }
    onQuickAddToday(t, projectId || null,taskId || null, slot);
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
        <p className="text-[12px] text-gray-400 mt-1">今天要执行的事，按项目聚合。可拖到右侧调整时段</p>

        <div className="mt-3">
          <button onClick={() => setAdding(v => !v)}
            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[12px] font-medium hover:bg-blue-100 transition-colors">
            ＋ 新增待办
          </button>
        </div>

        {adding && (
          <div className="mt-2 space-y-2">
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submit(); if (e.key === "Escape") { setAdding(false); setTitle(""); } }}
              placeholder="今天要做的事…"
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <select value={projectId} onChange={e => { setProjectId(e.target.value); setTaskId(""); }}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:border-blue-400">
                <option value="">未分类</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={taskId} onChange={e => setTaskId(e.target.value)}
                disabled={!projectId || projectTasks.length === 0}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:border-blue-400 disabled:opacity-50">
                <option value="">{projectId ? "选择任务" : "先选项目"}</option>
                {projectTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={slot} onChange={e => setSlot(e.target.value as typeof slot)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:border-blue-400">
                {SLOTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={submit} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-500">添加</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {total === 0 ? (
          <div className="text-center py-16 text-sm text-gray-300">
            今天还没有计划<br />
            <span className="text-[12px]">在上方新增，或从右侧把待办拖入计划区</span>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.key}>
              <div className="flex items-center gap-2 px-1 pb-1.5">
                {group.color ? (
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-300" />
                )}
                <span className="text-[13px] font-semibold text-gray-700">{group.name}</span>
                <span className="text-[11px] text-gray-300 tabular-nums">{group.items.length}</span>
              </div>
              <Droppable droppableId={`today-${group.key}`} isDropDisabled>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                    {group.items.map((item, i) => (
                      <Draggable key={item.id} draggableId={`today-item-${item.id}`} index={i}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing">
                            <PlanTaskCard item={item} showSlot dragging={snap.isDragging}
                              onUpdateStatus={onUpdateStatus} onRemove={onRemove} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))
        )}
      </div>
    </section>
  );
}