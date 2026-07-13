"use client";

import { useState } from "react";
import { Todo, Project, ProjectGroup } from "@/lib/types";

export type SidebarView = "today" | "inbox" | string; // string = projectId

interface ProjectSidebarProps {
  todos: Todo[];
  projects: Project[];
  projectGroups: ProjectGroup[];
  planCount: number;
  selectedView: SidebarView;
  onSelectView: (view: SidebarView) => void;
  onCreateProject: (name: string) => void;
}

// 计算某项目下未完成待办数
function pendingCount(todos: Todo[], projectId: string | null): number {
  return todos.filter(t => t.projectId === projectId && !t.completed).length;
}

export default function ProjectSidebar({
  todos, projects, projectGroups, planCount, selectedView, onSelectView, onCreateProject,
}: ProjectSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const inboxCount = pendingCount(todos, null);

  // 分组内项目 + 未分组项目
  const groupedIds = new Set(projectGroups.flatMap(g => g.projects.map(p => p.id)));
  const ungrouped = projects.filter(p => !groupedIds.has(p.id));

  const submitCreate = () => {
    const name = newName.trim();
    if (!name) { setCreating(false); return; }
    onCreateProject(name);
    setNewName("");
    setCreating(false);
  };

  const NavItem = ({ view, dot, icon, name, meta, count }: {
    view: SidebarView; dot?: string; icon?: string; name: string; meta?: string; count?: number;
  }) => {
    const active = selectedView === view;
    return (
      <button
        onClick={() => onSelectView(view)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors mb-0.5 ${
          active ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        {dot ? (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
        ) : (
          <span className={`w-6 h-6 rounded-lg grid place-items-center text-[11px] flex-shrink-0 ${
            active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
          }`}>{icon}</span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] truncate">{name}</span>
          {meta && <span className="block text-[11px] text-gray-400 mt-0.5">{meta}</span>}
        </span>
        {count != null && count > 0 && (
          <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{count}</span>
        )}
      </button>
    );
  };

  const renderProject = (p: Project) => (
    <NavItem key={p.id} view={p.id} dot={p.color} name={p.name} count={pendingCount(todos, p.id)} />
  );

  return (
    <aside className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="px-3 pt-3 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">工作空间</div>
      <div className="flex-1 overflow-y-auto px-2">
        <NavItem view="today" icon="今" name="今日" meta="当日计划" count={planCount} />
        <NavItem view="inbox" icon="收" name="收件箱" meta="待归类、待判断" count={inboxCount} />

        <div className="text-[11px] font-bold text-gray-400 px-2.5 pt-3.5 pb-1.5">项目</div>

        {projectGroups.map(g => (
          <div key={g.id} className="mb-1">
            {g.projects.length > 0 && (
              <div className="px-2.5 py-1 text-[10px] font-medium text-gray-400">{g.name}</div>
            )}
            {g.projects.map(renderProject)}
          </div>
        ))}
        {ungrouped.map(renderProject)}

        {projects.length === 0 && (
          <div className="px-2.5 py-3 text-[12px] text-gray-300">还没有项目</div>
        )}
      </div>

      <div className="border-t border-gray-100 p-2">
        {creating ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitCreate(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
              placeholder="项目名称"
              className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
            />
            <button onClick={submitCreate} className="text-[11px] text-blue-600 px-1.5 whitespace-nowrap">确定</button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full text-left px-2.5 py-2 text-[13px] text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
          >＋ 新建项目</button>
        )}
      </div>
    </aside>
  );
}