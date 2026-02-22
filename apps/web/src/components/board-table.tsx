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
  closestCorners,
} from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus, TaskPriority } from '@taskforge/shared';
import { BoardToolbar, type SortField, type SortDir } from './board-toolbar';
import { GroupSection, type GroupConfig } from './group-section';
import { CreateTaskModal } from './create-task-modal';
import { TaskDetailModal } from './task-detail-modal';

const GROUPS: GroupConfig[] = [
  { status: 'backlog', label: 'To-Do', color: '#784BD1' },
  { status: 'in_progress', label: 'In Progress', color: '#579BFC' },
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
  role: string;
  created_at: string;
}

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
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TaskStatus>>(new Set());
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
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

  // Refetch tasks from DB (polling fallback when Realtime fails, e.g. on Vercel)
  const refetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });
    if (data) setTasks(data);
  }, [boardId, supabase]);

  // Polling fallback: Realtime often fails on Vercel (cookie timing, WebSocket limits, etc).
  // Poll every 3s when tab is visible so updates appear even without Realtime.
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

  // Real-time subscription: sync tasks instantly when changed elsewhere (e.g. Discord)
  // Must wait for auth session before subscribing — Realtime uses RLS and requires a valid JWT.
  // On Vercel/production, cookies may not be ready on first paint; we retry with backoff.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setupSubscription = async (attempt = 0) => {
      if (cancelled) return;
      // getUser() validates server-side; getSession() can be stale on hydration
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (debugRealtime) {
        console.log('[Realtime debug]', {
          attempt,
          hasUser: !!user,
          hasToken: !!token,
          userId: user?.id,
        });
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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      setActiveTask(task ?? null);
    },
    [tasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus;
      if (!['backlog', 'in_progress', 'done'].includes(newStatus)) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      );
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    },
    [tasks, supabase],
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

  const toggleGroup = useCallback((status: TaskStatus) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
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
    async (title: string, status: TaskStatus) => {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          board_id: boardId,
          title,
          status,
          priority: 'medium' as TaskPriority,
          created_by: userId,
        })
        .select()
        .single();

      if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
      }
    },
    [boardId, userId, supabase],
  );

  const handleCreateTask = useCallback(
    async (data: {
      title: string;
      description?: string;
      priority: string;
      due_date?: string;
      status: string;
    }) => {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          board_id: boardId,
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          due_date: data.due_date || null,
          status: data.status,
          created_by: userId,
        })
        .select()
        .single();

      if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
      }
      setShowCreate(false);
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

  return (
    <div>
      <BoardToolbar
        onNewTask={() => setShowCreate(true)}
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-w-[800px]">
          {GROUPS.map((group) => (
            <GroupSection
              key={group.status}
              group={group}
              tasks={filteredAndSortedTasks.filter((t) => t.status === group.status)}
              collapsed={collapsedGroups.has(group.status)}
              onToggleCollapse={() => toggleGroup(group.status)}
              onTaskClick={setEditTask}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onAssigneeChange={handleAssigneeChange}
              onDueDateChange={handleDueDateChange}
              onDescriptionChange={handleDescriptionChange}
              onTitleChange={handleTitleChange}
              onAddTask={handleInlineAdd}
              orgMembers={orgMembers}
            />
          ))}
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
          ) : null}
        </DragOverlay>
      </DndContext>

      {showCreate && (
        <CreateTaskModal
          defaultStatus="backlog"
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateTask}
        />
      )}

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
