const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ====== CONFIGURATION ======
const HANDBOOK_CHANNEL_ID = "1512375254587146342";
const PANELS_CHANNEL_ID = "1512290092662784152";
const LOGO_URL = "https://i.ibb.co/svL9rTpk/Screenshot-2026-06-05-033121-removebg-preview.png";
// ===========================

client.once('ready', async () => {
    console.log(`🤖 Panel sender ready. Connected as ${client.user.tag}`);

    try {

        const handbookChannel = await client.channels.fetch(HANDBOOK_CHANNEL_ID);
        if (handbookChannel) {
            const handbookEmbed = new EmbedBuilder()
                .setTitle("📖 sᴛᴀғғ-ʜᴀɴᴅʙᴏᴏᴋ")
                .setDescription(
                    "Welcome to the official staff team directory. All active staff members are required to read and follow the official training documentation.\n\n" +
                    "🔗 **[Click Here to Access the Staff Handbook](https://your-link-here.com)**\n\n" +
                    "Please ensure you review recent policy updates and guidelines before starting your shift."
                )
                .setColor("#464DE0"
                .setThumbnail("https://i.ibb.co/svL9rTpk/Screenshot-2026-06-05-033121-removebg-preview.png") // Added quotes around the image URL
                .setFooter({ text: "Staff Team Administration", iconURL: LOGO_URL })
                .setTimestamp();

            await handbookChannel.send({ embeds: [handbookEmbed] });
            console.log("✅ Staff Handbook panel sent successfully.");
        } else {
            console.error("❌ Could not find Handbook channel.");
        }


        const panelsChannel = await client.channels.fetch(PANELS_CHANNEL_ID);
        if (panelsChannel) {
            const ticketEmbed = new EmbedBuilder()
                .setTitle("🎟️ Support Portal")
                .setDescription(
                    "Need assistance? Select the category that best matches your issue from the dropdown menu below.\n\n" +
                    "⚠️ *Please only open one ticket at a time. Creating troll or spam tickets may result in moderation action.*"
                )
                .setColor("#57FFEF") 
                .setThumbnail("https://i.ibb.co/mr6BJdCs/Screenshot-2026-06-05-033110-removebg-preview.png") // Added quotes around the image URL
                .setFooter({ text: "Staff Team Support", iconURL: LOGO_URL })
                .setTimestamp();


            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_category_select')
                .setPlaceholder('Choose a support category...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('General Support')
                        .setDescription('Ask questions or get help.')
                        .setValue('general_help')
                        .setEmoji('❓'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Player Reporting')
                        .setDescription('Report a user breaking server rules.')
                        .setValue('report_player')
                        .setEmoji('🛡️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Staff Application Help')
                        .setDescription('Inquire about issues regarding our staff portal.')
                        .setValue('staff_help')
                        .setEmoji('📝')
                );

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            await panelsChannel.send({ embeds: [ticketEmbed], components: [actionRow] });
            console.log("✅ Tickets panel sent successfully.");
        } else {
            console.error("❌ Could not find Tickets/Panels channel.");
        }

    } catch (error) {
        console.error("❌ Error sending panels:", error);
    }

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
