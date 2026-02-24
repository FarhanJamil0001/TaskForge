import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';

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

  const projectList = (projects ?? []).map((p) => ({ id: p.id, name: p.name }));

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
        <main className="flex-1 overflow-auto bg-surface px-4 py-4 pb-24 md:px-6 md:py-5 md:pb-5">{children}</main>
        <MobileBottomNav orgId={orgId} projects={projectList} />
      </div>
    </div>
  );
}
