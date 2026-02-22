import { NextRequest, NextResponse } from 'next/server';

export function verifyBotSecret(req: NextRequest): NextResponse | null {
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.BOT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
