const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());

// Tells Render to look in the main folder for files
app.use(express.static(__dirname));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages] });

// REMEMBER TO PUT YOUR ACTUAL DISCORD IDs HERE
const REVIEW_CHANNEL_ID = "1512296048037593220"; 
const STAFF_ROLE_ID = "1512203928702292077"; 

// Sends your HTML form when someone loads the link
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

app.post('/api/submit', async (req, res) => {
    const { username, age, timezone, experience, reason } = req.body;

    try {
        const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);
        if (!channel) return res.status(500).json({ ok: false, result: "Review channel not found." });

        const embed = new EmbedBuilder()
            .setTitle("📄 New Staff Application Submitted")
            .setColor(0x2563eb)
            .addFields(
                { name: "Discord User ID", value: username || "N/A", inline: true },
                { name: "Age", value: age || "N/A", inline: true },
                { name: "Timezone", value: timezone || "N/A", inline: true },
                { name: "Relevant Experience", value: experience || "N/A" },
                { name: "Motivation / Why join?", value: reason || "N/A" }
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
        res.status(200).json({ ok: true, result: "ACCEPTED" });

    } catch (error) {
        console.error("Error processing application:", error);
        res.status(500).json({ ok: false, result: "SERVER_ERROR" });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

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
                await applicant.send("🎉 Congratulations! Your staff application has been accepted. Welcome to the team!").catch(() => null);
            }

            await interaction.update({
                content: `✅ **Application Approved** by ${interaction.user.tag}`,
                components: []
            });

        } else if (action === 'decline') {
            if (applicant) {
                await applicant.send("❌ Thank you for applying, but your staff application has been declined at this time.").catch(() => null);
            }

            await interaction.update({
                content: `❌ **Application Declined** by ${interaction.user.tag}`,
                components: []
            });
        }

    } catch (err) {
        console.error("Interaction error:", err);
        await interaction.reply({ content: "Something went wrong processing this choice.", ephemeral: true }).catch(() => null);
    }
});

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live on port ${PORT}`));            .setFooter({ text: `Applicant ID: ${username}` })
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
        res.status(200).json({ ok: true, result: "ACCEPTED" });

    } catch (error) {
        console.error("Error processing application:", error);
        res.status(500).json({ ok: false, result: "SERVER_ERROR" });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

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
                await applicant.send("🎉 Congratulations! Your staff application has been accepted. Welcome to the team!").catch(() => null);
            }

            await interaction.update({
                content: `✅ **Application Approved** by ${interaction.user.tag}`,
                components: []
            });

        } else if (action === 'decline') {
            if (applicant) {
                await applicant.send("❌ Thank you for applying, but your staff application has been declined at this time.").catch(() => null);
            }

            await interaction.update({
                content: `❌ **Application Declined** by ${interaction.user.tag}`,
                components: []
            });
        }

    } catch (err) {
        console.error("Interaction error:", err);
        await interaction.reply({ content: "Something went wrong processing this choice.", ephemeral: true }).catch(() => null);
    }
});

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live on port ${PORT}`));
