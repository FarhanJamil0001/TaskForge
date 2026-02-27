'use client';

import {
  useState,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { ListKeymap } from '@tiptap/extension-list';
import type { Task, TaskStatus, TaskPriority } from '@taskforge/shared';
import { StatusPill } from './status-pill';
import { PriorityPill } from './priority-pill';

interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at: string;
}

interface TaskDetailDrawerProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  orgMembers: OrgMember[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Not Started',
  in_progress: 'Working on it',
  needs_testing: 'Needs Testing',
  done: 'Done',
};

function getMemberDisplayName(m: OrgMember): string {
  return [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email;
}

function MemberAvatar({
  userId,
  displayName,
  email,
  size = 28,
}: {
  userId: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: number;
}) {
  if (!userId) {
    return (
      <div
        className="flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-300 dark:border-zinc-600 dark:text-zinc-500"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.47}
          height={size * 0.47}
          viewBox="0 0 14 14"
          fill="none"
          className="stroke-current"
        >
          <circle cx="7" cy="5" r="3" strokeWidth="1.2" />
          <path d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5" strokeWidth="1.2" />
        </svg>
      </div>
    );
  }

  const hue = userId.charCodeAt(0) * 37 + userId.charCodeAt(1) * 17;
  const color = `hsl(${hue % 360}, 60%, 55%)`;
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : email
      ? email.slice(0, 2).toUpperCase()
      : userId.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color, width: size, height: size }}
      title={displayName || email || userId}
    >
      {initials}
    </div>
  );
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return `In ${diff} days`;
  return due.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: due.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function getDueDateColor(dateStr: string | null): string {
  if (!dateStr) return 'text-txt-secondary dark:text-zinc-400';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff < 0) return 'text-status-red';
  if (diff === 0) return 'text-status-orange';
  if (diff === 1) return 'text-status-blue';
  return 'text-txt-primary dark:text-zinc-200';
}

// ── Assignee Picker (inline for drawer) ──

function AssigneePicker({
  assigneeUserId,
  orgMembers,
  onChange,
}: {
  assigneeUserId: string | null;
  orgMembers: OrgMember[];
  onChange: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const currentMember = orgMembers.find((m) => m.user_id === assigneeUserId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-gray-100 dark:hover:bg-zinc-700"
      >
        <MemberAvatar
          userId={assigneeUserId}
          displayName={currentMember ? getMemberDisplayName(currentMember) : null}
          email={currentMember?.email}
          size={24}
        />
        <span className={assigneeUserId ? 'text-txt-primary dark:text-zinc-100' : 'text-txt-secondary dark:text-zinc-400'}>
          {currentMember ? getMemberDisplayName(currentMember) : 'Unassigned'}
        </span>
        {assigneeUserId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            aria-label="Remove assignee"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
              <path d="M2 2l8 8M10 2l-8 8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-[240px] w-[240px] overflow-y-auto rounded-lg border border-monday-border bg-white py-1 shadow-xl dark:border-zinc-600 dark:bg-zinc-800">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-txt-secondary transition hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            <MemberAvatar userId={null} size={24} />
            Unassigned
          </button>
          {orgMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onChange(m.user_id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-zinc-700 ${
                m.user_id === assigneeUserId
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                  : 'text-txt-primary dark:text-zinc-100'
              }`}
            >
              <MemberAvatar
                userId={m.user_id}
                displayName={getMemberDisplayName(m)}
                email={m.email}
                size={24}
              />
              <span className="truncate">{getMemberDisplayName(m)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Description Editor (TipTap) ──

function DescriptionEditor({
  initialContent,
  onSave,
}: {
  initialContent: string;
  onSave: (content: string) => void;
}) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialContent);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'What is this task about?',
      }),
      Highlight,
      ListKeymap,
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-0 py-2',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const html = ed.getHTML();
        const isEmpty = ed.isEmpty;
        const content = isEmpty ? '' : html;
        if (content !== lastSavedRef.current) {
          lastSavedRef.current = content;
          onSave(content || null as unknown as string);
        }
      }, 800);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1 border-b border-monday-border pb-2 dark:border-zinc-600">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            editor.isActive('bold')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1 text-xs italic transition ${
            editor.isActive('italic')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`rounded px-2 py-1 text-xs line-through transition ${
            editor.isActive('strike')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          S
        </button>
        <div className="mx-1 w-px bg-monday-border dark:bg-zinc-600" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded px-2 py-1 text-xs transition ${
            editor.isActive('bulletList')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
            <path d="M5 3h7M5 7h7M5 11h7" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="2" cy="3" r="1" fill="currentColor" />
            <circle cx="2" cy="7" r="1" fill="currentColor" />
            <circle cx="2" cy="11" r="1" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded px-2 py-1 text-xs transition ${
            editor.isActive('orderedList')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
            <path d="M5 3h7M5 7h7M5 11h7" strokeWidth="1.5" strokeLinecap="round" />
            <text x="0.5" y="5" fontSize="5" fill="currentColor" className="font-mono">1</text>
            <text x="0.5" y="9" fontSize="5" fill="currentColor" className="font-mono">2</text>
            <text x="0.5" y="13" fontSize="5" fill="currentColor" className="font-mono">3</text>
          </svg>
        </button>
        <div className="mx-1 w-px bg-monday-border dark:bg-zinc-600" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-2 py-1 text-xs font-bold transition ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`rounded px-2 py-1 text-xs transition ${
            editor.isActive('highlight')
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="9" width="12" height="4" rx="1" fill="currentColor" opacity="0.3" />
            <path d="M3 9V3a1 1 0 011-1h6a1 1 0 011 1v6" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

// ── Overflow Menu ──

function OverflowMenu({
  onDuplicate,
  onDelete,
  onCopyLink,
}: {
  onDuplicate?: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-txt-secondary transition hover:bg-gray-100 hover:text-txt-primary dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        title="More actions"
        aria-label="More actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[200px] rounded-lg border border-monday-border bg-white py-1 shadow-xl dark:border-zinc-600 dark:bg-zinc-800">
          <button
            onClick={() => {
              onCopyLink();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-txt-primary transition hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
              <path d="M6 8a3 3 0 004 .5l1.5-1.5a3 3 0 00-4.24-4.24L6 4" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M8 6a3 3 0 00-4-.5L2.5 7a3 3 0 004.24 4.24L8 10" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Copy link
          </button>
          {onDuplicate && (
            <button
              onClick={() => {
                onDuplicate();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-txt-primary transition hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                <rect x="4" y="4" width="8" height="8" rx="1.5" strokeWidth="1.2" />
                <path d="M10 4V2.5A1.5 1.5 0 008.5 1h-6A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H4" strokeWidth="1.2" />
              </svg>
              Duplicate task
            </button>
          )}
          <div className="my-1 border-t border-monday-border dark:border-zinc-600" />
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-status-red transition hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                <path d="M2 4h10M5 4V2.5A.5.5 0 015.5 2h3a.5.5 0 01.5.5V4M11 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Delete task
            </button>
          ) : (
            <div className="px-3 py-2">
              <p className="mb-2 text-xs text-status-red">Delete this task permanently?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onDelete();
                    setOpen(false);
                  }}
                  className="rounded bg-status-red px-3 py-1 text-xs font-medium text-white transition hover:opacity-90"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-txt-secondary hover:text-txt-primary dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Activity Item ──

function ActivityItem({
  type,
  payload,
  createdAt,
}: {
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}) {
  const date = new Date(createdAt);
  const timeStr = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  let icon: React.ReactNode;
  let message: string;

  switch (type) {
    case 'status_change':
      icon = (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-status-blue/10 text-status-blue">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
            <path d="M2 6h8M6 2v8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      );
      message = `Status changed to ${STATUS_LABELS[(payload.new_status as TaskStatus) ?? 'backlog'] ?? String(payload.new_status)}`;
      break;
    case 'assignment_change':
      icon = (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-status-purple/10 text-status-purple">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
            <circle cx="6" cy="4" r="2.5" strokeWidth="1.2" />
            <path d="M1 11c0-2.5 2-4.5 5-4.5s5 2 5 4.5" strokeWidth="1.2" />
          </svg>
        </div>
      );
      message = payload.new_assignee
        ? `Assigned to ${String(payload.new_assignee)}`
        : 'Unassigned';
      break;
    case 'due_date_change':
      icon = (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-status-orange/10 text-status-orange">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
            <rect x="1" y="2" width="10" height="9" rx="1.5" strokeWidth="1.2" />
            <path d="M1 5h10M4 0.5v3M8 0.5v3" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      );
      message = payload.new_date
        ? `Due date set to ${String(payload.new_date)}`
        : 'Due date removed';
      break;
    case 'completed':
      icon = (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-status-green/10 text-status-green">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
            <path d="M2.5 6l2.5 2.5 5-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
      message = 'Task marked as done';
      break;
    default:
      icon = (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-zinc-700 dark:text-zinc-500">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="6" cy="6" r="2" />
          </svg>
        </div>
      );
      message = type.replace(/_/g, ' ');
  }

  return (
    <div className="flex gap-3 py-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-txt-primary dark:text-zinc-200">{message}</p>
        <p className="mt-0.5 text-xs text-txt-secondary dark:text-zinc-500">{timeStr}</p>
      </div>
    </div>
  );
}

// ── Main Drawer Component ──

export function TaskDetailDrawer({
  task,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  orgMembers,
}: TaskDetailDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('activity');
  const [activities, setActivities] = useState<
    { id: string; type: string; payload: Record<string, unknown>; created_at: string }[]
  >([]);
  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const currentMember = orgMembers.find(
    (m) => m.user_id === task.assignee_user_id,
  );

  const isDone = task.status === 'done';
  const isNeedsTesting = task.status === 'needs_testing';

  // Animate open
  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  // Sync title from prop
  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleCloseRef.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load activity events
  useEffect(() => {
    async function loadActivity() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('task_events')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setActivities(data);
    }
    loadActivity();
  }, [task.id]);

  function handleClose() {
    setIsOpen(false);
    setTimeout(onClose, 200);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) handleClose();
  }

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate({ title: trimmed });
    } else {
      setTitle(task.title);
    }
    setEditingTitle(false);
  }

  function handleMarkReadyForTesting() {
    if (isDone) {
      onUpdate({ status: 'in_progress' });
    } else if (isNeedsTesting) {
      onUpdate({ status: 'done' });
    } else {
      onUpdate({ status: 'needs_testing' });
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}${window.location.pathname}?task=${task.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  const completionButtonLabel = isDone
    ? 'Mark incomplete'
    : isNeedsTesting
      ? 'Mark done'
      : 'Mark ready for testing';

  const completionButtonColor = isDone
    ? 'bg-status-green text-white hover:bg-status-green/90'
    : isNeedsTesting
      ? 'bg-status-green text-white hover:bg-status-green/90'
      : 'bg-status-purple text-white hover:bg-status-purple/90';

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-200 ${
        isOpen ? 'bg-black/30 backdrop-blur-[2px]' : 'bg-transparent'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={drawerRef}
        className={`flex h-full w-full flex-col border-l border-monday-border bg-white shadow-2xl transition-transform duration-200 ease-out dark:border-zinc-700 dark:bg-zinc-900 sm:w-[45%] sm:min-w-[420px] sm:max-w-[640px] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-monday-border px-5 py-3 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkReadyForTesting}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${completionButtonColor}`}
            >
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                  <path d="M12 2L5 12 2 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                  <circle cx="7" cy="7" r="5.5" strokeWidth="1.5" />
                  <path d="M4.5 7l1.75 1.75 3.25-3.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {completionButtonLabel}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Assignee avatar in header */}
            <MemberAvatar
              userId={task.assignee_user_id}
              displayName={
                currentMember ? getMemberDisplayName(currentMember) : null
              }
              email={currentMember?.email}
              size={28}
            />

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="flex h-8 w-8 items-center justify-center rounded-md text-txt-secondary transition hover:bg-gray-100 hover:text-txt-primary dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              title={copiedLink ? 'Copied!' : 'Copy link'}
              aria-label="Copy link"
            >
              {copiedLink ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-status-green">
                  <path d="M3 8l3.5 3.5 6.5-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                  <path d="M7 9a3.5 3.5 0 005 .5l2-2a3.5 3.5 0 00-5-5L7.5 4" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M9 7a3.5 3.5 0 00-5-.5l-2 2a3.5 3.5 0 005 5L8.5 12" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {/* Overflow menu */}
            <OverflowMenu
              onDuplicate={onDuplicate}
              onDelete={() => {
                onDelete();
                handleClose();
              }}
              onCopyLink={handleCopyLink}
            />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-txt-secondary transition hover:bg-gray-100 hover:text-txt-primary dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              title="Close (Esc)"
              aria-label="Close drawer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                <path d="M3 3l10 10M13 3L3 13" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5">
            {/* Task Title */}
            <div className="mb-6">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                      setTitle(task.title);
                      setEditingTitle(false);
                    }
                  }}
                  className="w-full bg-transparent text-xl font-bold text-txt-primary focus:outline-none dark:text-zinc-100"
                />
              ) : (
                <h1
                  onClick={() => setEditingTitle(true)}
                  className="cursor-text text-xl font-bold text-txt-primary transition-colors hover:text-brand-500 dark:text-zinc-100 dark:hover:text-brand-400"
                >
                  {task.title}
                  {task.status === 'done' && (
                    <span className="ml-2 inline-block rounded-full bg-status-green/10 px-2 py-0.5 text-xs font-medium text-status-green">
                      Completed
                    </span>
                  )}
                </h1>
              )}
            </div>

            {/* ── Metadata Block ── */}
            <div className="mb-6 space-y-0 rounded-lg border border-monday-border dark:border-zinc-700">
              {/* Assignee */}
              <div className="flex items-center border-b border-monday-border px-4 py-2.5 dark:border-zinc-700">
                <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wider text-txt-secondary dark:text-zinc-400">
                  Assignee
                </span>
                <div className="flex-1">
                  <AssigneePicker
                    assigneeUserId={task.assignee_user_id}
                    orgMembers={orgMembers}
                    onChange={(userId) =>
                      onUpdate({ assignee_user_id: userId })
                    }
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center border-b border-monday-border px-4 py-2.5 dark:border-zinc-700">
                <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wider text-txt-secondary dark:text-zinc-400">
                  Due Date
                </span>
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="date"
                    value={task.due_date ?? ''}
                    onChange={(e) =>
                      onUpdate({
                        due_date: e.target.value || null,
                      })
                    }
                    className="rounded-md border-none bg-transparent px-2 py-1 text-sm text-txt-primary focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-zinc-100"
                  />
                  <span
                    className={`text-xs ${getDueDateColor(task.due_date)}`}
                  >
                    {formatRelativeDate(task.due_date)}
                  </span>
                  {task.due_date && (
                    <button
                      onClick={() => onUpdate({ due_date: null })}
                      className="ml-auto text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                      aria-label="Clear due date"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
                        <path d="M2 2l8 8M10 2l-8 8" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center border-b border-monday-border px-4 py-2.5 dark:border-zinc-700">
                <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wider text-txt-secondary dark:text-zinc-400">
                  Status
                </span>
                <div className="w-[160px]">
                  <StatusPill
                    status={task.status}
                    onChange={(s) => onUpdate({ status: s })}
                  />
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center px-4 py-2.5">
                <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wider text-txt-secondary dark:text-zinc-400">
                  Priority
                </span>
                <div className="w-[140px]">
                  <PriorityPill
                    priority={task.priority}
                    onChange={(p) => onUpdate({ priority: p })}
                  />
                </div>
              </div>
            </div>

            {/* ── Description ── */}
            <div className="mb-6">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-txt-secondary dark:text-zinc-400">
                Description
              </h3>
              <div className="rounded-lg border border-monday-border p-4 transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-zinc-700">
                <DescriptionEditor
                  initialContent={task.description ?? ''}
                  onSave={(content) =>
                    onUpdate({ description: content || null })
                  }
                />
              </div>
            </div>

            {/* Discord info */}
            {task.discord_message_url && (
              <div className="mb-6 rounded-lg bg-status-purple/10 p-4">
                <p className="text-xs font-medium text-status-purple">
                  Created from Discord
                </p>
                <a
                  href={task.discord_message_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-status-purple/80 hover:underline"
                >
                  View original message →
                </a>
                {task.discord_author_id && (
                  <p className="mt-1 text-xs text-status-purple/60">
                    Author ID: {task.discord_author_id}
                  </p>
                )}
              </div>
            )}

            {/* ── Activity / Comments ── */}
            <div>
              <div className="mb-3 flex items-center gap-4 border-b border-monday-border dark:border-zinc-700">
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`border-b-2 pb-2 text-sm font-medium transition ${
                    activeTab === 'activity'
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-txt-secondary hover:text-txt-primary dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`border-b-2 pb-2 text-sm font-medium transition ${
                    activeTab === 'comments'
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-txt-secondary hover:text-txt-primary dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  Comments
                </button>
              </div>

              {activeTab === 'activity' ? (
                <div>
                  {activities.length === 0 ? (
                    <p className="py-6 text-center text-sm text-txt-secondary dark:text-zinc-500">
                      No activity yet
                    </p>
                  ) : (
                    <div className="divide-y divide-monday-border dark:divide-zinc-700">
                      {activities.map((event) => (
                        <ActivityItem
                          key={event.id}
                          type={event.type}
                          payload={event.payload}
                          createdAt={event.created_at}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Comment input */}
                  <div className="mb-4 flex gap-3">
                    <div className="mt-1 shrink-0">
                      <MemberAvatar userId={task.created_by} size={28} />
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full resize-none rounded-lg border border-monday-border p-3 text-sm placeholder:text-txt-secondary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        rows={3}
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          disabled={!commentText.trim()}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-40"
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="py-4 text-center text-sm text-txt-secondary dark:text-zinc-500">
                    No comments yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer: created at info ── */}
        <div className="shrink-0 border-t border-monday-border px-6 py-2.5 dark:border-zinc-700">
          <p className="text-xs text-txt-secondary dark:text-zinc-500">
            Created{' '}
            {new Date(task.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
