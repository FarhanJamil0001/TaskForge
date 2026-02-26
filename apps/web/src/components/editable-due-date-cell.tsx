'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const top = rect.bottom + 4;
    const left = rect.left + rect.width / 2 - POPOVER_W / 2;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    // Auto-open the native date picker so user can pick in one click
    const el = inputRef.current;
    if (el?.showPicker) {
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            el.showPicker();
          } catch {
            // showPicker() can throw in some contexts (e.g. not user-initiated)
          }
        });
      });
      return () => cancelAnimationFrame(t);
    }
  }, [open, updatePosition]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!open) return;
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    const onResize = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  function handleDateSelect(dateStr: string | null) {
    onChange(dateStr);
    setOpen(false);
  }

  function setQuickDate(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    handleDateSelect(toYMD(d));
  }

  return (
    <div className="flex w-full justify-center">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onPointerDown={(e) => e.stopPropagation()}
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
            {/* Quick one-click options */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="rounded bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-txt-primary transition-colors hover:bg-gray-200"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="rounded bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-txt-primary transition-colors hover:bg-gray-200"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(7)}
                className="rounded bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-txt-primary transition-colors hover:bg-gray-200"
              >
                Next week
              </button>
              <button
                type="button"
                onClick={() => handleDateSelect(null)}
                className="rounded px-2.5 py-1.5 text-xs text-txt-secondary transition-colors hover:bg-gray-100 hover:text-txt-primary"
              >
                Clear
              </button>
            </div>
            {/* Date input: picker opens automatically; selecting a date saves and closes */}
            <input
              ref={inputRef}
              type="date"
              defaultValue={dueDate || ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v) handleDateSelect(v);
              }}
              className="w-full rounded border border-monday-border px-3 py-2 text-sm text-txt-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
