'use client';

import { useState, useRef, useEffect } from 'react';
import type { TaskPriority } from '@taskforge/shared';

export type SortField = 'title' | 'priority' | 'due_date' | 'created_at';
export type SortDir = 'asc' | 'desc';

interface BoardToolbarProps {
  onNewTask: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSortChange: (field: SortField, dir: SortDir) => void;
  filterPriority: TaskPriority | 'all';
  onFilterChange: (priority: TaskPriority | 'all') => void;
}

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'created_at', label: 'Date created' },
  { field: 'title', label: 'Name' },
  { field: 'due_date', label: 'Due date' },
  { field: 'priority', label: 'Priority' },
];

const FILTER_OPTIONS: { value: TaskPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function DropdownMenu({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-monday-border bg-white py-1 shadow-xl"
    >
      {children}
    </div>
  );
}

export function BoardToolbar({
  onNewTask,
  search,
  onSearchChange,
  sortField,
  sortDir,
  onSortChange,
  filterPriority,
  onFilterChange,
}: BoardToolbarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  return (
    <div className="flex items-center gap-2 pb-4">
      <button
        onClick={onNewTask}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-[7px] text-sm font-medium text-white transition hover:bg-brand-600"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-white">
          <path d="M7 1v12M1 7h12" strokeWidth="2" strokeLinecap="round" />
        </svg>
        New Task
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Search */}
        <div className="relative flex items-center">
          {showSearch && (
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks..."
              className="mr-1 h-[32px] w-[200px] rounded-md border border-monday-border bg-white px-3 text-sm text-txt-primary placeholder:text-txt-secondary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          )}
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) onSearchChange('');
            }}
            className={`flex h-[32px] items-center gap-1.5 rounded-md px-2.5 text-sm transition ${
              showSearch
                ? 'bg-brand-50 text-brand-500'
                : 'text-txt-secondary hover:bg-gray-100'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
              <circle cx="7" cy="7" r="5" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Search
          </button>
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSort(!showSort);
              setShowFilter(false);
            }}
            className={`flex h-[32px] items-center gap-1.5 rounded-md px-2.5 text-sm transition ${
              sortField !== 'created_at'
                ? 'bg-brand-50 text-brand-500'
                : 'text-txt-secondary hover:bg-gray-100'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
              <path d="M2 4h12M4 8h8M6 12h4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Sort
          </button>
          <DropdownMenu open={showSort} onClose={() => setShowSort(false)}>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.field}
                onClick={() => {
                  const newDir =
                    sortField === opt.field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
                  onSortChange(opt.field, newDir);
                  setShowSort(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-gray-50 ${
                  sortField === opt.field ? 'text-brand-500' : 'text-txt-primary'
                }`}
              >
                {opt.label}
                {sortField === opt.field && (
                  <span className="text-xs text-txt-secondary">
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </DropdownMenu>
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setShowFilter(!showFilter);
              setShowSort(false);
            }}
            className={`flex h-[32px] items-center gap-1.5 rounded-md px-2.5 text-sm transition ${
              filterPriority !== 'all'
                ? 'bg-brand-50 text-brand-500'
                : 'text-txt-secondary hover:bg-gray-100'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
              <path d="M1 3h14l-5 5.5V13l-4 2V8.5L1 3z" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Filter
          </button>
          <DropdownMenu open={showFilter} onClose={() => setShowFilter(false)}>
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onFilterChange(opt.value);
                  setShowFilter(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-sm transition hover:bg-gray-50 ${
                  filterPriority === opt.value ? 'text-brand-500' : 'text-txt-primary'
                }`}
              >
                {opt.label}
                {filterPriority === opt.value && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="ml-auto stroke-brand-500"
                  >
                    <path d="M2.5 7.5L5.5 10.5L11.5 3.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
