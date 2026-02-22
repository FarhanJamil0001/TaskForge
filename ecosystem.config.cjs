/**
 * PM2 ecosystem config for the TaskForge Discord bot.
 * Run from project root: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'taskforge-bot',
      cwd: './apps/bot',
      script: 'pnpm',
      args: 'start',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
    },
  ],
};
