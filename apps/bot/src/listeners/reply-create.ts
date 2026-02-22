import { Message, EmbedBuilder } from 'discord.js';
import { createTask } from '../api.js';
import { parsePriority, parseDueDate } from '../parsers.js';

const TRIGGER = /^!task\b/i;

export async function handleReplyCreate(message: Message) {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content) return;
  if (!TRIGGER.test(message.content.trim())) return;

  const opts = message.content.replace(TRIGGER, '').trim();
  const priority = parsePriority(opts) ?? 'medium';
  const dueDate = parseDueDate(opts);

  if (message.reference?.messageId) {
    await createFromReply(message, opts, priority, dueDate);
  } else {
    await createFromMessage(message, opts, priority, dueDate);
  }
}

async function createFromReply(
  message: Message,
  opts: string,
  priority: string,
  dueDate: string | null,
) {
  let original: Message;
  try {
    original = await message.channel.messages.fetch(message.reference!.messageId!);
  } catch {
    await message.reply('Could not fetch the original message.');
    return;
  }

  if (!original.content) {
    await message.reply('The original message has no text content to create a task from.');
    return;
  }

  const title = original.content.slice(0, 500);
  const description = original.content.length > 500 ? original.content : null;
  const originalUrl = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${original.id}`;

  try {
    await createTask({
      guild_id: message.guild.id,
      channel_id: message.channel.id,
      title,
      description,
      priority,
      due_date: dueDate,
      discord_message_id: original.id,
      discord_author_id: original.author.id,
      discord_message_url: originalUrl,
    });

    await original.react('📋');

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('📋 Task created from message')
      .addFields(
        { name: 'Title', value: title },
        { name: 'Priority', value: priority, inline: true },
      );

    if (dueDate) {
      embed.addFields({ name: 'Due', value: dueDate, inline: true });
    }

    embed.setFooter({ text: `From ${original.author.displayName}` });

    await message.reply({ embeds: [embed] });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    await message.reply(`Failed to create task: ${detail}`);
  }
}

async function createFromMessage(
  message: Message,
  opts: string,
  priority: string,
  dueDate: string | null,
) {
  const title = opts.slice(0, 500).trim();
  if (!title) {
    await message.reply('Usage: `!task <title>` — e.g. `!task Fix the login bug`');
    return;
  }

  const messageUrl = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

  try {
    await createTask({
      guild_id: message.guild.id,
      channel_id: message.channel.id,
      title,
      description: opts.length > 500 ? opts : null,
      priority,
      due_date: dueDate,
      discord_message_id: message.id,
      discord_author_id: message.author.id,
      discord_message_url: messageUrl,
    });

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('📋 Task created')
      .addFields(
        { name: 'Title', value: title },
        { name: 'Priority', value: priority, inline: true },
      );

    if (dueDate) {
      embed.addFields({ name: 'Due', value: dueDate, inline: true });
    }

    await message.reply({ embeds: [embed] });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    await message.reply(`Failed to create task: ${detail}`);
  }
}
