require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    ActivityType,
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    AttachmentBuilder,
    StringSelectMenuBuilder 
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==============================================
// 1. WEB SERVER (Agar Render tidak mati)
// ==============================================
const app = express();
app.get('/', (req, res) => res.send('Bot is Alive & Commands Forced!'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web Server OK'));

// ==============================================
// 2. KONFIGURASI
// ==============================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL || 'http://localhost:3000';

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ FATAL: Token atau Client ID belum diisi di Environment Variables Render!');
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ==============================================
// 3. DEFINISI COMMAND (LANGSUNG DISINI)
// ==============================================
// Kita definisikan command langsung di array ini agar tidak ada error baca file
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Cek apakah bot merespon'),

    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate Lua Script (Phase 1)')
        .addAttachmentOption(opt => 
            opt.setName('file').setDescription('Upload file .lua').setRequired(true))
        .addStringOption(opt => 
            opt.setName('preset').setDescription('Pilih Preset')
            .addChoices(
                { name: '⚡ Performance', value: 'performance' },
                { name: '⚖️ Balanced', value: 'balanced' },
                { name: '🔒 Max Security', value: 'maxSecurity' }
            ))
].map(command => command.toJSON());

// ==============================================
// 4. LOGIC REGISTRASI (SAAT BOT ON)
// ==============================================
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity('/obfuscate', { type: ActivityType.Watching });

    try {
        console.log('🔄 MEMAKSA REGISTRASI COMMAND GLOBAL...');
        
        // Hapus command lama dulu (opsional, tapi bagus untuk bersih-bersih)
        // await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
        
        // Register command baru
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ SUKSES: ${data.length} command berhasil didaftarkan!`);
        console.log('👉 Silakan restart Discord di HP/PC Anda jika command belum muncul.');
    } catch (error) {
        console.error('❌ GAGAL REGISTER COMMAND:', error);
    }
});

// ==============================================
// 5. HANDLER INTERAKSI (LOGIC BOT)
// ==============================================
client.on('interactionCreate', async interaction => {
    // --- COMMAND HANDLER ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'ping') {
            await interaction.reply('🏓 Pong! Bot aktif.');
        } 

        else if (commandName === 'obfuscate') {
            await handleObfuscate(interaction);
        }
    }

    // --- BUTTON & MENU HANDLER ---
    else if (interaction.isButton() || interaction.isStringSelectMenu()) {
        // Logic tombol diteruskan ke fungsi yang sama (jika ingin dikembangkan)
        // Untuk saat ini reply simple saja agar tidak error
        if (interaction.customId.startsWith('reobf_') || interaction.customId.startsWith('sel_')) {
             await interaction.reply({ content: 'Fitur Re-Obfuscate perlu setup database state. Silakan upload ulang file.', ephemeral: true });
        }
    }
});

// ==============================================
// 6. FUNGSI LOGIKA OBFUSCATE
// ==============================================
async function handleObfuscate(interaction) {
    const file = interaction.options.getAttachment('file');
    const preset = interaction.options.getString('preset') || 'balanced';

    if (!file.name.endsWith('.lua') && !file.name.endsWith('.luau') && !file.name.endsWith('.txt')) {
        return interaction.reply({ content: '❌ Hanya file .lua / .luau / .txt', ephemeral: true });
    }

    await interaction.deferReply();

    try {
        // Download File
        const fileReq = await axios.get(file.url, { responseType: 'arraybuffer' });
        const sourceCode = fileReq.data.toString('utf-8');

        // Kirim ke API Render
        // CATATAN: Pastikan API_URL di Render Env Var tidak ada slash di akhir
        const response = await axios.post(`${API_URL}/api/obfuscate`, {
            code: sourceCode,
            fileName: file.name,
            preset: preset
        });

        const result = response.data;

        if (!result.success) throw new Error(result.error);

        // Buat File Hasil
        const buffer = Buffer.from(result.code, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: file.name.replace(/\.(lua|txt)/, '_obf.lua') });

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Obfuscation Complete')
            .setDescription(`Preset: **${preset}**\nTime: ${result.stats.processTime}`)
            .setFooter({ text: 'Phase 1 - Direct Handler' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
        console.error(error);
        await interaction.editReply(`❌ Error: ${error.message || 'API Connection Failed'}`);
    }
}

// ==============================================
// 7. START BOT
// ==============================================
client.login(TOKEN);
