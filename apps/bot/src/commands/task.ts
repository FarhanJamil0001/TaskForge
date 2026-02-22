import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { createTask } from '../api.js';
import { parsePriority, parseDueDate } from '../parsers.js';

export const data = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Create a task')
  .addSubcommand((sub) =>
    sub
      .setName('create')
      .setDescription('Create a new task in the linked project')
      .addStringOption((opt) =>
        opt.setName('title').setDescription('Task title').setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('priority')
          .setDescription('Priority: low, medium, high')
          .addChoices(
            { name: 'Low', value: 'low' },
            { name: 'Medium', value: 'medium' },
            { name: 'High', value: 'high' },
          ),
      )
      .addStringOption((opt) =>
        opt.setName('due').setDescription('Due date (e.g. 2026-02-25 or "Feb 25")'),
      )
      .addUserOption((opt) => opt.setName('assignee').setDescription('Assign to a user')),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guild = interaction.guild;
  const channel = interaction.channel;
  if (!guild || !channel) {
    await interaction.editReply('This command must be used in a server channel.');
    return;
  }

  const title = interaction.options.getString('title', true);
  const priorityOpt = interaction.options.getString('priority');
  const dueOpt = interaction.options.getString('due');
  const assignee = interaction.options.getUser('assignee');

  const priority = priorityOpt ?? parsePriority(title) ?? 'medium';
  const dueDate = dueOpt ? parseDueDate(dueOpt) : parseDueDate(title);

  try {
    await createTask({
      guild_id: guild.id,
      channel_id: channel.id,
      title,
      priority,
      due_date: dueDate,
      discord_author_id: interaction.user.id,
    });

    await interaction.editReply(`Task created: **${title}** (${priority} priority)`);
  } catch (err) {
    await interaction.editReply(
      `Failed to create task: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
}
