"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Todo, Project, ProjectGroup } from "@/lib/types";

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
  projectGroups: ProjectGroup[];
  onToggle: (id: string, completed: boolean) => void;
  onQuickAdd: (projectId: string | null, title: string) => void;
  onReorderProjects: (items: { id: string; order: number; groupId: string | null }[]) => void;
  onReorderTodos: (items: { id: string; zone: number; order: number }[]) => void;
}

function QuickAddInput({ projectId, onQuickAdd }: { projectId: string | null; onQuickAdd: (projectId: string | null, title: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onQuickAdd(projectId, v);
    setValue("");
  };
  return (
    <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-gray-100">
      <input
        type="text"
        value={value}
        placeholder="+ 快速添加待办（进入未整理）"
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submit(); }}
        className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-[11px] text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400 transition-all"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${value.trim() ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.97]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
      >添加</button>
    </div>
  );
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

export default function ProjectOverview({ todos, projects, projectGroups, onToggle, onQuickAdd, onReorderProjects, onReorderTodos }: ProjectOverviewProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showCompletedMap, setShowCompletedMap] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  // 按 ProjectGroup 聚合项目
  const getGroupedData = () => {
    const projectTodosMap: Record<string, Todo[]> = { _none: [] };
    projects.forEach(p => { projectTodosMap[p.id] = []; });
    todos.forEach(t => { const k = t.projectId || "_none"; if (projectTodosMap[k]) projectTodosMap[k].push(t); else projectTodosMap._none.push(t); });

    const grouped: { group: ProjectGroup | null; items: { project: Project | null; todos: Todo[] }[] }[] = [];

    projectGroups.forEach(g => {
      const items = g.projects.map(p => ({ project: p, todos: projectTodosMap[p.id] || [] }));
      grouped.push({ group: g, items });
    });

    const groupedProjectIds = new Set(projectGroups.flatMap(g => g.projects.map(p => p.id)));
    const ungroupedProjects = projects.filter(p => !groupedProjectIds.has(p.id));
    const ungroupedItems: { project: Project | null; todos: Todo[] }[] = [];
    ungroupedItems.push({ project: null, todos: projectTodosMap._none });
    ungroupedProjects.forEach(p => { ungroupedItems.push({ project: p, todos: projectTodosMap[p.id] || [] }); });
    if (ungroupedItems.length > 0) {
      grouped.unshift({ group: null, items: ungroupedItems });
    }

    return grouped;
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

  const grouped = getGroupedData();

  // 统一拖拽处理：区分项目卡片拖拽与待办拖拽
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "PROJECT") {
      // 项目卡片同分组内重排（droppableId = group-<groupId>）
      if (source.droppableId !== destination.droppableId) return;
      if (source.index === destination.index) return;
      const groupId = source.droppableId.replace(/^group-/, "");
      const section = grouped.find(s => (s.group?.id || "_ungrouped") === groupId);
      if (!section) return;
      // 仅取有 project 的卡片参与排序（排除 "未分类" _none 占位）
      const draggableItems = section.items.filter(it => it.project);
      const reordered = [...draggableItems];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      const gid = section.group?.id ?? null;
      const items = reordered.map((it, idx) => ({ id: it.project!.id, order: idx, groupId: gid }));
      onReorderProjects(items);
      return;
    }

    if (type === "TODO") {
      // 卡片内未完成待办重排（droppableId = todos-<projectKey>）
      if (source.droppableId !== destination.droppableId) return;
      if (source.index === destination.index) return;
      const projectKey = source.droppableId.replace(/^todos-/, "");
      const active = todos.filter(t => (t.projectId || "_none") === projectKey && !t.completed);
      const reordered = [...active];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      const items = reordered.map((t, idx) => ({ id: t.id, zone: t.zone, order: idx }));
      onReorderTodos(items);
      return;
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold text-gray-800 mb-2.5">各项目情况概览</h2>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {grouped.map((section) => {
            const groupId = section.group?.id || "_ungrouped";
            const isCollapsed = collapsedGroups.has(groupId);
            // 计算每个可拖拽项目卡片在 draggable 列表中的索引
            let projectDragIndex = -1;
            return (
              <div key={groupId}>
                {/* 分组头部 */}
                <button
                  onClick={() => toggleGroupCollapse(groupId)}
                  className="flex items-center gap-2 mb-2 group"
                >
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-600">
                    {section.group?.name || "未分组"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({section.items.reduce((acc, item) => acc + item.todos.length, 0)} 项)
                  </span>
                </button>
                {!isCollapsed && (
                  <Droppable droppableId={`group-${groupId}`} type="PROJECT" direction="horizontal">
                    {(dropProvided) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
                      >
                        {section.items.map(group => {
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
                          const isDraggableProject = !!group.project;
                          if (isDraggableProject) projectDragIndex += 1;
                          const dragIndex = projectDragIndex;

                          const cardInner = (dragHandleProps?: Record<string, unknown>, isDragging?: boolean) => (
                            <div className={`bg-white/90 rounded-xl border shadow-sm overflow-hidden flex flex-col ${isDragging ? "border-blue-300 shadow-md" : "border-gray-200/80"}`}>
                              {/* 项目头（拖拽把手） */}
                              <div className="px-3.5 py-2.5 border-b border-gray-100" {...(dragHandleProps || {})}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pc }} />
                                  <span className="text-xs font-semibold text-gray-700">{group.project?.name || "未分类"}</span>
                                  {isDraggableProject && (
                                    <svg className="w-3 h-3 text-gray-300 cursor-grab" fill="currentColor" viewBox="0 0 20 20">
                                      <circle cx="7" cy="5" r="1.4" /><circle cx="7" cy="10" r="1.4" /><circle cx="7" cy="15" r="1.4" />
                                      <circle cx="13" cy="5" r="1.4" /><circle cx="13" cy="10" r="1.4" /><circle cx="13" cy="15" r="1.4" />
                                    </svg>
                                  )}
                                  <span className="text-[10px] text-gray-400 ml-auto tabular-nums">{doneCount}/{total}</span>
                                </div>
                                <ProgressBar total={total} done={doneCount} color={pc} />
                              </div>

                              {/* 待办列表（可拖拽排序） */}
                              <div className="px-3.5 py-2 flex-1 overflow-y-auto max-h-[320px]">
                                {gt.length === 0 ? (
                                  <div className="text-center py-4 text-[11px] text-gray-300">暂无待办</div>
                                ) : (
                                  <>
                                    <Droppable droppableId={`todos-${key}`} type="TODO">
                                      {(todoDrop) => (
                                        <div ref={todoDrop.innerRef} {...todoDrop.droppableProps} className="space-y-1.5">
                                          {displayActive.map((todo, tIdx) => (
                                            <Draggable key={todo.id} draggableId={`todo-${todo.id}`} index={tIdx}>
                                              {(tp, tSnap) => (
                                                <div
                                                  ref={tp.innerRef}
                                                  {...tp.draggableProps}
                                                  {...tp.dragHandleProps}
                                                  className={`flex items-start gap-2 py-1 rounded-md ${tSnap.isDragging ? "bg-blue-50" : ""}`}
                                                >
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
                                              )}
                                            </Draggable>
                                          ))}
                                          {todoDrop.placeholder}
                                        </div>
                                      )}
                                    </Droppable>

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

                              {/* 快速添加待办 */}
                              <div className="px-3.5 pb-2.5">
                                <QuickAddInput projectId={group.project?.id || null} onQuickAdd={onQuickAdd} />
                              </div>
                            </div>
                          );

                          if (!isDraggableProject) {
                            return <div key={key}>{cardInner()}</div>;
                          }

                          return (
                            <Draggable key={key} draggableId={`project-${key}`} index={dragIndex}>
                              {(dp, snap) => (
                                <div ref={dp.innerRef} {...dp.draggableProps}>
                                  {cardInner(dp.dragHandleProps as unknown as Record<string, unknown>, snap.isDragging)}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {dropProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </section>
  );
}