import { createServerSupabase } from '@/lib/supabase/server';
import { BoardTable } from '@/components/board-table';

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: board } = await supabase
    .from('boards')
    .select('*, projects!inner(id, name, org_id, organizations!inner(id, name))')
    .eq('id', boardId)
    .single();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false });

  if (!board) {
    return <div className="text-center text-txt-secondary">Board not found</div>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-1 flex items-center gap-1.5 text-[13px] text-txt-secondary">
        <span>{board.projects.organizations.name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current opacity-50">
          <path d="M4.5 2.5l3 3.5-3 3.5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{board.projects.name}</span>
      </div>

      {/* Board header */}
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-txt-primary">{board.name}</h1>
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
      <BoardTable boardId={boardId} initialTasks={tasks ?? []} userId={user!.id} />
    </div>
  );
}
