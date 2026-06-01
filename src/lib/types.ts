export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: { todos: number };
}

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  priority: "low" | "medium" | "high";
  zone: number; // 1, 2, 3
  order: number;
  scheduledDate: string | null;
  projectId: string | null;
  project: Project | null;
  createdAt: string;
  updatedAt: string;
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