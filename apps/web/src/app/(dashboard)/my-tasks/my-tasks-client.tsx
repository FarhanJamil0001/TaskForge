'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus, TaskPriority } from '@taskforge/shared';
import { buildTaskTreeRows, getUnassignedDescendantIds, type TaskRow } from '@/lib/task-tree-rows';
import {
  EditableTitleCell,
  GripIcon,
} from '@/components/group-section';
import { BoardToolbar, type SortField, type SortDir } from '@/components/board-toolbar';
import { StatusPill } from '@/components/status-pill';
import { PriorityPill } from '@/components/priority-pill';
import { EditableOwnerCell } from '@/components/editable-owner-cell';
import { EditableDueDateCell } from '@/components/editable-due-date-cell';
import { EditableNotesCell } from '@/components/editable-notes-cell';
import { TaskDetailDrawer } from '@/components/task-detail-drawer';
import { startOfLocalDayFromYmd } from '@/lib/local-calendar-date';

interface TaskWithProject extends Task {
  project_id: string;
  project_name: string;
  is_collaborator?: boolean;
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

const COL_GRID =
  'grid-cols-[minmax(280px,2.5fr)_minmax(100px,1fr)_90px_140px_120px_110px_minmax(120px,1.5fr)]';

const TASK_TABLE_DATA_ROW_CLASS = 'h-[52px] min-h-[52px] max-h-[52px]';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// ── Date bucket helpers ──

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

type DateBucket = 'overdue' | 'today' | 'tomorrow' | 'next_7_days' | 'later' | 'no_date';

interface BucketConfig {
  key: DateBucket;
  label: string;
  color: string;
}

const DATE_BUCKETS: BucketConfig[] = [
  { key: 'overdue', label: 'Overdue', color: '#E2445C' },
  { key: 'today', label: 'Today', color: '#FDAB3D' },
  { key: 'tomorrow', label: 'Tomorrow', color: '#579BFC' },
  { key: 'next_7_days', label: 'Next 7 Days', color: '#784BD1' },
  { key: 'later', label: 'Later', color: '#C4C4C4' },
  { key: 'no_date', label: 'No Due Date', color: '#C4C4C4' },
];

function getDateBucket(dueDateStr: string | null): DateBucket {
  if (!dueDateStr) return 'no_date';
  const today = toDateOnly(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const dueRaw = startOfLocalDayFromYmd(dueDateStr);
  if (Number.isNaN(dueRaw.getTime())) return 'no_date';
  const due = toDateOnly(dueRaw);

  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  if (due.getTime() === tomorrow.getTime()) return 'tomorrow';
  if (due <= weekEnd) return 'next_7_days';
  return 'later';
}

// ── Row component ──

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
  depth = 0,
}: {
  task: TaskWithProject;
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
  depth?: number;
}) {
  return (
    <div
      className={`group/row grid cursor-pointer ${TASK_TABLE_DATA_ROW_CLASS} ${COL_GRID} border-b border-monday-border text-sm transition-colors last:border-b-0 hover:bg-[#F5F6F8]`}
      onClick={() => onTaskClick(task)}
    >
      <EditableTitleCell
        task={task}
        onTaskClick={onTaskClick}
        onTitleChange={onTitleChange}
        GripIcon={GripIcon}
        depth={depth}
      />

      <div className="flex min-h-0 min-w-0 items-center gap-1.5 overflow-hidden border-l border-monday-border px-2 py-1">
        <Link
          href={`/projects/${projectId}`}
          onClick={(e) => e.stopPropagation()}
          className="truncate text-sm text-brand-500 hover:underline"
        >
          {projectName}
        </Link>
        {task.is_collaborator && (
          <span
            className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            title="You are a collaborator, not the assignee"
          >
            Collab
          </span>
        )}
      </div>

      <div
        className="flex min-h-0 min-w-0 items-center overflow-hidden border-l border-monday-border py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <EditableOwnerCell
          assigneeUserId={task.assignee_user_id}
          orgMembers={orgMembers}
          onChange={(userId) => onAssigneeChange(task.id, userId)}
        />
      </div>

      <div
        className="flex min-h-0 min-w-0 items-center overflow-hidden border-l border-monday-border p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusPill
          status={task.status}
          onChange={(s) => onStatusChange(task.id, s)}
        />
      </div>

      <div
        className="flex min-h-0 min-w-0 items-center overflow-hidden border-l border-monday-border px-2 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <EditableDueDateCell
          dueDate={task.due_date}
          onChange={(date) => onDueDateChange(task.id, date)}
        />
      </div>

      <div
        className="flex min-h-0 min-w-0 items-center overflow-hidden border-l border-monday-border p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <PriorityPill
          priority={task.priority}
          onChange={(p) => onPriorityChange(task.id, p)}
        />
      </div>

      <div
        className="flex min-h-0 min-w-0 items-center overflow-hidden border-l border-monday-border px-2 py-0.5"
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

// ── Sortable column header ──

function SortableHeader({
  field,
  label,
  currentField,
  currentDir,
  onSort,
  align = 'center',
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField, dir: SortDir) => void;
  align?: 'left' | 'center';
}) {
  const isActive = currentField === field;
  return (
    <button
      type="button"
      onClick={() => {
        const newDir = isActive && currentDir === 'asc' ? 'desc' : 'asc';
        onSort(field, newDir);
      }}
      className={`flex w-full items-center gap-1 transition hover:text-brand-500 dark:hover:text-brand-400 ${
        align === 'left' ? 'justify-start' : 'justify-center'
      } ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-inherit'}`}
    >
      {label}
      {isActive && (
        <span className="text-[10px]" aria-hidden>
          {currentDir === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );
}

// ── Section component (reusable for date buckets and needs-testing) ──

function TaskSection({
  label,
  color,
  tasks,
  taskRows,
  collapsed,
  onToggle,
  renderRow,
  sortField,
  sortDir,
  onSortChange,
}: {
  label: string;
  color: string;
  tasks: TaskWithProject[];
  taskRows?: TaskRow[];
  collapsed: boolean;
  onToggle: () => void;
  renderRow: (task: TaskWithProject, depth: number) => React.ReactNode;
  sortField: SortField;
  sortDir: SortDir;
  onSortChange: (field: SortField, dir: SortDir) => void;
}) {
  if (tasks.length === 0) return null;

  const rows = taskRows ?? tasks.map((t) => ({ task: t, depth: 0 }));

  return (
    <div className="mb-5">
      <button
        onClick={onToggle}
        className="group mb-1 flex items-center gap-2 rounded px-1 py-1 transition hover:bg-gray-100 dark:hover:bg-zinc-800"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}
          style={{ color }}
        >
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[15px] font-bold" style={{ color }}>
          {label}
        </span>
        <span className="text-xs text-txt-secondary dark:text-zinc-400">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </button>

      {!collapsed && (
        <div className="overflow-hidden rounded-lg border border-monday-border bg-white dark:border-zinc-600 dark:bg-zinc-800">
          <div style={{ borderLeft: `5px solid ${color}` }}>
            <div
              className={`grid ${COL_GRID} border-b border-monday-border bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-wider text-txt-secondary dark:border-zinc-600 dark:bg-zinc-700/80 dark:text-zinc-300`}
            >
              <div className="px-4 py-2.5">
                <SortableHeader
                  field="title"
                  label="Task"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={onSortChange}
                  align="left"
                />
              </div>
              <div className="border-l border-monday-border px-2 py-2.5">
                <SortableHeader
                  field="project_name"
                  label="Project"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={onSortChange}
                />
              </div>
              <div className="border-l border-monday-border px-2 py-2.5">
                <SortableHeader
                  field="assignee_user_id"
                  label="Owner"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={onSortChange}
                />
              </div>
              <div className="border-l border-monday-border px-2 py-2.5">
                <SortableHeader
                  field="status"
                  label="Status"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={onSortChange}
                />
              </div>
              <div className="border-l border-monday-border px-2 py-2.5">
                <SortableHeader
                  field="due_date"
                  label="Due Date"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={onSortChange}
                />
              </div>
              <div className="border-l border-monday-border px-2 py-2.5">
                <SortableHeader
                  field="priority"
                  label="Priority"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={onSortChange}
                />
              </div>
              <div className="border-l border-monday-border px-2 py-2.5 text-center dark:border-zinc-600">Notes</div>
            </div>
            {rows.map(({ task, depth }) => renderRow(task as TaskWithProject, depth))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main client component ──

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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const supabase = createClient();

  const taskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);

  const effectiveRoots = useMemo(() => {
    const ids = taskIds;
    return tasks.filter(
      (t) => !t.parent_task_id || !ids.has(t.parent_task_id),
    );
  }, [tasks, taskIds]);

  const filteredAndSortedRoots = useMemo(() => {
    let result = [...effectiveRoots];

    if (!showCompleted) {
      result = result.filter((t) => t.status !== 'done');
    }

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
          const aRaw = a.due_date
            ? startOfLocalDayFromYmd(a.due_date).getTime()
            : Infinity;
          const bRaw = b.due_date
            ? startOfLocalDayFromYmd(b.due_date).getTime()
            : Infinity;
          const aDate = Number.isNaN(aRaw) ? Infinity : aRaw;
          const bDate = Number.isNaN(bRaw) ? Infinity : bRaw;
          cmp = aDate - bDate;
          break;
        }
        case 'status': {
          const STATUS_ORDER: Record<TaskStatus, number> = {
            backlog: 0,
            in_progress: 1,
            needs_testing: 2,
            done: 3,
          };
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        }
        case 'assignee_user_id': {
          const aVal = a.assignee_user_id ?? '';
          const bVal = b.assignee_user_id ?? '';
          cmp = aVal.localeCompare(bVal);
          break;
        }
        case 'project_name':
          cmp = (a.project_name ?? '').localeCompare(b.project_name ?? '');
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [effectiveRoots, search, sortField, sortDir, filterPriority, showCompleted]);

  const { needsTestingRoots, dateBucketRoots, completedRoots } = useMemo(() => {
    const needsTesting: TaskWithProject[] = [];
    const completed: TaskWithProject[] = [];
    const buckets: Record<DateBucket, TaskWithProject[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      next_7_days: [],
      later: [],
      no_date: [],
    };

    for (const t of filteredAndSortedRoots) {
      const hasIncompleteSubtasks = tasks.some(
        (s) => s.parent_task_id === t.id && s.status !== 'done',
      );
      if (t.status === 'done' && !hasIncompleteSubtasks) {
        completed.push(t);
      } else if (t.status === 'needs_testing' && !hasIncompleteSubtasks) {
        needsTesting.push(t);
      } else {
        buckets[getDateBucket(t.due_date)].push(t);
      }
    }

    return { needsTestingRoots: needsTesting, dateBucketRoots: buckets, completedRoots: completed };
  }, [filteredAndSortedRoots, tasks]);

  const needsTestingRows = useMemo(
    () => buildTaskTreeRows(tasks, needsTestingRoots),
    [tasks, needsTestingRoots],
  );

  const dateBucketRows = useMemo(() => {
    const result: Record<DateBucket, TaskRow[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      next_7_days: [],
      later: [],
      no_date: [],
    };
    for (const key of Object.keys(dateBucketRoots) as DateBucket[]) {
      result[key] = buildTaskTreeRows(tasks, dateBucketRoots[key]);
    }
    return result;
  }, [tasks, dateBucketRoots]);

  const completedRows = useMemo(
    () => buildTaskTreeRows(tasks, completedRoots),
    [tasks, completedRoots],
  );

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleUpdate = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      let cascadeIds: string[] = [];

      // My Tasks only loads assigned/collab tasks, so the local list usually omits
      // unassigned subtasks. Resolve descendants from the full board task set.
      if ('assignee_user_id' in updates && updates.assignee_user_id) {
        const { data: self } = await supabase
          .from('tasks')
          .select('board_id')
          .eq('id', taskId)
          .maybeSingle();
        if (self?.board_id) {
          const { data: boardTasks } = await supabase
            .from('tasks')
            .select('id, parent_task_id, assignee_user_id')
            .eq('board_id', self.board_id);
          cascadeIds = getUnassignedDescendantIds(boardTasks ?? [], taskId);
        }
      }

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) return { ...t, ...updates };
          if (cascadeIds.includes(t.id))
            return { ...t, assignee_user_id: updates.assignee_user_id! };
          return t;
        }),
      );
      await supabase.from('tasks').update(updates).eq('id', taskId);
      if (cascadeIds.length > 0) {
        await supabase
          .from('tasks')
          .update({ assignee_user_id: updates.assignee_user_id! })
          .in('id', cascadeIds);
      }
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

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const renderRow = useCallback(
    (task: TaskWithProject, depth: number = 0) => (
      <MyTasksTaskRow
        key={task.id}
        task={task}
        projectId={task.project_id}
        projectName={task.project_name}
        onTaskClick={(t) => setEditTask(t as TaskWithProject)}
        onStatusChange={(id, s) => handleUpdate(id, { status: s })}
        onPriorityChange={(id, p) => handleUpdate(id, { priority: p })}
        onAssigneeChange={(id, u) => handleUpdate(id, { assignee_user_id: u })}
        onDueDateChange={(id, d) => handleUpdate(id, { due_date: d })}
        onDescriptionChange={(id, desc) => handleUpdate(id, { description: desc })}
        onTitleChange={(id, t) => handleUpdate(id, { title: t })}
        orgMembers={orgMembers}
        depth={depth}
      />
    ),
    [handleUpdate, orgMembers],
  );

  const incompleteTotalCount = effectiveRoots.filter((t) => t.status !== 'done').length;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 text-[22px] font-bold text-txt-primary">My Tasks</h1>
          <p className="text-sm text-txt-secondary">
            Tasks assigned to you or where you collaborate
          </p>
        </div>
      </div>

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
          <h3 className="mb-1 text-lg font-semibold text-txt-primary">No tasks assigned</h3>
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

          {/* Show completed toggle */}
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
                showCompleted
                  ? 'bg-green-50 text-green-700'
                  : 'text-txt-secondary hover:bg-gray-100'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                {showCompleted ? (
                  <><rect x="2" y="2" width="12" height="12" rx="2" strokeWidth="1.5" /><path d="M5 8l2 2 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>
                ) : (
                  <rect x="2" y="2" width="12" height="12" rx="2" strokeWidth="1.5" />
                )}
              </svg>
              Show completed
              {!showCompleted && tasks.filter((t) => t.status === 'done').length > 0 && (
                <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {tasks.filter((t) => t.status === 'done').length}
                </span>
              )}
            </button>

            {incompleteTotalCount > 0 && (
              <span className="text-xs text-txt-secondary">
                {incompleteTotalCount} incomplete {incompleteTotalCount === 1 ? 'task' : 'tasks'}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Needs Testing section */}
              <TaskSection
                label="Needs Testing"
                color="#A25DDC"
                tasks={needsTestingRoots}
                taskRows={needsTestingRows}
                collapsed={collapsedSections.has('needs_testing')}
                onToggle={() => toggleSection('needs_testing')}
                renderRow={renderRow}
                sortField={sortField}
                sortDir={sortDir}
                onSortChange={(field, dir) => {
                  setSortField(field);
                  setSortDir(dir);
                }}
              />

              {/* Date-based buckets */}
              {DATE_BUCKETS.map((bucket) => {
                const bucketRoots = dateBucketRoots[bucket.key];
                const bucketRows = dateBucketRows[bucket.key];
                return (
                  <TaskSection
                    key={bucket.key}
                    label={bucket.label}
                    color={bucket.color}
                    tasks={bucketRoots}
                    taskRows={bucketRows}
                    collapsed={collapsedSections.has(bucket.key)}
                    onToggle={() => toggleSection(bucket.key)}
                    renderRow={renderRow}
                    sortField={sortField}
                    sortDir={sortDir}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                );
              })}

              {/* Completed section (only when toggled on) */}
              {showCompleted && (
                <TaskSection
                  label="Completed"
                  color="#00C875"
                  tasks={completedRoots}
                  taskRows={completedRows}
                  collapsed={collapsedSections.has('done')}
                  onToggle={() => toggleSection('done')}
                  renderRow={renderRow}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSortChange={(field, dir) => {
                    setSortField(field);
                    setSortDir(dir);
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}

      {editTask && (
        <TaskDetailDrawer
          task={editTask}
          onClose={() => setEditTask(null)}
          onUpdate={(updates) => handleUpdate(editTask.id, updates)}
          onDelete={() => handleDelete(editTask.id)}
          onNavigateToTask={(t) => setEditTask(t as typeof editTask)}
          onTaskCreated={(created) => {
            setTasks((prev) => {
              if (prev.some((t) => t.id === created.id)) return prev;
              const row: TaskWithProject = {
                ...created,
                acceptance_criteria: created.acceptance_criteria ?? [],
                project_id: editTask.project_id,
                project_name: editTask.project_name,
              };
              return [row, ...prev];
            });
          }}
          orgMembers={orgMembers}
        />
      )}
    </div>
  );
}
