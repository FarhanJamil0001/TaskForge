import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get('guild_id');
  const channelId = searchParams.get('channel_id');

  if (!guildId || !channelId) {
    return NextResponse.json(
      { error: 'guild_id and channel_id are required' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: links, error } = await supabase
    .from('discord_project_channels')
    .select('project_id, alias, create_mode')
    .eq('channel_id', channelId)
    .eq('guild_id', guildId)
    .eq('enabled', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const projectIds = (links ?? []).map((l) => l.project_id);
  const { data: projects } =
    projectIds.length > 0
      ? await supabase.from('projects').select('id, name').in('id', projectIds)
      : { data: [] };

  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const result = (links ?? []).map((l) => ({
    project_id: l.project_id,
    project_name: projectMap.get(l.project_id) ?? 'Unknown',
    alias: l.alias,
    create_mode: l.create_mode,
  }));

  return NextResponse.json({ links: result });
}
