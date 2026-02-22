'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function Topbar({ email }: { email?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  }

  const initial = email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-monday-border bg-white px-4">
      <div />
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-txt-secondary transition hover:bg-gray-100">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-current">
            <path d="M13.5 6.5a4.5 4.5 0 10-9 0c0 5-2 6.5-2 6.5h13s-2-1.5-2-6.5M10.3 15a1.5 1.5 0 01-2.6 0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Search icon */}
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-txt-secondary transition hover:bg-gray-100">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-current">
            <circle cx="8" cy="8" r="5.5" strokeWidth="1.3" />
            <path d="M12 12l4 4" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white transition hover:bg-brand-600"
          >
            {initial}
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[220px] rounded-lg border border-monday-border bg-white py-1 shadow-xl">
              {email && (
                <div className="border-b border-monday-border px-4 py-3">
                  <p className="truncate text-sm font-medium text-txt-primary">{email}</p>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-txt-secondary transition hover:bg-gray-50 hover:text-txt-primary"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                  <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
