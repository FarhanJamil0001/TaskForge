import { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import { deleteTask } from '../api.js';

export async function handleReactionDelete(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
) {
  if (user.bot) return;
  if (reaction.emoji.name !== '❌') return;

  if (reaction.partial) {
    try {
      reaction = await reaction.fetch();
    } catch {
      return;
    }
  }

  const message = reaction.message;
  if (!message.guild) return;

  try {
    await deleteTask({
      discord_message_id: message.id,
      guild_id: message.guild.id,
      channel_id: message.channel.id,
    });
  } catch {
    // Task may not exist for this message — silently ignore
  }
}
