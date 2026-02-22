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

  const { guild_id, channel_id, project_id, project_alias } = parsed.data;
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

  let deleteFilter = supabase
    .from('discord_project_channels')
    .delete()
    .eq('channel_id', channel_id)
    .eq('guild_id', guild_id);

  if (project_id) {
    deleteFilter = deleteFilter.eq('project_id', project_id);
  } else if (project_alias) {
    const { data: link } = await supabase
      .from('discord_project_channels')
      .select('project_id')
      .eq('channel_id', channel_id)
      .eq('guild_id', guild_id)
      .ilike('alias', project_alias)
      .single();
    if (!link) {
      return NextResponse.json(
        { error: 'No link found with that project or alias.' },
        { status: 404 },
      );
    }
    deleteFilter = deleteFilter.eq('project_id', link.project_id);
  } else {
    const { data: links } = await supabase
      .from('discord_project_channels')
      .select('id')
      .eq('channel_id', channel_id)
      .eq('guild_id', guild_id);
    if (!links || links.length === 0) {
      return NextResponse.json(
        { error: 'This channel is not linked to any project.' },
        { status: 404 },
      );
    }
    if (links.length > 1) {
      return NextResponse.json(
        { error: 'Channel has multiple project links. Specify project_id or project_alias to unlink one.' },
        { status: 400 },
      );
    }
    deleteFilter = deleteFilter.eq('id', links[0].id);
  }

  const { error } = await deleteFilter;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
