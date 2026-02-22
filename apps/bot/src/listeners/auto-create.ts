import { Message } from 'discord.js';
import { createTask, getChannelConfig } from '../api.js';
import { parsePriority, parseDueDate } from '../parsers.js';

export async function handleAutoCreate(message: Message) {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content) return;

  // Spam guard
  if (message.content.length < 6) return;
  if (message.content.startsWith('/')) return;
  if (/^!task\b/i.test(message.content.trim())) return;

  try {
    const config = await getChannelConfig({
      guild_id: message.guild.id,
      channel_id: message.channel.id,
    });
    if (!config.linked || config.create_mode !== 'instant') return;
  } catch {
    return;
  }

  const priority = parsePriority(message.content) ?? 'medium';
  const dueDate = parseDueDate(message.content);
  const messageUrl = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

  try {
    await createTask({
      guild_id: message.guild.id,
      channel_id: message.channel.id,
      title: message.content.slice(0, 500),
      description: message.content.length > 500 ? message.content : null,
      priority,
      due_date: dueDate,
      discord_message_id: message.id,
      discord_author_id: message.author.id,
      discord_message_url: messageUrl,
    });

    await message.react('📋');
  } catch {
    // Channel might not be linked — silently ignore
  }
}
