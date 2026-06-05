const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); // Allows your HTML file to communicate with this backend safely
app.use(express.json());

// REPLACE THIS WITH YOUR ACTUAL DISCORD WEBHOOK URL
const DISCORD_WEBHOOK_URL = "YOUR_DISCORD_WEBHOOK_URL_HERE";

app.post('/api/submit', async (req, res) => {
    const { username, age, timezone, experience, reason } = req.body;

    // Structure the message format for your staff log channel
    const discordPayload = {
        embeds: [{
            title: "📝 New Staff Application Submitted",
            color: 2427115, 
            fields: [
                { name: "Discord User ID", value: username || "N/A", inline: true },
                { name: "Age", value: age || "N/A", inline: true },
                { name: "Timezone", value: timezone || "N/A", inline: true },
                { name: "Relevant Experience", value: experience || "N/A" },
                { name: "Motivation / Why join?", value: reason || "N/A" }
            ],
            footer: { text: "Staff Portal Network" },
            timestamp: new Date()
        }]
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, discordPayload);
        // Returns a success flag back to your HTML popup script
        res.status(200).json({ ok: true, result: "ACCEPTED" });
    } catch (error) {
        console.error("Error sending to Discord:", error.message);
        res.status(500).json({ ok: false, result: "DISCORD_ERROR" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Backend live on port ${PORT}`);
});
