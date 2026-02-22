import { createServerSupabase } from '@/lib/supabase/server';
import { BoardsClient } from './client';

export default async function BoardsPage({
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
    .select('*, organizations!inner(id, name)')
    .eq('id', projectId)
    .single();

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (!project) {
    return <div className="text-center text-gray-400">Project not found</div>;
  }

  return (
    <BoardsClient
      project={project}
      boards={boards ?? []}
      userId={user!.id}
    />
  );
}
