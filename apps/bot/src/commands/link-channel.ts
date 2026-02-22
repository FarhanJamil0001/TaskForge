import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { linkChannel } from '../api.js';

export const data = new SlashCommandBuilder()
  .setName('link_channel')
  .setDescription('Link this channel to a TaskForge project')
  .addStringOption((opt) =>
    opt.setName('project_id').setDescription('Project ID from TaskForge').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const projectId = interaction.options.getString('project_id', true);
  const guild = interaction.guild;
  const channel = interaction.channel;

  if (!guild || !channel) {
    await interaction.editReply('This command must be used in a server channel.');
    return;
  }

  try {
    await linkChannel({
      guild_id: guild.id,
      channel_id: channel.id,
      project_id: projectId,
    });

    await interaction.editReply('Channel linked successfully!');

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('📋 TaskForge is now active in this channel!')
      .setDescription(
        'Messages in this channel will automatically become tasks in your project. ' +
        'Here\'s everything you need to know:',
      )
      .addFields(
        {
          name: '💬  Auto-create tasks',
          value:
            'Just send a message (6+ characters) and it becomes a task.\n' +
            'The bot will react with 📋 to confirm.',
          inline: false,
        },
        {
          name: '✅  Complete a task',
          value:
            'React with ✅ on any task message to mark it as **done**.',
          inline: false,
        },
        {
          name: '⚡  Priority keywords',
          value:
            '`urgent` `critical` `high` → High priority\n' +
            '`low` `minor` → Low priority\n' +
            'No keyword → Medium priority',
          inline: true,
        },
        {
          name: '📅  Due date keywords',
          value:
            '`due 2026-03-01` or `by Mar 1`\n' +
            'Dates are parsed automatically from your message.',
          inline: true,
        },
        {
          name: '↩️  Create task from a reply',
          value:
            'Reply to any message with `!task` to turn it into a task.\n' +
            'Add options: `!task urgent due Mar 1`',
          inline: false,
        },
        {
          name: '🛠️  Manual task creation',
          value:
            '```/task create title: Fix login bug priority: high due: 2026-03-01```\n' +
            'Only `title` is required — `priority`, `due`, and `assignee` are optional.',
          inline: false,
        },
      )
      .setFooter({ text: 'TaskForge • Messages starting with / are ignored' });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(
      `Failed to link: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
}
