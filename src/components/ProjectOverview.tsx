"use client";

import { useState } from "react";
import { Todo, Project } from "@/lib/types";

const ZONE_NAME: Record<number, string> = { 0: "未整理", 1: "优先做", 2: "稍后做", 3: "晚点做" };
const ZONE_CLS: Record<number, string> = {
  0: "bg-gray-100 text-gray-500",
  1: "bg-red-50 text-red-600",
  2: "bg-orange-50 text-orange-600",
  3: "bg-blue-50 text-blue-600",
};

interface ProjectOverviewProps {
  todos: Todo[];
  projects: Project[];
  onToggle: (id: string, completed: boolean) => void;
}

function ProgressBar({ total, done, color }: { total: number; done: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] tabular-nums text-gray-400 whitespace-nowrap">{done}/{total}</span>
    </div>
  );
}

export default function ProjectOverview({ todos, projects, onToggle }: ProjectOverviewProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showCompletedMap, setShowCompletedMap] = useState<Set<string>>(new Set());

  const projectGroups = () => {
    const g: Record<string, { project: Project | null; todos: Todo[] }> = { _none: { project: null, todos: [] } };
    projects.forEach(p => { g[p.id] = { project: p, todos: [] }; });
    todos.forEach(t => { const k = t.projectId || "_none"; if (g[k]) g[k].todos.push(t); else g._none.todos.push(t); });
    return Object.values(g);
  };

  const toggleExpanded = (key: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleShowCompleted = (key: string) => {
    setShowCompletedMap(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const INITIAL_SHOW = 5;

  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold text-gray-800 mb-2.5">各项目情况概览</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {projectGroups().map(group => {
          const key = group.project?.id || "_none";
          const gt = group.todos;
          const active = gt.filter(t => !t.completed);
          const done = gt.filter(t => t.completed);
          const total = gt.length;
          const doneCount = done.length;
          const pc = group.project?.color || "#94a3b8";
          const isExpanded = expandedProjects.has(key);
          const showCompleted = showCompletedMap.has(key);
          const displayActive = isExpanded ? active : active.slice(0, INITIAL_SHOW);
          const hasMoreActive = active.length > INITIAL_SHOW;

          return (
            <div key={key} className="bg-white/90 rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
              {/* 项目头 */}
              <div className="px-3.5 py-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pc }} />
                  <span className="text-xs font-semibold text-gray-700">{group.project?.name || "未分类"}</span>
                  <span className="text-[10px] text-gray-400 ml-auto tabular-nums">{doneCount}/{total}</span>
                </div>
                <ProgressBar total={total} done={doneCount} color={pc} />
              </div>

              {/* 待办列表 */}
              <div className="px-3.5 py-2 space-y-1.5 flex-1 overflow-y-auto max-h-[320px]">
                {gt.length === 0 ? (
                  <div className="text-center py-4 text-[11px] text-gray-300">暂无待办</div>
                ) : (
                  <>
                    {/* 未完成待办 */}
                    {displayActive.map(todo => (
                      <div key={todo.id} className="flex items-start gap-2 py-1">
                        <button
                          onClick={() => onToggle(todo.id, !todo.completed)}
                          className="mt-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-300 hover:border-blue-400 flex-shrink-0 transition-all"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-gray-700 leading-snug">{todo.title}</span>
                            <span className={`text-[9px] px-1 py-[0.5px] rounded flex-shrink-0 ${ZONE_CLS[todo.zone]}`}>
                              {ZONE_NAME[todo.zone]}
                            </span>
                          </div>
                          {todo.description && (
                            <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{todo.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {hasMoreActive && !isExpanded && (
                      <button onClick={() => toggleExpanded(key)} className="text-[10px] text-blue-500 hover:text-blue-600 py-1">
                        展开更多 ({active.length - INITIAL_SHOW} 项)
                      </button>
                    )}
                    {isExpanded && hasMoreActive && (
                      <button onClick={() => toggleExpanded(key)} className="text-[10px] text-blue-500 hover:text-blue-600 py-1">
                        收起
                      </button>
                    )}

                    {/* 已完成待办 */}
                    {done.length > 0 && (
                      <div className="pt-1.5 mt-1 border-t border-gray-100">
                        <button
                          onClick={() => toggleShowCompleted(key)}
                          className="text-[10px] text-gray-400 hover:text-gray-500 flex items-center gap-1"
                        >
                          <svg className={`w-3 h-3 transition-transform ${showCompleted ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          已完成 ({done.length})
                        </button>
                        {showCompleted && done.map(todo => (
                          <div key={todo.id} className="flex items-start gap-2 py-0.5 mt-1 opacity-50">
                            <button
                              onClick={() => onToggle(todo.id, false)}
                              className="mt-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-emerald-500 flex-shrink-0 flex items-center justify-center"
                            >
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] text-gray-400 line-through">{todo.title}</span>
                              {todo.description && <p className="text-[9px] text-gray-300 mt-0.5 truncate">{todo.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}