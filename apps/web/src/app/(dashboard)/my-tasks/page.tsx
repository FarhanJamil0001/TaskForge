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

  const taskSelect = `
    *,
    boards!inner(
      id,
      project_id,
      projects!inner(id, name, org_id)
    )
  `;

  // Tasks assigned to the user
  const { data: assignedRaw } = await supabase
    .from('tasks')
    .select(taskSelect)
    .eq('assignee_user_id', user.id)
    .order('created_at', { ascending: false });

  // Tasks where the user is a collaborator
  const { data: collabRows } = await supabase
    .from('task_collaborators')
    .select('task_id')
    .eq('user_id', user.id);

  const assignedIds = new Set((assignedRaw ?? []).map((t) => t.id));
  const collabOnlyIds = (collabRows ?? [])
    .map((r) => r.task_id)
    .filter((id: string) => !assignedIds.has(id));

  let collabRaw: typeof assignedRaw = [];
  if (collabOnlyIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select(taskSelect)
      .in('id', collabOnlyIds)
      .order('created_at', { ascending: false });
    collabRaw = data ?? [];
  }

  const collabTaskIdSet = new Set(collabOnlyIds);

  type RawTask = NonNullable<typeof assignedRaw>[number];

  function toClientTask(t: RawTask, isCollaborator: boolean) {
    const { boards, ...task } = t as RawTask & {
      boards: { project_id: string; projects: { id: string; name: string; org_id: string } };
    };
    if (boards.projects.org_id !== orgId) return null;
    return {
      ...task,
      project_id: boards.projects.id,
      project_name: boards.projects.name,
      is_collaborator: isCollaborator,
    };
  }

  const tasksForClient = [
    ...(assignedRaw ?? []).map((t) => toClientTask(t, false)),
    ...(collabRaw ?? []).map((t) => toClientTask(t, true)),
  ].filter((t): t is NonNullable<typeof t> => t !== null);

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
