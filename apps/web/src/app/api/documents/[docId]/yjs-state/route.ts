import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { state } = body as { state: number[] };
  if (!Array.isArray(state)) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  const buffer = Buffer.from(new Uint8Array(state));

  const { error } = await supabase
    .from('project_documents')
    .update({
      yjs_state: buffer,
      updated_at: new Date().toISOString(),
    })
    .eq('id', docId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
