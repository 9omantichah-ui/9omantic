"use client";

import { useState } from "react";
import { Todo, Project } from "@/lib/types";

interface TodoFormProps {
  todo?: Todo;
  projects: Project[];
  defaultZone?: number;
  onSubmit: (data: {
    title: string;
    description: string;
    priority: string;
    projectId: string;
    zone: number;
    scheduledDate: string;
  }) => void;
  onCancel?: () => void;
}

export default function TodoForm({ todo, projects, defaultZone, onSubmit, onCancel }: TodoFormProps) {
  const [title, setTitle] = useState(todo?.title || "");
  const [description, setDescription] = useState(todo?.description || "");
  const [priority, setPriority] = useState(todo?.priority || "medium");
  const [projectId, setProjectId] = useState(todo?.projectId || "");
  const [zone, setZone] = useState(todo?.zone ?? defaultZone ?? 0);
  const [scheduledDate, setScheduledDate] = useState(todo?.scheduledDate || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, priority, projectId, zone, scheduledDate });
    if (!todo) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setScheduledDate("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="任务标题 *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
        required
        autoFocus
      />
      <textarea
        placeholder="任务描述（可选）"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        {/* 所属项目 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">所属项目</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">无项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {/* 计划日期 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">计划开始日期</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {/* 优先级 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">优先级</span>
          {(["low", "medium", "high"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                priority === p
                  ? p === "high"
                    ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                    : p === "medium"
                    ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300"
                    : "bg-green-100 text-green-700 ring-2 ring-green-300"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {p === "high" ? "高" : p === "medium" ? "中" : "低"}
            </button>
          ))}
        </div>
        {/* 顺位区 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">顺位区</span>
          {[0, 1, 2, 3].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZone(z)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                zone === z
                  ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {z === 0 ? "待分配" : `第${z}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          {todo ? "更新" : "添加"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}