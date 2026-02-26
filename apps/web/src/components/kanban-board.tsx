'use client';

import { useState, useCallback } from 'react';
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
import type { Task, TaskStatus } from '@taskforge/shared';
import { TaskCard } from './task-card';
import { KanbanColumn } from './kanban-column';
import { CreateTaskModal } from './create-task-modal';
import { TaskDetailModal } from './task-detail-modal';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'bg-gray-100' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50' },
  { id: 'needs_testing', label: 'Needs Testing', color: 'bg-purple-50' },
  { id: 'done', label: 'Done', color: 'bg-green-50' },
];

export function KanbanBoard({
  boardId,
  initialTasks,
  userId,
}: {
  boardId: string;
  initialTasks: Task[];
  userId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createColumn, setCreateColumn] = useState<TaskStatus>('backlog');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const supabase = createClient();

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

      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      );

      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    },
    [tasks, supabase],
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

  function openCreate(column: TaskStatus) {
    setCreateColumn(column);
    setShowCreate(true);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              color={col.color}
              tasks={tasks.filter((t) => t.status === col.id)}
              onAddClick={() => openCreate(col.id)}
              onTaskClick={setEditTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {showCreate && (
        <CreateTaskModal
          defaultStatus={createColumn}
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
    </>
  );
}
