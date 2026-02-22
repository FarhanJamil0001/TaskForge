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

  return <OrgsClient orgs={orgs ?? []} userId={user!.id} />;
}
