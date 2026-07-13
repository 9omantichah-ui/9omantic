"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Todo, Project, ProjectGroup, Task } from "@/lib/types";

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
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onQuickAdd: (projectId: string | null, title: string, taskId?: string | null) => void;
  onCreateTask: (projectId: string | null, name: string) => Promise<Task | null>;
  onReorderProjects: (items: { id: string; order: number; groupId: string | null }[]) => void;
  onUpdateProjectColor: (projectId: string, color: string) => void;
  onMoveTodo: (todoId: string, projectId: string | null, taskId: string | null) => void;
}

// 预设颜色板
const PRESET_COLORS = [
  "#6366f1", "#3b82f6", "#0ea5e9", "#06b6d4", "#10b981",
  "#22c55e", "#eab308", "#f59e0b", "#f97316", "#ef4444",
  "#ec4899", "#a855f7", "#8b5cf6", "#64748b", "#78716c",
];

function ColorPicker({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const stop = (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault(); };
  return (
    <span className="relative flex-shrink-0" onMouseDown={stop} onPointerDown={stop} onClick={stop}>
      <button
        type="button"
        onClick={(e) => { stop(e); setOpen(o => !o); }}
        className="w-2.5 h-2.5 rounded-full block ring-offset-1 hover:ring-2 hover:ring-gray-300 transition"
        style={{ backgroundColor: color }}
        title="点击调整颜色"
      />
      {open && (
        <>
          <span className="fixed inset-0 z-10" onClick={(e) => { stop(e); setOpen(false); }} />
          <span className="absolute left-0 top-4 z-20 grid grid-cols-5 gap-1.5 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={(e) => { stop(e); onPick(c); setOpen(false); }}
                className={`w-4 h-4 rounded-full transition hover:scale-110 ${c === color ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </span>
        </>
      )}
    </span>
  );
}

function QuickAddInput({ projectId, taskId, onQuickAdd }: { projectId: string | null; taskId?: string | null; onQuickAdd: (projectId: string | null, title: string, taskId?: string | null) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onQuickAdd(projectId, v, taskId);
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

// 可排序的项目卡片包裹：iPhone 桌面式网格拖拽（拖到哪其他卡片自动补位）
function SortableCard({ id, children }: { id: string; children: (dragHandleProps: Record<string, unknown>, isDragging: boolean) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  const dragHandleProps = { ...attributes, ...listeners } as Record<string, unknown>;
  return (
    <div ref={setNodeRef} style={style} className="w-full md:w-[calc(50%-6px)] xl:w-[calc(33.333%-8px)] h-[480px]">
      {children(dragHandleProps, isDragging)}
    </div>
  );
}

// 可拖拽的待办行
function DraggableTodoRow({ todo, children }: { todo: Todo; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `todo::${todo.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 60 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

// 任务区可放置容器（作为待办拖拽的落点）
function TaskDropZone({ dropId, children }: { dropId: string; children: (isOver: boolean) => React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return <div ref={setNodeRef}>{children(isOver)}</div>;
}

export default function ProjectOverview({ todos, projects, tasks, onToggle, onQuickAdd, onCreateTask, onReorderProjects, onUpdateProjectColor, onMoveTodo }: ProjectOverviewProps) {
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  // 记录被用户手动展开的「已完成 / 未分类」区（默认折叠）
  const [expandedSpecial, setExpandedSpecial] = useState<Set<string>>(new Set());
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");

  const toggleTaskCollapse = (taskKey: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      next.has(taskKey) ? next.delete(taskKey) : next.add(taskKey);
      return next;
    });
  };

  const toggleSpecial = (specialKey: string) => {
    setExpandedSpecial(prev => {
      const next = new Set(prev);
      next.has(specialKey) ? next.delete(specialKey) : next.add(specialKey);
      return next;
    });
  };

  // 扁平聚合：所有项目平铺，另加一个"未分类"占位承载无项目的散待办
  const getProjectItems = () => {
    const projectTodosMap: Record<string, Todo[]> = { _none: [] };
    projects.forEach(p => { projectTodosMap[p.id] = []; });
    todos.forEach(t => { const k = t.projectId || "_none"; if (projectTodosMap[k]) projectTodosMap[k].push(t); else projectTodosMap._none.push(t); });

    const items: { project: Project | null; todos: Todo[] }[] = [];
    const sortedProjects = [...projects].sort((a, b) => a.order - b.order);
    const activeProjects: Project[] = [];
    const doneProjects: Project[] = [];
    sortedProjects.forEach(p => {
      const pt = projectTodosMap[p.id] || [];
      const isAllDone = pt.length > 0 && pt.every(t => t.completed);
      (isAllDone ? doneProjects : activeProjects).push(p);
    });
    activeProjects.forEach(p => items.push({ project: p, todos: projectTodosMap[p.id] || [] }));
    doneProjects.forEach(p => items.push({ project: p, todos: projectTodosMap[p.id] || [] }));
    if (projectTodosMap._none.length > 0) {
      items.push({ project: null, todos: projectTodosMap._none });
    }
    return items;
  };

  const projectItems = getProjectItems();
  const sortableIds = projectItems.filter(it => it.project).map(it => it.project!.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // 拖拽结束：区分「项目卡片排序」与「待办跨区移动」
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);

    // —— 待办跨区移动 ——
    if (activeId.startsWith("todo::")) {
      const todoId = activeId.slice("todo::".length);
      const overId = String(over.id);
      if (!overId.startsWith("drop::")) return;
      // drop::{projectKey}::{taskKey}
      const rest = overId.slice("drop::".length);
      const sep = rest.indexOf("::");
      const projectKey = rest.slice(0, sep);
      const taskKey = rest.slice(sep + 2);
      const newProjectId = projectKey === "_none" ? null : projectKey;
      const newTaskId = taskKey === "__loose__" ? null : taskKey;
      const cur = todos.find(t => t.id === todoId);
      if (!cur) return;
      if ((cur.projectId || null) === newProjectId && (cur.taskId || null) === newTaskId) return;
      onMoveTodo(todoId, newProjectId, newTaskId);
      return;
    }

    // —— 项目卡片排序 ——
    if (active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(active.id as string);
    const newIndex = sortableIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sortableIds, oldIndex, newIndex);
    const groupMap = new Map(projects.map(p => [p.id, p.groupId]));
    const items = reordered.map((pid, idx) => ({ id: pid, order: idx, groupId: groupMap.get(pid) ?? null }));
    onReorderProjects(items);
  };

  const totalTodos = projectItems.reduce((acc, item) => acc + item.todos.length, 0);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-2.5">
        <h2 className="text-sm font-bold text-gray-800">各项目情况概览</h2>
        <span className="text-[10px] text-gray-400">({projects.length} 个项目 · {totalTodos} 项待办)</span>
        <span className="text-[10px] text-gray-300 ml-1">拖动待办可移动到其他任务</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap items-start gap-3">
            {projectItems.map(group => {
       const key = group.project?.id || "_none";
              const gt = group.todos;
              const active = gt.filter(t => !t.completed);
              const done = gt.filter(t => t.completed);
              const total = gt.length;
              const doneCount = done.length;
              const pc = group.project?.color || "#94a3b8";
              const isDraggableProject = !!group.project;
              const pid = group.project?.id || null;

              // 单条待办行
              const renderTodoRow = (todo: Todo, dim = false) => (
                <DraggableTodoRow key={todo.id} todo={todo}>
                  <div className={`flex items-start gap-2 py-1 ${dim ? "opacity-50" : ""}`}>
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={() => onToggle(todo.id, !todo.completed)}
                      className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${todo.completed ? "bg-emerald-500 border-2 border-emerald-500" : "border-2 border-gray-300 hover:border-blue-400"}`}
                    >
                      {todo.completed && (
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[12px] leading-snug ${todo.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>{todo.title}</span>
                        {!todo.completed && (
                          <span className={`text-[9px] px-1 py-[0.5px] rounded flex-shrink-0 ${ZONE_CLS[todo.zone]}`}>{ZONE_NAME[todo.zone]}</span>
                        )}
                      </div>
                      {todo.description && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{todo.description}</p>}
                    </div>
                  </div>
                </DraggableTodoRow>
              );

              // 普通任务区（含拖拽落点）
              const renderTaskSection = (taskId: string, name: string, sectionTodos: Todo[]) => {
                const tKey = `${key}::${taskId}`;
                const isCol = collapsedTasks.has(tKey);
                const tActive = sectionTodos.filter(t => !t.completed);
                const dropId = `drop::${key}::${taskId}`;
                return (
                  <div key={taskId} className="mb-1.5">
                    <button onClick={() => toggleTaskCollapse(tKey)} className="w-full flex items-center gap-1.5 py-1 group/task">
                      <svg className={`w-3 h-3 text-gray-400 transition-transform ${isCol ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-[11px] font-semibold text-gray-600 truncate">{name}</span>
                      <span className="text-[9px] text-gray-400 ml-auto tabular-nums flex-shrink-0">{tActive.length}</span>
                    </button>
                <TaskDropZone dropId={dropId}>
                      {isOver => (
                        <div className={`pl-4 border-l ml-1.5 rounded-r transition-colors ${isOver ? "border-blue-400 bg-blue-50/60" : "border-gray-100"}`}>
                          {isCol ? (
                            isOver ? <div className="text-[10px] text-blue-400 py-1.5">放到这里</div> : null
                          ) : (
                            <>
                              {tActive.length === 0 ? (
                                <div className="text-[10px] text-gray-300 py-1">{isOver ? "放到这里" : "暂无待办"}</div>
                              ) : (
                                tActive.map(t => renderTodoRow(t))
                              )}
                              <QuickAddInput projectId={pid} taskId={taskId === "__loose__" ? null : taskId} onQuickAdd={onQuickAdd} />
                            </>
                          )}
                        </div>
                      )}
                    </TaskDropZone>
                  </div>
                );
              };

              const cardInner = (dragHandleProps?: Record<string, unknown>, isDragging?: boolean) => {
                // 项目下任务（按 order）
                const projTasks = tasks
                  .filter(tk => (tk.projectId || null) === pid)
                  .sort((a, b) => a.order - b.order);
                // 未挂任务的散待办（未分类）
                const looseActive = active.filter(t => !t.taskId);
                const looseTodos = gt.filter(t => !t.taskId);

                // 未分类区（默认折叠、置于任务列表最下方，在"已完成"之上）
                const looseKey = `${key}::__loose__`;
                const looseExpanded = expandedSpecial.has(looseKey);
                const looseDrop = `drop::${key}::__loose__`;

                // 已完成区（默认折叠，置于卡片最下方）
                const doneKey = `${key}::__done__`;
                const doneExpanded = expandedSpecial.has(doneKey);

                const hasAnything = projTasks.length > 0 || looseTodos.length > 0 || done.length > 0;

                return (
                  <div className={`bg-white/90 rounded-xl border shadow-sm overflow-hidden flex flex-col h-[480px] ${isDragging ? "border-blue-300 shadow-lg" : "border-gray-200/80"}`}>
                    {/* 项目头（拖拽把手） */}
                    <div className={`px-3.5 py-2.5 border-b border-gray-100 select-none ${isDraggableProject ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`} {...(dragHandleProps || {})}>
                      <div className="flex items-center gap-2 mb-1">
                        {group.project?.id
                          ? <ColorPicker color={pc} onPick={(c) => onUpdateProjectColor(group.project!.id, c)} />
                          : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pc }} />}
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

                    {/* 待办列表 */}
                    <div className="px-3.5 py-2 flex-1 overflow-y-auto min-h-0">
                      {!hasAnything ? (
                        <div className="text-center py-4 text-[11px] text-gray-300">暂无任务与待办</div>
                      ) : (
                        <>
                          {/* 正常任务区（仅显示未完成，已完成统一收到底部） */}
                          {projTasks.map(tk => renderTaskSection(tk.id, tk.name, active.filter(t => t.taskId === tk.id)))}

                          {/* 未分类区：默认折叠，置于任务列表最下方 */}
                          {looseTodos.length > 0 && (
                            <div className="mb-1.5">
                              <button onClick={() => toggleSpecial(looseKey)} className="w-full flex items-center gap-1.5 py-1">
                                <svg className={`w-3 h-3 text-gray-400 transition-transform ${looseExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-[11px] font-semibold text-gray-500 truncate">未分类</span>
                                <span className="text-[9px] text-gray-400 ml-auto tabular-nums flex-shrink-0">{looseActive.length}</span>
                              </button>
                              <TaskDropZone dropId={looseDrop}>
                                {isOver => (
                                  <div className={`pl-4 border-l ml-1.5 rounded-r transition-colors ${isOver ? "border-blue-400 bg-blue-50/60" : "border-gray-100"}`}>
                                    {looseExpanded ? (
                                      <>
                                        {looseActive.length === 0 ? (
                                          <div className="text-[10px] text-gray-300 py-1">{isOver ? "放到这里" : "暂无待办"}</div>
                                        ) : (
                                          looseActive.map(t => renderTodoRow(t))
                                        )}
                                        <QuickAddInput projectId={pid} taskId={null} onQuickAdd={onQuickAdd} />
                                      </>
                                    ) : (
                                      isOver ? <div className="text-[10px] text-blue-400 py-1.5">放到这里</div> : null
                                    )}
                                  </div>
                                )}
                              </TaskDropZone>
                            </div>
                          )}

                          {/* 已完成区：默认折叠，置于卡片最下方 */}
                          {done.length > 0 && (
                            <div className="mb-1 mt-1 pt-1.5 border-t border-gray-100">
                              <button onClick={() => toggleSpecial(doneKey)} className="w-full flex items-center gap-1.5 py-1">
                                <svg className={`w-3 h-3 text-gray-400 transition-transform ${doneExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-[11px] font-medium text-gray-400 truncate">已完成</span>
                                <span className="text-[9px] text-gray-400 ml-auto tabular-nums flex-shrink-0">{done.length}</span>
                              </button>
                              {doneExpanded && (
                                <div className="pl-4 border-l border-gray-100 ml-1.5">
                                  {done.map(t => renderTodoRow(t, true))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* 新建任务 */}
                      {group.project && (
                        addingTaskFor === key ? (
                          <div className="flex items-center gap-1.5 pt-2 mt-1 border-t border-gray-100">
                            <input
                              autoFocus
                              type="text"
                              value={newTaskName}
                              placeholder="新任务名称"
                              onChange={e => setNewTaskName(e.target.value)}
                              onKeyDown={async e => {
                                if (e.key === "Enter" && !e.nativeEvent.isComposing && newTaskName.trim()) {
                                  await onCreateTask(group.project!.id, newTaskName.trim());
                        setNewTaskName(""); setAddingTaskFor(null);
                                } else if (e.key === "Escape") { setNewTaskName(""); setAddingTaskFor(null); }
                              }}
                              className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-[11px] text-gray-700 focus:outline-none focus:border-blue-400"
                            />
                            <button
                              onClick={async () => { if (newTaskName.trim()) { await onCreateTask(group.project!.id, newTaskName.trim()); setNewTaskName(""); setAddingTaskFor(null); } }}
                              className="px-2 py-1 rounded-md text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-500"
                            >建</button>
                            <button onClick={() => { setNewTaskName(""); setAddingTaskFor(null); }} className="px-1.5 py-1 text-[11px] text-gray-400 hover:text-gray-600">取消</button>
                          </div>
                        ) : (
                          <button onClick={() => setAddingTaskFor(key)} className="mt-1.5 text-[11px] text-blue-500 hover:text-blue-600 flex items-center gap-1">
                     <span className="text-sm leading-none">+</span> 新建任务
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              };

              if (!isDraggableProject) {
                return <div key={key} className="w-full md:w-[calc(50%-6px)] xl:w-[calc(33.333%-8px)] h-[480px]">{cardInner()}</div>;
              }

              return (
                <SortableCard key={key} id={key}>
                  {(dhp, dragging) => cardInner(dhp, dragging)}
                </SortableCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}