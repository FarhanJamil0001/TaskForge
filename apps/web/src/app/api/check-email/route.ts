import { NextRequest, NextResponse } from 'next/server';

function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS;
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const allowed = getAllowedEmails();

    // If no allowlist configured, allow all (backward compatibility)
    if (allowed.length === 0) {
      return NextResponse.json({ allowed: true });
    }

    return NextResponse.json({ allowed: allowed.includes(email) });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
