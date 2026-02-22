import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

const DEBUG_REALTIME = process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true';

export function createClient() {
  if (client) return client;
  // Trim to fix WebSocket failures from trailing newlines in Vercel env vars (e.g. %0A in URL)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  client = createBrowserClient(
    url,
    key,
    DEBUG_REALTIME
      ? {
          realtime: {
            logLevel: 'info',
            logger: (kind: string, msg: string, data?: unknown) => {
              console.log(`[Realtime ${kind}]`, msg, data ?? '');
            },
          },
        }
      : undefined,
  );
  return client;
}
