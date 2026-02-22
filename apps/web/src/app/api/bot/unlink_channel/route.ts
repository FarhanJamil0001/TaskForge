import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { unlinkChannelSchema } from '@taskforge/shared';

export async function POST(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const body = await req.json();
  const parsed = unlinkChannelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { guild_id, channel_id } = parsed.data;
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

  const { data: link } = await supabase
    .from('discord_project_channels')
    .select('id')
    .eq('channel_id', channel_id)
    .eq('guild_id', guild_id)
    .single();

  if (!link) {
    return NextResponse.json(
      { error: 'This channel is not linked to any project.' },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from('discord_project_channels')
    .delete()
    .eq('id', link.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
