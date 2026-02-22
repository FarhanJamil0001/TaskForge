# TaskForge

A Monday.com-like project management web app with tight Discord integration.

## Architecture

```
TaskForge/
├── apps/
│   ├── web/          # Next.js 14 App Router (frontend + API routes)
│   └── bot/          # Discord bot (discord.js v14)
├── packages/
│   └── shared/       # Shared TypeScript types + Zod schemas
└── supabase/
    └── migrations/   # SQL schema + RLS policies
```

**Key design decisions:**
- The Discord bot **never** touches Supabase directly. It calls Next.js API routes authenticated with `BOT_SECRET`.
- The web app uses Supabase's `service-role` key only in server-side API route handlers.
- Row Level Security enforces that users can only access data for organizations they belong to.

## Prerequisites

- Node.js >= 18
- pnpm >= 9
- A [Supabase](https://supabase.com) project (free tier works)
- A [Discord Application](https://discord.com/developers/applications) with a bot token

## Setup

### 1. Clone and install

```bash
pnpm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the SQL Editor, run the migration file at `supabase/migrations/001_initial_schema.sql`.
3. Copy your project URL, anon key, and service role key.
4. **Vercel deploy**: Add redirect URLs in Authentication → URL Configuration. See [docs/supabase-redirect-urls.md](docs/supabase-redirect-urls.md) or run `./scripts/print-supabase-redirect-urls.sh`.

### 3. Configure environment variables

```bash
# Web app
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your Supabase credentials + a BOT_SECRET

# Bot
cp apps/bot/.env.example apps/bot/.env
# Edit apps/bot/.env with your Discord bot token + the same BOT_SECRET
```

The `BOT_SECRET` must be the same value in both `.env` files. Generate one with:
```bash
openssl rand -hex 32
```

### 4. Create a Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application.
3. Go to **Bot** → copy the token → paste it as `DISCORD_BOT_TOKEN`.
4. Copy the **Application ID** → paste as `DISCORD_CLIENT_ID`.
5. Under **Bot**, enable:
   - **Message Content Intent**
   - **Server Members Intent** (optional, for future user mapping)
6. Invite the bot to your server with the OAuth2 URL:
   ```
   https://discord.com/api/oauth2/authorize?client_id=1474904483556495611&permissions=2147485696&scope=bot%20applications.commands
   ```

### 5. Register slash commands

```bash
pnpm --filter @taskforge/bot deploy-commands
```

### 6. Run locally

```bash
# Terminal 1: Web app
pnpm dev:web

# Terminal 2: Discord bot
pnpm dev:bot
```

The web app runs at `http://localhost:3000`.

## End-to-End Demo

1. **Sign up** at `http://localhost:3000/auth`
2. **Create an organization** at `/orgs`
3. Click **"Show Connect Code"** to see the connect code
4. **Create a project** inside the org
5. **Create a board** inside the project
6. In Discord, run: `/connect org_id:<org-id> connect_code:<code>`
7. In a channel, run: `/link_channel project_id:<project-id>`
8. Send a normal message in that channel
9. The message appears as a task on the kanban board with a ✅ reaction

## Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Frontend    | Next.js 14 (App Router) + TypeScript + Tailwind |
| Auth / DB   | Supabase (Auth + Postgres + RLS)               |
| Bot         | discord.js v14 + TypeScript                     |
| Drag & Drop | @dnd-kit/core                                  |
| Validation  | Zod                                             |
| Monorepo    | pnpm workspaces                                |

## Project Structure

### Web App Routes

| Path                              | Description              |
|-----------------------------------|--------------------------|
| `/auth`                           | Login / Sign up          |
| `/orgs`                           | List & create orgs       |
| `/orgs/[orgId]/projects`          | List & create projects   |
| `/projects/[projectId]/boards`    | List & create boards     |
| `/boards/[boardId]`               | Kanban board             |

### Bot API Routes

| Endpoint                     | Description                        |
|------------------------------|------------------------------------|
| `POST /api/bot/connect_guild`| Link Discord guild to org          |
| `POST /api/bot/link_channel` | Link channel to project            |
| `POST /api/bot/create_task`  | Create task from Discord message   |
| `POST /api/bot/complete_task`| Mark task done (✅ reaction)        |
| `POST /api/bot/delete_task`  | Delete task (❌ reaction)           |

All bot API routes require `Authorization: Bearer <BOT_SECRET>` header.

### Discord Commands

| Command                              | Description                              |
|--------------------------------------|------------------------------------------|
| `/connect <org_id> <connect_code>`   | Link this server to a TaskForge org      |
| `/link_channel <project_id>`         | Link this channel to a project           |
| `/task create <title> [priority] [due] [assignee]` | Create a task manually      |

### Auto-Create Mode

When a channel is linked to a project, every message (6+ characters, not from bots, not starting with `/`) automatically creates a task. The bot reacts with 📋 on success.

### Task Reactions

- **✅** — React with checkmark on a Discord message that has an associated task to mark it complete.
- **❌** — React with cross mark on a Discord message that has an associated task to delete it.
