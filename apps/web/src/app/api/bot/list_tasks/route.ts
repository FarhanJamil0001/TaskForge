import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const guildId = body.guild_id;
  const channelId = body.channel_id;
  const limit = Math.min(Math.max(parseInt(String(body.limit ?? 10), 10) || 10, 1), 25);

  if (!guildId || !channelId) {
    return NextResponse.json(
      { error: 'guild_id and channel_id are required' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: channelLink } = await supabase
    .from('discord_project_channels')
    .select('project_id')
    .eq('channel_id', channelId)
    .eq('guild_id', guildId)
    .eq('enabled', true)
    .single();

  if (!channelLink) {
    return NextResponse.json(
      { error: 'Channel not linked to any project' },
      { status: 404 },
    );
  }

  const { data: board } = await supabase
    .from('boards')
    .select('id')
    .eq('project_id', channelLink.project_id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!board) {
    return NextResponse.json(
      { error: 'No board found for this project' },
      { status: 404 },
    );
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, created_at')
    .eq('board_id', board.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks ?? [] });
}
