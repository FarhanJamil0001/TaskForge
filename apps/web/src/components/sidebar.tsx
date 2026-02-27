'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SidebarProject {
  id: string;
  name: string;
  created_at: string;
}

function projectColor(id: string): string {
  const hue = (id.charCodeAt(0) * 47 + id.charCodeAt(1) * 23 + id.charCodeAt(2) * 11) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export function Sidebar({
  projects,
  orgId,
  orgName,
  userId,
}: {
  projects: SidebarProject[];
  orgId: string | null;
  orgName: string | null;
  userId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  async function handleAddProject() {
    const name = newName.trim();
    if (!name || !orgId || creating) return;
    setCreating(true);

    const { data: project } = await supabase
      .from('projects')
      .insert({ name, org_id: orgId, created_by: userId })
      .select('id')
      .single();

    if (project) {
      await supabase.from('boards').insert({
        project_id: project.id,
        name: 'Main Board',
        is_default: true,
        created_by: userId,
      });

      setNewName('');
      setAdding(false);
      setCreating(false);
      router.push(`/projects/${project.id}`);
      router.refresh();
    } else {
      setCreating(false);
    }
  }

  const activeProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;

  return (
    <aside className="hidden w-[250px] shrink-0 flex-col bg-sidebar dark:bg-zinc-950 md:flex">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-4 dark:border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
          T
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">TaskForge</span>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500">
            {orgName ?? 'work management'}
          </span>
        </div>
      </div>

      {/* Top nav */}
      <nav className="space-y-0.5 px-2.5 pt-3">
        <Link
          href="/projects"
          className={`flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition ${
            pathname === '/projects'
              ? 'bg-sidebar-active text-white'
              : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-current">
            <path d="M3 7.5L9 2.5L15 7.5V15H11V11H7V15H3V7.5Z" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          Home
        </Link>
        <Link
          href="/my-tasks"
          className={`flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition ${
            pathname === '/my-tasks'
              ? 'bg-sidebar-active text-white'
              : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-current">
            <path d="M2 4h14v10H2V4z" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M6 2v4M12 2v4M2 8h14" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          My Tasks
        </Link>
      </nav>

      {/* Projects section */}
      <div className="mt-4 flex flex-1 flex-col overflow-hidden px-2.5">
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-500">
            Projects
          </span>
          <button
            onClick={() => setAdding(true)}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-500 transition hover:bg-sidebar-hover hover:text-white dark:text-zinc-500 dark:hover:bg-zinc-800"
            title="New project"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
              <path d="M6 1v10M1 6h10" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto">
          {projects.map((project) => {
            const isActive = activeProjectId === project.id;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`group flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition ${
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                }`}
              >
                <span
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                  style={{ backgroundColor: projectColor(project.id) }}
                >
                  {project.name[0]?.toUpperCase()}
                </span>
                <span className="truncate">{project.name}</span>
              </Link>
            );
          })}

          {/* Inline add project */}
          {adding && (
            <div className="px-1 py-1">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddProject();
                  if (e.key === 'Escape') {
                    setAdding(false);
                    setNewName('');
                  }
                }}
                onBlur={() => {
                  if (!newName.trim()) {
                    setAdding(false);
                    setNewName('');
                  }
                }}
                placeholder="Project name..."
                disabled={creating}
                className="w-full rounded-md border border-white/20 bg-sidebar-hover px-3 py-1.5 text-[13px] text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}

          {projects.length === 0 && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-gray-500 transition hover:text-gray-300 dark:text-zinc-500 dark:hover:text-zinc-400"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                <path d="M7 1v12M1 7h12" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Create your first project
            </button>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div className="space-y-0.5 border-t border-white/10 p-3 dark:border-zinc-800">
        {orgId && (
          <Link
            href={`/orgs/${orgId}/members`}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] transition ${
              pathname.includes('/members')
                ? 'bg-sidebar-active font-medium text-white'
                : 'text-gray-400 hover:bg-sidebar-hover hover:text-white'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
              <circle cx="6" cy="5" r="2.5" strokeWidth="1.2" />
              <path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="11.5" cy="5.5" r="1.8" strokeWidth="1.2" />
              <path d="M11.5 9c1.8 0 3.2 1.3 3.5 3" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Members
          </Link>
        )}
        <Link
          href="/orgs"
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] transition ${
            pathname === '/orgs'
              ? 'bg-sidebar-active font-medium text-white'
              : 'text-gray-400 hover:bg-sidebar-hover hover:text-white'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
            <path d="M12.5 9.5a3.5 3.5 0 10-5 3.16V14l2-1 2 1v-1.34a3.5 3.5 0 001-2.16z" strokeWidth="1.2" strokeLinejoin="round" />
            <rect x="2" y="2" width="12" height="3" rx="1" strokeWidth="1.2" />
            <path d="M4 5v3M8 5v1" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Organizations
        </Link>
      </div>
    </aside>
  );
}
