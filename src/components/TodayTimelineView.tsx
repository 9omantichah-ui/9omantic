"use client";

import { useMemo, useState } from "react";
import { DailyPlanItem } from "@/lib/types";
import PlanTaskCard from "./PlanTaskCard";

interface TodayTimelineViewProps {
  planItems: DailyPlanItem[];
  onUpdateStatus: (itemId: string, status: string) => void;
  onRemove: (itemId: string) => void;
  onDeferToTomorrow: (itemId: string) => void;
  onSetPlanTime: (itemId: string, startAt: string | null, durationMin?: number) => void;
}

// 时间轴范围：08:00 - 22:00，粒度 30 分钟 → 28 个时间格
const START_HOUR = 8;
const END_HOUR = 22;
const SLOT_MIN = 30;
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN; // 28

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function slotIndexToHHmm(idx: number): string {
  const total = START_HOUR * 60 + idx * SLOT_MIN;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}
function hhmmToSlotIndex(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  const total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const rel = total - START_HOUR * 60;
  if (rel < 0 || rel >= (END_HOUR - START_HOUR) * 60) return null;
  return Math.floor(rel / SLOT_MIN);
}

/** 时间轴视图：左侧 30 分钟一格，右侧一列渲染安排在该格内（含跨格）的待办；
 *  顶部"未定时"区展示 startAt=null 的条目。 */
export default function TodayTimelineView({
  planItems, onUpdateStatus, onRemove, onDeferToTomorrow, onSetPlanTime,
}: TodayTimelineViewProps) {
  // 拆分：未定时 vs 已定时
  const { untimed, timed } = useMemo(() => {
    const untimed: DailyPlanItem[] = [];
    const timed: (DailyPlanItem & { _slot: number })[] = [];
    for (const it of planItems) {
      const idx = it.startAt ? hhmmToSlotIndex(it.startAt) : null;
      if (idx == null) untimed.push(it);
      else timed.push({ ...it, _slot: idx });
    }
    // 已定时按开始时间排序
    timed.sort((a, b) => a._slot - b._slot);
    return { untimed, timed };
  }, [planItems]);

  // 建立 slotIndex -> items[] 映射（仅按开始时间归位；跨格暂用行内 durationMin 提示）
  const bySlot = useMemo(() => {
    const map: Map<number, (DailyPlanItem & { _slot: number })[]> = new Map();
    for (const it of timed) {
      const arr = map.get(it._slot) ?? [];
      arr.push(it);
      map.set(it._slot, arr);
    }
    return map;
  }, [timed]);

  const [pickerFor, setPickerFor] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* 未定时区 */}
      {untimed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-3.5 py-2 bg-gray-50/70 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-[13px] font-semibold text-gray-700">未定时</span>
            <span className="text-[11px] text-gray-400 tabular-nums">{untimed.length}</span>
            <span className="ml-2 text-[11px] text-gray-400">点条目右侧「设时间」拖入时间轴</span>
          </div>
          <div>
            {untimed.map(item => (
              <div key={item.id} className="relative">
                <PlanTaskCard
                  item={item}
                  onUpdateStatus={onUpdateStatus}
                  onRemove={onRemove}
                  onDeferToTomorrow={onDeferToTomorrow}
                />
                <button
                  onClick={() => setPickerFor(pickerFor === item.id ? null : item.id)}
                  className="absolute right-24 top-1.5 opacity-0 hover:opacity-100 group-hover:opacity-100 px-1.5 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                >
                  设时间 ▾
                </button>
                {pickerFor === item.id && (
                  <TimePicker
                    onPick={(hhmm) => { onSetPlanTime(item.id, hhmm); setPickerFor(null); }}
                    onClose={() => setPickerFor(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 时间轴 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-3.5 py-2 bg-gray-50/70 border-b border-gray-100 flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-[13px] font-semibold text-gray-700">时间轴</span>
        <span className="text-[11px] text-gray-400">{START_HOUR}:00 – {END_HOUR}:00 · 半小时</span>
        </div>
        <div>
          {Array.from({ length: SLOT_COUNT }).map((_, idx) => {
            const label = slotIndexToHHmm(idx);
            const items = bySlot.get(idx) ?? [];
            const isHour = idx % 2 === 0;
            return (
              <div
                key={idx}
                className={`flex items-stretch min-h-[36px] ${isHour ? "border-t border-gray-200" : "border-t border-dashed border-gray-100"}`}
              >
                <div className={`w-14 flex-shrink-0 pt-1 pl-2 text-[11px] tabular-nums ${isHour ? "text-gray-500 font-medium" : "text-gray-300"}`}>
                  {isHour ? label : ""}
                </div>
                <div className="flex-1 min-w-0 border-l border-gray-100">
                  {items.length === 0 ? (
                    <div className="h-full" />
                  ) : (
                    items.map(item => (
                      <div key={item.id} className="relative">
                        <PlanTaskCard
                          item={item}
                          onUpdateStatus={onUpdateStatus}
                          onRemove={onRemove}
                          onDeferToTomorrow={onDeferToTomorrow}
                        />
                        <button
                          onClick={() => setPickerFor(pickerFor === item.id ? null : item.id)}
                          className="absolute right-24 top-1.5 opacity-40 hover:opacity-100 px-1.5 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        >
                          改时间 ▾
                        </button>
                        {pickerFor === item.id && (
                          <TimePicker
                            currentStartAt={item.startAt}
                            onPick={(hhmm) => { onSetPlanTime(item.id, hhmm); setPickerFor(null); }}
                            onClear={() => { onSetPlanTime(item.id, null); setPickerFor(null); }}
                            onClose={() => setPickerFor(null)}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 内嵌时间选择器：08:00 - 22:00 半小时列表
function TimePicker({
  currentStartAt, onPick, onClear, onClose,
}: {
  currentStartAt?: string | null;
  onPick: (hhmm: string) => void;
  onClear?: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-6 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-[240px] overflow-y-auto">
        <div className="px-3 pt-1 pb-0.5 text-[11px] text-gray-400 font-medium sticky top-0 bg-white">选择开始时间</div>
        {Array.from({ length: SLOT_COUNT }).map((_, idx) => {
          const hhmm = slotIndexToHHmm(idx);
          const active = currentStartAt === hhmm;
          return (
            <button
              key={idx}
              onClick={() => onPick(hhmm)}
              className={`w-full text-left px-3 py-1 text-[12px] tabular-nums transition-colors ${
                active ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-blue-50"
              }`}
            >
              {hhmm}
            </button>
          );
        })}
        {onClear && (
          <>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={onClear}
              className="w-full text-left px-3 py-1 text-[12px] text-gray-500 hover:bg-red-50 hover:text-red-500"
            >
              清除时间（回到未定时）
            </button>
          </>
        )}
      </div>
    </>
  );
}