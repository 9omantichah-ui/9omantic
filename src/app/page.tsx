"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Todo, Project, ProjectGroup, Task, DailyPlanItem } from "@/lib/types";
import AuthForm from "@/components/AuthForm";
import DailyPlanSection from "@/components/DailyPlanSection";
import ProjectSidebar, { SidebarView } from "@/components/ProjectSidebar";
import ProjectWorkspace from "@/components/ProjectWorkspace";
import TodayView from "@/components/TodayView";
import Image from "next/image";

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// 更新单条待办
function applyTodoUpdate(list: Todo[], id: string, updated: Todo): Todo[] {
  return list.map(t => t.id === id ? updated : t);
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; nickname: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [createTitle, setCreateTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const initialLoadedRef = useRef(false);
  const [planItems, setPlanItems] = useState<DailyPlanItem[]>([]);
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedView, setSelectedView] = useState<SidebarView>("today");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.user) setUser(data.user);
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  // 保活轮询：页面打开后每隔一段随机时间(约5~15分钟，非等差)ping /api/health，
  // 防止 Render 免费实例休眠。使用递归 setTimeout 让每次间隔独立随机。
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const nextDelay = () => {
      // 5~15 分钟之间随机(毫秒)，间隔非等差
      const min = 5 * 60 * 1000;
      const max = 15 * 60 * 1000;
      return Math.floor(min + Math.random() * (max - min));
    };

    const ping = async () => {
      try { await fetch("/api/health", { cache: "no-store" }); } catch { /* 忽略保活失败 */ }
      if (!cancelled) timer = setTimeout(ping, nextDelay());
    };

    timer = setTimeout(ping, nextDelay());
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
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

  const fetchTasks = async () => {
    try { const data = await (await fetch("/api/tasks")).json(); if (Array.isArray(data)) setTasks(data); } catch (e) { console.error(e); }
  };

  // 新建任务，成功后加入本地状态并返回新任务
  const handleCreateTask = async (projectId: string | null, name: string): Promise<Task | null> => {
    try {
      const r = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, projectId }) });
      if (!r.ok) return null;
      const t = await r.json();
      setTasks(p => [...p, t]);
      return t;
    } catch (e) { console.error(e); return null; }
  };

  const fetchProjectGroups = async () => {
    try {
      const data = await (await fetch("/api/project-groups")).json();
      if (data.groups) setProjectGroups(data.groups);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (user) { fetchProjects(); fetchProjectGroups(); fetchTasks(); } }, [user]);
  useEffect(() => { if (user) fetchTodos(); }, [fetchTodos, user]);

  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    try {
      const body: Record<string, unknown> = { title: createTitle.trim(), zone: 0 };
      const r = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) {
        const n = await r.json();
        setTodos(p => [...p, n]);
        setCreateTitle("");
      } else {
        const err = await r.text();
        console.error("创建待办失败:", r.status, err);
        alert(`创建失败 (${r.status}): ${err}`);
      }
    } catch (e) {
      console.error("创建待办网络错误:", e);
      alert("网络错误，请检查连接");
    }
    inputRef.current?.focus();
  };

  // 概览区快速添加待办（默认进入未整理区 zone=0）
  const handleQuickAdd = async (projectId: string | null, title: string, taskId?: string | null) => {
    if (!title.trim()) return;
    try {
      const body: Record<string, unknown> = { title: title.trim(), zone: 0 };
      if (projectId) body.projectId = projectId;
      if (taskId) body.taskId = taskId;
      const r = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (r.ok) {
        const n = await r.json();
        setTodos(p => [...p, n]);
      } else {
        const err = await r.text();
        console.error("快速添加失败:", r.status, err);
        alert(`添加失败 (${r.status}): ${err}`);
      }
    } catch (e) {
      console.error("快速添加网络错误:", e);
      alert("网络错误，请检查连接");
    }
  };

  const handleCreateProject = async (name: string, groupId?: string) => {
    const cs = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444"];
    try {
      const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: cs[projects.length % cs.length], groupId }) });
      if (r.ok) { fetchProjects(); fetchProjectGroups(); }
    } catch (e) { console.error(e); }
  };

  // 重命名项目
  const handleRenameProject = async (projectId: string, name: string) => {
    const t = name.trim();
    if (!t) return;
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: t } : p));
    try {
      await fetch(`/api/projects/${projectId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: t }) });
      fetchTodos();
    } catch (e) { console.error(e); fetchProjects(); }
  };

  // 重命名任务/分类
 const handleRenameTask = async (taskId: string, name: string) => {
    const t = name.trim();
    if (!t) return;
    setTasks(prev => prev.map(tk => tk.id === taskId ? { ...tk, name: t } : tk));
    setTodos(prev => prev.map(td => td.task?.id === taskId ? { ...td, task: { ...td.task!, name: t } } : td));
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: t }) });
    } catch (e) { console.error(e); fetchTasks(); }
  };

  // 同分组内项目拖拽排序：groupId 为 null 表示未分组区。orderedIds 为该分组排序后的项目 id 列表
  const handleReorderProjects = async (groupId: string | null, orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    setProjects(prev => {
      const affected = prev.filter(p => orderMap.has(p.id)).map(p => ({ ...p, order: orderMap.get(p.id)! }));
      const others = prev.filter(p => !orderMap.has(p.id));
      return [...affected, ...others].sort((a, b) => a.order - b.order);
    });
    if (groupId) {
      setProjectGroups(prev => prev.map(g => g.id === groupId
        ? { ...g, projects: [...g.projects].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)).map((p, i) => ({ ...p, order: i })) }
        : g));
    }
    const items = orderedIds.map((id, i) => ({ id, order: i, groupId: groupId ?? null }));
    try {
      await fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    } catch (e) { console.error(e); fetchProjects(); fetchProjectGroups(); }
  };

  // 概览区：将待办移动到其他任务/项目（更新 taskId 与 projectId）
  const handleMoveTodo = async (todoId: string, projectId: string | null, taskId: string | null) => {
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, projectId, taskId, task: taskId ? (tasks.find(tk => tk.id === taskId) ? { id: taskId, name: tasks.find(tk => tk.id === taskId)!.name } : t.task) : null } : t));
    try {
      await fetch(`/api/todos/${todoId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, taskId }) });
    } catch (e) { console.error(e); fetchTodos(); }
  };

  const handleToggle = async (id: string, c: boolean) => {
    try { const r = await fetch(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: c }) });
      if (r.ok) { const u = await r.json(); setTodos(p => applyTodoUpdate(p, id, u)); }
    } catch (e) { console.error(e); }
  };
  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    try { const r = await fetch(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (r.ok) { const u = await r.json(); setTodos(p => applyTodoUpdate(p, id, u)); }
    } catch (e) { console.error(e); }
  };
  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (r.ok) setTodos(p => p.filter(t => t.id !== id)); }
    catch (e) { console.error(e); }
  };

  const fetchPlan = useCallback(async () => {
    if (!user) return;
    try {
      const data = await (await fetch(`/api/daily-plan?date=${planDate}`)).json();
      if (Array.isArray(data)) setPlanItems(data);
      else if (Array.isArray(data.items)) setPlanItems(data.items);
    } catch (e) { console.error(e); }
  }, [user, planDate]);

  useEffect(() => { if (user) fetchPlan(); }, [fetchPlan, user]);

  const navigatePlanDate = (offset: number) => {
    const d = new Date(planDate);
    d.setDate(d.getDate() + offset);
    setPlanDate(d.toISOString().split("T")[0]);
  };
  const setPlanToday = () => setPlanDate(new Date().toISOString().split("T")[0]);

  // 把一条待办加入当日计划的指定时段
  const handleAddToPlanSlot = async (todoId: string, timeSlot: "morning" | "afternoon" | "evening") => {
    try {
      await fetch("/api/daily-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ todoId, date: planDate, timeSlot }) });
      fetchPlan();
    } catch (e) { console.error(e); }
  };

  // 兼容 TodoItem 上的「加入计划」按钮：加入当天默认时段(上午)
  const handleAddToPlan = async (todoId: string) => {
    await handleAddToPlanSlot(todoId, "morning");
  };

  // 今日视图快捷新增：先创建待办（默认进未整理区），再加入当日计划指定时段
  const handleQuickAddToday = async (title: string, projectId: string | null, taskId: string | null, timeSlot: "morning" | "afternoon" | "evening") => {
    if (!title.trim()) return;
    try {
      const body: Record<string, unknown> = { title: title.trim(), zone: 0 };
      if (projectId) body.projectId = projectId;
      if (taskId) body.taskId = taskId;
      const r = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const err = await r.text(); alert(`添加失败 (${r.status}): ${err}`); return; }
      const n = await r.json();
      setTodos(p => [...p, n]);
      // 加入当日计划
      await fetch("/api/daily-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ todoId: n.id, date: planDate, timeSlot }) });
      fetchPlan();
    } catch (e) { console.error(e); alert("网络错误，请检查连接"); }
  };

  const handleRemovePlan = async (itemId: string) => {
    setPlanItems(prev => prev.filter(i => i.id !== itemId));
    try {
      await fetch(`/api/daily-plan/${itemId}`, { method: "DELETE" });
    } catch (e) { console.error(e); fetchPlan(); }
  };

  const handleUpdatePlanStatus = async (itemId: string, status: string) => {
    setPlanItems(prev => prev.map(i => i.id === itemId ? { ...i, status: status as DailyPlanItem["status"] } : i));
    try {
      await fetch("/api/daily-plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: itemId, status }] }) });
    } catch (e) { console.error(e); fetchPlan(); }
  };

  // 把当日计划中的一条待办顺延到明日（从当前日期移除，加入次日同时段）
  const handleDeferToTomorrow = async (itemId: string) => {
    const cur = planItems.find(i => i.id === itemId);
    if (!cur || !cur.todoId) return;
    const d = new Date(planDate);
    d.setDate(d.getDate() + 1);
    const nextDate = d.toISOString().split("T")[0];
    setPlanItems(prev => prev.filter(i => i.id !== itemId));
    try {
      await fetch("/api/daily-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ todoId: cur.todoId, date: nextDate, timeSlot: cur.timeSlot }) });
      await fetch(`/api/daily-plan/${itemId}`, { method: "DELETE" });
    } catch (e) { console.error(e); fetchPlan(); }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const srcId = result.source.droppableId, dstId = result.destination.droppableId;

    // ── 左侧项目拖拽排序（仅同分组内） ──
    if (srcId.startsWith("sidebar-")) {
      if (srcId !== dstId) return; // 本轮仅支持同分组内排序
      const groupKey = srcId.replace("sidebar-", "");
      const groupId = groupKey === "ungrouped" ? null : groupKey;
      const groupedIds = new Set(projectGroups.flatMap(g => g.projects.map(p => p.id)));
      const listIds = groupId === null
        ? projects.filter(p => !groupedIds.has(p.id)).map(p => p.id)
        : (projectGroups.find(g => g.id === groupId)?.projects.map(p => p.id) ?? []);
      const [moved] = listIds.splice(result.source.index, 1);
      if (moved === undefined) return;
      listIds.splice(result.destination.index, 0, moved);
      handleReorderProjects(groupId, listIds);
      return;
    }

    // ── 当日计划相关拖拽 ──
    if (dstId.startsWith("plan-") || srcId.startsWith("plan-")) {
      // 拖出计划区（丢到待办 zone）：忽略，不做移出（移出用删除按钮）
      if (!dstId.startsWith("plan-")) return;
      const slot = dstId.replace("plan-", "") as "morning" | "afternoon" | "evening";

      if (srcId.startsWith("plan-") || srcId.startsWith("today-")) {
        // 计划内/今日视图跨时段移动：draggableId = plan-item-{id} 或 today-item-{id}
        const itemId = result.draggableId.replace(/^(plan-item-|today-item-)/, "");
        const cur = planItems.find(i => i.id === itemId);
        if (!cur || cur.timeSlot === slot) return;
        setPlanItems(prev => prev.map(i => i.id === itemId ? { ...i, timeSlot: slot } : i));
        try {
          await fetch("/api/daily-plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: itemId, timeSlot: slot }] }) });
        } catch (e) { console.error(e); fetchPlan(); }
      } else {
        // 从待办区拖入计划：draggableId = todo.id
        const todoId = result.draggableId;
        if (planItems.some(i => i.todoId === todoId)) return; // 已在计划中，避免 400
        handleAddToPlanSlot(todoId, slot);
      }
      return;
    }

    // ── 工作区内拖拽（改分类/项目归属） ──
    if (dstId.startsWith("ws-")) {
      const todoId = result.draggableId;
      const cur = todos.find(t => t.id === todoId);
      if (!cur) return;
      let targetProjectId: string | null;
      let targetTaskId: string | null;
      if (dstId === "ws-inbox") {
        targetProjectId = null;
        targetTaskId = null;
      } else if (dstId === "ws-task-none") {
        // 当前项目下的未分类：projectId 取当前视图项目
        targetProjectId = typeof selectedView === "string" && selectedView !== "today" && selectedView !== "inbox" ? selectedView : cur.projectId;
        targetTaskId = null;
      } else if (dstId.startsWith("ws-task-")) {
        targetTaskId = dstId.replace("ws-task-", "");
        const task = tasks.find(tk => tk.id === targetTaskId);
        targetProjectId = task ? task.projectId : cur.projectId;
      } else {
        return;
      }
      if (cur.projectId === targetProjectId && (cur.taskId ?? null) === targetTaskId) return;
      handleMoveTodo(todoId, targetProjectId, targetTaskId);
      return;
    }

    // 源自工作区但目标非计划/工作区（无意义），忽略
    if (srcId.startsWith("ws-")) return;

    // ── 已安排待办区内拖拽 ──
    const sZ = parseInt(srcId), dZ = parseInt(dstId);
    const sI = result.source.index, dI = result.destination.index;
    if (sZ === dZ && sI === dI) return;
    // 构建与 UI 渲染一致的分组：zone 0 包含所有待办，zone 1/2/3 只包含未完成或今天完成的
    const g: Record<number, Todo[]> = { 0: [], 1: [], 2: [], 3: [] };
    const notInDrag: Todo[] = []; // 不参与拖拽的待办（zone 1/2/3 中已完成且非今天的）
    todos.forEach(t => {
      if (g[t.zone] === undefined) { notInDrag.push(t); return; }
      if (t.zone === 0) {
        g[0].push(t);
      } else if (!t.completed || isToday(t.completedAt)) {
        g[t.zone].push(t);
      } else {
        notInDrag.push(t);
      }
    });
    const [m] = g[sZ].splice(sI, 1); m.zone = dZ; g[dZ].splice(dI, 0, m);
    const upd: Todo[] = [...notInDrag], items: { id: string; zone: number; order: number }[] = [];
    for (const z of [0,1,2,3]) g[z].forEach((t, i) => { upd.push({ ...t, zone: z, order: i }); items.push({ id: t.id, zone: z, order: i }); });
    setTodos(upd);
    try { await fetch("/api/todos/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });}
    catch (e) { console.error(e); }
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center"><span className="text-gray-400 text-sm">加载中...</span></div>;
  if (!user) return <AuthForm onSuccess={(u) => { setUser(u); setLoading(true); }} />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-gray-400 text-sm">加载中...</span></div>;

  // ── 当前视图信息 ──
  const isProjectView = selectedView !== "today" && selectedView !== "inbox";
  const currentProject = isProjectView ? (projects.find(p => p.id === selectedView) ?? null) : null;

  // 中栏待办：inbox = 无项目；项目视图 = 该项目下待办
  const workspaceTodos = selectedView === "inbox"
    ? todos.filter(t => !t.projectId)
    : isProjectView
      ? todos.filter(t => t.projectId === selectedView)
      : [];

  return (
    <main className="min-h-screen bg-[#f5f6f8] flex flex-col h-screen overflow-hidden">
      {/* ── 顶部栏：品牌 + 全局收集 ── */}
      <header className="flex items-center gap-4 px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Image src="/logo.svg" alt="ActionFlow" width={32} height={32} />
          <div className="hidden sm:block">
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-base font-bold text-gray-900 tracking-tight">ActionFlow</h1>
              <span className="text-xs font-medium text-gray-400">行动秩序</span>
            </div>
          </div>
        </div>

        {/* 全局收集栏 */}
        <div className="flex-1 flex items-center gap-2 max-w-2xl">
          <input ref={inputRef} type="text" placeholder="随手记录一件事，回车收进收件箱…" value={createTitle}
            onChange={e => setCreateTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreate(); }}
            className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400 transition-all" />
          <button type="button" onClick={handleCreate}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${createTitle.trim() ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.97]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            disabled={!createTitle.trim()}>收集</button>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          <p className="hidden md:block text-[11px] text-gray-400 tabular-nums">{todos.filter(t => !t.completed).length} 进行中 · {todos.filter(t => t.completed).length} 已完成</p>
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <span className="text-xs text-gray-400">{user.nickname}</span>
            <button onClick={async () => { await fetch("/api/auth/me", { method: "DELETE" }); setUser(null); setTodos([]); setProjects([]); }}
              className="text-[11px] text-gray-400 hover:text-red-500 px-2 py-0.5 rounded border border-gray-200 transition-colors">退出</button>
          </div>
        </div>
      </header>

      {/* ── 三栏工作区 ── */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 grid grid-cols-[244px_1fr_388px] gap-4 p-4 min-h-0">
          {/* 左栏：项目导航 */}
          <ProjectSidebar
            todos={todos}
            projects={projects}
            projectGroups={projectGroups}
            planCount={planItems.length}
            selectedView={selectedView}
        onSelectView={setSelectedView}
            onCreateProject={(name) => handleCreateProject(name)}
            onReorderProjects={handleReorderProjects}
          />

          {/* 中栏：今日引导 / 工作区 */}
          <div className="min-w-0 h-full overflow-hidden">
            {selectedView === "today" ? (
              <TodayView
                planItems={planItems}
                projects={projects}
                tasks={tasks}
                onUpdateStatus={handleUpdatePlanStatus}
                onRemove={handleRemovePlan}
                onQuickAddToday={handleQuickAddToday}
                onDeferToTomorrow={handleDeferToTomorrow}
              />
            ) : (
              <ProjectWorkspace
                project={selectedView === "inbox" ? null : currentProject}
                todos={workspaceTodos}
                projects={projects}
                tasks={tasks}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
         onAddToPlan={handleAddToPlan}
                onQuickAdd={handleQuickAdd}
                onCreateTask={handleCreateTask}
                onRenameProject={handleRenameProject}
                onRenameTask={handleRenameTask}
              />
            )}
          </div>

          {/* 右栏：当日计划（固定） */}
          <div className="min-w-0 h-full overflow-y-auto">
            <DailyPlanSection
              todos={todos}
              projects={projects}
              planItems={planItems}
              selectedDate={planDate}
              onNavigateDate={navigatePlanDate}
              onSetToday={setPlanToday}
              onUpdateStatus={handleUpdatePlanStatus}
              onRemove={handleRemovePlan}
              onAddToPlan={handleAddToPlanSlot}
            />
          </div>
        </div>
      </DragDropContext>
    </main>
  );
}
