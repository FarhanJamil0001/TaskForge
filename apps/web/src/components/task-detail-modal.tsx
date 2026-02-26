'use client';

import { useState } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@taskforge/shared';

export function TaskDetailModal({
  task,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    onUpdate({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      due_date: dueDate || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-monday-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-monday-border px-6 py-4">
          <h2 className="text-lg font-semibold text-txt-primary">Edit Task</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-txt-secondary transition hover:bg-gray-100 hover:text-txt-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
              <path d="M2 2l10 10M12 2L2 12" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-txt-primary">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-txt-primary">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px] resize-y"
              placeholder="Add more details..."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-txt-primary">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="input"
              >
                <option value="backlog">Not Started</option>
                <option value="in_progress">Working on it</option>
                <option value="needs_testing">Needs Testing</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-txt-primary">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-txt-primary">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Discord info */}
          {task.discord_message_url && (
            <div className="rounded-lg bg-status-purple/10 p-3">
              <p className="text-xs font-medium text-status-purple">Created from Discord</p>
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

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-monday-border pt-4">
            <div>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-sm text-status-red transition hover:text-status-red/80"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                    <path d="M2 4h10M5 4V2.5A.5.5 0 015.5 2h3a.5.5 0 01.5.5V4M11 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-status-red">Delete this task?</span>
                  <button
                    onClick={onDelete}
                    className="rounded bg-status-red px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-txt-secondary hover:text-txt-primary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
