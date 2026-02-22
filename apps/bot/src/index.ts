import { Client, GatewayIntentBits, Events, ChatInputCommandInteraction } from 'discord.js';
import * as connectCmd from './commands/connect.js';
import * as linkChannelCmd from './commands/link-channel.js';
import * as unlinkChannelCmd from './commands/unlink-channel.js';
import * as taskCmd from './commands/task.js';
import { handleAutoCreate } from './listeners/auto-create.js';
import { handleReplyCreate } from './listeners/reply-create.js';
import { handleReactionComplete } from './listeners/reaction-complete.js';
import { handleReactionDelete } from './listeners/reaction-delete.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const commands = new Map<
  string,
  { execute: (interaction: ChatInputCommandInteraction) => Promise<void> }
>();
commands.set(connectCmd.data.name, connectCmd);
commands.set(linkChannelCmd.data.name, linkChannelCmd);
commands.set(unlinkChannelCmd.data.name, unlinkChannelCmd);
commands.set(taskCmd.data.name, taskCmd);

client.once(Events.ClientReady, (c) => {
  console.log(`Bot ready as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const msg = 'An error occurred while executing this command.';
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: msg });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  await handleReplyCreate(message);
  await handleAutoCreate(message);
});
client.on(Events.MessageReactionAdd, handleReactionComplete);
client.on(Events.MessageReactionAdd, handleReactionDelete);

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set');
  process.exit(1);
}

client.login(token);
