import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { unlinkChannel } from '../api.js';

export const data = new SlashCommandBuilder()
  .setName('unlink_channel')
  .setDescription('Unlink this channel from its TaskForge project');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const channel = interaction.channel;

  if (!guild || !channel) {
    await interaction.editReply('This command must be used in a server channel.');
    return;
  }

  try {
    await unlinkChannel({
      guild_id: guild.id,
      channel_id: channel.id,
    });

    await interaction.editReply('Channel unlinked successfully!');

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('🔗‍💥 TaskForge has been disconnected from this channel')
      .setDescription(
        'Messages in this channel will no longer create tasks. ' +
        'Use `/link_channel` to reconnect to a project.',
      );

    await channel.send({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(
      `Failed to unlink: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
}
