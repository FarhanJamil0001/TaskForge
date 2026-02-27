'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const POPOVER_W = 320;
const POPOVER_H = 160;
const POPOVER_EST_HEIGHT = 260;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [localValue, setLocalValue] = useState(description || '');

  const handleSave = useCallback(() => {
    const trimmed = localValue.trim();
    onChange(trimmed || null);
    setOpen(false);
  }, [localValue, onChange]);

  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;

  useEffect(() => {
    if (open) {
      setLocalValue(description || '');
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open, description]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Clamp left so popover stays in viewport
      let left = rect.left;
      left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - POPOVER_W - VIEWPORT_PADDING));

      // Flip above button if not enough space below
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
        <span className="line-clamp-2 block truncate">
          {description || 'Add notes...'}
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] rounded-lg border border-monday-border bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-800"
            style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
          >
            <div className="border-b border-monday-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-txt-secondary dark:border-zinc-600 dark:text-zinc-400">
              Notes
            </div>
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === 'Escape') {
                  setLocalValue(description || '');
                  setOpen(false);
                }
              }}
              placeholder="Add notes..."
              className="w-full resize-none border-0 px-3 py-2 text-sm text-txt-primary placeholder:text-txt-secondary focus:outline-none dark:bg-transparent dark:text-zinc-100 dark:placeholder:text-zinc-500"
              rows={6}
              style={{ minHeight: POPOVER_H }}
            />
            <div className="flex justify-end border-t border-monday-border px-3 py-2 dark:border-zinc-600">
              <button
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
