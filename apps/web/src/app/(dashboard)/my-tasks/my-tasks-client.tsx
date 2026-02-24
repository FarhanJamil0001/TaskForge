'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus, TaskPriority } from '@taskforge/shared';
import {
  EditableTitleCell,
  GripIcon,
  type GroupConfig,
} from '@/components/group-section';
import { BoardToolbar, type SortField, type SortDir } from '@/components/board-toolbar';
import { StatusPill } from '@/components/status-pill';
import { PriorityPill } from '@/components/priority-pill';
import { EditableOwnerCell } from '@/components/editable-owner-cell';
import { EditableDueDateCell } from '@/components/editable-due-date-cell';
import { EditableNotesCell } from '@/components/editable-notes-cell';
import { TaskDetailModal } from '@/components/task-detail-modal';

interface TaskWithProject extends Task {
  project_id: string;
  project_name: string;
}

interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at: string;
}

// Match project board group order: To-Do, In Progress, Done
const GROUPS: GroupConfig[] = [
  { status: 'backlog', label: 'To-Do', color: '#784BD1' },
  { status: 'in_progress', label: 'In Progress', color: '#579BFC' },
  { status: 'done', label: 'Done', color: '#00C875' },
];

// Same as board-table GroupSection, with extra Project column
const COL_GRID =
  'grid-cols-[minmax(280px,2.5fr)_minmax(100px,1fr)_90px_140px_120px_110px_minmax(120px,1.5fr)]';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function MyTasksTaskRow({
  task,
  projectId,
  projectName,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
  onDescriptionChange,
  onTitleChange,
  orgMembers,
}: {
  task: Task;
  projectId: string;
  projectName: string;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onAssigneeChange: (taskId: string, assigneeUserId: string | null) => void;
  onDueDateChange: (taskId: string, dueDate: string | null) => void;
  onDescriptionChange: (taskId: string, description: string | null) => void;
  onTitleChange: (taskId: string, title: string) => void;
  orgMembers: OrgMember[];
}) {
  return (
    <div
      className={`group/row grid cursor-pointer ${COL_GRID} border-b border-monday-border text-sm transition-colors last:border-b-0 hover:bg-[#F5F6F8]`}
      onClick={() => onTaskClick(task)}
    >
      <EditableTitleCell
        task={task}
        onTaskClick={onTaskClick}
        onTitleChange={onTitleChange}
        GripIcon={GripIcon}
      />

      <div className="flex items-center border-l border-monday-border px-2 py-1">
        <Link
          href={`/projects/${projectId}`}
          onClick={(e) => e.stopPropagation()}
          className="truncate text-sm text-brand-500 hover:underline"
        >
          {projectName}
        </Link>
      </div>

      <div
        className="flex items-center border-l border-monday-border py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <EditableOwnerCell
          assigneeUserId={task.assignee_user_id}
          orgMembers={orgMembers}
          onChange={(userId) => onAssigneeChange(task.id, userId)}
        />
      </div>

      <div
        className="flex items-center border-l border-monday-border p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusPill
          status={task.status}
          onChange={(s) => onStatusChange(task.id, s)}
        />
      </div>

      <div
        className="flex items-center border-l border-monday-border px-2 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <EditableDueDateCell
          dueDate={task.due_date}
          onChange={(date) => onDueDateChange(task.id, date)}
        />
      </div>

      <div
        className="flex items-center border-l border-monday-border p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <PriorityPill
          priority={task.priority}
          onChange={(p) => onPriorityChange(task.id, p)}
        />
      </div>

      <div
        className="flex items-center border-l border-monday-border px-2 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <EditableNotesCell
          description={task.description}
          onChange={(desc) => onDescriptionChange(task.id, desc)}
        />
      </div>
    </div>
  );
}

export function MyTasksClient({
  tasks: initialTasks,
  orgMembers,
  userId,
}: {
  tasks: TaskWithProject[];
  orgMembers: OrgMember[];
  userId: string;
}) {
  const [tasks, setTasks] = useState<TaskWithProject[]>(initialTasks);
  const [editTask, setEditTask] = useState<TaskWithProject | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TaskStatus>>(
    new Set(),
  );
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const supabase = createClient();

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.project_name?.toLowerCase().includes(q),
      );
    }

    if (filterPriority !== 'all') {
      result = result.filter((t) => t.priority === filterPriority);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'priority':
          cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
        case 'due_date': {
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          cmp = aDate - bDate;
          break;
        }
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [tasks, search, sortField, sortDir, filterPriority]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskWithProject[]> = {
      backlog: [],
      in_progress: [],
      done: [],
    };
    filteredAndSortedTasks.forEach((t) => map[t.status].push(t));
    return map;
  }, [filteredAndSortedTasks]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleUpdate = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      );
      await supabase.from('tasks').update(updates).eq('id', taskId);
      if (editTask?.id === taskId) {
        setEditTask((prev) => (prev ? { ...prev, ...updates } : null));
      }
    },
    [supabase, editTask?.id],
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await supabase.from('tasks').delete().eq('id', taskId);
      setEditTask(null);
    },
    [supabase],
  );

  const toggleGroup = useCallback((status: TaskStatus) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold text-txt-primary">
        My Tasks
      </h1>
      <p className="mb-6 text-sm text-txt-secondary">
        Tasks assigned to you across all projects
      </p>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-monday-border bg-gray-50/50 py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 4h14v10H2V4z" />
              <path d="M6 2v4M12 2v4M2 8h14" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-semibold text-txt-primary">
            No tasks assigned
          </h3>
          <p className="text-center text-sm text-txt-secondary">
            Tasks assigned to you will appear here. Ask your team to assign you
            tasks, or create tasks and assign yourself.
          </p>
        </div>
      ) : (
        <>
          <BoardToolbar
            search={search}
            onSearchChange={setSearch}
            sortField={sortField}
            sortDir={sortDir}
            onSortChange={(field, dir) => {
              setSortField(field);
              setSortDir(dir);
            }}
            filterPriority={filterPriority}
            onFilterChange={setFilterPriority}
          />

          <div className="overflow-x-auto">
          <div className="min-w-[900px]">
          {GROUPS.map((group) => {
            const groupTasks = tasksByStatus[group.status];
            if (groupTasks.length === 0) return null;

            const collapsed = collapsedGroups.has(group.status);

            return (
              <div key={group.status} className="mb-5">
                <button
                  onClick={() => toggleGroup(group.status)}
                  className="group mb-1 flex items-center gap-2 rounded px-1 py-1 transition hover:bg-gray-100"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}
                    style={{ color: group.color }}
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    className="text-[15px] font-bold"
                    style={{ color: group.color }}
                  >
                    {group.label}
                  </span>
                  <span className="text-xs text-txt-secondary">
                    {groupTasks.length}{' '}
                    {groupTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </button>

                {!collapsed && (
                  <div className="overflow-hidden rounded-lg border border-monday-border bg-white">
                    <div style={{ borderLeft: `5px solid ${group.color}` }}>
                      <div
                        className={`grid ${COL_GRID} border-b border-monday-border bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-wider text-txt-secondary`}
                      >
                        <div className="px-4 py-2.5">Task</div>
                        <div className="border-l border-monday-border px-2 py-2.5 text-center">
                          Project
                        </div>
                        <div className="border-l border-monday-border px-2 py-2.5 text-center">
                          Owner
                        </div>
                        <div className="border-l border-monday-border px-2 py-2.5 text-center">
                          Status
                        </div>
                        <div className="border-l border-monday-border px-2 py-2.5 text-center">
                          Due Date
                        </div>
                        <div className="border-l border-monday-border px-2 py-2.5 text-center">
                          Priority
                        </div>
                        <div className="border-l border-monday-border px-2 py-2.5 text-center">
                          Notes
                        </div>
                      </div>

                      {groupTasks.map((task) => (
                        <MyTasksTaskRow
                          key={task.id}
                          task={task}
                          projectId={task.project_id}
                          projectName={task.project_name}
                          onTaskClick={(t) => setEditTask(t as TaskWithProject)}
                          onStatusChange={(id, s) => handleUpdate(id, { status: s })}
                          onPriorityChange={(id, p) =>
                            handleUpdate(id, { priority: p })
                          }
                          onAssigneeChange={(id, u) =>
                            handleUpdate(id, { assignee_user_id: u })
                          }
                          onDueDateChange={(id, d) =>
                            handleUpdate(id, { due_date: d })
                          }
                          onDescriptionChange={(id, desc) =>
                            handleUpdate(id, { description: desc })
                          }
                          onTitleChange={(id, t) => handleUpdate(id, { title: t })}
                          orgMembers={orgMembers}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
        </>
      )}

      {editTask && (
        <TaskDetailModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onUpdate={(updates) => handleUpdate(editTask.id, updates)}
          onDelete={() => handleDelete(editTask.id)}
        />
      )}
    </div>
  );
}
