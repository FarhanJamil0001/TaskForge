'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface MobileBottomNavProps {
  orgId: string | null;
  projects: { id: string; name: string }[];
}

function getNavItems(orgId: string | null) {
  const items = [
  {
    href: '/my-tasks',
    label: 'My Tasks',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="stroke-current">
        <path d="M2 4h14v10H2V4z" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M6 2v4M12 2v4M2 8h14" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    match: (path: string) => path === '/my-tasks',
  },
  {
    href: null,
    label: 'Projects',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="stroke-current">
        <rect x="4" y="4" width="14" height="14" rx="2" strokeWidth="1.8" />
        <path d="M4 9h14" strokeWidth="1.8" />
        <path d="M9 9v9" strokeWidth="1.8" />
      </svg>
    ),
    match: () => false,
    isSheet: true,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="stroke-current">
        <circle cx="11" cy="7" r="3.5" strokeWidth="1.6" />
        <path d="M4 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    match: (path: string) => path === '/profile',
  },
  ];
  if (orgId) {
    items.splice(2, 0, {
      href: `/orgs/${orgId}/members`,
      label: 'Members',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="stroke-current">
          <circle cx="8" cy="7" r="3" strokeWidth="1.6" />
          <path d="M2 19c0-3 2.5-5 6-5s6 2 6 5" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="15" cy="7" r="2.5" strokeWidth="1.6" />
          <path d="M15 12c2 0 3.5 1.5 3.5 3.5" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
      match: (path: string) => path.includes('/members'),
      isSheet: undefined,
    } as (typeof items)[0]);
  }
  return items;
}

export function MobileBottomNav({ orgId, projects }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [showProjectSheet, setShowProjectSheet] = useState(false);
  const navItems = getNavItems(orgId);

  return (
    <>
      {/* iOS-style bottom nav: floating, rounded, safe area */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="mx-3 mb-3 rounded-2xl border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/80">
          <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {navItems.map((item) => {
              if (item.isSheet) {
                const isActive = pathname.startsWith('/projects/');
                return (
                  <button
                    key={item.label}
                    onClick={() => setShowProjectSheet(true)}
                    className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition ${
                      isActive ? 'text-brand-500 dark:text-brand-400' : 'text-txt-secondary dark:text-zinc-400'
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                );
              }
              const href = item.href!;
              const isActive = item.match(pathname);
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition ${
                    isActive ? 'text-brand-500 dark:text-brand-400' : 'text-txt-secondary dark:text-zinc-400'
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Project picker sheet */}
      {showProjectSheet && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Choose project"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowProjectSheet(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900">
            <div className="sticky top-0 flex items-center justify-between border-b border-monday-border bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-txt-primary dark:text-zinc-100">Projects</h2>
              <button
                onClick={() => setShowProjectSheet(false)}
                className="rounded-full p-2 text-txt-secondary transition hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="stroke-current">
                  <path d="M5 5l10 10M15 5l-10 10" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-56px)] pb-[env(safe-area-inset-bottom)]">
              {projects.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-txt-secondary dark:text-zinc-400">
                  No projects yet. Create one from the sidebar on desktop.
                </p>
              ) : (
                <div className="py-2">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      onClick={() => setShowProjectSheet(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 transition active:bg-gray-50 dark:active:bg-zinc-800 ${
                        pathname.startsWith(`/projects/${p.id}`) ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400' : ''
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{
                          backgroundColor: `hsl(${(p.id.charCodeAt(0) * 47 + p.id.charCodeAt(1) * 23) % 360}, 55%, 55%)`,
                        }}
                      >
                        {p.name[0]?.toUpperCase()}
                      </span>
                      <span className="font-medium text-txt-primary dark:text-zinc-100">{p.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
