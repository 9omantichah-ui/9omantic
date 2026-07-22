"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Todo, Project, ProjectGroup, Task, DailyPlanItem } from "@/lib/types";
import AuthForm from "@/components/AuthForm";
import WeekPlanSection from "@/components/WeekPlanSection";
import ProjectSidebar, { SidebarView } from "@/components/ProjectSidebar";
import ProjectWorkspace from "@/components/ProjectWorkspace";
import TodayView from "@/components/TodayView";
import AllTodosView from "@/components/AllTodosView";
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

// selectedView 是否为具体项目 id（排除 today/inbox/all 等固定视图）
function isProjectViewId(view: string): boolean {
  return view !== "today" && view !== "inbox" && view !== "all";
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
  // R1: 本周视图相关 state。weekStart 指向本周一（ISO YYYY-MM-DD）
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay(); // 0 sun
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d.toISOString().split("T")[0];
  });
  const [weekItems, setWeekItems] = useState<(DailyPlanItem & { date: string })[]>([]);
  const [selectedView, setSelectedView] = useState<SidebarView>("today");
  // 全局「已安排」todoId 集合（跨日期、跨状态），来源 /api/scheduled-todo-ids
  // 用于 AllTodosView「未安排 Tab」判定，避免只看当日 planItems 造成的错误判定
  const [scheduledIds, setScheduledIds] = useState<Set<string>>(new Set());

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

  const handleDeleteProject = async (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (selectedView === projectId) setSelectedView("today");
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      fetchTodos();
      fetchProjectGroups();
      fetchPlan();
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

  // 工作区某分组内待办顺序调整：droppableId 决定分组，仅重排未完成待办的 order 并持久化
  const handleReorderTodosInSection = async (droppableId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    // 依据 droppableId 解析该分组内的过滤条件
    const matchGroup = (t: Todo): boolean => {
      if (droppableId === "ws-inbox") return !t.projectId;
      if (droppableId === "ws-task-none") {
        const pid = isProjectViewId(selectedView) ? selectedView : null;
        return t.projectId === pid && !t.taskId;
      }
      if (droppableId.startsWith("ws-task-")) {
        const taskId = droppableId.replace("ws-task-", "");
        return t.taskId === taskId;
      }
      return false;
    };

    // 当前分组内展示的未完成待办（与 UI 渲染顺序一致：按 order 升序）
    const sectionPending = todos
      .filter(t => matchGroup(t) && !t.completed)
      .sort((a, b) => a.order - b.order);
    if (fromIndex < 0 || fromIndex >= sectionPending.length) return;

    const reordered = [...sectionPending];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // 生成新的 order 映射（保持各自 zone 不变）
    const orderMap = new Map(reordered.map((t, i) => [t.id, i]));
    setTodos(prev => prev.map(t => orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t));

    const items = reordered.map((t, i) => ({ id: t.id, zone: t.zone, order: i }));
    try {
      await fetch("/api/todos/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    } catch (e) { console.error(e); fetchTodos(); }
  };

  // 概览区：将待办移动到其他任务/项目（更新 taskId 与 projectId）
  const handleMoveTodo = async (todoId: string, projectId: string | null, taskId: string | null) => {
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, projectId, taskId, task: taskId ? (tasks.find(tk => tk.id === taskId) ? { id: taskId, name: tasks.find(tk => tk.id === taskId)!.name } : t.task) : null } : t));
    try {
      await fetch(`/api/todos/${todoId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, taskId }) });
    } catch (e) { console.error(e); fetchTodos(); }
  };

  const handleToggle = async (id: string, c: boolean) => {
    // 同步当日计划中相同待办的状态
    setPlanItems(prev => prev.map(i => i.todoId === id ? { ...i, status: (c ? "completed" : "pending") as DailyPlanItem["status"] } : i));
    try { const r = await fetch(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: c }) });
      if (r.ok) { const u = await r.json(); setTodos(p => applyTodoUpdate(p, id, u)); }
      // 持久化计划项状态
      const planItem = planItems.find(i => i.todoId === id);
      if (planItem) { await fetch("/api/daily-plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: planItem.id, status: c ? "completed" : "pending" }] }) }); }
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

  // R1: 本周 planItems 拉取（含 date='NEXT_WEEK' 的下周暂存项）
  const fetchWeek = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`/api/daily-plan/week?start=${weekStart}`);
      if (!r.ok) return;
      const data = await r.json();
      if (Array.isArray(data.items)) setWeekItems(data.items);
    } catch (e) { console.error(e); }
  }, [user, weekStart]);

  useEffect(() => { if (user) fetchWeek(); }, [fetchWeek, user]);

  const navigateWeek = (offset: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset * 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };
  const setThisWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  // 拉取「所有被安排过的 todoId 集合」（跨日期、跨状态），供未安排 Tab 判定使用
  const fetchScheduledIds = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch("/api/scheduled-todo-ids");
      if (!r.ok) return;
      const data = await r.json();
      if (Array.isArray(data.ids)) setScheduledIds(new Set(data.ids as string[]));
    } catch (e) { console.error(e); }
  }, [user]);

  useEffect(() => { if (user) fetchScheduledIds(); }, [fetchScheduledIds, user]);

  const navigatePlanDate = (offset: number) => {
    const d = new Date(planDate);
    d.setDate(d.getDate() + offset);
    setPlanDate(d.toISOString().split("T")[0]);
  };
  const setPlanToday = () => setPlanDate(new Date().toISOString().split("T")[0]);

  // 把一条待办加入当日计划的指定时段（乐观更新，拖入即时可见）
  const handleAddToPlanSlot = async (todoId: string, timeSlot: "morning" | "afternoon" | "evening") => {
    if (planItems.some(i => i.todoId === todoId)) return; // 已在计划中
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    const tempId = `temp-${todoId}-${Date.now()}`;
    const optimistic = {
      id: tempId, todoId, order: 9999, status: "pending", timeSlot,
      todo,
    } as unknown as DailyPlanItem;
    setPlanItems(prev => [...prev, optimistic]);
    try {
      const r = await fetch("/api/daily-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ todoId, date: planDate, timeSlot }) });
      if (!r.ok) throw new Error(await r.text());
      setScheduledIds(prev => { const n = new Set(prev); n.add(todoId); return n; });
      fetchPlan();
      fetchWeek();
    } catch (e) {
      console.error(e);
      setPlanItems(prev => prev.filter(i => i.id !== tempId)); // 回滚
    }
  };

  // 兼容 TodoItem 上的「加入计划」按钮：加入当天默认时段(上午)
  const handleAddToPlan = async (todoId: string) => {
    await handleAddToPlanSlot(todoId, "morning");
  };

  // 快速安排：把一条待办安排到指定日期的指定时段（供「未安排」Tab 使用）
  // 与 handleAddToPlanSlot 的区别是可指定任意日期，不限于当前 planDate
  const handleQuickSchedule = async (todoId: string, date: string, timeSlot: "morning" | "afternoon" | "evening") => {
    try {
      const r = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ todoId, date, timeSlot }),
      });
      if (!r.ok) { const err = await r.text(); alert(`安排失败 (${r.status}): ${err}`); return; }
      // 立即将该 todoId 加入全局已安排集合，让「未安排 Tab」即刻更新（不受当日 planItems 覆盖影响）
      setScheduledIds(prev => { const n = new Set(prev); n.add(todoId); return n; });
      // 刷新当日 planItems（若安排的是当日）
      fetchPlan();
      fetchWeek();
      // 已由 scheduledIds 承担「跨日期已安排」判定，不再往 planItems 塞跨日期的乐观项
    } catch (e) { console.error(e); alert("网络错误，请检查连接"); }
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
      setScheduledIds(prev => { const nx = new Set(prev); nx.add(n.id); return nx; });
      fetchPlan();
      fetchWeek();
    } catch (e) { console.error(e); alert("网络错误，请检查连接"); }
  };

  const handleRemovePlan = async (itemId: string) => {
    setPlanItems(prev => prev.filter(i => i.id !== itemId));
    setWeekItems(prev => prev.filter(i => i.id !== itemId));
    try {
      await fetch(`/api/daily-plan/${itemId}`, { method: "DELETE" });
      // 该 todoId 可能已完全脱离所有计划，刷新全局已安排集合
      fetchScheduledIds();
      fetchWeek();
    } catch (e) { console.error(e); fetchPlan(); fetchWeek(); }
  };

  const handleUpdatePlanStatus = async (itemId: string, status: string) => {
    const item = planItems.find(i => i.id === itemId);
    const completed = status === "completed";
    // 乐观更新：计划项状态 + 对应待办完成状态
    setPlanItems(prev => prev.map(i => i.id === itemId ? { ...i, status: status as DailyPlanItem["status"] } : i));
    setWeekItems(prev => prev.map(i => i.id === itemId ? { ...i, status: status as DailyPlanItem["status"] } : i));
    if (item?.todoId) {
      setTodos(prev => prev.map(t => t.id === item.todoId ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null } : t));
    }
    try {
      await fetch("/api/daily-plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: itemId, status }] }) });
      // 同步待办完成状态,让项目视图/待办列表保持一致
      if (item?.todoId) {
        const r = await fetch(`/api/todos/${item.todoId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed }) });
        if (r.ok) { const u = await r.json(); setTodos(p => applyTodoUpdate(p, item.todoId!, u)); }
      }
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

  // 为当日计划项设置具体开始时间（半小时粒度：HH:mm）与持续时长（分钟）
  const handleSetPlanTime = async (itemId: string, startAt: string | null, durationMin?: number) => {
    setPlanItems(prev => prev.map(i => i.id === itemId ? {
      ...i,
      startAt,
      ...(typeof durationMin === "number" ? { durationMin } : {}),
    } : i));
    try {
      const payload: Record<string, unknown> = { id: itemId, startAt };
      if (typeof durationMin === "number") payload.durationMin = durationMin;
      await fetch("/api/daily-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [payload] }),
      });
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

    // ── 计划相关拖拽（当日/本周/下周） ──
    if (dstId.startsWith("plan-") || srcId.startsWith("plan-")) {
      // 拖出计划区（丢到待办 zone）：忽略
      if (!dstId.startsWith("plan-")) return;

      // 解析 destination：可能是
      //   plan-nextweek                     → 下周暂存
      //   plan-{YYYY-MM-DD}-{slot}          → 本周格子
      //   plan-{slot}                       → 兼容旧「当日计划」
      type Slot = "morning" | "afternoon" | "evening";
      let destDate: string | null = null;   // null 表示"当日"（旧行为）
      let destSlot: Slot = "morning";
      if (dstId === "plan-nextweek") {
        destDate = "NEXT_WEEK";
        destSlot = "morning";
      } else {
        const rest = dstId.replace(/^plan-/, "");
        const m = rest.match(/^(\d{4}-\d{2}-\d{2})-(morning|afternoon|evening)$/);
        if (m) {
          destDate = m[1];
          destSlot = m[2] as Slot;
        } else if (rest === "morning" || rest === "afternoon" || rest === "evening") {
          destSlot = rest as Slot;
        } else {
          return;
        }
      }

      if (srcId.startsWith("plan-") || srcId.startsWith("today-")) {
        // 已有 planItem 的移动
        const itemId = result.draggableId.replace(/^(plan-item-|today-item-)/, "");
        // 优先在 planItems 找，找不到再找 weekItems
        const cur = planItems.find(i => i.id === itemId) || weekItems.find(i => i.id === itemId);
        if (!cur) return;

        // 同一 Droppable 内拖拽：调整顺序（仅对旧的 plan-{slot} 保留 order 持久化）
        if (srcId === dstId && destDate === null) {
          const slotItems = planItems
            .filter(i => (i.timeSlot || "morning") === destSlot)
            .sort((a, b) => {
              const c = (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0);
              return c !== 0 ? c : (a.order ?? 0) - (b.order ?? 0);
            });
          const [moved] = slotItems.splice(result.source.index, 1);
          if (!moved) return;
          slotItems.splice(result.destination.index, 0, moved);
          const orderMap = new Map(slotItems.map((it, idx) => [it.id, idx]));
          setPlanItems(prev => prev.map(i => orderMap.has(i.id) ? { ...i, order: orderMap.get(i.id)! } : i));
          try {
            await fetch("/api/daily-plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: slotItems.map((it, idx) => ({ id: it.id, order: idx })) }) });
          } catch (e) { console.error(e); fetchPlan(); }
          return;
        }

        // 跨 Droppable / 跨日期 移动：删旧建新（简化实现，避免 schema 迁移）
        if (destDate !== null && cur.todoId) {
          // 目标为具体日期或 NEXT_WEEK：删除旧项，POST 到新日期+时段
          setWeekItems(prev => prev.filter(i => i.id !== itemId));
          setPlanItems(prev => prev.filter(i => i.id !== itemId));
          try {
            await fetch(`/api/daily-plan/${itemId}`, { method: "DELETE" });
            await fetch("/api/daily-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ todoId: cur.todoId, date: destDate, timeSlot: destSlot }) });
            fetchPlan();
            fetchWeek();
          } catch (e) { console.error(e); fetchPlan(); fetchWeek(); }
          return;
        }

        // 跨时段（仍在当日）
        if (cur.timeSlot === destSlot) return;
        setPlanItems(prev => prev.map(i => i.id === itemId ? { ...i, timeSlot: destSlot } : i));
        try {
          await fetch("/api/daily-plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: itemId, timeSlot: destSlot }] }) });
        } catch (e) { console.error(e); fetchPlan(); }
      } else {
        // 从待办区拖入计划：draggableId = todo.id
        const todoId = result.draggableId;
        if (destDate !== null) {
          // 拖到本周/下周格子：调用 quickSchedule，不做「已在计划中」的短路（允许把待办安排到多天）
          handleQuickSchedule(todoId, destDate, destSlot);
        } else {
          if (planItems.some(i => i.todoId === todoId)) return;
          handleAddToPlanSlot(todoId, destSlot);
        }
      }
      return;
    }

    // ── 工作区内拖拽（改分类/项目归属 + 同分类内排序） ──
    if (dstId.startsWith("ws-")) {
      const todoId = result.draggableId;
      const cur = todos.find(t => t.id === todoId);
      if (!cur) return;

      // 同一个 droppable 内拖拽：视为顺序调整（reorder），持久化 order
      if (srcId === dstId) {
        handleReorderTodosInSection(dstId, result.source.index, result.destination.index);
        return;
      }

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
  const isProjectView = selectedView !== "today" && selectedView !== "inbox" && selectedView !== "all";
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
        <div className={`flex-1 grid ${(isProjectView || selectedView === "all") ? "grid-cols-[244px_1fr_388px]" : "grid-cols-[244px_1fr]"} gap-4 p-4 min-h-0`}>
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
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
          />

          {/* 中栏：今日引导 / 工作区 */}
          <div className="min-w-0 h-full overflow-hidden">
            {selectedView === "today" ? (
              <TodayView
                planItems={planItems}
                projects={projects}
                tasks={tasks}
                selectedDate={planDate}
                onNavigateDate={navigatePlanDate}
                onSetToday={setPlanToday}
                onUpdateStatus={handleUpdatePlanStatus}
                onRemove={handleRemovePlan}
                onQuickAddToday={handleQuickAddToday}
                onDeferToTomorrow={handleDeferToTomorrow}
              />
            ) : selectedView === "all" ? (
              <AllTodosView
                todos={todos}
                projects={projects}
                planItems={planItems}
                scheduledIds={scheduledIds}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAddToPlan={handleAddToPlan}
                onSelectProject={setSelectedView}
                onQuickSchedule={handleQuickSchedule}
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

          {/* 右栏：本周计划（项目视图 / 全部待办视图显示） */}
          {(isProjectView || selectedView === "all") && (
            <div className="min-w-0 h-full overflow-y-auto">
              <WeekPlanSection
                todos={todos}
                weekItems={weekItems}
                weekStart={weekStart}
                onNavigateWeek={navigateWeek}
                onSetThisWeek={setThisWeek}
                onUpdateStatus={handleUpdatePlanStatus}
                onRemove={handleRemovePlan}
                onAddToPlan={handleQuickSchedule}
              />
            </div>
          )}
        </div>
      </DragDropContext>
    </main>
  );
}
