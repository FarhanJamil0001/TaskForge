import { createServerSupabase } from '@/lib/supabase/server';
import { BoardTable } from '@/components/board-table';
import { DiscordPanel } from '@/components/discord-panel';

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

  return (
    <div>
      {/* Board header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-txt-primary">{project.name}</h1>
          <DiscordPanel
            orgId={org.id}
            orgName={org.name}
            connectCode={org.connect_code}
            projectId={project.id}
            projectName={project.name}
          />
        </div>
        {/* View tabs */}
        <div className="mt-3 flex items-center gap-0.5 border-b border-monday-border">
          <button className="relative px-4 py-2 text-sm font-medium text-brand-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brand-500 after:content-['']">
            Main Table
          </button>
          <button className="px-4 py-2 text-sm text-txt-secondary transition hover:text-txt-primary">
            + Add view
          </button>
        </div>
      </div>

      {/* Board table */}
      <BoardTable boardId={board.id} initialTasks={tasks ?? []} userId={user!.id} />
    </div>
  );
}
