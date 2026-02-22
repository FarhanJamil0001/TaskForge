import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { connectGuild } from '../api.js';

export const data = new SlashCommandBuilder()
  .setName('connect')
  .setDescription('Link this Discord server to a TaskForge organization')
  .addStringOption((opt) =>
    opt.setName('org_id').setDescription('Organization ID from TaskForge').setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName('connect_code')
      .setDescription('Connect code generated in the web app')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const orgId = interaction.options.getString('org_id', true);
  const connectCode = interaction.options.getString('connect_code', true);
  const guild = interaction.guild;

  if (!guild) {
    await interaction.editReply('This command must be used in a server.');
    return;
  }

  try {
    await connectGuild({
      guild_id: guild.id,
      guild_name: guild.name,
      org_id: orgId,
      connect_code: connectCode,
    });

    await interaction.editReply(
      `Connected **${guild.name}** to the TaskForge organization. You can now use \`/link_channel\` to link channels to projects.`,
    );
  } catch (err) {
    await interaction.editReply(
      `Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
}
