import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteTaskFromBotSchema } from '@taskforge/shared';

export async function POST(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const body = await req.json();
  const parsed = deleteTaskFromBotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { discord_message_id, guild_id, channel_id } = parsed.data;
  const supabase = createAdminClient();

  const { data: task, error: findError } = await supabase
    .from('tasks')
    .select('id')
    .eq('discord_message_id', discord_message_id)
    .eq('discord_guild_id', guild_id)
    .eq('discord_channel_id', channel_id)
    .single();

  if (findError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, task_id: task.id });
}
