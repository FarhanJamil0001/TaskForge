import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTaskFromBotSchema } from '@taskforge/shared';

export async function POST(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const body = await req.json();
  const parsed = createTaskFromBotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    guild_id,
    channel_id,
    title,
    description,
    priority,
    due_date,
    assignee_user_id,
    discord_message_id,
    discord_author_id,
    discord_message_url,
  } = parsed.data;

  const supabase = createAdminClient();

  const { data: channelLink } = await supabase
    .from('discord_project_channels')
    .select('project_id')
    .eq('channel_id', channel_id)
    .eq('guild_id', guild_id)
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
      { error: 'No board found for this project. Create a board in the web app first.' },
      { status: 404 },
    );
  }

  const { data: guild } = await supabase
    .from('discord_guilds')
    .select('org_id')
    .eq('guild_id', guild_id)
    .single();

  const { data: orgMember } = guild
    ? await supabase
        .from('organization_members')
        .select('user_id')
        .eq('org_id', guild.org_id)
        .limit(1)
        .single()
    : { data: null };

  const createdBy = assignee_user_id ?? orgMember?.user_id;
  if (!createdBy) {
    return NextResponse.json({ error: 'Cannot determine task creator' }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      board_id: board.id,
      title,
      description: description ?? null,
      status: 'backlog',
      priority: priority ?? 'medium',
      due_date: due_date ?? null,
      assignee_user_id: assignee_user_id ?? null,
      created_by: createdBy,
      discord_guild_id: guild_id,
      discord_channel_id: channel_id,
      discord_message_id: discord_message_id ?? null,
      discord_author_id: discord_author_id ?? null,
      discord_message_url: discord_message_url ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('task_events').insert({
    task_id: task.id,
    type: 'created_from_discord',
    payload: { guild_id, channel_id, discord_message_id, discord_author_id },
  });

  return NextResponse.json({ task });
}
