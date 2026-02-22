import { createServerSupabase } from '@/lib/supabase/server';
import { ProjectViewClient } from './project-view-client';

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, org_id, organizations(id, name, connect_code)')
    .eq('id', projectId)
    .single();

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-txt-secondary">Project not found</p>
      </div>
    );
  }

  const org = project.organizations as unknown as {
    id: string;
    name: string;
    connect_code: string | null;
  };

  let { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_default', true)
    .single();

  if (!board) {
    const { data: newBoard } = await supabase
      .from('boards')
      .insert({
        project_id: projectId,
        name: 'Main Board',
        is_default: true,
        created_by: user!.id,
      })
      .select()
      .single();
    board = newBoard;
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-txt-secondary">Could not load board</p>
      </div>
    );
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('board_id', board.id)
    .order('created_at', { ascending: false });

  const { data: docs } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  return (
    <ProjectViewClient
      projectId={project.id}
      projectName={project.name}
      orgId={org.id}
      orgName={org.name}
      connectCode={org.connect_code}
      boardId={board.id}
      initialTasks={tasks ?? []}
      userId={user!.id}
      initialDocs={(docs ?? []) as import('@/components/document-hub').ProjectDocument[]}
    />
  );
}
