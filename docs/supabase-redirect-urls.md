# Supabase Redirect URLs for TaskForge

Add these URLs in **Supabase Dashboard** → **Authentication** → **URL Configuration**.

## Site URL (default redirect)

Set to your production URL:

```
https://taskforge-farhanjamil1000-7173s-projects.vercel.app
```

(Or `https://taskforge.vercel.app` if you use a custom production domain.)

## Redirect URLs (allow list)

Add each of these:

| URL | Purpose |
|-----|---------|
| `https://taskforge-farhanjamil1000-7173s-projects.vercel.app/**` | Production + preview deployments |
| `https://taskforge-farhanjamil1000-7173s-projects.vercel.app/auth/callback` | Auth callback (email confirm, OAuth) |
| `https://*.vercel.app/**` | All Vercel deployments (preview branches) |
| `http://localhost:3000/**` | Local development |

### Minimal setup

If you prefer fewer entries, the wildcard covers most cases:

- `https://*.vercel.app/**` — matches all Vercel URLs (taskforge, previews, etc.)
- `http://localhost:3000/**` — local dev

## Steps

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **URL Configuration**
3. Set **Site URL** to your main production URL
4. Add the **Redirect URLs** above
5. Save

---

## Debugging Realtime in production

If Realtime still doesn't work after setting redirect URLs:

1. **Enable debug logging** — In Vercel, add an environment variable:
   - Name: `NEXT_PUBLIC_DEBUG_REALTIME`
   - Value: `true`
2. Redeploy, then open your app and the **browser DevTools console** (F12 → Console).
3. Look for `[Realtime debug]` and `[Realtime ...]` messages:
   - **hasUser / hasToken** — If false, auth session isn't available (cookie/timing issue).
   - **Subscribe status** — Should show `SUBSCRIBED`. If `CHANNEL_ERROR`, check Supabase Dashboard → Database → Replication (ensure `tasks` is in the publication).
   - **transport** — WebSocket connection events (connected, heartbeat, errors).
4. [Supabase Realtime Inspector](https://realtime.supabase.com/inspector/new) — Connect with your project URL and anon key to see live connections and messages.
