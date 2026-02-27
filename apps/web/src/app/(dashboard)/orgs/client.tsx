'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Organization, OrgRole } from '@taskforge/shared';

interface PendingInvite {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  created_at: string;
  organizations: { id: string; name: string } | null;
}

export function OrgsClient({
  orgs,
  userId,
  userEmail,
  pendingInvites,
}: {
  orgs: Organization[];
  userId: string;
  userEmail: string;
  pendingInvites: PendingInvite[];
}) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectCodeOrg, setConnectCodeOrg] = useState<Organization | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

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

  function startEditing(org: Organization) {
    setEditingOrg(org);
    setEditName(org.name);
    setRenameError(null);
  }

  async function saveRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editingOrg || !editName.trim()) return;
    setSaving(true);
    setRenameError(null);
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ name: editName.trim() })
      .eq('id', editingOrg.id);
    if (updateError) {
      setRenameError(updateError.message);
      setSaving(false);
      return;
    }
    setEditingOrg(null);
    setSaving(false);
    router.refresh();
  }

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);

    const { error: rpcError } = await supabase.rpc('join_organization_by_code', {
      p_join_code: joinCode.trim(),
    });

    if (rpcError) {
      setJoinError(rpcError.message);
      setJoining(false);
      return;
    }

    setJoinCode('');
    setShowJoinForm(false);
    setJoining(false);
    router.refresh();
  }

  async function handleAcceptInvite(inviteId: string) {
    setAcceptingId(inviteId);
    setAcceptError(null);

    const { error: rpcError } = await supabase.rpc('accept_org_invite', {
      p_invite_id: inviteId,
    });

    if (rpcError) {
      setAcceptError(rpcError.message);
    }

    setAcceptingId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-txt-primary dark:text-zinc-100">Organizations</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowJoinForm(!showJoinForm);
              setShowForm(false);
            }}
            className="btn-secondary"
          >
            Join by Code
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowJoinForm(false);
            }}
            className="btn-primary"
          >
            New Organization
          </button>
        </div>
      </div>

      {/* Create org form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6">
          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
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

      {/* Join by code form */}
      {showJoinForm && (
        <form onSubmit={handleJoinByCode} className="card mb-6">
          <p className="mb-3 text-sm text-gray-500 dark:text-zinc-400">
            Enter the join code shared by an organization admin.
          </p>
          {joinError && <p className="mb-3 text-sm text-red-500">{joinError}</p>}
          <div className="flex gap-3">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3D4"
              className="input flex-1 font-mono uppercase tracking-widest"
              autoFocus
              maxLength={12}
            />
            <button type="submit" disabled={joining} className="btn-primary">
              {joining ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-zinc-400">
            Pending Invitations
          </h2>
          {acceptError && (
            <p className="mb-3 text-sm text-red-500">{acceptError}</p>
          )}
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="card flex items-center justify-between border-brand-500/30 bg-brand-50/30 dark:border-brand-500/40 dark:bg-brand-500/10"
              >
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-zinc-100">
                    {invite.organizations?.name ?? 'Unknown Organization'}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    Invited as <span className="font-medium">{invite.role}</span>
                    {' · '}
                    {new Date(invite.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleAcceptInvite(invite.id)}
                  disabled={acceptingId === invite.id}
                  className="btn-primary"
                >
                  {acceptingId === invite.id ? 'Accepting...' : 'Accept'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect code banner */}
      {connectCodeOrg && (
        <div className="card mb-6 border-brand-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Connect code for <strong>{connectCodeOrg.name}</strong>
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-brand-600">
                {connectCodeOrg.connect_code}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Use <code>/connect {'<orgId>'} {'<code>'}</code> in Discord
              </p>
            </div>
            <button
              onClick={() => setConnectCodeOrg(null)}
              className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Org cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {orgs.map((org) => (
          <div key={org.id} className="card group">
            {editingOrg?.id === org.id ? (
              <form onSubmit={saveRename} className="mb-3">
                {renameError && <p className="mb-2 text-sm text-red-500">{renameError}</p>}
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input mb-2"
                  autoFocus
                  placeholder="Organization name"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="btn-primary text-xs">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOrg(null);
                      setRenameError(null);
                    }}
                    disabled={saving}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <Link href={`/orgs/${org.id}/projects`} className="block">
                <h3 className="font-semibold group-hover:text-brand-600 dark:text-zinc-100 dark:group-hover:text-brand-400">{org.name}</h3>
                <p className="mt-1 font-mono text-xs text-gray-400 dark:text-zinc-500">{org.id}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                  Created {new Date(org.created_at).toLocaleDateString()}
                </p>
              </Link>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => startEditing(org)}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                Rename
              </button>
              <Link
                href={`/orgs/${org.id}/members`}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                Members
              </Link>
              <button
                onClick={() => setConnectCodeOrg(org)}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                Discord Code
              </button>
              <button
                onClick={() => regenerateCode(org)}
                className="text-xs text-gray-400 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                Regenerate
              </button>
            </div>
          </div>
        ))}
      </div>

      {orgs.length === 0 && pendingInvites.length === 0 && !showForm && !showJoinForm && (
        <div className="card text-center text-gray-400 dark:text-zinc-500">
          No organizations yet. Create one or join an existing one to get started.
        </div>
      )}
    </div>
  );
}
