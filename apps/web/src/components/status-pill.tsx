'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { TaskStatus } from '@taskforge/shared';

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string }> = {
  backlog: { label: 'Not Started', bg: '#C4C4C4' },
  in_progress: { label: 'Working on it', bg: '#FDAB3D' },
  done: { label: 'Done', bg: '#00C875' },
};

const DROPDOWN_W = 160;

export function StatusPill({
  status,
  onChange,
}: {
  status: TaskStatus;
  onChange: (s: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const top = rect.bottom + 4;
    const left = rect.left + rect.width / 2 - DROPDOWN_W / 2;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function dismiss() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open, updatePosition]);

  const config = STATUS_CONFIG[status];

  return (
    <div className="w-full">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex h-[34px] w-full items-center justify-center rounded-[2px] text-xs font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: config.bg }}
      >
        {config.label}
      </button>
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg border border-monday-border bg-white p-1.5 shadow-xl"
            style={{ top: pos.top, left: pos.left, width: DROPDOWN_W }}
          >
            {(Object.entries(STATUS_CONFIG) as [TaskStatus, { label: string; bg: string }][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(key);
                    setOpen(false);
                  }}
                  className="mb-0.5 flex w-full items-center justify-center rounded-[2px] px-3 py-2 text-xs font-medium text-white transition-opacity last:mb-0 hover:opacity-90"
                  style={{ backgroundColor: cfg.bg }}
                >
                  {cfg.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
