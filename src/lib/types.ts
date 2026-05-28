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
  priority: "low" | "medium" | "high";
  zone: number; // 1, 2, 3
  order: number;
  scheduledDate: string | null;
  projectId: string | null;
  project: Project | null;
  createdAt: string;
  updatedAt: string;
}