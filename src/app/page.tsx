"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Todo, Project, ProjectGroup } from "@/lib/types";
import TodoItem from "@/components/TodoItem";
import AuthForm from "@/components/AuthForm";
import ProjectGroupSelector from "@/components/ProjectGroupSelector";
import DailyPlanSection from "@/components/DailyPlanSection";
import ProjectOverview from "@/components/ProjectOverview";
import Image from "next/image";

const ZONES = [
  { id: 1, name: "优先做", accent: "#ef4444", empty: "把最紧急的待办拖到这里" },
  { id: 2, name: "稍后做", accent: "#f97316", empty: "不急但重要的待办放这里" },
  { id: 3, name: "晚点做", accent: "#3b82f6", empty: "有空再处理的待办放这里" },
];

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

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
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [createProjectId, setCreateProjectId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.user) setUser(data.user);
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = (9 + Math.random() * 5) * 60 * 1000;
      timer = setTimeout(() => { fetch("/api/health").catch(() => {}); scheduleNext(); }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, []);

  const fetchTodos = useCallback(async () => {
    if (!user) return;
    try {
      const data = await (await fetch("/api/todos")).json();
      if (Array.isArray(data)) setTodos(data);
      if (!initialLoadedRef.current) { setLoading(false); initialLoadedRef.current = true; }
    } catch (e) { console.error(e); if (!initialLoadedRef.current) setLoading(false); }
  }, [user]);

  const fetchProjects = async () => {
    try { const data = await (await fetch("/api/projects")).json(); if (Array.isArray(data)) setProjects(data); } catch (e) { console.error(e); }
  };

  const fetchProjectGroups = async () => {
    try {
      const data = await (await fetch("/api/project-groups")).json();
      if (data.groups) setProjectGroups(data.groups);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (user) { fetchProjects(); fetchProjectGroups(); } }, [user]);
  useEffect(() => { if (user) fetchTodos(); }, [fetchTodos, user]);

  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    try {
      const body: Record<string, unknown> = { title: createTitle.trim(), zone: 0 };
      if (createDesc.trim()) body.description = createDesc.trim();
      if (createProjectId) body.projectId = createProjectId;
      const r = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { const n = await r.json(); setTodos(p => [...p, n]); }
    } catch (e) { console.error(e); }
    setCreateTitle(""); setCreateDesc(""); setShowDesc(false);
    inputRef.current?.focus();
  };

  const handleCreateProject = async (name: string, groupId?: string) => {
    const cs = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444"];
    try {
      const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: cs[projects.length % cs.length], groupId }) });
      if (r.ok) { fetchProjects(); fetchProjectGroups(); }
    } catch (e) { console.error(e); }
  };

  const handleCreateGroup = async (name: string) => {
    try {
      const r = await fetch("/api/project-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (r.ok) fetchProjectGroups();
    } catch (e) { console.error(e); }
  };

  const handleToggleGroupCollapse = async (groupId: string, collapsed: boolean) => {
    setProjectGroups(prev => prev.map(g => g.id === groupId ? { ...g, collapsed } : g));
    try { await fetch(`/api/project-groups/${groupId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collapsed }) }); }
    catch (e) { console.error(e); }
  };

  const handleMoveProject = async (projectId: string, groupId: string | null) => {
    try {
      await fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: projectId, order: 0, groupId }] }) });
      fetchProjects(); fetchProjectGroups();
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

  const handleAddToPlan = async (todoId: string) => {
    try {
      const date = new Date().toISOString().split("T")[0];
      await fetch("/api/daily-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ todoId, date }) });
    } catch (e) { console.error(e); }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sZ = parseInt(result.source.droppableId), dZ = parseInt(result.destination.droppableId);
    const sI = result.source.index, dI = result.destination.index;
    if (sZ === dZ && sI === dI) return;
    const g: Record<number, Todo[]> = { 0: [], 1: [], 2: [], 3: [] };
    todos.forEach(t => { if (g[t.zone] !== undefined && (!t.completed || isToday(t.completedAt))) g[t.zone].push(t); });
    const [m] = g[sZ].splice(sI, 1); m.zone = dZ; g[dZ].splice(dI, 0, m);
    const upd: Todo[] = [], items: { id: string; zone: number; order: number }[] = [];
    for (const z of [0,1,2,3]) g[z].forEach((t, i) => { upd.push({ ...t, zone: z, order: i }); items.push({ id: t.id, zone: z, order: i }); });
    setTodos(upd);
    try { await fetch("/api/todos/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }); }
    catch (e) { console.error(e); }
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center"><span className="text-gray-400 text-sm">加载中...</span></div>;
  if (!user) return <AuthForm onSuccess={(u) => { setUser(u); setLoading(true); }} />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-gray-400 text-sm">加载中...</span></div>;

  const poolTodos = todos.filter(t => t.zone === 0);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
    <main className="min-h-screen py-6 px-4 lg:px-8 bg-[#f5f6f8]">
      <div className="max-w-[1400px] mx-auto">

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

        {/* ── 左右分栏：左边主内容，右边当日计划 ── */}
        <div className="flex gap-6 items-start">
          {/* 左侧主区域 */}
          <div className="flex-1 min-w-0">

            {/* ── 添加待办 ── */}
            <section className="mb-6" onMouseDown={e => e.stopPropagation()}>
              <h2 className="text-sm font-bold text-gray-800 mb-2">添加一个「待办」</h2>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <input ref={inputRef} type="text" placeholder="写下一个待办..." value={createTitle}
                    onChange={e => setCreateTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreate(); }}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400 transition-all" />
                  <button type="button" onClick={handleCreate}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${createTitle.trim() ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.97]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                    disabled={!createTitle.trim()}>添加待办</button>
                </div>
                <div className="mt-2.5">
                  <ProjectGroupSelector
                    projects={projects}
                    projectGroups={projectGroups}
                    selectedProjectId={createProjectId}
                    onSelectProject={setCreateProjectId}
                    onCreateProject={handleCreateProject}
                    onCreateGroup={handleCreateGroup}
                    onToggleGroupCollapse={handleToggleGroupCollapse}
                    onMoveProject={handleMoveProject}
                  />
                </div>
                <div className="mt-2 flex items-center">
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

            {/* ── 未整理的「待办」── 双列 */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-800">未整理的「待办」<span className="ml-2 text-[11px] font-normal text-gray-400">{poolTodos.length} 项</span></h2>
                {poolTodos.length >= 6 && (
                  <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">未整理待办有点多，先挑几个安排一下。</span>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                <Droppable droppableId="0">
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`grid grid-cols-1 md:grid-cols-2 gap-1.5 min-h-[3rem] rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? "drop-zone-highlight" : ""}`}>
                      {poolTodos.length === 0 && !snapshot.isDraggingOver && (
                        <div className="col-span-full text-center py-5 text-sm text-gray-300">暂无未整理待办</div>
                      )}
                      {poolTodos.map((todo, i) => (
                        <Draggable key={todo.id} draggableId={todo.id} index={i}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              className={`cursor-grab active:cursor-grabbing ${snap.isDragging ? "dragging-card" : ""}`}>
                              <TodoItem todo={todo} projects={projects} compact
                                onToggle={handleToggle} onUpdate={handleUpdate} onDelete={handleDelete} onAddToPlan={handleAddToPlan} />
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
                  const zt = todos.filter(t => t.zone === zone.id && (!t.completed || isToday(t.completedAt)));
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
                                        onToggle={handleToggle} onUpdate={handleUpdate} onDelete={handleDelete} onAddToPlan={handleAddToPlan} />
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

          </div>

          {/* 右侧：当日计划 */}
          <div className="hidden lg:block w-[340px] flex-shrink-0 sticky top-6">
            <DailyPlanSection todos={todos} projects={projects} />
          </div>
        </div>

        {/* 移动端当日计划（lg以下显示） */}
        <div className="lg:hidden mb-6">
          <DailyPlanSection todos={todos} projects={projects} />
        </div>

        {/* ── 各项目情况概览 ── */}
        <ProjectOverview todos={todos} projects={projects} onToggle={handleToggle} />
      </div>
    </main>
    </DragDropContext>
  );
}