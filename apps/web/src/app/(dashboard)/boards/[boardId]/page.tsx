import { createServerSupabase } from '@/lib/supabase/server';
import { BoardViewClient } from './board-view-client';

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const supabase = await createServerSupabase();
  const [{ data: { user } }, { data: board }, { data: tasks }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('boards')
      .select('*, projects!inner(id, name, org_id, organizations!inner(id, name, connect_code))')
      .eq('id', boardId)
      .single(),
    supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false }),
  ]);

  if (!board) {
    return <div className="text-center text-txt-secondary">Board not found</div>;
  }

  const project = board.projects as {
    id: string;
    name: string;
    org_id: string;
    organizations: { id: string; name: string; connect_code: string | null };
  };

  const [{ data: siblingBoardRows }, { data: docs }] = await Promise.all([
    supabase.from('boards').select('id, name').eq('project_id', board.project_id).neq('id', boardId),
    supabase.from('project_documents').select('*').eq('project_id', project.id).order('position', { ascending: true }),
  ]);

  return (
    <BoardViewClient
      boardId={boardId}
      boardName={board.name}
      projectId={project.id}
      projectName={project.name}
      orgId={project.org_id}
      orgName={project.organizations.name}
      connectCode={project.organizations.connect_code}
      initialTasks={tasks ?? []}
      userId={user!.id}
      initialDocs={
        (docs ?? []) as import('@/components/document-hub').ProjectDocument[]
      }
      siblingBoards={(siblingBoardRows ?? []).map((b) => ({
        id: b.id,
        name: b.name,
      }))}
    />
  );
}
