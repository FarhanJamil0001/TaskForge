import { createServerSupabase } from '@/lib/supabase/server';
import { ProjectViewClient } from './project-view-client';
import type { ProjectDocument } from '@/components/document-hub';
import type { Task } from '@taskforge/shared';

export type ProjectView = {
  id: string;
  project_id: string;
  type: 'board' | 'documents';
  name: string;
  board_id: string | null;
  position: number;
};

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createServerSupabase();

  const [{ data: { user } }, { data: project }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('projects')
      .select('id, name, org_id, organizations(id, name, connect_code)')
      .eq('id', projectId)
      .single(),
  ]);

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

  let { data: defaultBoard } = await supabase
    .from('boards')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_default', true)
    .single();

  if (!defaultBoard) {
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
    defaultBoard = newBoard;
  }

  if (!defaultBoard) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-txt-secondary">Could not load board</p>
      </div>
    );
  }

  let { data: views } = await supabase
    .from('project_views')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (!views || views.length === 0) {
    await supabase.from('project_views').insert([
      {
        project_id: projectId,
        type: 'board',
        name: 'Main Table',
        board_id: defaultBoard.id,
        position: 0,
      },
      {
        project_id: projectId,
        type: 'documents',
        name: 'Documents',
        board_id: null,
        position: 1,
      },
    ]);
    const { data: v } = await supabase
      .from('project_views')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });
    views = v ?? [];
  }

  const boardIds = (views as ProjectView[])
    .filter((v) => v.type === 'board' && v.board_id)
    .map((v) => v.board_id as string);

  const [tasksResult, { data: docs }] = await Promise.all([
    boardIds.length > 0
      ? supabase.from('tasks').select('*').in('board_id', boardIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as Task[] }),
    supabase.from('project_documents').select('*').eq('project_id', projectId).order('position', { ascending: true }),
  ]);

  const tasksByBoardId: Record<string, Task[]> = {};
  for (const boardId of boardIds) {
    tasksByBoardId[boardId] = (tasksResult.data ?? []).filter(
      (t: Task) => t.board_id === boardId,
    );
  }

  return (
    <ProjectViewClient
      projectId={project.id}
      projectName={project.name}
      orgId={org.id}
      orgName={org.name}
      connectCode={org.connect_code}
      initialViews={(views ?? []) as ProjectView[]}
      tasksByBoardId={tasksByBoardId}
      userId={user!.id}
      initialDocs={(docs ?? []) as ProjectDocument[]}
    />
  );
}
