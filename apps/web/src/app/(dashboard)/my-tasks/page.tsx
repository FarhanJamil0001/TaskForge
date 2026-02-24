import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { MyTasksClient } from './my-tasks-client';

export default async function MyTasksPage() {
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

  const orgId = membership?.org_id ?? null;
  if (!orgId) redirect('/orgs');

  const { data: tasksWithContext } = await supabase
    .from('tasks')
    .select(
      `
      *,
      boards!inner(
        id,
        project_id,
        projects!inner(id, name, org_id)
      )
    `,
    )
    .eq('assignee_user_id', user.id)
    .order('created_at', { ascending: false });

  const tasks =
    tasksWithContext?.filter((t) => {
      const proj = (t.boards as { projects: { org_id: string } })?.projects;
      return proj?.org_id === orgId;
    }) ?? [];

  const tasksForClient = tasks.map((t) => {
    const { boards, ...task } = t as typeof t & {
      boards: { project_id: string; projects: { id: string; name: string } };
    };
    return {
      ...task,
      project_id: boards.projects.id,
      project_name: boards.projects.name,
    };
  });

  const { data: orgMembers } = await supabase.rpc('get_org_members_with_email', {
    p_org_id: orgId,
  });

  return (
    <MyTasksClient
      tasks={tasksForClient}
      orgMembers={orgMembers ?? []}
      userId={user.id}
    />
  );
}
