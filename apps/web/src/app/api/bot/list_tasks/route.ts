import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const guildId = body.guild_id;
  const channelId = body.channel_id;
  const projectIdParam = body.project_id;
  const projectAliasParam = body.project_alias;
  const limit = Math.min(Math.max(parseInt(String(body.limit ?? 10), 10) || 10, 1), 25);

  if (!guildId || !channelId) {
    return NextResponse.json(
      { error: 'guild_id and channel_id are required' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: channelLinks } = await supabase
    .from('discord_project_channels')
    .select('project_id, alias')
    .eq('channel_id', channelId)
    .eq('guild_id', guildId)
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
    const aliases = channelLinks.filter((l) => l.alias).map((l) => l.alias).join(', ');
    return NextResponse.json(
      { error: `Specify project with project option: ${aliases || 'link projects with aliases first'}` },
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
