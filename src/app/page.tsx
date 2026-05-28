"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Todo, Project } from "@/lib/types";
import TodoItem from "@/components/TodoItem";
import AuthForm from "@/components/AuthForm";
import Image from "next/image";

const ZONES = [
  { id: 1, name: "优先做", accent: "#ef4444", empty: "把最紧急的待办拖到这里" },
  { id: 2, name: "稍后做", accent: "#f97316", empty: "不急但重要的待办放这里" },
  { id: 3, name: "晚点做", accent: "#3b82f6", empty: "有空再处理的待办放这里" },
];
const ZONE_NAME: Record<number, string> = { 0: "未整理", 1: "优先做", 2: "稍后做", 3: "晚点做" };

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
  const [showDesc, setShowDesc] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    try {
      const r = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: createTitle.trim(), description: createDesc.trim() || undefined, projectId: createProjectId || undefined, zone: 0 }) });
      if (r.ok) { const n = await r.json(); setTodos(p => [...p, n]); }
    } catch (e) { console.error(e); }
    setCreateTitle(""); setCreateDesc(""); setShowDesc(false);
    inputRef.current?.focus();
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
    <main className="min-h-screen py-6 px-4 lg:px-8 bg-[#f5f6f8]">
      <div className="max-w-[1100px] mx-auto">

        {/* ── 品牌区 ── */}
        <header className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Image src="/logo.svg" alt="ActionFlow" width={44} height={44} className="flex-shrink-0" />
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">ActionFlow</h1>
                <span className="text-sm font-medium text-gray-400">行动秩序</span>
              </div>
              <p className="text-[13px] font-semibold text-gray-600 mt-0.5">随手记录，灵活规划，高效执行</p>
              <p className="text-[11px] text-gray-400 mt-0.5">把待办记下来，再安排它怎么做</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-gray-400 tabular-nums">{todos.filter(t => !t.completed).length} 进行中 · {todos.filter(t => t.completed).length} 已完成</p>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <span className="text-xs text-gray-400">{user.nickname}</span>
              <button onClick={async () => { await fetch("/api/auth/me", { method: "DELETE" }); setUser(null); setTodos([]); setProjects([]); }}
                className="text-[11px] text-gray-400 hover:text-red-500 px-2 py-0.5 rounded border border-gray-200 transition-colors">退出</button>
            </div>
          </div>
        </header>

        {/* ── 添加一个「待办」 ── */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-2">添加一个「待办」</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3.5">
            <div className="flex items-center gap-3">
              <input ref={inputRef} type="text" placeholder="写下一个待办..." value={createTitle}
                onChange={e => setCreateTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreate(); }}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400 transition-all" />
              <button onClick={handleCreate}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${createTitle.trim() ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.97]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                disabled={!createTitle.trim()}>添加待办</button>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setCreateProjectId("")}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${createProjectId === "" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>未分类</button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setCreateProjectId(p.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white transition-all ${createProjectId === p.id ? "ring-2 ring-offset-1 ring-gray-300" : "opacity-55 hover:opacity-85"}`}
                  style={{ backgroundColor: p.color }}>{p.name}</button>
              ))}
              {showProjectForm ? (
                <span className="inline-flex items-center gap-1">
                  <input type="text" placeholder="项目名" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateProject()}
                    className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-700 w-16 focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus />
                  <button onClick={handleCreateProject} className="text-[10px] text-blue-600 font-medium">确定</button>
                  <button onClick={() => { setShowProjectForm(false); setNewProjectName(""); }} className="text-[10px] text-gray-400">取消</button>
                </span>
              ) : (
                <button onClick={() => setShowProjectForm(true)} className="px-1.5 py-0.5 rounded-full text-[10px] border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500">+ 新建项目</button>
              )}
              <button onClick={() => setShowDesc(!showDesc)}
                className={`px-1.5 py-0.5 rounded-full text-[10px] transition-all ${showDesc ? "bg-gray-200 text-gray-600" : "text-gray-400 hover:text-gray-500"}`}>
                {showDesc ? "收起备注" : "+ 备注"}
              </button>
            </div>
            {showDesc && (
              <textarea placeholder="备注（可选）" value={createDesc} onChange={e => setCreateDesc(e.target.value)} rows={2}
                className="mt-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-blue-400 resize-none placeholder:text-gray-400 transition-all" />
            )}
          </div>
        </section>

        {/* ── 未整理的「待办」 ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-800">未整理的「待办」<span className="ml-2 text-[11px] font-normal text-gray-400">{poolTodos.length} 项</span></h2>
            {poolTodos.length >= 6 && (
              <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">未整理待办有点多，先挑几个安排一下。</span>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
           <Droppable droppableId="0">
              {(provided, snapshot) =>(
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={`space-y-1.5 min-h-[3rem] rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : ""}`}>
                  {poolTodos.length === 0 && !snapshot.isDraggingOver && (
                    <div className="text-center py-5 text-sm text-gray-300">暂无未整理待办</div>
                  )}
                  {poolTodos.map((todo, i) => (
                    <Draggable key={todo.id} draggableId={todo.id} index={i}>
                      {(prov, snap) => (
                        <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                          className={`cursor-grab active:cursor-grabbing ${snap.isDragging ? "dragging-card" : ""}`}>
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
        </section>

        {/* ── 已安排的「待办」 ── */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-800 mb-2">已安排的「待办」</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ZONES.map(zone => {
              const zt = todos.filter(t => t.zone === zone.id);
              const total = zt.length, done = zt.filter(t => t.completed).length;
              return (
                <div key={zone.id} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.accent }} />
                        <span className="text-xs font-semibold text-gray-700">{zone.name}</span>
                      </div>
                      {total > 0 && <span className="text-[10px] text-gray-400 tabular-nums">{done}/{total}</span>}
                    </div>
                    {total > 0 && <ProgressBar total={total} done={done} color={zone.accent} />}
                  </div>
                  <div className="p-2 flex-1 overflow-y-auto max-h-[45vh]">
                    <Droppable droppableId={String(zone.id)}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}
                          className={`space-y-1.5 min-h-[3.5rem] rounded-lg p-1.5 transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : ""}`}>
                          {zt.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-5 text-xs text-gray-300">{zone.empty}</div>
                          )}
                          {zt.map((todo, i) => (
                            <Draggable key={todo.id} draggableId={todo.id} index={i}>
                              {(prov, snap) => (
                                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                  className={`cursor-grab active:cursor-grabbing ${snap.isDragging ? "dragging-card" : ""}`}>
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
              );
            })}
          </div>
        </section>

        {/* ── 各项目情况概览 ── */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 mb-2.5">各项目情况概览</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projectGroups().map(group => {
              const gt = group.todos, total = gt.length, done = gt.filter(t => t.completed).length;
              const pc = group.project?.color || "#94a3b8";
              return (
                <div key={group.project?.id || "_none"} className="bg-white/90 rounded-lg border border-gray-200/80 shadow-sm overflow-hidden">
                  <div className="px-3.5 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pc }} />
                      <span className="text-xs font-semibold text-gray-700">{group.project?.name || "未分类"}</span>
                      <span className="text-[10px] text-gray-400 ml-auto tabular-nums">{done}/{total}</span>
                    </div>
                    <ProgressBar total={total} done={done} color={pc} />
                  </div>
                  <div className="px-3.5 py-2 space-y-1 max-h-[180px] overflow-y-auto">
                    {gt.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-gray-300">暂无待办</div>
                    ) : gt.map(todo => (
                      <div key={todo.id} className="flex items-start gap-1.5 py-0.5">
                        <button onClick={() => handleToggle(todo.id, !todo.completed)}
                          className={`mt-0.5 w-3 h-3 rounded-full border flex-shrink-0 transition-all ${todo.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-blue-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] truncate ${todo.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>{todo.title}</span>
                            <span className="text-[9px] px-1 py-[0.5px] rounded bg-gray-100 text-gray-400 flex-shrink-0">{ZONE_NAME[todo.zone]}</span>
                          </div>
                          {todo.description && <p className="text-[10px] text-gray-400 truncate mt-0.5">{todo.description}</p>}
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