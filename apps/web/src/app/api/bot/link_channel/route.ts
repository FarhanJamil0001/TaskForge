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

  const { guild_id, channel_id, project_id } = parsed.data;
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

  const { data: link, error } = await supabase
    .from('discord_project_channels')
    .upsert(
      { guild_id, channel_id, project_id, enabled: true, create_mode: 'instant' },
      { onConflict: 'channel_id' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ link });
}
