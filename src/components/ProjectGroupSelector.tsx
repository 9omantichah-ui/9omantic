"use client";

import { useState } from "react";
import { Project, ProjectGroup } from "@/lib/types";

interface ProjectGroupSelectorProps {
  projects: Project[];
  projectGroups: ProjectGroup[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, groupId?: string) => void;
  onCreateGroup: (name: string) => void;
  onToggleGroupCollapse: (groupId: string, collapsed: boolean) => void;
  onMoveProject: (projectId: string, groupId: string | null) => void;
  onDeleteProject: (projectId: string) => void;
}

export default function ProjectGroupSelector({
  projects,
  projectGroups,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onCreateGroup,
  onToggleGroupCollapse,
  onMoveProject,
  onDeleteProject,
}: ProjectGroupSelectorProps) {
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectGroupId, setNewProjectGroupId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);

  const ungroupedProjects = projects.filter(p => !p.groupId && !projectGroups.some(g => g.projects.some(gp => gp.id === p.id)));

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), newProjectGroupId || undefined);
    setNewProjectName("");
    setNewProjectGroupId("");
    setShowProjectForm(false);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName.trim());
    setNewGroupName("");
    setShowGroupForm(false);
  };

  const handleDeleteProject = (p: Project) => {
    if (window.confirm(`确定删除项目「${p.name}」吗？该项目下的所有待办将一并删除，此操作不可恢复。`)) {
      onDeleteProject(p.id);
      setMoveMenuId(null);
    }
  };

  return (
    <div className="space-y-1.5" onMouseDown={e => e.stopPropagation()}>
      {/* 未分组项目 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onSelectProject("")}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
            selectedProjectId === "" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          未分类
        </button>
        {ungroupedProjects.map(p => (
          <span key={p.id} className="relative inline-flex">
            <button
              type="button"
              onClick={() => onSelectProject(p.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white transition-all ${
                selectedProjectId === p.id ? "ring-2 ring-offset-1 ring-gray-300" : "opacity-60 hover:opacity-90"
              }`}
              style={{ backgroundColor: p.color }}
            >
              {p.name}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMoveMenuId(moveMenuId === p.id ? null : p.id); }}
              className="ml-0.5 w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center text-[8px]"
              title="更多操作"
            >
              ⋯
            </button>
            {moveMenuId === p.id && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[90px]">
                {projectGroups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { onMoveProject(p.id, g.id); setMoveMenuId(null); }}
                    className="block w-full px-2.5 py-1 text-[10px] text-left text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  >
                    → {g.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleDeleteProject(p)}
                  className="block w-full px-2.5 py-1 text-[10px] text-left text-red-500 hover:bg-red-50 border-t border-gray-100 mt-0.5 pt-1"
                >
                  🗑 删除项目
                </button>
              </div>
            )}
          </span>
        ))}
      </div>

      {/* 项目组 */}
      {projectGroups.map(group => (
        <div key={group.id} className="rounded-lg border border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => onToggleGroupCollapse(group.id, !group.collapsed)}
            className="w-full flex items-center gap-1.5 px-2 py-1 text-left"
          >
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform ${group.collapsed ? "" : "rotate-90"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-500">{group.name}</span>
            <span className="text-[9px] text-gray-400">({group.projects.length})</span>
          </button>
          {!group.collapsed && (
            <div className="flex items-center gap-1.5 flex-wrap px-2 pb-1.5">
              {group.projects.map(p => (
                <span key={p.id} className="relative inline-flex">
                  <button
                    type="button"
                    onClick={() => onSelectProject(p.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white transition-all ${
                      selectedProjectId === p.id ? "ring-2 ring-offset-1 ring-gray-300" : "opacity-60 hover:opacity-90"
                    }`}
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMoveMenuId(moveMenuId === p.id ? null : p.id); }}
                    className="ml-0.5 w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center text-[8px]"
                    title="移出分组"
                  >
                    ↗
                  </button>
               {moveMenuId === p.id && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[90px]">
                      <button
                        type="button"
                        onClick={() => { onMoveProject(p.id, null); setMoveMenuId(null); }}
                        className="block w-full px-2.5 py-1 text-[10px] text-left text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                      >
                        → 未分组
                      </button>
                      {projectGroups.filter(g => g.id !== group.id).map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => { onMoveProject(p.id, g.id); setMoveMenuId(null); }}
                          className="block w-full px-2.5 py-1 text-[10px] text-left text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                        >
                          → {g.name}
                        </button>
                      ))}
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        type="button"
                        onClick={() => { handleDeleteProject(p); setMoveMenuId(null); }}
                        className="block w-full px-2.5 py-1 text-[10px] text-left text-red-500 hover:bg-red-50"
                      >
                        🗑 删除项目
                      </button>
                    </div>
                  )}
                </span>
              ))}
              {group.projects.length === 0 && (
                <span className="text-[9px] text-gray-300 italic">暂无项目</span>
              )}
            </div>
          )}
        </div>
      ))}

      {/* 操作按钮 */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {showProjectForm ? (
          <span className="inline-flex items-center gap-1">
            <input
              type="text"
              placeholder="项目名"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreateProject(); } }}
              className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-700 w-16 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
            {projectGroups.length > 0 && (
              <select
                value={newProjectGroupId}
                onChange={e => setNewProjectGroupId(e.target.value)}
                className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-600 focus:outline-none"
              >
                <option value="">未分组</option>
                {projectGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={handleCreateProject} className="text-[10px] text-blue-600 font-medium">确定</button>
            <button type="button" onClick={() => { setShowProjectForm(false); setNewProjectName(""); }} className="text-[10px] text-gray-400">取消</button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowProjectForm(true)}
            className="px-1.5 py-0.5 rounded-full text-[10px] border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500"
          >
            + 新建项目
          </button>
        )}

        {showGroupForm ? (
          <span className="inline-flex items-center gap-1">
            <input
              type="text"
              placeholder="分组名"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreateGroup(); } }}
              className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-700 w-16 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
            <button type="button" onClick={handleCreateGroup} className="text-[10px] text-blue-600 font-medium">确定</button>
            <button type="button" onClick={() => { setShowGroupForm(false); setNewGroupName(""); }} className="text-[10px] text-gray-400">取消</button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowGroupForm(true)}
            className="px-1.5 py-0.5 rounded-full text-[10px] border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500"
          >
            + 新建分组
          </button>
        )}
      </div>
    </div>
  );
}