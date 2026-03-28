import { createServerSupabase } from '@/lib/supabase/server';
import { MembersClient } from './client';

export default async function MembersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: org }, { data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, join_code')
      .eq('id', orgId)
      .single(),
    supabase.rpc('get_org_members_with_email', { p_org_id: orgId }),
    supabase
      .from('org_invites')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  if (!org) {
    return <div className="text-center text-gray-400">Organization not found</div>;
  }

  const myMembership = (members ?? []).find(
    (m: { user_id: string }) => m.user_id === user!.id,
  );

  return (
    <MembersClient
      org={org}
      members={members ?? []}
      invites={invites ?? []}
      currentUserId={user!.id}
      isAdmin={myMembership?.role === 'admin'}
    />
  );
}
