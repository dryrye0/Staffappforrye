const express = require('express');
const cors = require('cors');
const path = require('path');
const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Discord Client with required intents
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.DirectMessages
    ] 
});

// ====== CONFIGURATION (Pulled safely from environment variables) ======
const REVIEW_CHANNEL_ID = process.env.REVIEW_CHANNEL_ID || "1512296048037593220"; 
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || "1512203928702292077"; 
const HANDBOOK_CHANNEL_ID = process.env.HANDBOOK_CHANNEL_ID || "1512375254587146342";
const LOGO_URL = "https://i.ibb.co/svL9rTpk/Screenshot-2026-06-05-033121-removebg-preview.png"; 
// ======================================================================

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// OPEN MODE: Handles incoming form data from index.html
app.post('/api/submit', async (req, res) => {
    const { username, age, timezone, experience, reason } = req.body;

    // Validate that data payload exists and username is a valid number format
    if (!username || !age || !timezone || !experience || !reason || isNaN(username)) {
        return res.status(400).json({ ok: false, result: "INVALID_DATA_PAYLOAD" });
    }

    try {
        const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);
        if (!channel) {
            console.error("Review channel could not be found by the bot.");
            return res.status(500).json({ ok: false, result: "SERVER_CONFIGURATION_ERROR" });
        }

        // Build a clean, styled embed for your staff reviewers
        const reviewEmbed = new EmbedBuilder()
            .setTitle("📄 New Staff Application Submitted")
            .setColor(0x2563eb)
            .addFields(
                { name: "👤 Applicant User ID", value: `<@${username}> (ID: ${username})`, inline: true },
                { name: "🎂 Age", value: String(age), inline: true },
                { name: "🌍 Timezone", value: String(timezone), inline: true },
                { name: "🛠️ Relevant Experience", value: String(experience) },
                { name: "❓ Motivation / Why join?", value: String(reason) }
            )
            .setFooter({ text: `Applicant ID: ${username}` })
            .setTimestamp();

        // Create the interactive action buttons
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_${username}`)
                .setLabel('Accept')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`decline_${username}`)
                .setLabel('Decline')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [reviewEmbed], components: [actionRow] });
        res.status(200).json({ ok: true, result: "PENDING" });

    } catch (error) {
        console.error("Error routing application to Discord:", error);
        res.status(500).json({ ok: false, result: "SERVER_ERROR" });
    }
});

// Unified Interaction Listener (Handles Slash Commands & Button Clicks)
client.on('interactionCreate', async (interaction) => {
    
    // 1. Handle the /help command
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('⚠️ System Status')
                .setDescription('Bot Has Nuh Cmds, U Stupi Youngin, just a staff application thingy')
                .setTimestamp();

            await interaction.reply({ embeds: [helpEmbed] });
        }
        return;
    }

    // 2. Handle Application Review Buttons
    if (!interaction.isButton()) return;

    const [action, applicantId] = interaction.customId.split('_');
    const guild = interaction.guild;

    if (!guild) return;

    try {
        const applicant = await client.users.fetch(applicantId).catch(() => null);

        if (action === 'accept') {
            const member = await guild.members.fetch(applicantId).catch(() => null);
            if (member) {
                await member.roles.add(STAFF_ROLE_ID);
            }

            if (applicant) {
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle("🎉 Application Accepted!")
                    .setDescription(`Welcome to the team! Your staff application has been approved.\n\nPlease head over to <#${HANDBOOK_CHANNEL_ID}> to read through our guidelines and begin training.`)
                    .setColor(0x22c55e)
                    .setThumbnail(LOGO_URL)
                    .setTimestamp();

                await applicant.send({ embeds: [welcomeEmbed] }).catch(() => null);
            }

            await interaction.update({
                content: `✅ **Application Approved** by ${interaction.user.tag}`,
                embeds: interaction.message.embeds,
                components: [] // Removes buttons so application cannot be double processed
            });

        } else if (action === 'decline') {
            if (applicant) {
                await applicant.send("❌ Thank you for applying, but your staff application has been declined at this time.").catch(() => null);
            }

            await interaction.update({
                content: `❌ **Application Declined** by ${interaction.user.tag}`,
                embeds: interaction.message.embeds,
                components: [] // Removes buttons
            });
        }

    } catch (err) {
        console.error("Failed to process button interaction:", err);
        await interaction.reply({ content: "An error occurred while managing this application.", ephemeral: true }).catch(() => null);
    }
});

// Setup bot environment settings upon successful login
client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    
    // Set custom status
    client.user.setPresence({
        activities: [{ 
            name: 'bot hosted by RyesBots', 
            type: 3 // Watching
        }],
        status: 'online', 
    });

    // Register /help application command schema
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
        console.error("Slash command registration failure:", error);
    }
});

// Authenticate Bot Client using environment token
client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live (Open Mode) on port ${PORT}`));
