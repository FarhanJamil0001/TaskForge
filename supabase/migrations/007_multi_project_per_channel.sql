-- Allow a channel to be linked to multiple projects with optional aliases
-- Drop the single-channel-unique constraint
ALTER TABLE discord_project_channels DROP CONSTRAINT IF EXISTS discord_project_channels_channel_id_key;

-- Add unique constraint: one link per (channel, project) pair
ALTER TABLE discord_project_channels ADD CONSTRAINT discord_project_channels_channel_project_unique
  UNIQUE (channel_id, project_id);

-- Add alias column: short name to specify project when creating tasks (e.g. "web", "api")
ALTER TABLE discord_project_channels ADD COLUMN IF NOT EXISTS alias TEXT;

-- Aliases must be unique within a channel (so !task web ... is unambiguous)
CREATE UNIQUE INDEX IF NOT EXISTS idx_discord_channels_channel_alias
  ON discord_project_channels (guild_id, channel_id, alias)
  WHERE alias IS NOT NULL;
