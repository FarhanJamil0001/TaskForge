import { NextRequest, NextResponse } from 'next/server';
import { verifyBotSecret } from '@/lib/bot-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { connectGuildSchema } from '@taskforge/shared';

export async function POST(req: NextRequest) {
  const authError = verifyBotSecret(req);
  if (authError) return authError;

  const body = await req.json();
  const parsed = connectGuildSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { guild_id, guild_name, org_id, connect_code } = parsed.data;
  const supabase = createAdminClient();

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, connect_code')
    .eq('id', org_id)
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  if (org.connect_code !== connect_code) {
    return NextResponse.json({ error: 'Invalid connect code' }, { status: 403 });
  }

  const { data: guild, error } = await supabase
    .from('discord_guilds')
    .upsert(
      { guild_id, name: guild_name, org_id },
      { onConflict: 'guild_id' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ guild });
}
