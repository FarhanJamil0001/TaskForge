'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

function OwnerAvatar({
  userId,
  email,
  size = 30,
}: {
  userId: string | null;
  email?: string | null;
  size?: number;
}) {
  if (!userId) {
    return (
      <div
        className="flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-300"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.47} height={size * 0.47} viewBox="0 0 14 14" fill="none" className="stroke-current">
          <circle cx="7" cy="5" r="3" strokeWidth="1.2" />
          <path d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5" strokeWidth="1.2" />
        </svg>
      </div>
    );
  }

  const hue = userId.charCodeAt(0) * 37 + userId.charCodeAt(1) * 17;
  const color = `hsl(${hue % 360}, 60%, 55%)`;
  const initials = email ? email.slice(0, 2).toUpperCase() : userId.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color, width: size, height: size }}
      title={email || userId}
    >
      {initials}
    </div>
  );
}

const DROPDOWN_W = 220;

export function EditableOwnerCell({
  assigneeUserId,
  orgMembers,
  onChange,
}: {
  assigneeUserId: string | null;
  orgMembers: OrgMember[];
  onChange: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const currentMember = orgMembers.find((m) => m.user_id === assigneeUserId);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const top = rect.bottom + 4;
    const left = rect.left;
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
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', () => setOpen(false), true);
    window.addEventListener('resize', () => setOpen(false));
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', () => setOpen(false), true);
      window.removeEventListener('resize', () => setOpen(false));
    };
  }, [open, updatePosition]);

  return (
    <div className="flex w-full justify-center">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center justify-center rounded p-0.5 transition-colors hover:bg-gray-100"
      >
        <OwnerAvatar
          userId={assigneeUserId}
          email={currentMember?.email}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] max-h-[280px] overflow-y-auto rounded-lg border border-monday-border bg-white py-1 shadow-xl"
            style={{ top: pos.top, left: pos.left, width: DROPDOWN_W }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-txt-primary transition-colors hover:bg-gray-50"
            >
              <OwnerAvatar userId={null} size={28} />
              <span className="text-txt-secondary">Unassigned</span>
            </button>
            {orgMembers.map((m) => (
              <button
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(m.user_id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-txt-primary transition-colors hover:bg-gray-50"
              >
                <OwnerAvatar userId={m.user_id} email={m.email} size={28} />
                <span className="truncate">{m.email}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
