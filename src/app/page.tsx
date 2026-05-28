"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Todo, Project } from "@/lib/types";
import TodoItem from "@/components/TodoItem";
import AuthForm from "@/components/AuthForm";

const PRIORITY_ZONES = [
  { id: 1, name: "第一顺位", accent: "#ef4444", empty: "拖拽任务到此区域" },
  { id: 2, name: "第二顺位", accent: "#f97316", empty: "拖拽任务到此区域" },
  { id: 3, name: "第三顺位", accent: "#3b82f6", empty: "拖拽任务到此区域" },
];

function ProgressBar({ total, done, color }: { total: number; done: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const barColor = pct >= 100 ? "#10b981" : pct >= 70 ? color : pct >= 30 ? "#f59e0b" : "#ef4444";
  const textCls = pct >= 100 ? "text-emerald-600 font-semibold" : pct >= 70 ? "text-gray-500" : pct >= 30 ? "text-amber-600" : "text-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="progress-bar h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <span className={`text-[11px] tabular-nums whitespace-nowrap ${textCls}`}>{done}/{total} · {pct}%</span>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; nickname: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("todo_page_title") : null) || "我的待办任务");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [createProjectId, setCreateProjectId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [inlineAddId, setInlineAddId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineDesc, setInlineDesc] = useState("");

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

  const saveTitle = () => {
    const v = titleDraft.trim() || "我的待办任务";
    setPageTitle(v); localStorage.setItem("todo_page_title", v); setEditingTitle(false);
  };

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
  const handleInlineAdd = async (projectId: string) => {
    if (!inlineTitle.trim()) return;
    await createTodo(inlineTitle.trim(), inlineDesc.trim(), projectId);
    setInlineTitle(""); setInlineDesc(""); setInlineAddId(null);
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

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">加载中...</div></div>;
  if (!user) return <AuthForm onSuccess={(u) => { setUser(u); setLoading(true); }} />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">加载中...</div></div>;

  const poolTodos = todos.filter(t => t.zone === 0);
  const poolTotal = poolTodos.length, poolDone = poolTodos.filter(t => t.completed).length;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
    <main className="min-h-screen py-6 px-4 lg:px-8">
      <div className="max-w-[1400px] mx-auto">

        {/* ══ 顶部区域 ══ */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {editingTitle ? (
                <div className="inline-flex items-center gap-2">
                  <input type="text" value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveTitle()}
                    className="text-3xl font-bold border-b-2 border-blue-400 bg-transparent focus:outline-none px-1 py-1" autoFocus />
                  <button onClick={saveTitle} className="text-xs text-blue-600 font-medium px-2.5 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100">保存</button>
                  <button onClick={() => setEditingTitle(false)} className="text-xs text-gray-400 px-2 py-1.5 hover:text-gray-500">取消</button>
                </div>
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight cursor-pointer group inline-flex items-center gap-2"
                  onClick={() => { setTitleDraft(pageTitle); setEditingTitle(true); }}>
                  {pageTitle}
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </h1>
              )}
              <p className="text-sm text-gray-500 mt-1">{todos.filter(t => !t.completed).length} 项进行中 · {todos.filter(t => t.completed).length} 项已完成</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Hi, {user.nickname}</span>
              <button onClick={async () => { await fetch("/api/auth/me", { method: "DELETE" }); setUser(null); setTodos([]); setProjects([]); }}
                className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">退出</button>
            </div>
          </div>
        </header>

        {/* ══ 快速记 ══ */}
        <section className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">快速记</h2>
            <p className="text-xs text-gray-400 mt-0.5">快速记录临时事项，后续可拖拽分配顺位或归属项目</p>
          </div>
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">所属项目</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setCreateProjectId("")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${createProjectId === "" ? "bg-gray-800 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>未分类</button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setCreateProjectId(p.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium text-white transition-all ${createProjectId === p.id ? "ring-2 ring-offset-2 shadow-sm" : "opacity-70 hover:opacity-100"}`}
                  style={{ backgroundColor: p.color }}>{p.name}</button>
              ))}
              {showProjectForm ? (
                <div className="flex items-center gap-1.5">
                  <input type="text" placeholder="项目名称" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateProject()}
                    className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs w-24 focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus />
                  <button onClick={handleCreateProject} className="text-xs text-blue-600 font-medium">确定</button>
                  <button onClick={() => { setShowProjectForm(false); setNewProjectName(""); }} className="text-xs text-gray-400">取消</button>
                </div>
              ) : (
                <button onClick={() => setShowProjectForm(true)} className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">+ 新建项目</button>
              )}
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <span className="pl-3 text-gray-300"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg></span>
                <input type="text" placeholder="请输入待办事项，回车添加" value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreate(); }}
                  className="flex-1 px-2.5 py-2.5 bg-transparent text-sm focus:outline-none placeholder:text-gray-400" />
              </div>
              <button onClick={handleCreate}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${createTitle.trim() ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                disabled={!createTitle.trim()}>添加</button>
            </div>
            <textarea placeholder="补充具体事项、背景或执行要求（可选）" value={createDesc}
              onChange={e => setCreateDesc(e.target.value)} rows={2}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none transition-all placeholder:text-gray-400" />
          </div>
        </section>

        {/* ══ 任务分配工作区（左右并排） ══ */}
        <section className="mb-8">
          <div className="flex flex-col lg:flex-row gap-5 items-stretch">

            {/* ===== 左侧 30%：待分配任务池 ===== */}
            <div className="w-full lg:w-[30%] flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full flex flex-col">
                <div className="px-4 py-3.5 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">待分配任务池</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">拖拽到右侧顺位区安排优先级</p>
                  <div className="mt-2"><ProgressBar total={poolTotal} done={poolDone} color="#94a3b8" /></div>
                </div>
                <div className="p-3 flex-1 overflow-y-auto max-h-[60vh]">
                  <Droppable droppableId="0">
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={`space-y-1.5 min-h-[3rem] rounded-xl p-1.5 transition-all ${snapshot.isDraggingOver ? "bg-blue-50/60 ring-2 ring-blue-200/60 ring-dashed" : "bg-gray-50/40"}`}>
                        {poolTodos.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-8 text-xs text-gray-400">暂无待分配任务<br/><span className="text-[11px]">可在上方快速添加</span></div>
                        )}
                        {poolTodos.map((todo, i) => (
                          <Draggable key={todo.id} draggableId={todo.id} index={i}>
                            {(prov, snap) => (
                              <div ref={prov.innerRef} {...prov.draggableProps}
                                className={snap.isDragging ? "opacity-90 shadow-lg scale-[1.02] rotate-[0.5deg]" : ""}>
                                <TodoItem todo={todo} projects={projects} compact
                                  onToggle={handleToggle} onUpdate={handleUpdate} onDelete={handleDelete}
                                  dragHandleProps={prov.dragHandleProps ?? undefined} />
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

            {/* ===== 右侧 70%：按顺位推进 ===== */}
            <div className="w-full lg:flex-1 min-w-0">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full flex flex-col">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">按顺位推进</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{todos.filter(t => t.zone >= 1 && !t.completed).length} 项待办 · 拖拽调整优先级</p>
                </div>
                <div className="p-4 flex-1 overflow-y-auto max-h-[60vh]">
                  {PRIORITY_ZONES.map(zone => {
                    const zt = todos.filter(t => t.zone === zone.id);
                    const total = zt.length, done = zt.filter(t => t.completed).length;
                    return (
                      <div key={zone.id} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: zone.accent }} />
                          <span className="text-xs font-semibold text-gray-700">{zone.name}</span>
                          <div className="flex-1"><ProgressBar total={total} done={done} color={zone.accent} /></div>
                        </div>
                        <Droppable droppableId={String(zone.id)}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}
                              className={`space-y-1.5 min-h-[2.5rem] rounded-xl p-2 transition-all ${snapshot.isDraggingOver ? "bg-blue-50/60 ring-2 ring-blue-200/60 ring-dashed" : "bg-gray-50/40"}`}>
                              {zt.length === 0 && !snapshot.isDraggingOver && (
                                <div className="text-center py-4 text-[11px] text-gray-400">{zone.empty}</div>
                              )}
                              {zt.map((todo, i) => (
                                <Draggable key={todo.id} draggableId={todo.id} index={i}>
                                  {(prov, snap) => (
                                    <div ref={prov.innerRef} {...prov.draggableProps}
                                      className={snap.isDragging ? "opacity-90 shadow-lg scale-[1.02] rotate-[0.5deg]" : ""}>
                                      <TodoItem todo={todo} projects={projects} compact
                                        onToggle={handleToggle} onUpdate={handleUpdate} onDelete={handleDelete}
                                        dragHandleProps={prov.dragHandleProps ?? undefined} />
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

        {/* ══ 底部：按项目查看（卡片网格） ══ */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800">按项目查看</h2>
            <p className="text-xs text-gray-400 mt-0.5">查看各项目任务进展与完成情况</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectGroups().map(group => {
              const gt = group.todos, total = gt.length, done = gt.filter(t => t.completed).length;
              const pc = group.project?.color || "#94a3b8";
              const groupKey = group.project?.id || "_none";
              const previewTodos = gt.slice(0, 5);
              return (
                <div key={groupKey} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  {/* 卡片头部 */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pc }} />
                        <span className="text-sm font-semibold text-gray-800">{group.project?.name || "未分类"}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">{done}/{total} 已完成</span>
                    </div>
                    <ProgressBar total={total} done={done} color={pc} />
                  </div>
                  {/* 卡片内容：任务预览 */}
                  <div className="px-4 py-3">
                    {previewTodos.length === 0 ? (
                      <div className="text-center py-4 text-xs text-gray-400">暂无任务</div>
                    ) : (
                      <div className="space-y-1.5">
                        {previewTodos.map(todo => (
                          <div key={todo.id} className="flex items-center gap-2 py-1">
                            <button onClick={() => handleToggle(todo.id, !todo.completed)}
                              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${todo.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-gray-400"}`}>
                              {todo.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <span className={`text-xs truncate ${todo.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>{todo.title}</span>
                          </div>
                        ))}
                        {gt.length > 5 && (
                          <div className="text-[11px] text-gray-400 pt-1">还有 {gt.length - 5} 项...</div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* 卡片底部：添加按钮 */}
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                    {inlineAddId === groupKey ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="任务标题，回车添加" value={inlineTitle}
                            onChange={e => setInlineTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleInlineAdd(group.project?.id || ""); }}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" autoFocus />
                          <button onClick={() => handleInlineAdd(group.project?.id || "")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${inlineTitle.trim() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                            disabled={!inlineTitle.trim()}>添加</button>
                          <button onClick={() => setInlineAddId(null)} className="text-xs text-gray-400 hover:text-gray-500">取消</button>
                        </div>
                        <textarea placeholder="补充描述（可选）" value={inlineDesc}
                          onChange={e => setInlineDesc(e.target.value)} rows={1}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 resize-none placeholder:text-gray-400" />
                      </div>
                    ) : (
                      <button onClick={() => { setInlineAddId(groupKey); setInlineTitle(""); setInlineDesc(""); }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ 添加待办</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {todos.length === 0 && projects.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">暂无任务与项目</div>
          )}
        </section>

      </div>
    </main>
    </DragDropContext>
  );
}