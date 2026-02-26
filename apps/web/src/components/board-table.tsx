'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus, TaskPriority, BoardGroup } from '@taskforge/shared';
import { BoardToolbar, type SortField, type SortDir } from './board-toolbar';
import { GroupSection, type GroupConfig } from './group-section';
import { MobileTaskList } from './mobile-task-list';
import { TaskDetailModal } from './task-detail-modal';

const DEFAULT_GROUPS: GroupConfig[] = [
  { status: 'backlog', label: 'To-Do', color: '#784BD1' },
  { status: 'done', label: 'Done', color: '#00C875' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at: string;
}

// ── Add Custom Group inline form ──

function AddGroupButton({ onAdd }: { onAdd: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setName('');
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mb-5 flex items-center gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') { setName(''); setEditing(false); }
          }}
          onBlur={handleSubmit}
          placeholder="Group name..."
          className="h-[32px] w-[200px] rounded-md border border-monday-border px-3 text-sm text-txt-primary placeholder:text-txt-secondary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="mb-5 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-txt-secondary transition hover:bg-gray-100 hover:text-brand-500"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
        <path d="M7 1v12M1 7h12" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Add new group
    </button>
  );
}

// ── Custom Group Header (with rename/delete, optional drag handle) ──

function CustomGroupHeader({
  group,
  taskCount,
  collapsed,
  onToggle,
  onRename,
  onDelete,
  onAddTask,
  dragHandleProps,
}: {
  group: BoardGroup;
  taskCount: number;
  collapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddTask: () => void;
  dragHandleProps?: { attributes: object; listeners: object | undefined };
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  function handleBlur() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== group.name) onRename(trimmed);
    else setName(group.name);
    setEditing(false);
  }

  return (
    <div className="group mb-1 flex items-center gap-2 rounded px-1 py-1">
      {dragHandleProps && (
        <div
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          className="flex cursor-grab touch-none select-none items-center rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-txt-primary active:cursor-grabbing"
          title="Drag to reorder"
          aria-label="Drag to reorder group"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="4" cy="2" r="1" />
            <circle cx="8" cy="2" r="1" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="8" cy="6" r="1" />
            <circle cx="4" cy="10" r="1" />
            <circle cx="8" cy="10" r="1" />
          </svg>
        </div>
      )}
      <button onClick={onToggle} className="flex items-center gap-2 transition hover:bg-gray-100">
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
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setName(group.name); setEditing(false); } }}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            className="h-6 rounded bg-transparent text-[15px] font-bold focus:outline-none focus:ring-1 focus:ring-brand-500"
            style={{ color: group.color }}
          />
        ) : (
          <span className="text-[15px] font-bold" style={{ color: group.color }}>
            {group.name}
          </span>
        )}
        <span className="text-xs text-txt-secondary">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
      </button>

      {!collapsed && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddTask(); }}
          className="ml-1 flex h-6 w-6 items-center justify-center rounded text-txt-secondary transition hover:bg-gray-200 hover:text-brand-500"
          title={`Add task to ${group.name}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
            <path d="M7 1v12M1 7h12" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Group actions menu */}
      <div className="relative ml-auto">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-txt-primary group-hover:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="7" cy="3" r="1.2" />
            <circle cx="7" cy="7" r="1.2" />
            <circle cx="7" cy="11" r="1.2" />
          </svg>
        </button>
        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-monday-border bg-white py-1 shadow-xl"
          >
            <button
              onClick={() => { setEditing(true); setShowMenu(false); }}
              className="flex w-full items-center px-3 py-2 text-sm text-txt-primary transition hover:bg-gray-50"
            >
              Rename
            </button>
            <button
              onClick={() => { onDelete(); setShowMenu(false); }}
              className="flex w-full items-center px-3 py-2 text-sm text-status-red transition hover:bg-red-50"
            >
              Delete group
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sortable group wrapper (for reordering custom groups) ──

const GROUP_ID_PREFIX = 'group:';

function SortableGroupItem({
  group,
  groupTasks,
  isCollapsed,
  toggleGroup,
  onRename,
  onDelete,
  onAddTask,
  addingGroup,
  expandGroup,
  setAddingGroup,
  setEditTask,
  handleStatusChange,
  handlePriorityChange,
  handleAssigneeChange,
  handleDueDateChange,
  handleDescriptionChange,
  handleTitleChange,
  handleInlineAdd,
  orgMembers,
}: {
  group: BoardGroup;
  groupTasks: Task[];
  isCollapsed: boolean;
  toggleGroup: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddTask: (id: string) => void;
  addingGroup: string | null;
  expandGroup: (id: string) => void;
  setAddingGroup: (id: string | null) => void;
  setEditTask: (task: Task | null) => void;
  handleStatusChange: (taskId: string, status: import('@taskforge/shared').TaskStatus) => void;
  handlePriorityChange: (taskId: string, priority: import('@taskforge/shared').TaskPriority) => void;
  handleAssigneeChange: (taskId: string, assigneeUserId: string | null) => void;
  handleDueDateChange: (taskId: string, dueDate: string | null) => void;
  handleDescriptionChange: (taskId: string, description: string | null) => void;
  handleTitleChange: (taskId: string, title: string) => void;
  handleInlineAdd: (title: string, status: import('@taskforge/shared').TaskStatus, groupId?: string) => void;
  orgMembers: OrgMember[];
}) {
  const sortableId = `${GROUP_ID_PREFIX}${group.id}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <CustomGroupHeader
        group={group}
        taskCount={groupTasks.length}
        collapsed={isCollapsed}
        onToggle={() => toggleGroup(group.id)}
        onRename={(name) => onRename(group.id, name)}
        onDelete={() => onDelete(group.id)}
        onAddTask={() => onAddTask(group.id)}
        dragHandleProps={{ attributes, listeners: listeners ?? {} }}
      />
      {!isCollapsed && (
        <GroupSection
          group={{ status: 'backlog', label: group.name, color: group.color }}
          tasks={groupTasks}
          collapsed={false}
          onToggleCollapse={() => toggleGroup(group.id)}
          onTaskClick={setEditTask}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onAssigneeChange={handleAssigneeChange}
          onDueDateChange={handleDueDateChange}
          onDescriptionChange={handleDescriptionChange}
          onTitleChange={handleTitleChange}
          onAddTask={(title) => handleInlineAdd(title, 'backlog', group.id)}
          onAddTaskDone={() => setAddingGroup(null)}
          forceAdding={addingGroup === group.id}
          orgMembers={orgMembers}
          hideHeader
          droppableId={group.id}
        />
      )}
    </div>
  );
}

// ── Main component ──

export function BoardTable({
  boardId,
  orgId,
  initialTasks,
  userId,
}: {
  boardId: string;
  orgId: string;
  initialTasks: Task[];
  userId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [customGroups, setCustomGroups] = useState<BoardGroup[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const supabase = createClient();
  const editTaskRef = useRef(editTask);
  editTaskRef.current = editTask;

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  useEffect(() => {
    if (!orgId) return;
    supabase
      .rpc('get_org_members_with_email', { p_org_id: orgId })
      .then(({ data }) => setOrgMembers(data ?? []));
  }, [orgId, supabase]);

  // Load custom groups
  useEffect(() => {
    supabase
      .from('board_groups')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })
      .then(({ data }) => setCustomGroups(data ?? []));
  }, [boardId, supabase]);

  const refetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });
    if (data) setTasks(data);
  }, [boardId, supabase]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const poll = () => {
      if (document.visibilityState === 'visible') refetchTasks();
    };
    const id = setInterval(poll, 3_000);
    const onVisible = () => refetchTasks();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refetchTasks]);

  const debugRealtime = process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true';

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setupSubscription = async (attempt = 0) => {
      if (cancelled) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (debugRealtime) {
        console.log('[Realtime debug]', { attempt, hasUser: !!user, hasToken: !!token, userId: user?.id });
      }
      if (!user || !token) {
        if (attempt < 3) {
          if (debugRealtime) console.log('[Realtime debug] No auth, retry in', [500, 1500, 3000][attempt], 'ms');
          setTimeout(() => setupSubscription(attempt + 1), [500, 1500, 3000][attempt]);
        } else if (debugRealtime) {
          console.warn('[Realtime debug] Gave up after 3 attempts — no auth session');
        }
        return;
      }

      supabase.realtime.setAuth(token);
      if (debugRealtime) console.log('[Realtime debug] setAuth called, subscribing to board', boardId);

      if (cancelled) return;
      channel = supabase
        .channel(`tasks:board:${boardId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `board_id=eq.${boardId}`,
          },
          (payload) => {
            if (debugRealtime) console.log('[Realtime debug] Event received:', payload.eventType, payload);
            if (payload.eventType === 'INSERT') {
              const newTask = payload.new as Task;
              setTasks((prev) => {
                if (prev.some((t) => t.id === newTask.id)) return prev;
                return [newTask, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Task;
              setTasks((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t)),
              );
              if (editTaskRef.current?.id === updated.id) setEditTask(updated);
            } else if (payload.eventType === 'DELETE') {
              const deleted = payload.old as Task;
              setTasks((prev) => prev.filter((t) => t.id !== deleted.id));
              if (editTaskRef.current?.id === deleted.id) setEditTask(null);
            }
          },
        )
        .subscribe((status, err) => {
          if (debugRealtime) console.log('[Realtime debug] Subscribe status:', status, err ?? '');
          if (status === 'CHANNEL_ERROR') {
            if (debugRealtime) console.warn('[Realtime debug] Channel error, refreshing auth');
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) supabase.realtime.setAuth(session.access_token);
            });
          }
        });
    };

    setupSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) supabase.realtime.setAuth(session.access_token);
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [boardId, supabase, debugRealtime]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleReorderGroups = useCallback(
    async (oldIndex: number, newIndex: number) => {
      const reordered = arrayMove(customGroups, oldIndex, newIndex);
      setCustomGroups(reordered);
      await Promise.all(
        reordered.map((g, i) =>
          supabase.from('board_groups').update({ position: i }).eq('id', g.id),
        ),
      );
    },
    [customGroups, supabase],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      if (id.startsWith(GROUP_ID_PREFIX)) {
        setActiveGroupId(id.slice(GROUP_ID_PREFIX.length));
        setActiveTask(null);
      } else {
        const task = tasks.find((t) => t.id === id);
        setActiveTask(task ?? null);
        setActiveGroupId(null);
      }
    },
    [tasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = String(active.id);
      const overId = over ? String(over.id) : null;

      // Group reorder
      if (activeId.startsWith(GROUP_ID_PREFIX)) {
        setActiveGroupId(null);
        if (overId?.startsWith(GROUP_ID_PREFIX) && activeId !== overId) {
          const oldIndex = customGroups.findIndex((g) => `${GROUP_ID_PREFIX}${g.id}` === activeId);
          const newIndex = customGroups.findIndex((g) => `${GROUP_ID_PREFIX}${g.id}` === overId);
          if (oldIndex >= 0 && newIndex >= 0) {
            await handleReorderGroups(oldIndex, newIndex);
          }
        }
        return;
      }

      // Task drop
      setActiveTask(null);
      if (!overId) return;

      const taskId = activeId;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (['backlog', 'done'].includes(overId)) {
        const newStatus = overId as TaskStatus;
        if (task.status === newStatus && !task.group_id) return;
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, group_id: null } : t)),
        );
        await supabase.from('tasks').update({ status: newStatus, group_id: null }).eq('id', taskId);
        return;
      }

      const customGroup = customGroups.find((g) => g.id === overId);
      if (customGroup && task.group_id !== customGroup.id) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, group_id: customGroup.id } : t)),
        );
        await supabase.from('tasks').update({ group_id: customGroup.id }).eq('id', taskId);
      }
    },
    [tasks, supabase, customGroups, handleReorderGroups],
  );

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
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

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
      await supabase.from('tasks').update({ status }).eq('id', taskId);
    },
    [supabase],
  );

  const handlePriorityChange = useCallback(
    async (taskId: string, priority: TaskPriority) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
      await supabase.from('tasks').update({ priority }).eq('id', taskId);
    },
    [supabase],
  );

  const handleAssigneeChange = useCallback(
    async (taskId: string, assigneeUserId: string | null) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, assignee_user_id: assigneeUserId } : t)),
      );
      await supabase.from('tasks').update({ assignee_user_id: assigneeUserId }).eq('id', taskId);
    },
    [supabase],
  );

  const handleDueDateChange = useCallback(
    async (taskId: string, dueDate: string | null) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, due_date: dueDate } : t)),
      );
      await supabase.from('tasks').update({ due_date: dueDate }).eq('id', taskId);
    },
    [supabase],
  );

  const handleDescriptionChange = useCallback(
    async (taskId: string, description: string | null) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, description } : t)),
      );
      await supabase.from('tasks').update({ description }).eq('id', taskId);
    },
    [supabase],
  );

  const handleTitleChange = useCallback(
    async (taskId: string, title: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, title } : t)),
      );
      await supabase.from('tasks').update({ title }).eq('id', taskId);
    },
    [supabase],
  );

  const handleInlineAdd = useCallback(
    async (title: string, status: TaskStatus, groupId?: string) => {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          board_id: boardId,
          title,
          status,
          priority: 'medium' as TaskPriority,
          created_by: userId,
          group_id: groupId ?? null,
        })
        .select()
        .single();

      if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
      }
    },
    [boardId, userId, supabase],
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
      await supabase.from('tasks').update(updates).eq('id', taskId);
    },
    [supabase],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await supabase.from('tasks').delete().eq('id', taskId);
      setEditTask(null);
    },
    [supabase],
  );

  const handleNewTask = useCallback(() => {
    expandGroup('backlog');
    setAddingGroup('backlog');
  }, [expandGroup]);

  // ── Custom group CRUD ──

  const handleAddCustomGroup = useCallback(
    async (name: string) => {
      const colors = ['#784BD1', '#579BFC', '#FDAB3D', '#E2445C', '#00C875', '#A25DDC', '#037F4C', '#FF158A'];
      const color = colors[customGroups.length % colors.length];
      const position = customGroups.length;

      const { data } = await supabase
        .from('board_groups')
        .insert({ board_id: boardId, name, color, position })
        .select()
        .single();

      if (data) setCustomGroups((prev) => [...prev, data]);
    },
    [boardId, supabase, customGroups.length],
  );

  const handleRenameGroup = useCallback(
    async (groupId: string, name: string) => {
      setCustomGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, name } : g)),
      );
      await supabase.from('board_groups').update({ name }).eq('id', groupId);
    },
    [supabase],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      // Tasks in this group get their group_id set to null (DB ON DELETE SET NULL)
      setCustomGroups((prev) => prev.filter((g) => g.id !== groupId));
      setTasks((prev) => prev.map((t) => (t.group_id === groupId ? { ...t, group_id: null } : t)));
      await supabase.from('board_groups').delete().eq('id', groupId);
    },
    [supabase],
  );

  // Tasks not assigned to any custom group, split by default status groups
  const ungroupedTasks = useMemo(
    () => filteredAndSortedTasks.filter((t) => !t.group_id),
    [filteredAndSortedTasks],
  );

  return (
    <div>
      <BoardToolbar
        onNewTask={handleNewTask}
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

      {/* Mobile: card-based task list */}
      <MobileTaskList
        tasks={filteredAndSortedTasks}
        orgMembers={orgMembers}
        onTaskClick={setEditTask}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onAssigneeChange={handleAssigneeChange}
        onAddTask={(title, status) => handleInlineAdd(title, status)}
      />

      {/* Desktop: table with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden min-w-[800px] md:block">
          {/* To-Do: always at top */}
          <GroupSection
            group={DEFAULT_GROUPS[0]}
            tasks={ungroupedTasks.filter((t) => t.status !== 'done')}
            collapsed={collapsedGroups.has('backlog')}
            onToggleCollapse={() => toggleGroup('backlog')}
            onTaskClick={setEditTask}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onAssigneeChange={handleAssigneeChange}
            onDueDateChange={handleDueDateChange}
            onDescriptionChange={handleDescriptionChange}
            onTitleChange={handleTitleChange}
            onAddTask={(title, status) => handleInlineAdd(title, status)}
            onAddTaskDone={() => setAddingGroup(null)}
            forceAdding={addingGroup === 'backlog'}
            orgMembers={orgMembers}
          />

          {/* Custom groups (sortable, always in the middle) */}
          <SortableContext
            items={customGroups.map((g) => `${GROUP_ID_PREFIX}${g.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {customGroups.map((cg) => (
              <SortableGroupItem
                key={cg.id}
                group={cg}
                groupTasks={filteredAndSortedTasks.filter((t) => t.group_id === cg.id)}
                isCollapsed={collapsedGroups.has(cg.id)}
                toggleGroup={toggleGroup}
                onRename={handleRenameGroup}
                onDelete={handleDeleteGroup}
                onAddTask={(id) => { expandGroup(id); setAddingGroup(id); }}
                addingGroup={addingGroup}
                expandGroup={expandGroup}
                setAddingGroup={setAddingGroup}
                setEditTask={setEditTask}
                handleStatusChange={handleStatusChange}
                handlePriorityChange={handlePriorityChange}
                handleAssigneeChange={handleAssigneeChange}
                handleDueDateChange={handleDueDateChange}
                handleDescriptionChange={handleDescriptionChange}
                handleTitleChange={handleTitleChange}
                handleInlineAdd={handleInlineAdd}
                orgMembers={orgMembers}
              />
            ))}
          </SortableContext>

          {/* Done: always at bottom */}
          <GroupSection
            group={DEFAULT_GROUPS[1]}
            tasks={ungroupedTasks.filter((t) => t.status === 'done')}
            collapsed={collapsedGroups.has('done')}
            onToggleCollapse={() => toggleGroup('done')}
            onTaskClick={setEditTask}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onAssigneeChange={handleAssigneeChange}
            onDueDateChange={handleDueDateChange}
            onDescriptionChange={handleDescriptionChange}
            onTitleChange={handleTitleChange}
            onAddTask={(title, status) => handleInlineAdd(title, status)}
            onAddTaskDone={() => setAddingGroup(null)}
            forceAdding={addingGroup === 'done'}
            orgMembers={orgMembers}
          />

          <AddGroupButton onAdd={handleAddCustomGroup} />
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="w-80 rotate-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
              <p className="text-sm font-medium text-gray-800">{activeTask.title}</p>
              {activeTask.description && (
                <p className="mt-1 line-clamp-1 text-xs text-gray-500">{activeTask.description}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[activeTask.priority]}`}
                >
                  {activeTask.priority}
                </span>
                {activeTask.due_date && (
                  <span className="text-[10px] text-gray-400">
                    Due {new Date(activeTask.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ) : activeGroupId ? (
            (() => {
              const g = customGroups.find((x) => x.id === activeGroupId);
              if (!g) return null;
              return (
                <div className="flex items-center gap-2 rounded-lg border border-monday-border bg-white px-4 py-2.5 shadow-lg">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-[15px] font-bold" style={{ color: g.color }}>
                    {g.name}
                  </span>
                </div>
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {editTask && (
        <TaskDetailModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onUpdate={(updates) => handleUpdateTask(editTask.id, updates)}
          onDelete={() => handleDeleteTask(editTask.id)}
        />
      )}
    </div>
  );
}
