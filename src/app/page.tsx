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

const ZONE_NAME: Record<number, string> = { 0: "待分配", 1: "优先做", 2: "稍后做", 3: "晚点做" };

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
    <main className="min-h-screen py-5 px-4 lg:px-8 bg-gray-50">
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

        {/* ═ 快速记录 ═ */}
        <section className="mb-6 bg-gray-900 rounded-xl px-5 py-4 shadow-lg">
          <h2 className="text-sm font-semibold text-gray-200 mb-3">快速记录</h2>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="快速记录" value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreate(); }}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-gray-500 transition-all" />
            <button onClick={handleCreate}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${createTitle.trim() ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-95" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
              disabled={!createTitle.trim()}>添加</button>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setCreateProjectId("")}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${createProjectId === "" ? "bg-white text-gray-900" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>未分类</button>
            {projects.map(p => (
              <button key={p.id} onClick={() => setCreateProjectId(p.id)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium text-white transition-all ${createProjectId === p.id ? "ring-2 ring-white/50 shadow-sm" : "opacity-60 hover:opacity-100"}`}
                style={{ backgroundColor: p.color }}>{p.name}</button>
            ))}
            {showProjectForm ? (
              <span className="inline-flex items-center gap-1">
                <input type="text" placeholder="项目名" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateProject()}
                  className="px-2 py-0.5 bg-gray-800 border border-gray-600 rounded text-[11px] text-white w-20 focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                <button onClick={handleCreateProject} className="text-[11px] text-blue-400 font-medium">确定</button>
                <button onClick={() => { setShowProjectForm(false); setNewProjectName(""); }} className="text-[11px] text-gray-500">取消</button>
              </span>
            ) : (
              <button onClick={() => setShowProjectForm(true)} className="px-2 py-0.5 rounded-full text-[11px] border border-dashed border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-300">+ 新建项目</button>
            )}
          </div>
          <textarea placeholder="备注（可选）" value={createDesc} onChange={e => setCreateDesc(e.target.value)} rows={1}
            className="mt-2 w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-600 transition-all" />
        </section>

        {/* ═ 全部任务 ═ */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 mb-3">全部任务</h2>
          <div className="flex flex-col lg:flex-row gap-4">

            {/* 左侧：待分配 */}
            <div className="w-full lg:w-[28%] flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">待分配</span>
                  <span className="text-[10px] text-gray-400">{poolTodos.length} 项</span>
                </div>
                <div className="p-2 flex-1 overflow-y-auto max-h-[50vh]">
                  <Droppable droppableId="0">
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={`space-y-1 min-h-[3rem] rounded-lg p-1 transition-all ${snapshot.isDraggingOver ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}>
                        {poolTodos.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-6 text-xs text-gray-300">暂无待分配</div>
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

            {/* 右侧：已排序 */}
            <div className="w-full lg:flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-600">已排序</span>
                </div>
                <div className="p-3 flex-1 overflow-y-auto max-h-[50vh] space-y-3">
                  {ZONES.map(zone => {
                    const zt = todos.filter(t => t.zone === zone.id);
                    const total = zt.length, done = zt.filter(t => t.completed).length;
                    return (
                      <div key={zone.id}>
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zone.accent }} />
                          <span className="text-[11px] font-medium text-gray-600">{zone.name}</span>
                          {total > 0 && <div className="flex-1 max-w-[100px]"><ProgressBar total={total} done={done} color={zone.accent} /></div>}
                        </div>
                        <Droppable droppableId={String(zone.id)}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}
                              className={`space-y-1 min-h-[2.5rem] rounded-lg p-1.5 transition-all ${snapshot.isDraggingOver ? "bg-blue-50 ring-1 ring-blue-200" : "bg-gray-50/60"}`}>
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
        </section>

        {/* ═ 项目 ═ */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">项目</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectGroups().map(group => {
              const gt = group.todos, total = gt.length, done = gt.filter(t => t.completed).length;
              const pc = group.project?.color || "#94a3b8";
              const groupKey = group.project?.id || "_none";
              return (
                <div key={groupKey} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pc }} />
                      <span className="text-xs font-semibold text-gray-800">{group.project?.name || "未分类"}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{done}/{total} 完成</span>
                    </div>
                    <ProgressBar total={total} done={done} color={pc} />
                  </div>
                  <div className="px-3.5 py-2 space-y-1 max-h-[200px] overflow-y-auto">
                    {gt.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-gray-300">暂无任务</div>
                    ) : gt.map(todo => (
                      <div key={todo.id} className="flex items-start gap-1.5 py-0.5">
                        <button onClick={() => handleToggle(todo.id, !todo.completed)}
                          className={`mt-0.5 w-3 h-3 rounded-full border flex-shrink-0 ${todo.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] truncate ${todo.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>{todo.title}</span>
                            <span className="text-[9px] px-1 py-[0.5px] rounded bg-gray-100 text-gray-400 flex-shrink-0">{ZONE_NAME[todo.zone] || "待分配"}</span>
                          </div>
                          {todo.description && (
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{todo.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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