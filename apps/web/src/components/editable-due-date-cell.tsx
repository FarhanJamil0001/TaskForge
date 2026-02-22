'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

const POPOVER_W = 280;

export function EditableDueDateCell({
  dueDate,
  onChange,
}: {
  dueDate: string | null;
  onChange: (date: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [localValue, setLocalValue] = useState(dueDate || '');

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const top = rect.bottom + 4;
    const left = rect.left + rect.width / 2 - POPOVER_W / 2;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    setLocalValue(dueDate || '');
  }, [dueDate]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
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
  }, [open, updatePosition]);

  function handleSave() {
    const trimmed = localValue.trim();
    onChange(trimmed || null);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setLocalValue('');
    setOpen(false);
  }

  return (
    <div className="flex w-full justify-center">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
          setLocalValue(dueDate || '');
        }}
        className={`min-h-[34px] w-full rounded px-2 py-1.5 text-center text-[13px] transition-colors hover:bg-gray-100 ${
          dueDate
            ? isOverdue(dueDate)
              ? 'font-medium text-status-red'
              : 'text-txt-primary'
            : 'text-gray-300'
        }`}
      >
        {dueDate ? formatDate(dueDate) : '—'}
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] rounded-lg border border-monday-border bg-white p-4 shadow-xl"
            style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
          >
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-txt-secondary">
              Due date
            </div>
            <input
              type="date"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="mb-3 w-full rounded border border-monday-border px-3 py-2 text-sm text-txt-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
            <div className="flex justify-between gap-2">
              <button
                onClick={handleClear}
                className="rounded px-3 py-1.5 text-sm text-txt-secondary transition-colors hover:bg-gray-100 hover:text-txt-primary"
              >
                Clear
              </button>
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
