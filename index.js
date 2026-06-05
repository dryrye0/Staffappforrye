const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ] 
});

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// Immediately rejects all submissions since the portal is locked down
app.post('/api/submit', (req, res) => {
    res.status(403).json({ ok: false, result: "PORTAL_CLOSED" });
});

// Help command text responder
client.on('messageCreate', async (message) => {
    // Ignore other bots so it doesn't cause loops
    if (message.author.bot) return;

    // Check if the message is exactly /help
    if (message.content.toLowerCase() === '/help') {
        await message.reply(".....uh.....um....mmmmmm, my master aint set me up gng, srry bout dat, TELL EM DOH>;3");
    }
});

// Custom Status Setup
client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    
    client.user.setPresence({
        activities: [{ 
            name: 'bot hosted by RyesBots', 
            type: 3
        }],
        status: 'online', 
    });
});

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live (Closed Mode) on port ${PORT}`));
