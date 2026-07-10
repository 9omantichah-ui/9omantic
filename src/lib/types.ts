export interface ProjectGroup {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
  userId: string;
  createdAt: string;
  projects: Project[];
}

export interface Project {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
  order: number;
  createdAt: string;
  _count?: { todos: number };
}

export interface Task {
  id: string;
  name: string;
  projectId: string | null;
  order: number;
  userId: string;
  createdAt: string;
  todos?: Todo[];
  _count?: { todos: number; completed: number };
}

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  priority: "low" | "medium" | "high";
  zone: number; // 0=未整理, 1=优先做, 2=稍后做, 3=晚点做
  order: number;
  scheduledDate: string | null;
  projectId: string | null;
  project: Project | null;
  taskId: string | null;
  task?: { id: string; name: string } | null;
  parentId: string | null; // 已废弃，保留字段
  subtodos?: Todo[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlan {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  createdAt: string;
  items: DailyPlanItem[];
}

export interface DailyPlanItem {
  id: string;
  planId: string;
  todoId: string;
  order: number;
  status: "pending" | "in_progress" | "completed";
  timeSlot: "morning" | "afternoon" | "evening";
  userId: string;
  createdAt: string;
  todo?: Todo;
}

export interface RecurringTodo {
  id: string;
  title: string;
  projectId: string | null;
  project: Project | null;
  repeatDays: string[]; // e.g. ["周一", "周三", "周五"]
  note: string | null;
  completedDates: string[]; // e.g. ["2026-05-29"]
  generatedDates: string[]; // e.g. ["2026-05-29"]
  userId: string;
  createdAt: string;
  updatedAt: string;
}