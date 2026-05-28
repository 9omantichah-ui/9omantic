"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Todo, Project } from "@/lib/types";
import TodoItem from "@/components/TodoItem";
import AuthForm from "@/components/AuthForm";

const ZONES = [
  { id: 1, name: "优先做", accent: "#ef4444", empty: "+ 放到这里" },
  { id: 2, name: "稍后做", accent: "#f97316", empty: "+ 放到这里" },
  { id: 3, name: "晚点做", accent: "#3b82f6", empty: "+ 放到这里" },
];

function ProgressBar({ total, done, color }: { total: number; done: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const barColor = pct >= 100 ? "#10b981" : pct >= 70 ? color : pct >= 30 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <span className="text-[10px] tabular-nums text-gray-400 whitespace-nowrap">{done}/{total}</span>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; nickname: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createProjectId, setCreateProjectId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.user) setUser(data.user);
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  const fetchTodos = useCallback(async () => {
    if (!user) return;
    try { setTodos(await (await fetch("/api/todos")).json()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [user]);
  const fetchProjects = async () => {
    try { const data = await (await fetch("/api/projects")).json(); if (Array.isArray(data)) setProjects(data); } catch (e) { console.error(e); }
  };
  useEffect(() => { if (user) fetchProjects(); }, [user]);
  useEffect(() => { if (user) fetchTodos(); }, [fetchTodos, user]);

  const createTodo = async (title: string, desc: string, projectId: string, zone = 0) => {
    try {
      const r = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc || undefined, projectId: projectId || undefined, zone }) });
      if (r.ok) { const n = await r.json(); setTodos(p => [...p, n]); }
    } catch (e) { console.error(e); }
  };
  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    await createTodo(createTitle.trim(), createDesc.trim(), createProjectId);
    setCreateTitle(""); setCreateDesc("");
  };
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const cs = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444"];
    try {
      const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim(), color: cs[projects.length % cs.length] }) });
      if (r.ok) { setNewProjectName(""); setShowProjectForm(false); fetchProjects(); }
    } catch (e) { console.error(e); }
  };
  const handleToggle = async (id: string, c: boolean) => {
    try { const r = await fetch(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: c }) });
      if (r.ok) { const u = await r.json(); setTodos(p => p.map(t => t.id === id ? u : t)); }
    } catch (e) { console.error(e); }
  };
  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    try { const r = await fetch(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (r.ok) { const u = await r.json(); setTodos(p => p.map(t => t.id === id ? u : t)); }
    } catch (e) { console.error(e); }
  };
  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/todos/${id}`, { method: "DELETE" }); if (r.ok) setTodos(p => p.filter(t => t.id !== id)); }
    catch (e) { console.error(e); }
  };
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sZ = parseInt(result.source.droppableId), dZ = parseInt(result.destination.droppableId);
    const sI = result.source.index, dI = result.destination.index;
    if (sZ === dZ && sI === dI) return;
    const g: Record<number, Todo[]> = { 0: [], 1: [], 2: [], 3: [] };
    todos.forEach(t => { if (g[t.zone] !== undefined) g[t.zone].push(t); });
    const [m] = g[sZ].splice(sI, 1); m.zone = dZ; g[dZ].splice(dI, 0, m);
    const upd: Todo[] = [], items: { id: string; zone: number; order: number }[] = [];
    for (const z of [0,1,2,3]) g[z].forEach((t, i) => { upd.push({ ...t, zone: z, order: i }); items.push({ id: t.id, zone: z, order: i }); });
    setTodos(upd);
    try { await fetch("/api/todos/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }); }
    catch (e) { console.error(e); }
  };
  const projectGroups = () => {
    const g: Record<string, { project: Project | null; todos: Todo[] }> = { _none: { project: null, todos: [] } };
    projects.forEach(p => { g[p.id] = { project: p, todos: [] }; });
    todos.forEach(t => { const k = t.projectId || "_none"; if (g[k]) g[k].todos.push(t); else g._none.todos.push(t); });
    return Object.values(g);
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center"><span className="text-gray-400 text-sm">加载中...</span></div>;
  if (!user) return <AuthForm onSuccess={(u) => { setUser(u); setLoading(true); }} />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-gray-400 text-sm">加载中...</span></div>;

  const poolTodos = todos.filter(t => t.zone === 0);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
    <main className="min-h-screen py-5 px-4 lg:px-8 bg-slate-50/50">
      <div className="max-w-[1400px] mx-auto">

        {/* ═ 顶部 ═ */}
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">待办整理</h1>
            <p className="text-sm text-gray-400 mt-0.5">随手记录，灵活排序，高效执行</p>
            <p className="text-xs text-gray-500 mt-1.5">{todos.filter(t => !t.completed).length} 进行中 · {todos.filter(t => t.completed).length} 已完成</p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-sm text-gray-500">{user.nickname}</span>
            <button onClick={async () => { await fetch("/api/auth/me", { method: "DELETE" }); setUser(null); setTodos([]); setProjects([]); }}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded border border-gray-200 transition-colors">退出</button>
          </div>
        </header>

        {/* ═ 输入区 ═ */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="快速记录" value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreate(); }}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400 transition-all" />
            <button onClick={handleCreate}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${createTitle.trim() ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              disabled={!createTitle.trim()}>添加</button>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setCreateProjectId("")}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${createProjectId === "" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>未分类</button>
            {projects.map(p => (
              <button key={p.id} onClick={() => setCreateProjectId(p.id)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium text-white transition-all ${createProjectId === p.id ? "ring-2 ring-offset-1 shadow-sm" : "opacity-60 hover:opacity-100"}`}
                style={{ backgroundColor: p.color }}>{p.name}</button>
            ))}
            {showProjectForm ? (
              <span className="inline-flex items-center gap-1">
                <input type="text" placeholder="项目名" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateProject()}
                  className="px-2 py-0.5 border border-gray-200 rounded text-[11px] w-20 focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus />
                <button onClick={handleCreateProject} className="text-[11px] text-blue-600 font-medium">确定</button>
                <button onClick={() => { setShowProjectForm(false); setNewProjectName(""); }} className="text-[11px] text-gray-400">取消</button>
              </span>
            ) : (
              <button onClick={() => setShowProjectForm(true)} className="px-2 py-0.5 rounded-full text-[11px] border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500">+ 新建项目</button>
            )}
          </div>
          {/* 备注 */}
          <textarea placeholder="备注（可选）" value={createDesc} onChange={e => setCreateDesc(e.target.value)} rows={1}
            className="mt-2 w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 resize-none placeholder:text-gray-400 transition-all" />
        </div>

        {/* ═ 任务工作区 ═ */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">

          {/* 左侧：待分配 */}
          <div className="w-full lg:w-[28%] flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">待分配</h2>
                <span className="text-[10px] text-gray-400">{poolTodos.length} 项</span>
              </div>
              <div className="p-2.5 flex-1 overflow-y-auto max-h-[55vh]">
                <Droppable droppableId="0">
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`space-y-1 min-h-[3rem] rounded-lg p-1 transition-all ${snapshot.isDraggingOver ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}>
                      {poolTodos.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-8 text-xs text-gray-300">暂无待分配</div>
                      )}
                      {poolTodos.map((todo, i) => (
                        <Draggable key={todo.id} draggableId={todo.id} index={i}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              className={`cursor-grab active:cursor-grabbing ${snap.isDragging ? "shadow-lg scale-[1.02] opacity-90 rotate-[0.3deg]" : ""}`}>
                              <TodoItem todo={todo} projects={projects} compact
                                onToggle={handleToggle} onUpdate={handleUpdate} onDelete={handleDelete} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </div>

          {/* 右侧：我的任务 */}
          <div className="w-full lg:flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">我的任务</h2>
              </div>
              <div className="p-3 flex-1 overflow-y-auto max-h-[55vh] space-y-3">
                {ZONES.map(zone => {
                  const zt = todos.filter(t => t.zone === zone.id);
                  const total = zt.length, done = zt.filter(t => t.completed).length;
                  return (
             <div key={zone.id}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zone.accent }} />
                        <span className="text-xs font-medium text-gray-600">{zone.name}</span>
                        {total > 0 && <div className="flex-1 max-w-[120px]"><ProgressBar total={total} done={done} color={zone.accent} /></div>}
                      </div>
                      <Droppable droppableId={String(zone.id)}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}
                            className={`space-y-1 min-h-[2.5rem] rounded-lg p-1.5 transition-all ${snapshot.isDraggingOver ? "bg-blue-50 ring-1 ring-blue-200" : "bg-gray-50/50"}`}>
                            {zt.length === 0 && !snapshot.isDraggingOver && (
                              <div className="text-center py-3 text-[11px] text-gray-300">{zone.empty}</div>
                            )}
                            {zt.map((todo, i) => (
                              <Draggable key={todo.id} draggableId={todo.id} index={i}>
                                {(prov, snap) => (
                                  <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                    className={`cursor-grab active:cursor-grabbing ${snap.isDragging ? "shadow-lg scale-[1.02] opacity-90 rotate-[0.3deg]" : ""}`}>
                                    <TodoItem todo={todo} projects={projects} compact
                                      onToggle={handleToggle} onUpdate={handleUpdate} onDelete={handleDelete} />
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
            </div>
          </div>
        </div>

        {/* ═ 底部：项目 ═ */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">项目</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {projectGroups().map(group => {
              const gt = group.todos, total = gt.length, done = gt.filter(t => t.completed).length;
              const pc = group.project?.color || "#94a3b8";
              const groupKey = group.project?.id || "_none";
              const isExpanded = expandedProject === groupKey;
              return (
                <div key={groupKey} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow transition-shadow overflow-hidden">
                  <div className="px-3 py-2.5 cursor-pointer" onClick={() => setExpandedProject(isExpanded ? null : groupKey)}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pc }} />
                      <span className="text-xs font-semibold text-gray-800 truncate">{group.project?.name || "未分类"}</span>
                    </div>
                    <ProgressBar total={total} done={done} color={pc} />
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-2.5 border-t border-gray-100 pt-2 space-y-1">
                      {gt.slice(0, 8).map(todo => (
                        <div key={todo.id} className="flex items-center gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); handleToggle(todo.id, !todo.completed); }}
                            className={`w-3 h-3 rounded-full border flex-shrink-0 ${todo.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`} />
                          <span className={`text-[11px] truncate ${todo.completed ? "text-gray-400 line-through" : "text-gray-600"}`}>{todo.title}</span>
                        </div>
                      ))}
                      {gt.length > 8 && <p className="text-[10px] text-gray-400">还有 {gt.length - 8} 项</p>}
                      {/* 内联添加 */}
                      <div className="flex items-center gap-1 mt-1">
                        <input type="text" placeholder="添加任务" value={expandedProject === groupKey ? inlineTitle : ""}
                          onChange={e => setInlineTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing && inlineTitle.trim()) { createTodo(inlineTitle.trim(), "", group.project?.id || ""); setInlineTitle(""); } }}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-[11px] focus:outline-none focus:border-blue-400" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </main>
    </DragDropContext>
  );
}