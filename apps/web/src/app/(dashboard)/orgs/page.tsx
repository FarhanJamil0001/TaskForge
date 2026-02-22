import { createServerSupabase } from '@/lib/supabase/server';
import { OrgsClient } from './client';

export default async function OrgsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, organization_members!inner(user_id)')
    .eq('organization_members.user_id', user!.id)
    .order('created_at', { ascending: false });

  const userEmail = user!.email!.toLowerCase();

  const { data: pendingInvites } = await supabase
    .from('org_invites')
    .select('id, org_id, email, role, created_at, organizations(id, name)')
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString());

  const myInvites = (pendingInvites ?? [])
    .filter((i) => i.email.toLowerCase() === userEmail)
    .map((i) => {
      const org = Array.isArray(i.organizations) ? i.organizations[0] : i.organizations;
      return {
        ...i,
        organizations: org ? { id: org.id, name: org.name } : null,
      };
    });

  return (
    <OrgsClient
      orgs={orgs ?? []}
      userId={user!.id}
      userEmail={userEmail}
      pendingInvites={myInvites}
    />
  );
}
