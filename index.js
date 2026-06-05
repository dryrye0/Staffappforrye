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
const REVIEW_CHANNEL_ID = process.env.REVIEW_CHANNEL_ID || "1512296048037593220"; 
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || "1512203928702292077"; 
const HANDBOOK_CHANNEL_ID = process.env.HANDBOOK_CHANNEL_ID || "1512375254587146342";
const PANELS_CHANNEL_ID = process.env.PANELS_CHANNEL_ID || "1512290092662784152";
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID || "1512527598822097008";
const LOGO_URL = "https://i.ibb.co/svL9rTpk/Screenshot-2026-06-05-033121-removebg-preview.png"; 
// ==========================

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

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

client.on('interactionCreate', async (interaction) => {
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

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_category_select') {
            await interaction.deferReply({ flags: [64] });

            const selectedValue = interaction.values[0];
            const guild = interaction.guild;
            if (!guild) return;

            try {
                let ticketLabel = "general";
                if (selectedValue === "report_player") ticketLabel = "report";
                if (selectedValue === "staff_help") ticketLabel = "staff-assistance";

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${ticketLabel}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
                        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] }
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

    if (interaction.isButton()) {
        if (interaction.customId === 'verify_rules_agree') {
            await interaction.deferReply({ flags: [64] });

            const member = interaction.member;
            const VERIFIED_ROLE_ID = "1512203928702292068"; 

            try {
                if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
                    await interaction.editReply({ content: "ℹ️ You are already verified and have access to the community channels!" });
                    return;
                }

                await member.roles.add(VERIFIED_ROLE_ID);
                await interaction.editReply({ content: "✅ Rules acknowledged! The community role has been assigned. Welcome to the server!" });
                
            } catch (err) {
                console.error("Verification assignment error:", err);
                await interaction.editReply({ content: "❌ Failed to assign verification role. Adjust your bot hierarchy!" });
            }
            return;
        }

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

client.once('clientReady', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    
    client.user.setPresence({
        activities: [{ name: 'bot hosted by RyesBots', type: 3 }],
        status: 'online', 
    });

    try {
        const handbookChannel = await client.channels.fetch(HANDBOOK_CHANNEL_ID).catch(() => null);
        if (handbookChannel) {
            const messages = await handbookChannel.messages.fetch({ limit: 10 });
            const alreadySent = messages.some(msg => msg.embeds.length > 0 && msg.embeds[0].title === "📖 sᴛᴀғғ-ʜᴀɴᴅʙᴏᴏᴋ");

            if (!alreadySent) {
                const handbookEmbed = new EmbedBuilder()
                    .setTitle("📖 sᴛᴀғғ-ʜᴀɴᴅʙᴏᴏᴋ")
                    .setDescription(
                        "Welcome to the official staff team directory. All active team members are strictly required to read, understand, and abide by our core operational rules:\n\n" +
                        "1️⃣ **Team Communication**\n" +
                        "Don’t make major administration decisions by yourself. Always consult other staff members first—clear communication is key to running this server.\n\n" +
                        "2️⃣ **Professional Boundaries**\n" +
                        "Do not bring outside personal issues or conflicts into the server. Personal dislikes are never a valid reason to issue moderational punishments.\n\n" +
                        "3️⃣ **Zero Power Abuse**\n" +
                        "Your permissions are given to protect the community, not to control it. Do not mute, kick, or ban users at your own personal will. Only punish individuals who explicitly violate community rules.\n\n" +
                        "4️⃣ **Lead by Example**\n" +
                        "As a representative of the team, remain calm and professional even when dealing with hostile members. Do not engage in toxic behavior, arguments, or profanity. If a user treats you poorly, handle it objectively via our official moderation system.\n\n" +
                        "5️⃣ **Confidential Information**\n" +
                        "Keep conversations inside official staff-restricted environments hidden from standard community populations.\n\n" +
                        "🔗 **[Click Here to Access the Full Staff Documentation](https://ryesden-staff-backend.onrender.com/)**"
                    )
                    .setColor("#464DE0")
                    .setThumbnail(LOGO_URL)
                    .setFooter({ text: "Staff Team Administration Guidelines", iconURL: LOGO_URL })
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

                const linkEmbed = new EmbedBuilder()
                    .setDescription("📝 **Ready to join our team?**\nClick the link below to fill out your official staff application directly on our secure web portal.\n\n🔗 **[Apply Here!](https://ryesden-staff-backend.onrender.com/)**")
                    .setColor("#57FFEF");

                await panelsChannel.send({ embeds: [linkEmbed] });
                console.log("✅ Tickets and portal link panels deployed successfully.");
            }
        }

        const rulesChannel = await client.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
        if (rulesChannel) {
            const messages = await rulesChannel.messages.fetch({ limit: 10 });
            const alreadySent = messages.some(msg => msg.embeds.length > 0 && msg.embeds[0].title === "📜 COMMUNITY RULES & GUIDELINES");

            if (!alreadySent) {
                const rulesEmbed = new EmbedBuilder()
                    .setTitle("📜 COMMUNITY RULES & GUIDELINES")
                    .setDescription("Please review and follow the official regulations of the server. Failure to follow these codes will result in structural moderation actions.")
                    .setImage("https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fi.pinimg.com%2Foriginals%2F06%2Fd5%2Fda%2F06d5dac46000d258bcf1a3e15a714f4d.jpg&f=1&nofb=1&ipt=4f41f217d33ad3b91fde0670a657bac85108b2d3a2130d6e950a7860ea66daa3")
                    .setColor("#1A1A1A")
                    .addFields(
                        { name: "§ 1.0.1", value: "Approach all community members with mutual respect. Harassment, insults, and personal attacks are strictly prohibited." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.0.2", value: "Do not start, encourage, or participate in drama, arguments, or toxic behavior within public text or voice channels." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.0.3", value: "Spamming, flooding chat rooms with repetitive characters/emojis, or text walling is prohibited." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.0.4", value: "Unsolicited self-promotion, advertising links, or direct messaging server invites to members will result in an immediate ban." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.0.5", value: "Do not post, upload, or link any explicit, offensive, or harmful material inside general channels." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.0.6", value: "Trolling, provoking staff, or intentionally disrupting the peace of conversational areas is disallowed." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.0.7", value: "Do not utilize excessive sarcasm, slurs, or aggressive language aimed at degrading other users." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.0.8", value: "All actions, conversations, and hosted files must strictly comply with the global Discord Terms of Service." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.0.9", value: "Do not distribute, discuss, link, or promote software piracy, cracked applications, or illegal downloads." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.0", value: "Respect media release dates. Do not post spoilers regarding games, anime, or films within a two-week window of launch." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.1", value: "Do not share, promote, or detail methods regarding game exploits, online cheats, hacks, or trainers." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.2", value: "Keep text topics relevant to their designated channels (e.g., bot commands belong strictly inside the bot channel)." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.3", value: "Do not bypass filters or use alternative spelling variations to evade automoderation configurations." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.4", value: "Do not impersonate server developers, administrators, moderators, or high-profile public entities." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.5", value: "Mini-modding (acting as staff or issuing public ultimatums when you do not hold a staff position) is not permitted." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.6", value: "Do not continuously tag or mention staff members without an urgent, verifiable reason." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.7", value: "Keep all usernames, nicknames, status indicators, and profile avatars appropriate for a public space." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.8", value: "Voice channel soundboards, voice changers, and loud noises meant to disrupt active connections are banned." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.1.9", value: "Do not upload or execute script links meant to scrape data or extract private identity information from users." },
                        { name: "\u200B", value: "────────────────────────────────────────" },
                        { name: "§ 1.2.0", value: "Decisions made by senior administration regarding rule edge cases or interpretations remain final." }
                    )
                    .setFooter({ text: "Server Governance Code", iconURL: LOGO_URL })
                    .setTimestamp();

                await rulesChannel.send({ embeds: [rulesEmbed] });

                const acceptRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify_rules_agree')
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success)
                );

                await rulesChannel.send({
                    content: "I confirm that I have read the #ʀᴜʟᴇs, will follow them, and understand that I will face consequences if I violate them.",
                    components: [acceptRow]
                });

                console.log("✅ 20-part rules matrix (with borders) and verification agreement deployed.");
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend live (Open Mode) on port ${PORT}`));
