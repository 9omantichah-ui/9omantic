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

// 段内快速添加输入框
function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (title: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => { const t = val.trim(); if (!t) return; onAdd(t); setVal(""); };
  return (
    <div className="flex gap-2 px-2.5 py-2 border-t border-dashed border-gray-100">
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submit(); }}
        placeholder={placeholder}
        className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-transparent rounded-lg text-[13px] focus:outline-none focus:border-blue-300 focus:bg-white transition-all placeholder:text-gray-400"
      />
      <button onClick={submit} className="px-3 rounded-lg bg-blue-50 text-blue-600 text-[13px] font-medium hover:bg-blue-100 transition-colors">添加</button>
    </div>
  );
}

export default function ProjectWorkspace({
  project, todos, tasks, projects, onToggle, onUpdate, onDelete, onAddToPlan, onQuickAdd, onCreateTask,
}: ProjectWorkspaceProps) {
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");

  const isInbox = project === null;
  const projectId = project?.id ?? null;

  // 当前项目的分类（收件箱视图不展示分类分组
  const projectTasks = isInbox ? [] : tasks.filter(t => t.projectId === projectId);

  // 按分类分组：有分类的归入对应分类，无分类归入「未分类」
  const byTask = new Map<string | null, Todo[]>();
  todos.forEach(t => {
    const key = t.taskId ?? null;
    if (!byTask.has(key)) byTask.set(key, []);
    byTask.get(key)!.push(t);
  });

  const submitCreateTask = async () => {
    const name = newTaskName.trim();
    if (!name) { setCreatingTask(false); return; }
    await onCreateTask(projectId, name);
    setNewTaskName("");
    setCreatingTask(false);
  };

  // 渲染一组待办
  const renderTodoList = (list: Todo[], droppableId: string) => (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.droppableProps}
          className={`p-1.5 space-y-1 min-h-[2.5rem] rounded-lg transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : ""}`}>
          {list.length === 0 && !snapshot.isDraggingOver && (
            <div className="text-center py-3 text-[12px] text-gray-300">暂无待办</div>
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

  const pending = todos.filter(t => !t.completed).length;
  const done = todos.filter(t => t.completed).length;

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
      {/* 标题区 */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          {project && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />}
          <h1 className="text-lg font-bold text-gray-900 truncate">{isInbox ? "收件箱" : project!.name}</h1>
        </div>
        <p className="text-[12px] text-gray-400 mt-1">
          {isInbox ? "暂未归属项目的待办，集中在这里快速整理" : `${pending} 项待办 · ${done} 项已完成`}
        </p>
      </div>

      {/* 待办列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isInbox ? (
          // 收件箱：单块列表 + 快速添加
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {renderTodoList(byTask.get(null) ?? [], "ws-inbox")}
            <QuickAdd placeholder="随手记录一件待办…" onAdd={title => onQuickAdd(null, title, null)} />
          </div>
        ) : (
          <>
            {/* 各分类分组 */}
            {projectTasks.map(task => (
              <div key={task.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50/60 border-b border-gray-100">
                  <span className="text-[13px] font-semibold text-gray-700">{task.name}</span>
                  <span className="text-[11px] text-gray-400">{(byTask.get(task.id) ?? []).length} 项</span>
                </div>
                {renderTodoList(byTask.get(task.id) ?? [], `ws-task-${task.id}`)}
                <QuickAdd placeholder={`在「${task.name}」中添加待办`} onAdd={title => onQuickAdd(projectId, title, task.id)} />
              </div>
            ))}

            {/* 未分类待办（无 taskId） */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50/60 border-b border-gray-100">
                <span className="text-[13px] font-semibold text-gray-700">未分类</span>
                <span className="text-[11px] text-gray-400">{(byTask.get(null) ?? []).length} 项</span>
              </div>
              {renderTodoList(byTask.get(null) ?? [], "ws-task-none")}
              <QuickAdd placeholder="添加待办到当前项目" onAdd={title => onQuickAdd(projectId, title, null)} />
            </div>

            {/* 新建分类 */}
            {creatingTask ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitCreateTask(); if (e.key === "Escape") { setCreatingTask(false); setNewTaskName(""); } }}
                  placeholder="分类 / 阶段名称"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"
                />
                <button onClick={submitCreateTask} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-[13px] font-medium">确定</button>
                <button onClick={() => { setCreatingTask(false); setNewTaskName(""); }} className="text-[12px] text-gray-400">取消</button>
              </div>
            ) : (
              <button onClick={() => setCreatingTask(true)}
                className="w-full py-2.5 text-[13px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-dashed border-gray-200 transition-colors">
                ＋ 新建分类 / 阶段
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}