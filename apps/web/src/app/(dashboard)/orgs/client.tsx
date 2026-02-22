'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Organization } from '@taskforge/shared';

export function OrgsClient({ orgs, userId }: { orgs: Organization[]; userId: string }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectCodeOrg, setConnectCodeOrg] = useState<Organization | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);

    const connectCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { error: rpcError } = await supabase.rpc('create_organization', {
      p_name: name.trim(),
      p_connect_code: connectCode,
    });

    if (rpcError) {
      setError(rpcError.message);
      setCreating(false);
      return;
    }

    setName('');
    setShowForm(false);
    setCreating(false);
    router.refresh();
  }

  async function regenerateCode(org: Organization) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from('organizations').update({ connect_code: code }).eq('id', org.id);
    setConnectCodeOrg({ ...org, connect_code: code });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          New Organization
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6">
          {error && (
            <p className="mb-3 text-sm text-red-500">{error}</p>
          )}
          <div className="flex gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
              className="input flex-1"
              autoFocus
            />
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {connectCodeOrg && (
        <div className="card mb-6 border-brand-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Connect code for <strong>{connectCodeOrg.name}</strong>
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-brand-600">
                {connectCodeOrg.connect_code}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Use <code>/connect {'<orgId>'} {'<code>'}</code> in Discord
              </p>
            </div>
            <button onClick={() => setConnectCodeOrg(null)} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {orgs.map((org) => (
          <div key={org.id} className="card group">
            <Link href={`/orgs/${org.id}/projects`} className="block">
              <h3 className="font-semibold group-hover:text-brand-600">{org.name}</h3>
              <p className="mt-1 font-mono text-xs text-gray-400">{org.id}</p>
              <p className="mt-1 text-xs text-gray-400">
                Created {new Date(org.created_at).toLocaleDateString()}
              </p>
            </Link>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConnectCodeOrg(org)}
                className="text-xs text-brand-600 hover:underline"
              >
                Show Connect Code
              </button>
              <button
                onClick={() => regenerateCode(org)}
                className="text-xs text-gray-400 hover:underline"
              >
                Regenerate
              </button>
            </div>
          </div>
        ))}
      </div>

      {orgs.length === 0 && !showForm && (
        <div className="card text-center text-gray-400">
          No organizations yet. Create one to get started.
        </div>
      )}
    </div>
  );
}
