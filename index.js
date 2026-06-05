const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

app.post('/api/submit', (req, res) => {
    res.status(403).json({ ok: false, result: "PORTAL_CLOSED" });
});

// Official Slash Command Listener
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'help') {
        // Build the embed response
        const helpEmbed = new EmbedBuilder()
            .setColor('#5865F2') // Discord Blurple color (you can change this hex code)
            .setTitle('⚠️ System Status')
            .setDescription('.....uh.....um....mmmmmm, my master aint set me up gng, srry bout dat, TELL EM DOH>;3')
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed] });
    }
});

// Register Slash Commands when the bot connects
client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    
    // Set Custom Status
    client.user.setPresence({
        activities: [{ 
            name: 'bot hosted by RyesBots', 
            type: 3 
        }],
        status: 'online', 
    });

    // Register the command with Discord to make it show up in the list
    const commands = [
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Get help regarding the system')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live (Closed Mode) on port ${PORT}`));
