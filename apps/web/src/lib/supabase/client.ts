import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

const DEBUG_REALTIME = process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true';

export function createClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
