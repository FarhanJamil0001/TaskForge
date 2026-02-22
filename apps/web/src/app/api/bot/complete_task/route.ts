import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { completeTaskFromBotSchema } from '@taskforge/shared';

export async function POST(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const body = await req.json();
  const parsed = completeTaskFromBotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { discord_message_id, guild_id, channel_id } = parsed.data;
  const supabase = createAdminClient();

  const { data: task, error: findError } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('discord_message_id', discord_message_id)
    .eq('discord_guild_id', guild_id)
    .eq('discord_channel_id', channel_id)
    .single();

  if (findError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status === 'done') {
    return NextResponse.json({ task, already_done: true });
  }

  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'done' })
    .eq('id', task.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from('task_events').insert({
    task_id: task.id,
    type: 'completed_from_discord',
    payload: { guild_id, channel_id, discord_message_id },
  });

  return NextResponse.json({ task: updated });
}
