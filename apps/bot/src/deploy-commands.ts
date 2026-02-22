import { REST, Routes } from 'discord.js';
import { data as connectData } from './commands/connect.js';
import { data as linkChannelData } from './commands/link-channel.js';
import { data as unlinkChannelData } from './commands/unlink-channel.js';
import { data as taskData } from './commands/task.js';

const token = process.env.DISCORD_BOT_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const commands = [connectData.toJSON(), linkChannelData.toJSON(), unlinkChannelData.toJSON(), taskData.toJSON()];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
})();
