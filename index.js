const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// Immediately rejects all submissions since the portal is locked down
app.post('/api/submit', (req, res) => {
    res.status(403).json({ ok: false, result: "PORTAL_CLOSED" });
});

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live (Closed Mode) on port ${PORT}`));
