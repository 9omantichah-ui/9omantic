"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Todo, Project, Task } from "@/lib/types";
import TodoItem from "./TodoItem";

interface ProjectWorkspaceProps {
  // null = 收件箱（无项目）视图
  project: Project | null;
  todos: Todo[]; // 已按当前视图过滤好的待办
  projects: Project[];
  tasks: Task[]; // 当前项目下的分类/阶段
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onAddToPlan: (todoId: string) => void;
  onQuickAdd: (projectId: string | null, title: string, taskId?: string | null) => void;
  onCreateTask: (projectId: string | null, name: string) => Promise<Task | null>;
}

export default function ProjectWorkspace({
  project, todos, tasks, projects, onToggle, onUpdate, onDelete, onAddToPlan, onQuickAdd, onCreateTask,
}: ProjectWorkspaceProps) {
  // 顶部操作栏内联表单状态
  const [addingTodo, setAddingTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoTaskId, setNewTodoTaskId] = useState<string>(""); // "" = 未分类
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [showDone, setShowDone] = useState(false);

  const isInbox = project === null;
  const projectId = project?.id ?? null;

  // 当前项目的分类（收件箱视图不展示分类分组）
  const projectTasks = isInbox ? [] : tasks.filter(t => t.projectId === projectId);

  // 分离已完成 / 未完成
  const pendingTodos = todos.filter(t => !t.completed);
  const doneTodos = todos.filter(t => t.completed);

  // 按分类分组（仅未完成）
  const byTask = new Map<string | null, Todo[]>();
  pendingTodos.forEach(t => {
    const key = t.taskId ?? null;
    if (!byTask.has(key)) byTask.set(key, []);
    byTask.get(key)!.push(t);
  });

  const submitCreateTask = async () => {
    const name = newTaskName.trim();
    if (!name) { setAddingTask(false); return; }
    await onCreateTask(projectId, name);
    setNewTaskName("");
    setAddingTask(false);
  };

  const submitAddTodo = () => {
    const title = newTodoTitle.trim();
    if (!title) { setAddingTodo(false); return; }
    onQuickAdd(projectId, title, newTodoTaskId || null);
    setNewTodoTitle("");
  };

  // 渲染一组待办
  const renderTodoList = (list: Todo[], droppableId: string) => (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.droppableProps}
          className={`py-1 space-y-0.5 min-h-[2rem] rounded-lg transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : ""}`}>
          {list.length === 0 && !snapshot.isDraggingOver && (
            <div className="py-2 pl-2 text-[12px] text-gray-300">暂无待办</div>
          )}
          {list.map((todo, i) => (
            <Draggable key={todo.id} draggableId={todo.id} index={i}>
              {(prov, snap) => (
                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                  className={`cursor-grab active:cursor-grabbing ${snap.isDragging ? "dragging-card" : ""}`}>
                  <TodoItem todo={todo} projects={projects} compact hideProject
                    onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} onAddToPlan={onAddToPlan} />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  // 轻量分类标题栏 + 列表行
  const renderSection = (name: string, list: Todo[], droppableId: string, isTask = true) => {
    const accent = project?.color ?? "#94a3b8";
    const done = list.filter(t => t.completed).length;
    return (
      <div className="mb-3">
        {isTask ? (
          <div
            className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 mb-1.5 rounded-md border-l-[3px] bg-gray-50/70"
            style={{ borderLeftColor: accent }}
          >
            <span className="text-[13px] font-semibold text-gray-800 truncate">{name}</span>
            <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0">
              {done > 0 ? `${done}/${list.length}` : list.length}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-1 pb-1">
            <span className="text-[12px] font-medium text-gray-400">{name}</span>
            <span className="text-[11px] text-gray-300">{list.length}</span>
          </div>
        )}
        <div className={isTask ? "pl-2.5" : ""}>
          {renderTodoList(list, droppableId)}
        </div>
      </div>
    );
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
      {/* 标题区 */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          {project && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />}
          <h1 className="text-lg font-bold text-gray-900 truncate">{isInbox ? "收件箱" : project!.name}</h1>
        </div>
        <p className="text-[12px] text-gray-400 mt-1">
          {isInbox ? "暂未归属项目的待办，集中在这里快速整理" :`${pendingTodos.length} 项待办进行中`}
        </p>

        {/* 顶部固定操作栏 */}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => { setAddingTodo(v => !v); setAddingTask(false); }}
            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[12px] font-medium hover:bg-blue-100 transition-colors">
            ＋ 新增待办
          </button>
          {!isInbox && (
            <button onClick={() => { setAddingTask(v => !v); setAddingTodo(false); }}
              className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-[12px] font-medium hover:bg-gray-100 transition-colors">
              ＋ 新增分类 / 阶段
            </button>
          )}
        </div>

        {/* 新增待办内联表单 */}
        {addingTodo && (
          <div className="flex items-center gap-2 mt-2">
            <input
              autoFocus
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitAddTodo(); if (e.key === "Escape") { setAddingTodo(false); setNewTodoTitle(""); } }}
              placeholder="待办内容…"
              className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"
            />
            {!isInbox && (
              <select value={newTodoTaskId} onChange={e => setNewTodoTaskId(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:border-blue-400">
                <option value="">未分类</option>
                {projectTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <button onClick={submitAddTodo} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-500">添加</button>
          </div>
        )}

        {/* 新增分类内联表单 */}
        {addingTask && !isInbox && (
          <div className="flex items-center gap-2 mt-2">
            <input
              autoFocus
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitCreateTask(); if (e.key === "Escape") { setAddingTask(false); setNewTaskName(""); } }}
              placeholder="分类 / 阶段名称"
              className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"
            />
            <button onClick={submitCreateTask} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-500">确定</button>
            <button onClick={() => { setAddingTask(false); setNewTaskName(""); }} className="text-[12px] text-gray-400">取消</button>
          </div>
        )}
      </div>

      {/* 待办列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isInbox ? (
          renderTodoList(byTask.get(null) ?? [], "ws-inbox")
        ) : (
          <>
            {/* 各分类分组（仅未完成） */}
            {projectTasks.map(task => renderSection(task.name, byTask.get(task.id) ?? [], `ws-task-${task.id}`))}
            {/* 未分类（仅未完成） */}
            {renderSection("未分类", byTask.get(null) ?? [], "ws-task-none", false)}
          </>
        )}

        {/* 统一已完成折叠区 */}
        {doneTodos.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <button onClick={() => setShowDone(v => !v)}
              className="flex items-center gap-1.5 px-1 py-1 text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
              <svg className={`w-3 h-3 transition-transform ${showDone ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              已完成（{doneTodos.length}）
            </button>
            {showDone && (
              <div className="py-1 space-y-0.5">
                {doneTodos.map(todo => (
                  <TodoItem key={todo.id} todo={todo} projects={projects} compact
                    onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}