# Running the TaskForge Discord Bot on a Server (PM2)

This guide is for running the Discord bot on a Linux server with PM2 for 24/7 uptime and auto-restart on failure.

## Prerequisites

- **Node.js >= 18**
- **pnpm >= 9** (`npm install -g pnpm`)
- **PM2** (already installed on your server)

## What You Need From the TaskForge Owner

Before you can run the bot, the owner needs to give you:

1. **`apps/bot/.env`** — A file with these variables (they create it, you never share it):

   ```
   DISCORD_BOT_TOKEN=...        # From Discord Developer Portal
   DISCORD_CLIENT_ID=...        # Discord Application ID
   BOT_API_BASE_URL=https://... # Production web app URL (e.g. https://taskforge.vercel.app)
   BOT_SECRET=...              # Shared secret (must match the web app's BOT_SECRET)
   ```

2. **Access to the repo** — Either:
   - Git clone URL (if public), or
   - A zip/tarball of the project

---

## Setup Steps

### 1. Get the project on the server

```bash
git clone https://github.com/FarhanJamil0001/TaskForge.git
cd TaskForge
```

(Or unpack the project if they sent you a zip.)

### 2. Install dependencies

```bash
pnpm install
```

### 3. Build the shared package

```bash
pnpm --filter @taskforge/shared build
```

### 4. Add the `.env` file

Create `apps/bot/.env` with the values the owner gave you:

```bash
# Create from example, then edit with real values
cp apps/bot/.env.example apps/bot/.env
nano apps/bot/.env   # or vim, etc.
```

Fill in:
- `DISCORD_BOT_TOKEN` — Bot token from Discord Developer Portal
- `DISCORD_CLIENT_ID` — Application ID from Discord
- `BOT_API_BASE_URL` — **Production** web URL (e.g. `https://your-app.vercel.app`)
- `BOT_SECRET` — Must match the web app’s `BOT_SECRET`

### 5. Register slash commands (one-time)

```bash
pnpm --filter @taskforge/bot deploy-commands
```

### 6. Start the bot with PM2

**Option A — Using the ecosystem file (recommended):**

```bash
pm2 start ecosystem.config.cjs
```

**Option B — Manual start:**

```bash
cd apps/bot
pm2 start "pnpm start" --name taskforge-bot
```

### 7. (Optional) Survive server reboots

```bash
pm2 save
pm2 startup
# Run the command it prints to enable startup on boot
```

---

## PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 logs taskforge-bot` | View logs |
| `pm2 monit` | Live dashboard |
| `pm2 restart taskforge-bot` | Restart the bot |
| `pm2 stop taskforge-bot` | Stop the bot |
| `pm2 delete taskforge-bot` | Remove from PM2 |

---

## Updating the Bot

When the owner pushes changes:

```bash
cd TaskForge
git pull
pnpm install
pnpm --filter @taskforge/shared build
pm2 restart taskforge-bot
```

---

## Troubleshooting

- **Bot doesn’t respond** — Check `pm2 logs taskforge-bot`. Ensure `BOT_API_BASE_URL` points to the live web app (not localhost).
- **"DISCORD_BOT_TOKEN is not set"** — `.env` is missing or in the wrong place. It must be at `apps/bot/.env`.
- **Slash commands missing** — Run `pnpm --filter @taskforge/bot deploy-commands` again.
- **API errors / 401** — `BOT_SECRET` in the bot’s `.env` must match the web app’s `BOT_SECRET`.
