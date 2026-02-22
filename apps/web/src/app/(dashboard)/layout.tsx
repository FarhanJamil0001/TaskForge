import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, organizations(id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const orgId = membership?.org_id ?? null;
  const org = membership?.organizations as unknown as { id: string; name: string } | null;
  const orgName = org?.name ?? null;

  const { data: projects } = orgId
    ? await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
    : { data: [] };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        projects={projects ?? []}
        orgId={orgId}
        orgName={orgName}
        userId={user.id}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          email={user.email}
          firstName={(user.user_metadata as { first_name?: string })?.first_name}
          lastName={(user.user_metadata as { last_name?: string })?.last_name}
        />
        <main className="flex-1 overflow-auto bg-surface px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
