import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { linkChannelSchema } from '@taskforge/shared';

export async function POST(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const body = await req.json();
  const parsed = linkChannelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { guild_id, channel_id, project_id, create_mode, alias } = parsed.data;
  const supabase = createAdminClient();

  const { data: guild } = await supabase
    .from('discord_guilds')
    .select('id, org_id')
    .eq('guild_id', guild_id)
    .single();

  if (!guild) {
    return NextResponse.json(
      { error: 'Guild not connected. Use /connect first.' },
      { status: 404 },
    );
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', project_id)
    .single();

  if (!project || project.org_id !== guild.org_id) {
    return NextResponse.json(
      { error: 'Project not found or does not belong to this org' },
      { status: 404 },
    );
  }

  const { data: existingLinks } = await supabase
    .from('discord_project_channels')
    .select('project_id')
    .eq('channel_id', channel_id)
    .eq('guild_id', guild_id)
    .eq('enabled', true);

  const isNewProject = !(existingLinks ?? []).some((l) => l.project_id === project_id);
  const hasOtherProjects = (existingLinks ?? []).length >= 1;

  if (isNewProject && hasOtherProjects && !alias) {
    return NextResponse.json(
      { error: 'When linking multiple projects to a channel, an alias is required (e.g. "web", "api")' },
      { status: 400 },
    );
  }

  const { data: link, error } = await supabase
    .from('discord_project_channels')
    .upsert(
      {
        guild_id,
        channel_id,
        project_id,
        enabled: true,
        create_mode: create_mode ?? 'instant',
        alias: alias ?? null,
      },
      { onConflict: 'channel_id,project_id' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ link });
}
