'use client';

import { useState, useRef, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus, TaskPriority } from '@taskforge/shared';
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
  role: string;
  created_at: string;
}

interface GroupSectionProps {
  group: GroupConfig;
  tasks: Task[];
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
  orgMembers: OrgMember[];
}

const COL_GRID = 'grid-cols-[minmax(280px,2.5fr)_90px_140px_120px_110px_minmax(120px,1.5fr)]';

function EditableTitleCell({
  task,
  onTaskClick,
  onTitleChange,
  listeners,
  attributes,
  GripIcon,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTitleChange: (taskId: string, title: string) => void;
  listeners?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  GripIcon: () => JSX.Element;
}) {
  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleBlur() {
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onTitleChange(task.id, trimmed);
    } else {
      setLocalTitle(task.title);
    }
    setEditing(false);
  }

  return (
    <div className="flex items-center px-2 py-2 font-medium text-txt-primary">
      <button
        className="mr-1.5 shrink-0 cursor-grab rounded p-1 text-gray-300 opacity-0 transition hover:text-gray-500 active:cursor-grabbing group-hover/row:opacity-100"
        {...listeners}
        {...attributes}
      >
        <GripIcon />
      </button>
      {editing ? (
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
          className="min-w-0 flex-1 truncate bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      ) : (
        <>
          <span
            className="cursor-pointer truncate transition-colors hover:text-brand-500"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {task.title}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick(task);
            }}
            className="ml-1 flex-shrink-0 rounded p-0.5 text-gray-400 opacity-0 transition hover:text-brand-500 group-hover/row:opacity-100"
            title="Open task details"
            aria-label="Open task details"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
              <path d="M7 2l3 3-6 6H1V9l6-7z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
      {task.discord_message_url && (
        <span className="ml-2 flex-shrink-0 text-[10px] text-status-purple" title="From Discord">
          ⟡
        </span>
      )}
    </div>
  );
}

function GripIcon() {
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
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group/row grid ${COL_GRID} border-b border-monday-border text-sm transition-colors last:border-b-0 hover:bg-[#F5F6F8] ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      {/* Task title with drag handle */}
      <EditableTitleCell
        task={task}
        onTaskClick={onTaskClick}
        onTitleChange={onTitleChange}
        listeners={listeners as unknown as Record<string, unknown>}
        attributes={attributes as unknown as Record<string, unknown>}
        GripIcon={GripIcon}
      />

      {/* Owner */}
      <div className="flex items-center border-l border-monday-border py-1">
        <EditableOwnerCell
          assigneeUserId={task.assignee_user_id}
          orgMembers={orgMembers}
          onChange={(userId) => onAssigneeChange(task.id, userId)}
        />
      </div>

      {/* Status */}
      <div className="flex items-center border-l border-monday-border p-1">
        <StatusPill status={task.status} onChange={(s) => onStatusChange(task.id, s)} />
      </div>

      {/* Due date */}
      <div className="flex items-center border-l border-monday-border px-2 py-1">
        <EditableDueDateCell
          dueDate={task.due_date}
          onChange={(date) => onDueDateChange(task.id, date)}
        />
      </div>

      {/* Priority */}
      <div className="flex items-center border-l border-monday-border p-1">
        <PriorityPill
          priority={task.priority}
          onChange={(p) => onPriorityChange(task.id, p)}
        />
      </div>

      {/* Notes */}
      <div className="flex items-center border-l border-monday-border px-2 py-1">
        <EditableNotesCell
          description={task.description}
          onChange={(desc) => onDescriptionChange(task.id, desc)}
        />
      </div>
    </div>
  );
}

export function GroupSection({
  group,
  tasks,
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
  orgMembers,
}: GroupSectionProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({ id: group.status });

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function handleAdd() {
    const trimmed = newTitle.trim();
    if (trimmed) {
      onAddTask(trimmed, group.status);
      setNewTitle('');
    }
  }

  return (
    <div ref={setNodeRef} className="mb-5">
      {/* Group header */}
      <button
        onClick={onToggleCollapse}
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
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[15px] font-bold" style={{ color: group.color }}>
          {group.label}
        </span>
        <span className="text-xs text-txt-secondary">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </button>

      {!collapsed && (
        <div
          className={`overflow-hidden rounded-lg border bg-white transition-shadow ${
            isOver
              ? 'border-brand-500 shadow-[0_0_0_1px_theme(colors.brand.500)]'
              : 'border-monday-border'
          }`}
        >
          {/* Left color bar via border */}
          <div style={{ borderLeft: `5px solid ${group.color}` }}>
            {/* Column headers */}
            <div
              className={`grid ${COL_GRID} border-b border-monday-border bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-wider text-txt-secondary`}
            >
              <div className="px-4 py-2.5">Task</div>
              <div className="border-l border-monday-border px-2 py-2.5 text-center">Owner</div>
              <div className="border-l border-monday-border px-2 py-2.5 text-center">Status</div>
              <div className="border-l border-monday-border px-2 py-2.5 text-center">Due Date</div>
              <div className="border-l border-monday-border px-2 py-2.5 text-center">Priority</div>
              <div className="border-l border-monday-border px-2 py-2.5 text-center">Notes</div>
            </div>

            {/* Task rows */}
            {tasks.map((task) => (
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
              />
            ))}

            {/* Add task row */}
            <div
              className={`grid ${COL_GRID} text-sm`}
            >
              <div className="px-4 py-2">
                {adding ? (
                  <input
                    ref={inputRef}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') {
                        setAdding(false);
                        setNewTitle('');
                      }
                    }}
                    onBlur={() => {
                      handleAdd();
                      setAdding(false);
                      setNewTitle('');
                    }}
                    placeholder="+ Add task"
                    className="w-full bg-transparent text-sm text-txt-primary placeholder:text-txt-secondary focus:outline-none"
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
          </div>
        </div>
      )}
    </div>
  );
}
