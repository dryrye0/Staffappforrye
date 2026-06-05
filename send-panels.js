// Register Slash Commands and Set Presence when bot connects
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

    // ----------------------------------------------------
    // ONE-TIME PANEL AUTO-SENDER
    // ----------------------------------------------------
    try {
        console.log("Checking channels to deploy system panels...");

        // 1. STAFF HANDBOOK PANEL
        const handbookChannel = await client.channels.fetch("1512375254587146342").catch(() => null);
        if (handbookChannel) {
            // Optional: Fetch recent messages to see if your panel is already there
            const messages = await handbookChannel.messages.fetch({ limit: 5 });
            const alreadySent = messages.some(msg => msg.embeds.length > 0 && msg.embeds[0].title === "📖 sᴛᴀғғ-ʜᴀɴᴅʙᴏᴏᴋ");

            if (!alreadySent) {
                const handbookEmbed = new EmbedBuilder()
                    .setTitle("📖 sᴛᴀғғ-ʜᴀɴᴅʙᴏᴏᴋ")
                    .setDescription(
                        "Welcome to the official staff team directory. All active staff members are required to read and follow the official training documentation.\n\n" +
                        "🔗 **[Click Here to Access the Staff Handbook](https://your-link-here.com)**\n\n" +
                        "Please ensure you review recent policy updates and guidelines before starting your shift."
                    )
                    .setColor("#464DE0")
                    .setThumbnail("https://i.ibb.co/svL9rTpk/Screenshot-2026-06-05-033121-removebg-preview.png")
                    .setFooter({ text: "Staff Team Administration", iconURL: "https://i.ibb.co/svL9rTpk/Screenshot-2026-06-05-033121-removebg-preview.png" })
                    .setTimestamp();

                await handbookChannel.send({ embeds: [handbookEmbed] });
                console.log("✅ Staff Handbook panel deployed successfully.");
            } else {
                console.log("ℹ️ Staff Handbook panel already exists. Skipping.");
            }
        }

        // 2. TICKETS PANEL WITH DROPDOWN
        const panelsChannel = await client.channels.fetch("1512290092662784152").catch(() => null);
        if (panelsChannel) {
            const messages = await panelsChannel.messages.fetch({ limit: 5 });
            const alreadySent = messages.some(msg => msg.embeds.length > 0 && msg.embeds[0].title === "🎟️ Support Portal");

            if (!alreadySent) {
                const ticketEmbed = new EmbedBuilder()
                    .setTitle("🎟️ Support Portal")
                    .setDescription(
                        "Need assistance? Select the category that best matches your issue from the dropdown menu below.\n\n" +
                        "⚠️ *Please only open one ticket at a time. Creating troll or spam tickets may result in moderation action.*"
                    )
                    .setColor("#57FFEF")
                    .setThumbnail("https://i.ibb.co/mr6BJdCs/Screenshot-2026-06-05-033110-removebg-preview.png")
                    .setFooter({ text: "Staff Team Support", iconURL: "https://i.ibb.co/svL9rTpk/Screenshot-2026-06-05-033121-removebg-preview.png" })
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
                console.log("✅ Tickets panel deployed successfully.");
            } else {
                console.log("ℹ️ Tickets panel already exists. Skipping.");
            }
        }

    } catch (error) {
        console.error("❌ Error running startup panel deployments:", error);
    }
    // ----------------------------------------------------

    // Register /help slash command schema below
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
