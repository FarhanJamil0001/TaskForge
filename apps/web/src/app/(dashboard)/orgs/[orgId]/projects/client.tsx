'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Organization, Project } from '@taskforge/shared';

export function ProjectsClient({
  org,
  projects,
  userId,
}: {
  org: Organization;
  projects: Project[];
  userId: string;
}) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    await supabase
      .from('projects')
      .insert({ name: name.trim(), org_id: org.id, created_by: userId });

    setName('');
    setShowForm(false);
    setCreating(false);
    router.refresh();
  }

  async function handleDelete(projectId: string) {
    setDeleting(true);
    await supabase.from('projects').delete().eq('id', projectId);
    setConfirmDeleteId(null);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2">
        <Link href="/orgs" className="text-sm text-gray-400 hover:text-gray-600">
          ← Organizations
        </Link>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{org.name} — Projects</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          New Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="input flex-1"
            autoFocus
          />
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <div key={project.id} className="card group relative">
            <Link href={`/projects/${project.id}/boards`} className="block">
              <h3 className="font-semibold group-hover:text-brand-600">{project.name}</h3>
              <p className="mt-1 font-mono text-xs text-gray-400">{project.id}</p>
              <p className="mt-1 text-xs text-gray-400">
                Created {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
            <button
              onClick={() => setConfirmDeleteId(project.id)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              title="Delete project"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                <path d="M3 4.5h10M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M5 4.5v8a1 1 0 001 1h4a1 1 0 001-1v-8M7 7v3.5M9 7v3.5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {projects.length === 0 && !showForm && (
        <div className="card text-center text-gray-400">
          No projects yet. Create one to get started.
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Delete project?</h2>
            <p className="mt-2 text-sm text-gray-500">
              This will permanently delete the project and all of its boards and tasks.
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
