'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { TaskPriority } from '@taskforge/shared';
import { useTheme } from './theme-provider';

const PRIORITY_CONFIG_LIGHT: Record<TaskPriority, { label: string; bg: string }> = {
  high: { label: 'High', bg: '#E2445C' },
  medium: { label: 'Medium', bg: '#FDAB3D' },
  low: { label: 'Low', bg: '#579BFC' },
};

const PRIORITY_CONFIG_DARK: Record<TaskPriority, { label: string; bg: string }> = {
  high: { label: 'High', bg: '#dc2626' },
  medium: { label: 'Medium', bg: '#d97706' },
  low: { label: 'Low', bg: '#2563eb' },
};

const DROPDOWN_W = 140;

const COMPACT_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Med',
  low: 'Low',
};

export function PriorityPill({
  priority,
  onChange,
  size = 'default',
}: {
  priority: TaskPriority;
  onChange: (p: TaskPriority) => void;
  size?: 'default' | 'compact';
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const PRIORITY_CONFIG = isDark ? PRIORITY_CONFIG_DARK : PRIORITY_CONFIG_LIGHT;

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

  const config = PRIORITY_CONFIG[priority];
  const isCompact = size === 'compact';

  return (
    <div className={isCompact ? 'w-[3.25rem] shrink-0' : 'w-full'}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={
          isCompact
            ? 'flex h-5 w-full max-w-full items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white transition-opacity hover:opacity-90'
            : 'flex h-[34px] w-full items-center justify-center rounded-[2px] text-xs font-medium text-white transition-opacity hover:opacity-90'
        }
        style={{ backgroundColor: config.bg }}
      >
        {isCompact ? COMPACT_LABELS[priority] : config.label}
      </button>
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg border border-monday-border bg-white p-1.5 shadow-xl dark:border-zinc-600 dark:bg-zinc-800"
            style={{ top: pos.top, left: pos.left, width: DROPDOWN_W }}
          >
            {(
              Object.entries(PRIORITY_CONFIG) as [TaskPriority, { label: string; bg: string }][]
            ).map(([key, cfg]) => (
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
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
