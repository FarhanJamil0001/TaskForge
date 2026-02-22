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

  const { data: channelLink } = await supabase
    .from('discord_project_channels')
    .select('create_mode')
    .eq('channel_id', channelId)
    .eq('guild_id', guildId)
    .eq('enabled', true)
    .single();

  if (!channelLink) {
    return NextResponse.json({ linked: false });
  }

  return NextResponse.json({
    linked: true,
    create_mode: channelLink.create_mode,
  });
}
