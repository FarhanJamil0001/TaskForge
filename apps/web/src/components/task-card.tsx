'use client';

import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@taskforge/shared';

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export function TaskCard({
  task,
  isDragging,
  onClick,
}: {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition active:cursor-grabbing ${
        isDragging ? 'rotate-2 opacity-80 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <p className="text-sm font-medium text-gray-800">{task.title}</p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{task.description}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityColors[task.priority]}`}
        >
          {task.priority}
        </span>
        {task.due_date && (
          <span className="text-[10px] text-gray-400">
            Due {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
        {task.discord_message_url && (
          <span className="text-[10px] text-indigo-400" title="From Discord">
            ⟡
          </span>
        )}
      </div>
    </div>
  );
}
