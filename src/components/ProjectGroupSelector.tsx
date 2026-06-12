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
}: ProjectGroupSelectorProps) {
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectGroupId, setNewProjectGroupId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

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

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData("projectId", projectId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverGroupId(groupId);
  };

  const handleDragLeave = () => {
    setDragOverGroupId(null);
  };

  const handleDrop = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const projectId = e.dataTransfer.getData("projectId");
    if (projectId) {
      onMoveProject(projectId, groupId);
    }
    setDragOverGroupId(null);
  };

  return (
    <div className="space-y-2">
      {/* 未分类按钮 */}
      <div
        className="flex items-center gap-1.5 flex-wrap"
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        <button
          onClick={() => onSelectProject("")}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
            selectedProjectId === "" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          未分类
        </button>
        {ungroupedProjects.map(p => (
          <button
            key={p.id}
            draggable
            onDragStart={(e) => handleDragStart(e, p.id)}
            onClick={() => onSelectProject(p.id)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white transition-all cursor-grab active:cursor-grabbing ${
              selectedProjectId === p.id ? "ring-2 ring-offset-1 ring-gray-300" : "opacity-55 hover:opacity-85"
            }`}
            style={{ backgroundColor: p.color }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* 项目组 */}
      {projectGroups.map(group => (
        <div
          key={group.id}
          className={`rounded-lg border transition-all ${
            dragOverGroupId === group.id ? "border-blue-300 bg-blue-50/50" : "border-gray-100 bg-gray-50/50"
          }`}
          onDragOver={(e) => handleDragOver(e, group.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, group.id)}
        >
          <button
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
                <button
                  key={p.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, p.id)}
                  onClick={() => onSelectProject(p.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white transition-all cursor-grab active:cursor-grabbing ${
                    selectedProjectId === p.id ? "ring-2 ring-offset-1 ring-gray-300" : "opacity-55 hover:opacity-85"
                  }`}
                  style={{ backgroundColor: p.color }}
                >
                  {p.name}
                </button>
              ))}
              {group.projects.length === 0 && (
                <span className="text-[9px] text-gray-300 italic">拖拽项目到此分组</span>
              )}
            </div>
          )}
        </div>
      ))}

      {/* 操作按钮区 */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {showProjectForm ? (
          <span className="inline-flex items-center gap-1">
            <input
              type="text"
              placeholder="项目名"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateProject()}
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
            <button onClick={handleCreateProject} className="text-[10px] text-blue-600 font-medium">确定</button>
            <button onClick={() => { setShowProjectForm(false); setNewProjectName(""); }} className="text-[10px] text-gray-400">取消</button>
          </span>
        ) : (
          <button
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
              onKeyDown={e => e.key === "Enter" && handleCreateGroup()}
              className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-700 w-16 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
            <button onClick={handleCreateGroup} className="text-[10px] text-blue-600 font-medium">确定</button>
            <button onClick={() => { setShowGroupForm(false); setNewGroupName(""); }} className="text-[10px] text-gray-400">取消</button>
          </span>
        ) : (
          <button
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