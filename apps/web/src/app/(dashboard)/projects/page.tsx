import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function ProjectsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership) redirect('/orgs');

  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('org_id', membership.org_id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (projects && projects.length > 0) {
    redirect(`/projects/${projects[0].id}`);
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="stroke-brand-500">
            <rect x="4" y="6" width="24" height="20" rx="3" strokeWidth="2" />
            <path d="M4 12h24" strokeWidth="2" />
            <path d="M12 12v14" strokeWidth="2" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-txt-primary">No projects yet</h2>
        <p className="mt-2 text-sm text-txt-secondary">
          Create your first project using the <strong>+</strong> button in the sidebar.
        </p>
      </div>
    </div>
  );
}
