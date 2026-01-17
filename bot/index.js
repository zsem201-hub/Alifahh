require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

// ==========================================
// 🌐 RENDER KEEP-ALIVE SERVER
// Bagian ini wajib ada agar Render tidak mematikan bot
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
    <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h1>🛡️ LuaGuard Bot is Online!</h1>
        <p>Status: <span style="color: green; font-weight: bold;">Active</span></p>
        <p>Listening for commands...</p>
    </div>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Keep-Alive Web Server listening on port ${PORT}`);
});
// ==========================================


// Inisialisasi Bot Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
// Pastikan folder commands ada sebelum membaca
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    const commands = [];
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
        }
    }

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    (async () => {
        try {
            console.log('🔄 Registering slash commands...');
            
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            
            console.log('✅ Slash commands registered!');
        } catch (error) {
            console.error('❌ Error registering commands:', error);
        }
    })();
} else {
    console.warn('⚠️ Warning: commands folder not found!');
}

// Bot ready event
client.once('ready', () => {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🛡️  LuaGuard Obfuscator Bot`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`📛 Logged in as: ${client.user.tag}`);
    console.log(`🌐 Servers: ${client.guilds.cache.size}`);
    console.log(`${'═'.repeat(50)}\n`);
    
    // Set activity
    client.user.setActivity('Protecting Lua Scripts', { 
        type: ActivityType.Watching 
    });
});

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            console.error(`Command not found: ${interaction.commandName}`);
            return;
        }
        
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            
            const errorMessage = {
                content: '❌ An error occurred while executing this command.',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
        const command = client.commands.get('obfuscate');
        if (command && command.handleButton) {
            await command.handleButton(interaction);
        }
    }
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
        const command = client.commands.get('obfuscate');
        if (command && command.handleSelect) {
            await command.handleSelect(interaction);
        }
    }
});

// Login
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Error: DISCORD_TOKEN is missing in environment variables!');
} else {
    client.login(process.env.DISCORD_TOKEN);
}
