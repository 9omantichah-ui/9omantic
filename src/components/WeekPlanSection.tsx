"use client";

import { useMemo, useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Todo, DailyPlanItem } from "@/lib/types";
import PlanTaskCard from "./PlanTaskCard";

/**
 * R1: 右栏本周(7 天) + 下周折叠 视图。
 * - 数据源：/api/daily-plan/week?start=YYYY-MM-DD → planItems 携带 date 字段
 * - 下周暂存：date === "NEXT_WEEK"
 * - Droppable id 约定：
 *     · 本周格子：plan-{YYYY-MM-DD}-{slot}
 *     · 下周暂存：plan-nextweek
 */

type Slot = "morning" | "afternoon" | "evening";

interface WeekItem extends DailyPlanItem {
  date: string; // "YYYY-MM-DD" 或 "NEXT_WEEK"
}

interface Props {
  todos: Todo[];
  weekItems: WeekItem[];
  weekStart: string;                 // 本周一 YYYY-MM-DD
  onNavigateWeek: (offset: number) => void; // -1 上周 / +1 下周
  onSetThisWeek: () => void;
  onUpdateStatus: (itemId: string, status: string) => void;
  onRemove: (itemId: string) => void;
  onAddToPlan: (todoId: string, date: string, timeSlot: Slot) => void;
}

const SLOTS: { id: Slot; name: string; icon: string; accent: string }[] = [
  { id: "morning", name: "上午", icon: "🌅", accent: "#f59e0b" },
  { id: "afternoon", name: "下午", icon: "☀️", accent: "#3b82f6" },
  { id: "evening", name: "晚上", icon: "🌙", accent: "#8b5cf6" },
];

const WEEK_LABEL = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function addDays(dateStr: string, offset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function formatMD(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WeekPlanSection({
  todos, weekItems, weekStart, onNavigateWeek, onSetThisWeek,
  onUpdateStatus, onRemove, onAddToPlan,
}: Props) {
  const [nextWeekOpen, setNextWeekOpen] = useState(true);
  const [pickerKey, setPickerKey] = useState<string | null>(null); // "date|slot" or "NEXT_WEEK|morning"
  const [searchTerm, setSearchTerm] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // 按 date+slot 分桶
  const bucket = useMemo(() => {
    const m = new Map<string, WeekItem[]>();
    for (const it of weekItems) {
      const slot = (it.timeSlot || "morning") as Slot;
      const key = `${it.date}|${slot}`;
      const arr = m.get(key) || [];
      arr.push(it);
      m.set(key, arr);
    }
    // 排序：未完成在前，然后 order
    for (const [, arr] of m) {
      arr.sort((a, b) => {
        const c = (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0);
        return c !== 0 ? c : (a.order ?? 0) - (b.order ?? 0);
      });
    }
    return m;
  }, [weekItems]);

  // 已被本周/下周安排过的 todoId 集合（用于「添加」picker 过滤）
  const scheduledTodoIds = useMemo(() => new Set(weekItems.map(i => i.todoId)), [weekItems]);
  const availableTodos = todos.filter(t =>
    !t.completed && !scheduledTodoIds.has(t.id) &&
    (searchTerm === "" || t.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isThisWeek = (() => {
    // 判断当前 weekStart 是否就是「本周」
    const d = new Date();
    const day = d.getDay(); // 0 sun
    const diffToMonday = (day + 6) % 7;
    d.setDate(d.getDate() - diffToMonday);
    return d.toISOString().split("T")[0] === weekStart;
  })();

  const renderItem = (item: WeekItem, index: number) => (
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

  const renderPicker = (date: string, slot: Slot) => {
    const key = `${date}|${slot}`;
    if (pickerKey !== key) {
      return (
        <button
          onClick={() => { setPickerKey(key); setSearchTerm(""); }}
          className="w-full py-1 text-[11px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          + 添加
        </button>
      );
    }
    return (
      <div>
        <div className="flex items-center gap-1 mb-1">
          <input
            type="text"
            placeholder="搜索待办..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[11px] focus:outline-none focus:border-blue-400"
            autoFocus
          />
          <button onClick={() => { setPickerKey(null); setSearchTerm(""); }} className="text-[10px] text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="max-h-[140px] overflow-y-auto space-y-0.5">
          {availableTodos.length === 0 ? (
            <div className="text-center py-2 text-[10px] text-gray-300">无可添加</div>
          ) : availableTodos.slice(0, 20).map(t => (
            <button
              key={t.id}
              onClick={() => { onAddToPlan(t.id, date, slot); setPickerKey(null); setSearchTerm(""); }}
              className="w-full flex items-center gap-1 px-1.5 py-1 rounded hover:bg-blue-50 text-left"
            >
              <span className="text-[11px] text-gray-700 truncate flex-1">{t.title}</span>
              {t.project && (
                <span className="px-1 rounded text-[9px] font-medium text-white flex-shrink-0" style={{ backgroundColor: t.project.color }}>
                  {t.project.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">本周计划</h2>
          <span className="text-[11px] text-gray-400">· 拖待办到日期时段</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onNavigateWeek(-1)} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="上一周">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onSetThisWeek}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${isThisWeek ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {isThisWeek ? "本周" : `${formatMD(weekStart)}~`}
          </button>
          <button onClick={() => onNavigateWeek(1)} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="下一周">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {days.map((date, dayIdx) => {
          const isTodayCol = date === today;
          const dayTotal = SLOTS.reduce((acc, s) => acc + (bucket.get(`${date}|${s.id}`)?.length ?? 0), 0);
          return (
            <div key={date} className={`bg-white rounded-xl border shadow-sm ${isTodayCol ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200"}`}>
              <div className={`px-3 py-1.5 border-b flex items-center justify-between ${isTodayCol ? "border-blue-100 bg-blue-50/40" : "border-gray-100"}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isTodayCol ? "text-blue-700" : "text-gray-700"}`}>
                    {WEEK_LABEL[dayIdx]} · {formatMD(date)}
                  </span>
                  {isTodayCol && <span className="text-[10px] text-blue-600 bg-blue-100 px-1 rounded">今天</span>}
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums">{dayTotal} 项</span>
              </div>
              <div className="p-2 grid grid-cols-3 gap-2">
                {SLOTS.map(slot => {
                  const items = bucket.get(`${date}|${slot.id}`) ?? [];
                  return (
                   <div key={slot.id} className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slot.accent }} />
                        <span className="text-[10px] text-gray-500">{slot.icon}{slot.name}</span>
                        {items.length > 0 && <span className="text-[9px] text-gray-300 tabular-nums ml-auto">{items.length}</span>}
                      </div>
                      <Droppable droppableId={`plan-${date}-${slot.id}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-1 min-h-[3rem] rounded p-1 transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : "bg-gray-50/50"}`}
                          >
                            {items.length === 0 && !snapshot.isDraggingOver && (
                              <div className="text-center py-2 text-[10px] text-gray-300">拖入</div>
                            )}
                            {items.map((it, i) => renderItem(it, i))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                      <div className="mt-1">{renderPicker(date, slot.id)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 下周折叠区 */}
        <div className="bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
          <button
            onClick={() => setNextWeekOpen(v => !v)}
            className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <span>📦 下周暂存</span>
              <span className="text-[10px] text-gray-400 font-normal">
                {(bucket.get("NEXT_WEEK|morning")?.length ?? 0)} 项
              </span>
            </span>
            <svg className={`w-3.5 h-3.5 transition-transform ${nextWeekOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {nextWeekOpen && (
            <div className="p-2">
              <Droppable droppableId="plan-nextweek">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-1 min-h-[3rem] rounded p-1.5 transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : "bg-gray-50/50"}`}
                  >
                    {(bucket.get("NEXT_WEEK|morning") ?? []).length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center py-3 text-[11px] text-gray-300">拖待办到这里 → 下周再处理</div>
                    )}
                    {(bucket.get("NEXT_WEEK|morning") ?? []).map((it, i) => renderItem(it, i))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <div className="mt-2">{renderPicker("NEXT_WEEK", "morning")}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}