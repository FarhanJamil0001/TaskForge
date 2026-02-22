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
    project_id: projectIdParam,
    project_alias: projectAliasParam,
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

  const { data: channelLinks } = await supabase
    .from('discord_project_channels')
    .select('project_id, alias')
    .eq('channel_id', channel_id)
    .eq('guild_id', guild_id)
    .eq('enabled', true);

  if (!channelLinks || channelLinks.length === 0) {
    return NextResponse.json(
      { error: 'Channel not linked to any project' },
      { status: 404 },
    );
  }

  let resolvedProjectId: string;
  if (projectIdParam && channelLinks.some((l) => l.project_id === projectIdParam)) {
    resolvedProjectId = projectIdParam;
  } else if (projectAliasParam) {
    const byAlias = channelLinks.find(
      (l) => l.alias?.toLowerCase() === projectAliasParam.toLowerCase(),
    );
    if (!byAlias) {
      const aliases = channelLinks.filter((l) => l.alias).map((l) => `"${l.alias}"`).join(', ');
      return NextResponse.json(
        { error: `Unknown project alias. Use one of: ${aliases || '(no aliases set)'}` },
        { status: 400 },
      );
    }
    resolvedProjectId = byAlias.project_id;
  } else if (channelLinks.length === 1) {
    resolvedProjectId = channelLinks[0].project_id;
  } else {
    const aliases = channelLinks.filter((l) => l.alias).map((l) => `!task ${l.alias} <title>`).join(' or ');
    return NextResponse.json(
      { error: `Specify project: ${aliases || 'link projects with aliases first'}` },
      { status: 400 },
    );
  }

  const { data: board } = await supabase
    .from('boards')
    .select('id')
    .eq('project_id', resolvedProjectId)
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
