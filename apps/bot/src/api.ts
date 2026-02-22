const BASE_URL = process.env.BOT_API_BASE_URL || 'http://localhost:3000';
const BOT_SECRET = process.env.BOT_SECRET || '';

async function botFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BOT_SECRET}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message ?? data.error ?? `API error ${res.status}`);
  }
  return data as T;
}

export function connectGuild(payload: {
  guild_id: string;
  guild_name: string;
  org_id: string;
  connect_code: string;
}) {
  return botFetch('/api/bot/connect_guild', payload);
}

export function linkChannel(payload: {
  guild_id: string;
  channel_id: string;
  project_id: string;
}) {
  return botFetch('/api/bot/link_channel', payload);
}

export function unlinkChannel(payload: {
  guild_id: string;
  channel_id: string;
}) {
  return botFetch('/api/bot/unlink_channel', payload);
}

export function completeTask(payload: {
  discord_message_id: string;
  guild_id: string;
  channel_id: string;
}) {
  return botFetch('/api/bot/complete_task', payload);
}

export function createTask(payload: {
  guild_id: string;
  channel_id: string;
  title: string;
  description?: string | null;
  priority?: string;
  due_date?: string | null;
  assignee_user_id?: string | null;
  discord_message_id?: string | null;
  discord_author_id?: string | null;
  discord_message_url?: string | null;
}) {
  return botFetch('/api/bot/create_task', payload);
}
