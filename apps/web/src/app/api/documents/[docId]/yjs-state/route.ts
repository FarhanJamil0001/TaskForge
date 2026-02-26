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
  const { state } = body as { state: string | number[] };

  let hexString: string;
  if (typeof state === 'string') {
    hexString = '\\x' + Buffer.from(state, 'base64').toString('hex');
  } else if (Array.isArray(state)) {
    hexString = '\\x' + Buffer.from(new Uint8Array(state)).toString('hex');
  } else {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  const { error } = await supabase
    .from('project_documents')
    .update({ yjs_state: hexString })
    .eq('id', docId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
