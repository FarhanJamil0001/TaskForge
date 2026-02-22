import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { createTask, listTasks } from '../api.js';
import { parsePriority, parseDueDate } from '../parsers.js';

export const data = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Create or list tasks')
  .addSubcommand((sub) =>
    sub
      .setName('create')
      .setDescription('Create a new task in the linked project')
      .addStringOption((opt) =>
        opt.setName('title').setDescription('Task title').setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('project')
          .setDescription('Project alias when channel has multiple (e.g. web, api)'),
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
  )
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('List recent tasks from the linked project')
      .addStringOption((opt) =>
        opt
          .setName('project')
          .setDescription('Project alias when channel has multiple (e.g. web, api)'),
      )
      .addIntegerOption((opt) =>
        opt
          .setName('limit')
          .setDescription('Number of tasks to show (1-25)')
          .setMinValue(1)
          .setMaxValue(25),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'list') {
    await executeList(interaction);
    return;
  }

  await executeCreate(interaction);
}

async function executeCreate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guild = interaction.guild;
  const channel = interaction.channel;
  if (!guild || !channel) {
    await interaction.editReply('This command must be used in a server channel.');
    return;
  }

  const title = interaction.options.getString('title', true);
  const projectAlias = interaction.options.getString('project');
  const priorityOpt = interaction.options.getString('priority');
  const dueOpt = interaction.options.getString('due');
  const assignee = interaction.options.getUser('assignee');

  const priority = priorityOpt ?? parsePriority(title) ?? 'medium';
  const dueDate = dueOpt ? parseDueDate(dueOpt) : parseDueDate(title);

  try {
    await createTask({
      guild_id: guild.id,
      channel_id: channel.id,
      project_alias: projectAlias ?? undefined,
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

async function executeList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guild = interaction.guild;
  const channel = interaction.channel;
  if (!guild || !channel) {
    await interaction.editReply('This command must be used in a server channel.');
    return;
  }

  const projectAlias = interaction.options.getString('project');
  const limit = interaction.options.getInteger('limit') ?? 10;

  try {
    const { tasks } = await listTasks({
      guild_id: guild.id,
      channel_id: channel.id,
      project_alias: projectAlias ?? undefined,
      limit,
    });

    if (tasks.length === 0) {
      await interaction.editReply('No tasks found in the linked project.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle(`📋 Recent tasks (${tasks.length})`)
      .setDescription(
        tasks
          .map(
            (t, i) =>
              `**${i + 1}.** ${t.title}\n` +
              `   \`${t.status}\` · ${t.priority}${t.due_date ? ` · Due ${t.due_date}` : ''}`,
          )
          .join('\n\n'),
      )
      .setFooter({ text: 'View and manage tasks in TaskForge' });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(
      `Failed to list tasks: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
}
