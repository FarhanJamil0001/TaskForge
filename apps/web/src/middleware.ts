import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const publicPaths = ['/auth', '/access-denied', '/api/bot', '/api/check-email'];
  const isPublicPath = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  // Email allowlist: if ALLOWED_EMAILS is set, only listed emails can access
  if (user && !request.nextUrl.pathname.startsWith('/access-denied')) {
    const raw = process.env.ALLOWED_EMAILS;
    if (raw?.trim()) {
      const allowed = raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (allowed.length > 0) {
        const userEmail = user.email?.toLowerCase();
        if (!userEmail || !allowed.includes(userEmail)) {
          const url = request.nextUrl.clone();
          url.pathname = '/access-denied';
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
