'use client';

import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus, TaskPriority } from '@taskforge/shared';
import type { TaskRow } from '@/lib/task-tree-rows';
import type { SortField, SortDir } from './board-toolbar';
import { StatusPill } from './status-pill';
import { PriorityPill } from './priority-pill';
import { EditableOwnerCell } from './editable-owner-cell';
import { EditableDueDateCell } from './editable-due-date-cell';
import { EditableNotesCell } from './editable-notes-cell';

export interface GroupConfig {
  status: TaskStatus;
  label: string;
  color: string;
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

export interface TableSelection {
  selectedIds: Set<string>;
  onToggleTask: (taskId: string) => void;
  onSelectAllInSection: (taskIds: string[], select: boolean) => void;
  onRowContextMenu: (e: ReactMouseEvent, task: Task) => void;
}

interface GroupSectionProps {
  group: GroupConfig;
  tasks: Task[];
  taskRows?: TaskRow[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onAssigneeChange: (taskId: string, assigneeUserId: string | null) => void;
  onDueDateChange: (taskId: string, dueDate: string | null) => void;
  onDescriptionChange: (taskId: string, description: string | null) => void;
  onTitleChange: (taskId: string, title: string) => void;
  onAddTask: (title: string, status: TaskStatus) => void;
  onAddTaskDone?: () => void;
  forceAdding?: boolean;
  orgMembers: OrgMember[];
  hideHeader?: boolean;
  droppableId?: string;
  sortField?: SortField;
  sortDir?: SortDir;
  onSortChange?: (field: SortField, dir: SortDir) => void;
  selection?: TableSelection;
}

function SortableHeader({
  field,
  label,
  currentField,
  currentDir,
  onSort,
}: {
  field: SortField | null;
  label: string;
  currentField?: SortField;
  currentDir?: SortDir;
  onSort?: (field: SortField, dir: SortDir) => void;
}) {
  if (field === null || !onSort) {
    return <div>{label}</div>;
  }
  const isActive = currentField === field;
  const isTaskColumn = field === 'title';
  return (
    <button
      type="button"
      onClick={() => {
        const newDir = isActive && currentDir === 'asc' ? 'desc' : 'asc';
        onSort(field, newDir);
      }}
      className={`flex w-full items-center gap-1 transition hover:text-brand-500 ${
        isTaskColumn ? 'justify-start' : 'justify-center'
      } ${isActive ? 'text-brand-600' : ''}`}
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

const COL_GRID = 'grid-cols-[minmax(280px,2.5fr)_90px_140px_120px_110px_minmax(120px,1.5fr)]';
const COL_GRID_WITH_SELECT =
  'grid-cols-[36px_minmax(280px,2.5fr)_90px_140px_120px_110px_minmax(120px,1.5fr)]';

/** Fixed height so long notes/descriptions do not stretch board rows */
const TASK_TABLE_DATA_ROW_CLASS = 'h-[52px] min-h-[52px] max-h-[52px]';

export function EditableTitleCell({
  task,
  onTaskClick,
  onTitleChange,
  GripIcon,
  dragHandleProps,
  depth = 0,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTitleChange: (taskId: string, title: string) => void;
  GripIcon: () => JSX.Element;
  dragHandleProps?: { attributes: object; listeners: object | undefined };
  depth?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(task.title);
  const [inputWidth, setInputWidth] = useState(40);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setLocalTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (editing && measureRef.current) {
      const w = measureRef.current.getBoundingClientRect().width;
      setInputWidth(Math.max(w, 40));
    }
  }, [editing, localTitle]);

  function handleBlur() {
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onTitleChange(task.id, trimmed);
    } else {
      setLocalTitle(task.title);
    }
    setEditing(false);
  }

  const gripListeners = dragHandleProps?.listeners as
    | (Record<string, unknown> & { onPointerDown?: (e: React.PointerEvent) => void })
    | undefined;
  const { onPointerDown: gripOnPointerDown, ...gripRestListeners } = gripListeners ?? {};

  return (
    <div
      className="flex min-h-0 min-w-0 items-center overflow-hidden px-2 py-1.5 font-medium text-txt-primary dark:text-zinc-100"
      style={depth > 0 ? { paddingLeft: `${0.5 + depth * 1.25}rem` } : undefined}
    >
      {depth > 0 && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="mr-1.5 shrink-0 text-gray-300 dark:text-zinc-600"
        >
          <path d="M3 2V8H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {dragHandleProps ? (
        <div
          {...dragHandleProps.attributes}
          {...gripRestListeners}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            gripOnPointerDown?.(e);
            e.stopPropagation();
          }}
          className="mr-1.5 flex shrink-0 cursor-grab touch-none select-none rounded p-1 text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-txt-primary active:cursor-grabbing group-hover/row:opacity-100 dark:text-zinc-500 dark:hover:bg-zinc-700"
          title="Drag to move"
          aria-label="Drag to reorder"
        >
          <GripIcon />
        </div>
      ) : (
        <div className="mr-1.5 shrink-0 rounded p-1 text-gray-300 opacity-0 transition group-hover/row:opacity-100 dark:text-zinc-500">
          <GripIcon />
        </div>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTaskClick(task);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="mr-1.5 flex-shrink-0 rounded p-0.5 text-gray-400 opacity-0 transition hover:text-brand-500 group-hover/row:opacity-100 dark:text-zinc-500"
        title="Open task details"
        aria-label="Open task details"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
          <path d="M7 2l3 3-6 6H1V9l6-7z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="relative flex min-w-0 flex-1 items-center">
        {editing ? (
          <>
            <span
              ref={measureRef}
              className="invisible absolute left-0 top-0 whitespace-pre font-medium"
              aria-hidden
            >
              {localTitle || '\u00A0'}
            </span>
            <input
              ref={inputRef}
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  setLocalTitle(task.title);
                  setEditing(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ width: inputWidth }}
              className="min-w-[2ch] shrink-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </>
        ) : (
          <span
            className="inline-block max-w-full cursor-pointer truncate transition-colors hover:text-brand-500 dark:hover:text-brand-400"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {task.title}
          </span>
        )}
        {task.discord_message_url && (
          <span className="ml-2 flex-shrink-0 text-[10px] text-status-purple" title="From Discord">
            ⟡
          </span>
        )}
      </div>
    </div>
  );
}

export function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="2" r="1" />
      <circle cx="8" cy="2" r="1" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="10" r="1" />
      <circle cx="8" cy="10" r="1" />
    </svg>
  );
}

function SectionSelectAllCheckbox({
  tasks,
  selection,
}: {
  tasks: Task[];
  selection: TableSelection;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const ids = tasks.map((t) => t.id);
  const selectedInSection = ids.filter((id) => selection.selectedIds.has(id));
  const allSelected = ids.length > 0 && selectedInSection.length === ids.length;
  const someSelected = selectedInSection.length > 0 && !allSelected;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSelected}
      onChange={() => selection.onSelectAllInSection(ids, !allSelected)}
      className="h-3.5 w-3.5 rounded border-monday-border text-brand-500 focus:ring-brand-500"
      aria-label={allSelected ? 'Deselect all tasks in this section' : 'Select all tasks in this section'}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function DraggableTaskRow({
  task,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
  onDescriptionChange,
  onTitleChange,
  orgMembers,
  selection,
  depth = 0,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onAssigneeChange: (taskId: string, assigneeUserId: string | null) => void;
  onDueDateChange: (taskId: string, dueDate: string | null) => void;
  onDescriptionChange: (taskId: string, description: string | null) => void;
  onTitleChange: (taskId: string, title: string) => void;
  orgMembers: OrgMember[];
  selection?: TableSelection;
  depth?: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const isSelected = selection?.selectedIds.has(task.id) ?? false;

  return (
    <div
      ref={setNodeRef}
      onClickCapture={(e) => {
        if (selection && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          e.stopPropagation();
          selection.onToggleTask(task.id);
        }
      }}
      onClick={() => onTaskClick(task)}
      onContextMenu={(e) => selection?.onRowContextMenu(e, task)}
      className={`group/row grid cursor-pointer ${TASK_TABLE_DATA_ROW_CLASS} ${
        selection ? COL_GRID_WITH_SELECT : COL_GRID
      } border-b border-monday-border text-sm transition-colors last:border-b-0 hover:bg-[#F5F6F8] dark:border-zinc-600 dark:hover:bg-zinc-700/50 ${
        isDragging ? 'opacity-30' : ''
      } ${isSelected ? 'bg-brand-50/80 dark:bg-brand-950/25' : ''}`}
    >
      {selection ? (
        <div
          className="flex min-h-0 items-center justify-center overflow-hidden border-r border-monday-border dark:border-zinc-600"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => selection.onToggleTask(task.id)}
            className="h-3.5 w-3.5 rounded border-monday-border text-brand-500 focus:ring-brand-500"
            aria-label={`Select ${task.title}`}
          />
        </div>
      ) : null}
      {/* Task title */}
      <EditableTitleCell
        task={task}
        onTaskClick={onTaskClick}
        onTitleChange={onTitleChange}
        GripIcon={GripIcon}
        dragHandleProps={{ attributes, listeners: listeners ?? {} }}
        depth={depth}
      />

      {/* Owner */}
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

      {/* Status */}
      <div
        className="flex min-h-0 min-w-0 items-center overflow-hidden border-l border-monday-border p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusPill status={task.status} onChange={(s) => onStatusChange(task.id, s)} />
      </div>

      {/* Due date */}
      <div
        className="flex min-h-0 min-w-0 items-center overflow-hidden border-l border-monday-border px-2 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <EditableDueDateCell
          dueDate={task.due_date}
          onChange={(date) => onDueDateChange(task.id, date)}
        />
      </div>

      {/* Priority */}
      <div
        className="flex min-h-0 min-w-0 items-center overflow-hidden border-l border-monday-border p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <PriorityPill
          priority={task.priority}
          onChange={(p) => onPriorityChange(task.id, p)}
        />
      </div>

      {/* Notes */}
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

const QUICK_ADD_GROUPS: TaskStatus[] = ['backlog', 'in_progress', 'needs_testing'];

export function GroupSection({
  group,
  tasks,
  taskRows,
  collapsed,
  onToggleCollapse,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
  onDescriptionChange,
  onTitleChange,
  onAddTask,
  onAddTaskDone,
  forceAdding,
  orgMembers,
  hideHeader,
  droppableId,
  sortField,
  sortDir,
  onSortChange,
  selection,
}: GroupSectionProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({ id: droppableId ?? group.status });

  const isAdding = adding || !!forceAdding;
  const showQuickAdd = QUICK_ADD_GROUPS.includes(group.status);

  useEffect(() => {
    if (forceAdding) setAdding(true);
  }, [forceAdding]);

  useEffect(() => {
    if (isAdding) {
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isAdding]);

  function handleBlur() {
    const trimmed = newTitle.trim();
    if (trimmed) {
      onAddTask(trimmed, group.status);
    }
    setNewTitle('');
    setAdding(false);
    onAddTaskDone?.();
  }

  return (
    <div ref={setNodeRef} className={hideHeader ? '' : 'mb-5'}>
      {/* Group header */}
      {!hideHeader && (
        <div className="group mb-1 flex items-center gap-2 rounded px-1 py-1">
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-2 transition hover:bg-gray-100"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}
              style={{ color: group.color }}
            >
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[15px] font-bold" style={{ color: group.color }}>
              {group.label}
            </span>
            <span className="text-xs text-txt-secondary">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </button>
          {showQuickAdd && !collapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAdding(true);
              }}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded text-txt-secondary transition hover:bg-gray-200 hover:text-brand-500"
              title={`Add task to ${group.label}`}
              aria-label={`Add task to ${group.label}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                <path d="M7 1v12M1 7h12" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}

      {!collapsed && (
        <div
          className={`overflow-hidden rounded-lg border bg-white transition-shadow dark:bg-zinc-800 ${
            isOver
              ? 'border-brand-500 shadow-[0_0_0_1px_theme(colors.brand.500)]'
              : 'border-monday-border dark:border-zinc-700'
          }`}
        >
          {/* Left color bar via border */}
          <div style={{ borderLeft: `5px solid ${group.color}` }}>
            {/* Column headers */}
            <div
              className={`grid ${
                selection ? COL_GRID_WITH_SELECT : COL_GRID
              } border-b border-monday-border bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-wider text-txt-secondary dark:border-zinc-600 dark:bg-zinc-700/80 dark:text-zinc-300`}
            >
              {selection ? (
                <div className="flex items-center justify-center border-r border-monday-border py-2.5 dark:border-zinc-600">
                  <SectionSelectAllCheckbox tasks={tasks} selection={selection} />
                </div>
              ) : null}
              <div className="px-4 py-2.5">
                <SortableHeader
                  field="title"
                  label="Task"
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

            {/* Add task row - at top so new tasks appear where you're typing */}
            <div
              className={`grid ${
                selection ? COL_GRID_WITH_SELECT : COL_GRID
              } border-b border-monday-border text-sm dark:border-zinc-600`}
            >
              {selection ? <div className="border-r border-monday-border dark:border-zinc-600" /> : null}
              <div className="px-4 py-2">
                {isAdding ? (
                  <input
                    ref={inputRef}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                      if (e.key === 'Escape') {
                        setNewTitle('');
                        setAdding(false);
                        onAddTaskDone?.();
                        inputRef.current?.blur();
                      }
                    }}
                    onBlur={handleBlur}
                    placeholder="Task title..."
                    className="w-full bg-transparent text-sm text-txt-primary placeholder:text-txt-secondary focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                ) : (
                  <button
                    onClick={() => setAdding(true)}
                    className="text-txt-secondary transition-colors hover:text-brand-500"
                  >
                    + Add task
                  </button>
                )}
              </div>
              <div className="col-span-5" />
            </div>

            {/* Task rows */}
            {(taskRows ?? tasks.map((t) => ({ task: t, depth: 0 }))).map(({ task, depth }) => (
              <DraggableTaskRow
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onStatusChange={onStatusChange}
                onPriorityChange={onPriorityChange}
                onAssigneeChange={onAssigneeChange}
                onDueDateChange={onDueDateChange}
                onDescriptionChange={onDescriptionChange}
                onTitleChange={onTitleChange}
                orgMembers={orgMembers}
                selection={selection}
                depth={depth}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
