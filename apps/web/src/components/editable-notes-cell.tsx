'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { plainTextFromHtml } from '@/lib/plain-text-from-html';
import {
  TaskDescriptionEditor,
  type TaskDescriptionEditorRef,
} from '@/components/task-description-editor';

const POPOVER_W = 400;
const POPOVER_EST_HEIGHT = 400;
const VIEWPORT_PADDING = 8;

export function EditableNotesCell({
  description,
  onChange,
}: {
  description: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<TaskDescriptionEditorRef>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleSave = useCallback(() => {
    const content = editorRef.current?.getContent();
    if (content === undefined) {
      setOpen(false);
      return;
    }
    onChange(content);
    setOpen(false);
  }, [onChange]);

  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;

  const previewText = useMemo(() => {
    if (!description?.trim()) return '';
    return plainTextFromHtml(description);
  }, [description]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = rect.left;
      left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - POPOVER_W - VIEWPORT_PADDING));

      let top: number;
      if (rect.bottom + POPOVER_EST_HEIGHT + VIEWPORT_PADDING > vh) {
        top = rect.top - POPOVER_EST_HEIGHT - 4;
        top = Math.max(VIEWPORT_PADDING, top);
      } else {
        top = rect.bottom + 4;
      }

      setPos({ top, left });
    };
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        saveRef.current();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', () => setOpen(false), true);
    window.addEventListener('resize', () => setOpen(false));
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', () => setOpen(false), true);
      window.removeEventListener('resize', () => setOpen(false));
    };
  }, [open]);

  return (
    <div className="flex w-full">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="min-h-[34px] w-full cursor-text rounded px-3 py-2 text-left text-[13px] text-txt-secondary transition-colors hover:bg-gray-100 hover:text-txt-primary dark:text-zinc-400 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-100"
      >
        <span className="line-clamp-2 block break-words">
          {previewText || 'Add notes...'}
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] flex max-h-[min(420px,calc(100vh-16px))] flex-col rounded-lg border border-monday-border bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-800"
            style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-monday-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-txt-secondary dark:border-zinc-600 dark:text-zinc-400">
              Notes
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-1">
              <TaskDescriptionEditor
                key={description ?? ''}
                ref={editorRef}
                initialContent={description || ''}
                compact
                autoFocus
                placeholder="Add notes..."
                editorMinHeightClass="min-h-[132px]"
              />
            </div>
            <div className="shrink-0 flex justify-end gap-2 border-t border-monday-border px-3 py-2 dark:border-zinc-600">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1.5 text-sm font-medium text-txt-secondary transition-colors hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Save
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
