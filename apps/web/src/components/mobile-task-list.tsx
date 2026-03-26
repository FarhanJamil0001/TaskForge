'use client';

import { useState, useMemo } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@taskforge/shared';
import type { TaskRow } from '@/lib/task-tree-rows';
import { plainTextFromHtml } from '@/lib/plain-text-from-html';
import { formatShortMonthDayFromYmd } from '@/lib/local-calendar-date';
import { StatusPill } from './status-pill';
import { PriorityPill } from './priority-pill';
import { EditableOwnerCell } from './editable-owner-cell';

const GROUPS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'backlog', label: 'To-Do', color: '#784BD1' },
  { status: 'in_progress', label: 'In Progress', color: '#579BFC' },
  { status: 'needs_testing', label: 'Needs Testing', color: '#A25DDC' },
  { status: 'done', label: 'Done', color: '#00C875' },
];


interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at: string;
}

interface MobileTaskListProps {
  tasks: Task[];
  taskRows?: TaskRow[];
  orgMembers: OrgMember[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onAssigneeChange: (taskId: string, assigneeUserId: string | null) => void;
  onAddTask: (title: string, status: TaskStatus) => void;
}

function TaskCard({
  task,
  groupColor,
  orgMembers,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  depth = 0,
}: {
  task: Task;
  groupColor: string;
  orgMembers: OrgMember[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onAssigneeChange: (taskId: string, assigneeUserId: string | null) => void;
  depth?: number;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTaskClick(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTaskClick(task);
        }
      }}
      className="flex w-full cursor-pointer overflow-hidden rounded-xl border border-monday-border bg-white text-left shadow-sm transition active:scale-[0.99] dark:border-zinc-600 dark:bg-zinc-800"
      style={depth > 0 ? { marginLeft: `${depth * 1}rem` } : undefined}
    >
      {/* Left accent bar */}
      <div
        className="w-1 shrink-0"
        style={{ backgroundColor: groupColor }}
        aria-hidden
      />

      <div className="min-w-0 flex-1 p-4">
        {/* Title & description */}
        <p className="font-medium text-txt-primary line-clamp-2 dark:text-zinc-100">{task.title}</p>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-txt-secondary dark:text-zinc-400">
            {plainTextFromHtml(task.description)}
          </p>
        )}

        {/* Metadata row: Status | Priority | Due */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-txt-secondary dark:text-zinc-400">Status</span>
            <StatusPill status={task.status} onChange={(s) => onStatusChange(task.id, s)} />
          </div>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-txt-secondary dark:text-zinc-400">Priority</span>
            <PriorityPill priority={task.priority} onChange={(p) => onPriorityChange(task.id, p)} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-txt-secondary">Due</span>
            <span className="text-xs text-txt-primary dark:text-zinc-100">
              {task.due_date
                ? formatShortMonthDayFromYmd(task.due_date) || '—'
                : '—'}
            </span>
          </div>
        </div>

        {/* Assignee row */}
        <div
          className="mt-3 flex items-center gap-2 border-t border-monday-border pt-3 dark:border-zinc-600"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-txt-secondary dark:text-zinc-400">Assigned to</span>
          <div className="shrink-0">
            <EditableOwnerCell
              assigneeUserId={task.assignee_user_id}
              orgMembers={orgMembers}
              onChange={(userId) => onAssigneeChange(task.id, userId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileTaskList({
  tasks,
  taskRows,
  orgMembers,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onAddTask,
}: MobileTaskListProps) {
  const rows = taskRows ?? tasks.map((t) => ({ task: t, depth: 0 }));

  const sectionRows = useMemo(() => {
    const map = new Map<TaskStatus, typeof rows>();
    for (const g of GROUPS) map.set(g.status, []);

    let currentStatus: TaskStatus | null = null;
    for (const row of rows) {
      if (row.depth === 0) currentStatus = row.task.status;
      if (currentStatus) map.get(currentStatus)?.push(row);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-6 md:hidden">
      {GROUPS.map((group) => {
        const groupRows = sectionRows.get(group.status) ?? [];
        const rootCount = groupRows.filter((r) => r.depth === 0).length;
        return (
          <section key={group.status} className="rounded-xl border border-monday-border bg-white p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="h-3 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <h3 className="font-semibold text-txt-primary dark:text-zinc-100">{group.label}</h3>
              <span className="ml-auto text-xs text-txt-secondary dark:text-zinc-400">
                {rootCount}
              </span>
            </div>
            <div className="space-y-3">
              {groupRows.map(({ task, depth }) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  groupColor={group.color}
                  orgMembers={orgMembers}
                  onTaskClick={onTaskClick}
                  onStatusChange={onStatusChange}
                  onPriorityChange={onPriorityChange}
                  onAssigneeChange={onAssigneeChange}
                  depth={depth}
                />
              ))}
              <AddTaskRow group={group} onAdd={onAddTask} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AddTaskRow({
  group,
  onAdd,
}: {
  group: { status: TaskStatus; label: string };
  onAdd: (title: string, status: TaskStatus) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  function handleAdd() {
    const t = title.trim();
    if (t) {
      onAdd(t, group.status);
      setTitle('');
      setAdding(false);
    }
  }

  if (adding) {
    return (
      <div className="rounded-xl border border-dashed border-monday-border bg-gray-50/50 p-3 dark:border-zinc-600 dark:bg-zinc-800/50">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
            if (e.key === 'Escape') {
              setAdding(false);
              setTitle('');
            }
          }}
          onBlur={() => {
            handleAdd();
            setAdding(false);
          }}
          placeholder="Task title..."
          className="w-full rounded-lg border border-monday-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-monday-border py-3 text-sm text-txt-secondary transition hover:border-brand-300 hover:text-brand-500 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-brand-500/50 dark:hover:text-brand-400"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
        <path d="M8 3v10M4 9h8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Add task
    </button>
  );
}

