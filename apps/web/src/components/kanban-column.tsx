'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '@taskforge/shared';
import { TaskCard } from './task-card';

export function KanbanColumn({
  id,
  label,
  color,
  tasks,
  onAddClick,
  onTaskClick,
}: {
  id: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onAddClick: () => void;
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 shrink-0 flex-col rounded-xl ${color} ${
        isOver ? 'ring-2 ring-brand-500' : ''
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 shadow-sm">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddClick}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-gray-600"
        >
          +
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400 dark:text-zinc-500">No tasks</p>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>
    </div>
  );
}
