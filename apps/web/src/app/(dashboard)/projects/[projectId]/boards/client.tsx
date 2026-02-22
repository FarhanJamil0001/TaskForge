'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Board } from '@taskforge/shared';

interface ProjectWithOrg {
  id: string;
  org_id: string;
  name: string;
  organizations: { id: string; name: string };
}

export function BoardsClient({
  project,
  boards,
  userId,
}: {
  project: ProjectWithOrg;
  boards: Board[];
  userId: string;
}) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    const isDefault = boards.length === 0;
    await supabase
      .from('boards')
      .insert({
        name: name.trim(),
        project_id: project.id,
        created_by: userId,
        is_default: isDefault,
      });

    setName('');
    setShowForm(false);
    setCreating(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2">
        <Link
          href={`/orgs/${project.org_id}/projects`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← {project.organizations.name} / Projects
        </Link>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name} — Boards</h1>
          <p className="mt-1 font-mono text-xs text-gray-400">{project.id}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          New Board
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Board name"
            className="input flex-1"
            autoFocus
          />
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {boards.map((board) => (
          <Link key={board.id} href={`/boards/${board.id}`} className="card group block">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold group-hover:text-brand-600">{board.name}</h3>
              {board.is_default && (
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
                  Default
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Created {new Date(board.created_at).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>

      {boards.length === 0 && !showForm && (
        <div className="card text-center text-gray-400">
          No boards yet. Create one to get started.
        </div>
      )}
    </div>
  );
}
