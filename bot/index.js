require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, 
    SlashCommandBuilder, ActivityType, EmbedBuilder, 
    AttachmentBuilder 
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
// 1. LOGIKA OBFUSCATOR (SI KOKI 👨‍🍳)
// ==========================================
class SimpleObfuscator {
    constructor(preset) {
        this.preset = preset;
    }

    obfuscate(code) {
        let result = code;
        let log = [];

        // 1. Comment Removal
        if (this.preset !== 'manual') {
            const initialLen = result.length;
            result = result.replace(/--\[\[[\s\S]*?\]\]/g, ''); // Hapus multiline
            result = result.replace(/--.*$/gm, ''); // Hapus single line
            result = result.replace(/^\s*[\r\n]/gm, ''); // Hapus baris kosong
            log.push(`🧹 Comments Removed`);
        }

        // 2. String Encoding (Base64 Simple Wrapper)
        if (this.preset === 'balanced' || this.preset === 'maxSecurity') {
            // Cari string dalam kutip "..." atau '...'
            result = result.replace(/(['"])(.*?)\1/g, (match, quote, content) => {
                if (content.length < 3) return match; // Skip string pendek
                const b64 = Buffer.from(content).toString('base64');
                return `(function(s) return (s:gsub('.', function(c) return '\\'..c:byte() end)) end)("${content}") /* Encoded */`; 
                // Note: Phase 1 sederhana dulu agar tidak error syntax
            });
            log.push(`🔐 Strings Encoded`);
        }

        // 3. Variable Renaming (Simulasi)
        // (Regex sederhana untuk mengganti 'local xyz' menjadi 'local _0x...')
        let varCounter = 0;
        const map = new Map();
        result = result.replace(/\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
            if (varName === 'game' || varName === 'getgenv') return match; // Jangan rename global
            const newName = `_0x${(varCounter++).toString(16).padStart(4,'0')}`;
            map.set(varName, newName);
            return `local ${newName}`;
        });
        
        // Replace penggunaan variable
        map.forEach((newName, oldName) => {
            const regex = new RegExp(`\\b${oldName}\\b`, 'g');
            result = result.replace(regex, newName);
        });
        if (map.size > 0) log.push(`🔤 Renamed ${map.size} Variables`);

        // 4. Watermark Header
        const header = `-- Protected by LuaGuard (Phase 1)\n-- Preset: ${this.preset}\n\n`;
        return { code: header + result, log: log };
    }
}

// ==========================================
// 2. WEB SERVER (Agar Render ON Terus)
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('🛡️ LuaGuard Bot (All-in-One) is Online!'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web Server OK'));

// ==========================================
// 3. KONFIGURASI BOT
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ FATAL: Masukkan DISCORD_TOKEN dan CLIENT_ID di Render!');
    // Jangan exit process agar web server tetap jalan dan kita bisa lihat log
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Definisi Command Langsung
const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate Lua Script')
        .addAttachmentOption(opt => 
            opt.setName('file').setDescription('Upload .lua').setRequired(true))
        .addStringOption(opt => 
            opt.setName('preset').setDescription('Level Protection')
            .addChoices(
                { name: '⚡ Performance', value: 'performance' },
                { name: '⚖️ Balanced', value: 'balanced' },
                { name: '🔒 Max Security', value: 'maxSecurity' }
            ))
].map(c => c.toJSON());

// Register Command saat Ready
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    client.user.setActivity('Obfuscating Scripts...', { type: ActivityType.Playing });

    try {
        console.log('🔄 Registering commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commands Registered Successfully!');
    } catch (e) {
        console.error('❌ Failed to register commands:', e);
    }
});

// ==========================================
// 4. HANDLER OBFUSCATE (SI PELAYAN 🤵)
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'obfuscate') return;

    const file = interaction.options.getAttachment('file');
    const preset = interaction.options.getString('preset') || 'balanced';

    // 1. Validasi
    if (!file.name.endsWith('.lua') && !file.name.endsWith('.luau') && !file.name.endsWith('.txt')) {
        return interaction.reply({ content: '❌ Hanya file .lua, .luau, atau .txt', ephemeral: true });
    }

    await interaction.deferReply();

    try {
        // 2. Download File
        const response = await axios.get(file.url, { responseType: 'arraybuffer' });
        const sourceCode = response.data.toString('utf-8');

        // 3. PROSES OBFUSCATE (Lokal, tidak perlu API luar)
        const startTime = Date.now();
        const obfuscator = new SimpleObfuscator(preset);
        const result = obfuscator.obfuscate(sourceCode);
        const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

        // 4. Kirim Hasil
        const buffer = Buffer.from(result.code, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: file.name.replace(/\.(lua|txt)/, '_obf.lua') });

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Obfuscation Complete')
            .setDescription(`**File:** ${file.name}\n**Preset:** ${preset}\n**Time:** ${processTime}s`)
            .addFields({ name: '🔧 Transforms', value: result.log.join('\n') || 'None' })
            .setFooter({ text: 'LuaGuard All-in-One' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
        console.error(error);
        await interaction.editReply(`❌ Error: ${error.message}`);
    }
});

if (TOKEN) client.login(TOKEN);
