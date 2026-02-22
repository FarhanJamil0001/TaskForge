'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { OrgRole } from '@taskforge/shared';

interface MemberRow {
  id: string;
  user_id: string;
  email: string;
  role: OrgRole;
  created_at: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: OrgRole;
  status: string;
  created_at: string;
}

interface MembersClientProps {
  org: { id: string; name: string; join_code: string | null };
  members: MemberRow[];
  invites: InviteRow[];
  currentUserId: string;
  isAdmin: boolean;
}

export function MembersClient({
  org,
  members,
  invites,
  currentUserId,
  isAdmin,
}: MembersClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [confirmRemove, setConfirmRemove] = useState<MemberRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const [changingRole, setChangingRole] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [orgName, setOrgName] = useState(org.name);
  const [savingName, setSavingName] = useState(false);

  const adminCount = members.filter((m) => m.role === 'admin').length;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    const existing = members.find((m) => m.email?.toLowerCase() === email);
    if (existing) {
      setInviteError('This user is already a member of the organization.');
      setInviting(false);
      return;
    }

    const { error } = await supabase.from('org_invites').insert({
      org_id: org.id,
      email,
      role: inviteRole,
      invited_by: currentUserId,
    });

    if (error) {
      if (error.code === '23505') {
        setInviteError('A pending invite already exists for this email.');
      } else {
        setInviteError(error.message);
      }
    } else {
      setInviteSuccess(`Invite sent to ${email}`);
      setInviteEmail('');
    }
    setInviting(false);
    router.refresh();
  }

  async function copyJoinCode() {
    if (!org.join_code) return;
    await navigator.clipboard.writeText(org.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateJoinCode() {
    setRegenerating(true);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from('organizations').update({ join_code: code }).eq('id', org.id);
    setRegenerating(false);
    router.refresh();
  }

  async function handleRemove(member: MemberRow) {
    setRemoving(true);
    await supabase.from('organization_members').delete().eq('id', member.id);
    setConfirmRemove(null);
    setRemoving(false);
    router.refresh();
  }

  async function handleRoleChange(member: MemberRow, newRole: OrgRole) {
    setChangingRole(member.id);
    await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', member.id);
    setChangingRole(null);
    router.refresh();
  }

  async function handleRevokeInvite(inviteId: string) {
    await supabase
      .from('org_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);
    router.refresh();
  }

  async function saveOrgName(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;
    setSavingName(true);
    await supabase
      .from('organizations')
      .update({ name: orgName.trim() })
      .eq('id', org.id);
    setEditingName(false);
    setSavingName(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={`/orgs/${org.id}/projects`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          &larr; Projects
        </Link>
        {isAdmin && editingName ? (
          <form onSubmit={saveOrgName} className="ml-2 flex items-center gap-2">
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="input w-48 py-1.5 text-sm"
              autoFocus
            />
            <button type="submit" disabled={savingName} className="btn-primary text-xs">
              {savingName ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingName(false);
                setOrgName(org.name);
              }}
              disabled={savingName}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm font-medium text-gray-700">{org.name}</span>
            {isAdmin && (
              <button
                onClick={() => setEditingName(true)}
                className="ml-1 text-xs text-gray-400 hover:text-brand-600 hover:underline"
              >
                Rename
              </button>
            )}
          </>
        )}
      </div>
      <h1 className="mb-6 text-2xl font-bold">Members</h1>

      {/* Join Code Section */}
      {isAdmin && (
        <div className="card mb-6">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Join Code</h2>
          <p className="mb-3 text-xs text-gray-400">
            Share this code with people so they can join the organization instantly.
          </p>
          <div className="flex items-center gap-3">
            <code className="rounded-lg bg-gray-100 px-4 py-2 font-mono text-lg font-bold tracking-widest text-brand-600">
              {org.join_code ?? '—'}
            </code>
            <button onClick={copyJoinCode} className="btn-secondary text-xs">
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={regenerateJoinCode}
              disabled={regenerating}
              className="text-xs text-gray-400 hover:underline"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}

      {/* Invite by Email */}
      {isAdmin && (
        <div className="card mb-6">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Invite by Email</h2>
          <p className="mb-3 text-xs text-gray-400">
            The invited user will see this invite when they sign in with the same email address.
          </p>
          <form onSubmit={handleInvite} className="flex items-end gap-3">
            <div className="flex-1">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="input"
                required
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="input w-32"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={inviting} className="btn-primary whitespace-nowrap">
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
          {inviteError && (
            <p className="mt-2 text-sm text-red-500">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="mt-2 text-sm text-green-600">{inviteSuccess}</p>
          )}
        </div>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Pending Invites</h2>
          <div className="divide-y divide-gray-100">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    {invite.email}
                  </span>
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    pending
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    as {invite.role}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Members ({members.length})
        </h2>
        <div className="divide-y divide-gray-100">
          {members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const isLastAdmin = member.role === 'admin' && adminCount <= 1;
            return (
              <div
                key={member.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                    {(member.email ?? '?')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {member.email ?? 'Unknown'}
                      {isCurrentUser && (
                        <span className="ml-1.5 text-xs text-gray-400">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && !isCurrentUser ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member, e.target.value as OrgRole)
                      }
                      disabled={changingRole === member.id}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        member.role === 'admin'
                          ? 'bg-brand-50 text-brand-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.role}
                    </span>
                  )}

                  {isAdmin && !isCurrentUser && !isLastAdmin && (
                    <button
                      onClick={() => setConfirmRemove(member)}
                      className="rounded-md p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                      title="Remove member"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="stroke-current"
                      >
                        <path
                          d="M3 4.5h10M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M5 4.5v8a1 1 0 001 1h4a1 1 0 001-1v-8M7 7v3.5M9 7v3.5"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Remove member?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Remove <strong>{confirmRemove.email}</strong> from{' '}
              <strong>{org.name}</strong>? They will lose access to all projects
              and data in this organization.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={removing}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={removing}
                className="btn-danger"
              >
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
