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
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.DirectMessages
    ] 
});

// ====== CONFIGURATION ======
const REVIEW_CHANNEL_ID = "1512296048037593220"; 
const STAFF_ROLE_ID = "1512203928702292077"; 
const HANDBOOK_CHANNEL_ID = "1512375254587146342";
const PANELS_CHANNEL_ID = "1512290092662784152";
const LOGO_URL = "https://i.ibb.co/svL9rTpk/Screenshot-2026-06-05-033121-removebg-preview.png"; 
// ===========================

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// Web portal endpoint for staff application submissions
app.post('/api/submit', async (req, res) => {
    const { username, age, timezone, experience, reason } = req.body;

    if (!username || !age || !timezone || !experience || !reason || isNaN(username)) {
        return res.status(400).json({ ok: false, result: "INVALID_DATA_PAYLOAD" });
    }

    try {
        const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);
        if (!channel) return res.status(500).json({ ok: false, result: "Review channel not found." });

        const embed = new EmbedBuilder()
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

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_${username}`)
                .setLabel('Accept')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`decline_${username}`)
                .setLabel('Decline')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [row] });
        res.status(200).json({ ok: true, result: "PENDING" });

    } catch (error) {
        console.error("Error processing application:", error);
        res.status(500).json({ ok: false, result: "SERVER_ERROR" });
    }
});

// Unified Interaction Listener
client.on('interactionCreate', async (interaction) => {
    
    // 1. Handle Slash Commands (/help)
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

    // 2. Handle Dropdown Ticket Selections
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_category_select') {
            await interaction.deferReply({ flags: [64] }); // Fixed deprecation (64 = Ephemeral)

            const selectedValue = interaction.values[0];
            const guild = interaction.guild;

            try {
                // Set descriptive titles based on dropdown choice
                let ticketLabel = "general";
                if (selectedValue === "report_player") ticketLabel = "report";
                if (selectedValue === "staff_help") ticketLabel = "staff-assistance";

                // Generate private ticket channel visible only to applicant and staff
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${ticketLabel}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
                        },
                        {
                            id: STAFF_ROLE_ID,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
                        }
                    ],
                });

                const welcomeTicketEmbed = new EmbedBuilder()
                    .setTitle(`🎟️ Ticket Opened - ${ticketLabel.toUpperCase()}`)
                    .setDescription(`Hello ${interaction.user}, thank you for contacting support. Support staff (<@&${STAFF_ROLE_ID}>) will be with you shortly.\n\nPlease describe your issue in detail here.`)
                    .setColor("#57FFEF")
                    .setTimestamp();

                await ticketChannel.send({ embeds: [welcomeTicketEmbed] });
                await interaction.editReply({ content: `✅ Ticket opened successfully! Check your new channel here: ${ticketChannel}` });

            } catch (err) {
                console.error("Error creating ticket channel:", err);
                await interaction.editReply({ content: "❌ Failed to create ticket channel. Verify bot role permissions!" });
            }
        }
        return;
    }

    // 3. Handle Application Review Buttons (Accept / Decline)
    if (interaction.isButton()) {
        const [action, applicantId] = interaction.customId.split('_');
        const guild = interaction.guild;

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

                // Uses update directly without double calling callbacks to prevent Error 40060
                await interaction.update({
                    content: `✅ **Application Approved** by ${interaction.user.tag}`,
                    embeds: interaction.message.embeds,
                    components: []
                });

            } else if (action === 'decline') {
                if (applicant) {
                    await applicant.send("❌ Thank you for applying, but your staff application has been declined at this time.").catch(() => null);
                }

                await interaction.update({
                    content: `❌ **Application Declined** by ${interaction.user.tag}`,
                    embeds: interaction.message.embeds,
                    components: []
                });
            }

        } catch (err) {
            console.error("Failed to update button state:", err);
        }
    }
});

// Changed from 'ready' to 'clientReady' to match discord.js v14/v15 standards
client.once('clientReady', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    
    client.user.setPresence({
        activities: [{ name: 'bot hosted by RyesBots', type: 3 }],
        status: 'online', 
    });

    // Deploy System Panels Automatically on Startup if missing
    try {
        const handbookChannel = await client.channels.fetch(HANDBOOK_CHANNEL_ID).catch(() => null);
        if (handbookChannel) {
            const messages = await handbookChannel.messages.fetch({ limit: 10 });
            const alreadySent = messages.some(msg => msg.embeds.length > 0 && msg.embeds[0].title === "📖 sᴛᴀғғ-ʜᴀɴᴅʙᴏᴏᴋ");

            if (!alreadySent) {
                const handbookEmbed = new EmbedBuilder()
                    .setTitle("📖 sᴛᴀғғ-ʜᴀɴᴅʙᴏᴏᴋ")
                    .setDescription("Welcome to the official staff team directory. All active staff members are required to read and follow the official training documentation.\n\n🔗 **[Click Here to Access the Staff Handbook](https://your-link-here.com)**\n\nPlease ensure you review recent policy updates and guidelines before starting your shift.")
                    .setColor("#464DE0")
                    .setThumbnail(LOGO_URL)
                    .setFooter({ text: "Staff Team Administration", iconURL: LOGO_URL })
                    .setTimestamp();

                await handbookChannel.send({ embeds: [handbookEmbed] });
                console.log("✅ Staff Handbook panel deployed.");
            }
        }

        const panelsChannel = await client.channels.fetch(PANELS_CHANNEL_ID).catch(() => null);
        if (panelsChannel) {
            const messages = await panelsChannel.messages.fetch({ limit: 10 });
            const alreadySent = messages.some(msg => msg.embeds.length > 0 && msg.embeds[0].title === "🎟️ Support Portal");

            if (!alreadySent) {
                const ticketEmbed = new EmbedBuilder()
                    .setTitle("🎟️ Support Portal")
                    .setDescription("Need assistance? Select the category that best matches your issue from the dropdown menu below.\n\n⚠️ *Please only open one ticket at a time. Creating troll tickets may result in moderation action.*")
                    .setColor("#57FFEF")
                    .setThumbnail("https://i.ibb.co/mr6BJdCs/Screenshot-2026-06-05-033110-removebg-preview.png")
                    .setFooter({ text: "Staff Team Support", iconURL: LOGO_URL })
                    .setTimestamp();

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('ticket_category_select')
                    .setPlaceholder('Choose a support category...')
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('General Support').setDescription('Ask questions or get help.').setValue('general_help').setEmoji('❓'),
                        new StringSelectMenuOptionBuilder().setLabel('Player Reporting').setDescription('Report a user breaking server rules.').setValue('report_player').setEmoji('🛡️'),
                        new StringSelectMenuOptionBuilder().setLabel('Staff Application Help').setDescription('Inquire about our staff portal.').setValue('staff_help').setEmoji('📝')
                    );

                const actionRow = new ActionRowBuilder().addComponents(selectMenu);
                await panelsChannel.send({ embeds: [ticketEmbed], components: [actionRow] });
                console.log("✅ Tickets panel deployed.");
            }
        }
    } catch (e) {
        console.error("Panel auto-deployment skipped:", e);
    }

    const commands = [
        new SlashCommandBuilder().setName('help').setDescription('Get help regarding the system')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (error) {
        console.error(error);
    }
});

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 10000; // Updated to 10000 matching Render port binding defaults
app.listen(PORT, () => console.log(`Backend live (Open Mode) on port ${PORT}`));
