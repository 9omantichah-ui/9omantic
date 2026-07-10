"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
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

export default function ProjectOverview({ todos, projects, tasks, onToggle, onQuickAdd, onCreateTask, onReorderProjects }: ProjectOverviewProps) {
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");

  const toggleTaskCollapse = (taskKey: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      next.has(taskKey) ? next.delete(taskKey) : next.add(taskKey);
      return next;
    });
  };

  // 扁平聚合：所有项目平铺（不再按 ProjectGroup 分组），另加一个"未分类"占位承载无项目的散待办
  const getProjectItems = () => {
    const projectTodosMap: Record<string, Todo[]> = { _none: [] };
    projects.forEach(p => { projectTodosMap[p.id] = []; });
    todos.forEach(t => { const k = t.projectId || "_none"; if (projectTodosMap[k]) projectTodosMap[k].push(t); else projectTodosMap._none.push(t); });

    const items: { project: Project | null; todos: Todo[] }[] = [];
    // 按项目原有 order 平铺全部项目
    [...projects].sort((a, b) => a.order - b.order).forEach(p => {
      items.push({ project: p, todos: projectTodosMap[p.id] || [] });
    });
    // 无项目归属的散待办 → "未分类" 占位卡片（置于末尾）
    if (projectTodosMap._none.length > 0) {
      items.push({ project: null, todos: projectTodosMap._none });
    }
    return items;
  };

  const projectItems = getProjectItems();

  // 拖拽处理：全局单一列表内重排项目卡片（保持各自原 groupId 不变）
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "PROJECT") {
      if (source.index === destination.index) return;
      // 仅有 project 的卡片参与排序（排除 "未分类" _none 占位）
      const draggableItems = projectItems.filter(it => it.project);
      const reordered = [...draggableItems];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      const items = reordered.map((it, idx) => ({ id: it.project!.id, order: idx, groupId: it.project!.groupId }));
      onReorderProjects(items);
      return;
    }
  };

  const totalTodos = projectItems.reduce((acc, item) => acc + item.todos.length, 0);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-2.5">
        <h2 className="text-sm font-bold text-gray-800">各项目情况概览</h2>
        <span className="text-[10px] text-gray-400">({projects.length} 个项目 · {totalTodos} 项待办)</span>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        {(() => {
          // 计算每个可拖拽项目卡片在 draggable 列表中的索引
          let projectDragIndex = -1;
          return (
            <Droppable droppableId="all-projects" type="PROJECT">
              {(dropProvided) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className="flex flex-wrap items-start gap-3"
                >
                  {projectItems.map(group => {
                          const key = group.project?.id || "_none";
                          const gt = group.todos;
                          const active = gt.filter(t => !t.completed);
                          const done = gt.filter(t => t.completed);
                          const total = gt.length;
                          const doneCount = done.length;
                          const pc = group.project?.color || "#94a3b8";
                          const isDraggableProject = !!group.project;
                          if (isDraggableProject) projectDragIndex += 1;
                          const dragIndex = projectDragIndex;

                          const cardInner = (dragHandleProps?: Record<string, unknown>, isDragging?: boolean) => (
                            <div className={`bg-white/90 rounded-xl border shadow-sm overflow-hidden flex flex-col h-[480px] ${isDragging ? "border-blue-300 shadow-lg" : "border-gray-200/80"}`}>
                              {/* 项目头（拖拽把手） */}
                              <div className={`px-3.5 py-2.5 border-b border-gray-100 select-none ${isDraggableProject ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`} {...(dragHandleProps || {})}>
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

                              {/* 待办列表（按任务分组） */}
                              <div className="px-3.5 py-2 flex-1 overflow-y-auto min-h-0">
                                {(() => {
                                  const pid = group.project?.id || null;
                                  // 该项目下的任务（按 order）
                                  const projTasks = tasks
                                    .filter(tk => (tk.projectId || null) === pid)
                                    .sort((a, b) => a.order - b.order);
                                  // 未挂任务的散待办
                                  const looseActive = active.filter(t => !t.taskId);
                                  const looseDone = done.filter(t => !t.taskId);

                                  const renderTodoRow = (todo: Todo, dim = false) => (
                                    <div key={todo.id} className={`flex items-start gap-2 py-1 ${dim ? "opacity-50" : ""}`}>
                                      <button
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
                                  );

                                  const renderTaskSection = (taskId: string, name: string, sectionTodos: Todo[], color: string) => {
                                    const tKey = `${key}::${taskId}`;
                                    const isCol = collapsedTasks.has(tKey);
                                    const tActive = sectionTodos.filter(t => !t.completed);
                                    const tDone = sectionTodos.filter(t => t.completed);
                                    return (
                                      <div key={taskId} className="mb-1.5">
                                        <button onClick={() => toggleTaskCollapse(tKey)} className="w-full flex items-center gap-1.5 py-1 group/task">
                                          <svg className={`w-3 h-3 text-gray-400 transition-transform ${isCol ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                          <span className="text-[11px] font-semibold text-gray-600 truncate">{name}</span>
                                          <span className="text-[9px] text-gray-400 ml-auto tabular-nums flex-shrink-0">{tDone.length}/{sectionTodos.length}</span>
                                        </button>
                                        {!isCol && (
                                          <div className="pl-4 border-l border-gray-100 ml-1.5">
                                            {sectionTodos.length === 0 ? (
                                              <div className="text-[10px] text-gray-300 py-1">暂无待办</div>
                                            ) : (
                                              <>
                                                {tActive.map(t => renderTodoRow(t))}
                                             {tDone.map(t => renderTodoRow(t, true))}
                                              </>
                                            )}
                                            <QuickAddInput projectId={pid} taskId={taskId} onQuickAdd={onQuickAdd} />
                               </div>
                                        )}
                                      </div>
                                    );
                                  };

                                  const hasAnything = projTasks.length > 0 || looseActive.length > 0 || looseDone.length > 0;
                                  if (!hasAnything) {
                                    return <div className="text-center py-4 text-[11px] text-gray-300">暂无任务与待办</div>;
                                  }

                                  return (
                                    <>
                                      {projTasks.map(tk => {
                                        const secTodos = gt.filter(t => t.taskId === tk.id);
                                        return renderTaskSection(tk.id, tk.name, secTodos, pc);
                                      })}
                                      {(looseActive.length > 0 || looseDone.length > 0) &&
                                        renderTaskSection("__loose__", "未分类", [...looseActive, ...looseDone], pc)}
                                    </>
                                  );
                                })()}

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

                          if (!isDraggableProject) {
                            return <div key={key} className="w-full md:w-[calc(50%-6px)] xl:w-[calc(33.333%-8px)] h-[480px]">{cardInner()}</div>;
                      }

                          return (
                            <Draggable key={key} draggableId={`project-${key}`} index={dragIndex}>
                              {(dp, snap) => (
                                <div
                                  ref={dp.innerRef}
                                  {...dp.draggableProps}
                                  className={`w-full md:w-[calc(50%-6px)] xl:w-[calc(33.333%-8px)] h-[480px] ${snap.isDragging ? "z-50" : ""}`}
                                >
                                  {cardInner(dp.dragHandleProps as unknown as Record<string, unknown>, snap.isDragging)}
                                </div>
                              )}
                            </Draggable>
                          );
                  })}
                  {/* flex-wrap 布局下隐藏 placeholder，避免拖拽时占位挤动其他卡片 */}
                  <span style={{ display: "none" }}>{dropProvided.placeholder}</span>
                </div>
              )}
            </Droppable>
          );
        })()}
      </DragDropContext>
    </section>
  );
}