require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, 
    SlashCommandBuilder, ActivityType, EmbedBuilder, 
    AttachmentBuilder 
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
// PROTECTED NAMES - JANGAN DIGANTI
// ==========================================
const PROTECTED = new Set([
    // Roblox Core
    'game','workspace','script','plugin','shared',
    // Services
    'Enum','Instance','Vector3','Vector2','CFrame','Color3','BrickColor',
    'UDim','UDim2','Ray','TweenInfo','Region3','Rect','NumberRange',
    'NumberSequence','ColorSequence','PhysicalProperties','Random',
    // Roblox Functions
    'typeof','require','spawn','delay','wait','tick','time','elapsedTime',
    'settings','UserSettings','version','printidentity','warn',
    // Executor Globals
    'getgenv','getrenv','getfenv','setfenv','getrawmetatable','setrawmetatable',
    'hookfunction','hookmetamethod','newcclosure','islclosure','iscclosure',
    'loadstring','checkcaller','getcallingscript','identifyexecutor',
    'getexecutorname','syn','fluxus','KRNL_LOADED','Drawing','cleardrawcache',
    'isreadonly','setreadonly','make_writeable','firesignal','getconnections',
    'fireproximityprompt','gethui','gethiddenproperty','sethiddenproperty',
    'setsimulationradius','getcustomasset','getsynasset','isnetworkowner',
    'fireclickdetector','firetouchinterest','isrbxactive',
    'request','http_request','HttpGet','httpget',
    'readfile','writefile','appendfile','loadfile','isfile','isfolder',
    'makefolder','delfolder','delfile','listfiles',
    'rconsoleprint','rconsolename','rconsoleclear','rconsoleinput',
    // Lua Globals
    '_G','_VERSION','assert','collectgarbage','coroutine','debug',
    'dofile','error','gcinfo','getmetatable','setmetatable',
    'ipairs','pairs','next','load','loadfile','newproxy',
    'os','io','pcall','xpcall','print','rawequal','rawget','rawset','rawlen',
    'select','string','table','math','bit32','utf8','task',
    'tonumber','tostring','type','unpack',
    // Lua Keywords
    'and','break','do','else','elseif','end','false','for','function',
    'goto','if','in','local','nil','not','or','repeat','return',
    'then','true','until','while','continue',
    // Common
    'self','this','super'
]);

// ==========================================
// SIMPLE OBFUSCATOR (PHASE 1 - SAFE)
// ==========================================
class SafeObfuscator {
    constructor(preset) {
        this.preset = preset;
        this.counter = 0;
        this.mapping = new Map();
        this.logs = [];
    }

    // Generate nama baru
    newName() {
        return `_L${(this.counter++).toString(36)}`;
    }

    // Hapus semua comments
    removeComments(code) {
        let result = code;
        let removed = 0;

        // Multi-line: --[[ ... ]] atau --[=[ ... ]=]
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => {
            removed++;
            return '';
        });

        // Single-line: -- ... (tapi jangan di dalam string)
        const lines = result.split('\n');
        result = lines.map(line => {
            // Simple check: cari -- yang tidak di dalam quotes
            let inString = false;
            let quote = '';
            for (let i = 0; i < line.length - 1; i++) {
                const c = line[i];
                if ((c === '"' || c === "'") && (i === 0 || line[i-1] !== '\\')) {
                    if (!inString) {
                        inString = true;
                        quote = c;
                    } else if (c === quote) {
                        inString = false;
                    }
                }
                if (!inString && c === '-' && line[i+1] === '-') {
                    removed++;
                    return line.substring(0, i).trimEnd();
                }
            }
            return line;
        }).join('\n');

        if (removed > 0) {
            this.logs.push(`🧹 Removed ${removed} comments`);
        }
        return result;
    }

    // Rename local variables saja (SAFE METHOD)
    renameVariables(code) {
        if (this.preset === 'performance') {
            return code; // Skip untuk performance
        }

        let result = code;
        let renamed = 0;

        // Pattern: local varname atau local var1, var2
        // Kita collect dulu semua nama
        const pattern = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;
        const toRename = [];

        while ((match = pattern.exec(code)) !== null) {
            const name = match[1];
            if (!PROTECTED.has(name) && !this.mapping.has(name)) {
                const newN = this.newName();
                this.mapping.set(name, newN);
                toRename.push({ old: name, new: newN });
            }
        }

        // Sort by length descending (rename longer names first)
        toRename.sort((a, b) => b.old.length - a.old.length);

        // Replace each variable
        for (const item of toRename) {
            // Buat regex yang match whole word only
            const regex = new RegExp(`\\b${item.old}\\b`, 'g');
            const before = result;
            result = result.replace(regex, (match, offset) => {
                // Cek apakah di dalam string
                if (this.isInString(result, offset)) {
                    return match;
                }
                return item.new;
            });
            if (before !== result) renamed++;
        }

        if (renamed > 0) {
            this.logs.push(`🔤 Renamed ${renamed} variables`);
        }
        return result;
    }

    // Cek apakah posisi ada di dalam string
    isInString(code, pos) {
        let inStr = false;
        let q = '';
        for (let i = 0; i < pos; i++) {
            const c = code[i];
            const prev = i > 0 ? code[i-1] : '';
            if ((c === '"' || c === "'") && prev !== '\\') {
                if (!inStr) {
                    inStr = true;
                    q = c;
                } else if (c === q) {
                    inStr = false;
                }
            }
            // Long string [[
            if (c === '[' && code[i+1] === '[' && !inStr) {
                const end = code.indexOf(']]', i + 2);
                if (end !== -1 && pos > i && pos < end + 2) {
                    return true;
                }
            }
        }
        return inStr;
    }

    // Compress whitespace (MILD - tidak agresif)
    compress(code) {
        let result = code;

        // Hapus baris yang hanya whitespace
        result = result.split('\n')
            .filter(line => line.trim() !== '')
            .join('\n');

        // Hapus multiple newlines
        result = result.replace(/\n{3,}/g, '\n\n');

        // Trim setiap baris
        result = result.split('\n')
            .map(line => line.trim())
            .join('\n');

        this.logs.push(`📦 Whitespace cleaned`);
        return result;
    }

    // Main function
    obfuscate(source) {
        let code = source;

        // Step 1: Remove comments
        code = this.removeComments(code);

        // Step 2: Rename variables (skip jika performance)
        code = this.renameVariables(code);

        // Step 3: Compress whitespace
        code = this.compress(code);

        // Header
        const header = [
            '-- ═══════════════════════════════════════',
            '-- Protected by LuaGuard v1.0 (Phase 1)',
            `-- Preset: ${this.preset}`,
            `-- Date: ${new Date().toISOString().split('T')[0]}`,
            '-- ═══════════════════════════════════════',
            ''
        ].join('\n');

        return {
            code: header + code,
            logs: this.logs
        };
    }
}

// ==========================================
// WEB SERVER
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('🛡️ LuaGuard Bot Online!'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Server OK'));

// ==========================================
// BOT SETUP
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Environment Check:');
console.log(`   TOKEN: ${TOKEN ? '✅' : '❌ MISSING'}`);
console.log(`   CLIENT_ID: ${CLIENT_ID || '❌ MISSING'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Commands
const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Protect your Lua script')
        .addAttachmentOption(o => o
            .setName('file')
            .setDescription('Upload .lua file')
            .setRequired(true))
        .addStringOption(o => o
            .setName('preset')
            .setDescription('Protection level')
            .addChoices(
                { name: '⚡ Performance', value: 'performance' },
                { name: '⚖️ Balanced', value: 'balanced' },
                { name: '🔒 Max Security', value: 'maxSecurity' }
            )),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot status')
].map(c => c.toJSON());

// Register on ready
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ Logged in: ${client.user.tag}`);
    client.user.setActivity('/obfuscate', { type: ActivityType.Listening });

    if (!CLIENT_ID) {
        console.log('❌ CLIENT_ID missing - commands not registered');
        return;
    }

    try {
        console.log('🔄 Registering commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commands registered!');
    } catch (e) {
        console.log('❌ Register failed:', e.message);
    }
});

// Handle commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        return interaction.reply('🏓 Pong! Bot is working.');
    }

    if (interaction.commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        // Validate
        const valid = ['.lua', '.luau', '.txt'];
        if (!valid.some(ext => file.name.toLowerCase().endsWith(ext))) {
            return interaction.reply({ 
                content: '❌ Only .lua, .luau, .txt files allowed!', 
                ephemeral: true 
            });
        }

        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({ 
                content: '❌ Max file size is 2MB!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        try {
            // Download
            const res = await axios.get(file.url, { responseType: 'arraybuffer' });
            const source = res.data.toString('utf-8');

            if (!source.trim()) {
                return interaction.editReply('❌ File is empty!');
            }

            // Obfuscate
            const start = Date.now();
            const obf = new SafeObfuscator(preset);
            const result = obf.obfuscate(source);
            const time = ((Date.now() - start) / 1000).toFixed(2);

            // Output
            const buf = Buffer.from(result.code, 'utf-8');
            const outName = file.name.replace(/\.(lua|luau|txt)$/i, '_protected.lua');
            const attachment = new AttachmentBuilder(buf, { name: outName });

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('✅ Script Protected!')
                .addFields(
                    { name: '📁 File', value: file.name, inline: true },
                    { name: '⚙️ Preset', value: preset, inline: true },
                    { name: '⏱️ Time', value: `${time}s`, inline: true },
                    { name: '📊 Size', value: `${source.length} → ${result.code.length}`, inline: true },
                    { name: '🔧 Applied', value: result.logs.join('\n') || 'None', inline: false }
                )
                .setFooter({ text: 'LuaGuard Phase 1 • Safe Mode' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ Error: ${e.message}`);
        }
    }
});

// Start
if (TOKEN) {
    client.login(TOKEN);
} else {
    console.log('❌ Cannot start: No token');
}
