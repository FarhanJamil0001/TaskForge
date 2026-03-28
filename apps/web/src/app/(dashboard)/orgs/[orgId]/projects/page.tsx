import { createServerSupabase } from '@/lib/supabase/server';
import { ProjectsClient } from './client';

export default async function ProjectsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: org }, { data: projects }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('projects').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
  ]);

  if (!org) {
    return <div className="text-center text-gray-400">Organization not found</div>;
  }

  return (
    <ProjectsClient org={org} projects={projects ?? []} userId={user!.id} />
  );
}
