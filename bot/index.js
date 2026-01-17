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
    // Roblox
    'game','workspace','script','plugin','shared','Enum','Instance',
    'Vector3','Vector2','CFrame','Color3','BrickColor','UDim','UDim2',
    'Ray','TweenInfo','Region3','Rect','NumberRange','NumberSequence',
    'ColorSequence','PhysicalProperties','Random','Axes','Faces',
    'typeof','require','spawn','delay','wait','tick','time','warn',
    'settings','UserSettings','version','printidentity','elapsedTime',
    // Executor
    'getgenv','getrenv','getfenv','setfenv','getrawmetatable','setrawmetatable',
    'hookfunction','hookmetamethod','newcclosure','islclosure','iscclosure',
    'loadstring','checkcaller','getcallingscript','identifyexecutor',
    'getexecutorname','syn','fluxus','KRNL_LOADED','Drawing','cleardrawcache',
    'isreadonly','setreadonly','firesignal','getconnections',
    'fireproximityprompt','gethui','gethiddenproperty','sethiddenproperty',
    'setsimulationradius','getcustomasset','getsynasset','isnetworkowner',
    'fireclickdetector','firetouchinterest','isrbxactive',
    'request','http_request','HttpGet','httpget','HttpPost',
    'readfile','writefile','appendfile','loadfile','isfile','isfolder',
    'makefolder','delfolder','delfile','listfiles','getscriptbytecode',
    'rconsoleprint','rconsolename','rconsoleclear','rconsoleinput',
    'setclipboard','setfflag','getnamecallmethod',
    // Task
    'task',
    // Lua
    '_G','_VERSION','assert','collectgarbage','coroutine','debug',
    'dofile','error','gcinfo','getmetatable','setmetatable',
    'ipairs','pairs','next','load','loadfile','newproxy',
    'os','io','pcall','xpcall','print','rawequal','rawget','rawset','rawlen',
    'select','string','table','math','bit32','utf8',
    'tonumber','tostring','type','unpack',
    // Keywords
    'and','break','do','else','elseif','end','false','for','function',
    'goto','if','in','local','nil','not','or','repeat','return',
    'then','true','until','while','continue',
    // Common
    'self','this','Callback','Connect','Wait','Fire'
]);

// ==========================================
// SAFE OBFUSCATOR - PHASE 2
// ==========================================
class LuaGuard {
    constructor(preset) {
        this.preset = preset;
        this.counter = 0;
        this.varMap = new Map();
        this.logs = [];
    }

    // Generate safe variable name
    genVar() {
        const id = this.counter++;
        if (this.preset === 'maxSecurity') {
            return '_0x' + id.toString(16).padStart(4, '0');
        }
        return '_v' + id;
    }

    // Check if inside string
    isInString(code, pos) {
        let inStr = false, q = '';
        for (let i = 0; i < pos && i < code.length; i++) {
            const c = code[i], prev = i > 0 ? code[i-1] : '';
            if ((c === '"' || c === "'") && prev !== '\\') {
                if (!inStr) { inStr = true; q = c; }
                else if (c === q) { inStr = false; }
            }
            // Long string [[...]]
            if (c === '[' && code[i+1] === '[' && !inStr) {
                const end = code.indexOf(']]', i+2);
                if (end > 0 && pos > i && pos < end+2) return true;
            }
        }
        return inStr;
    }

    // 1. Remove Comments (SAFE)
    removeComments(code) {
        let result = code;
        let count = 0;

        // Multi-line --[[ ]]
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => { count++; return ''; });

        // Single-line --
        const lines = result.split('\n');
        result = lines.map(line => {
            let inStr = false, q = '';
            for (let i = 0; i < line.length - 1; i++) {
                const c = line[i], prev = i > 0 ? line[i-1] : '';
                if ((c === '"' || c === "'") && prev !== '\\') {
                    if (!inStr) { inStr = true; q = c; }
                    else if (c === q) { inStr = false; }
                }
                if (!inStr && c === '-' && line[i+1] === '-' && line[i+2] !== '[') {
                    count++;
                    return line.slice(0, i).trimEnd();
                }
            }
            return line;
        }).join('\n');

        if (count > 0) this.logs.push(`🧹 Removed ${count} comments`);
        return result;
    }

    // 2. Rename Variables (SAFE)
    renameVars(code) {
        if (this.preset === 'performance') return code;

        let result = code;
        const vars = [];

        // Collect: local varname
        const localRe = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let m;
        while ((m = localRe.exec(code)) !== null) {
            const name = m[1];
            if (!PROTECTED.has(name) && !this.varMap.has(name)) {
                const newN = this.genVar();
                this.varMap.set(name, newN);
                vars.push({ old: name, new: newN });
            }
        }

        // Collect: function params
        const funcRe = /function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
        while ((m = funcRe.exec(code)) !== null) {
            if (m[1].trim()) {
                m[1].split(',').map(p => p.trim()).filter(p => p && p !== '...').forEach(p => {
                    if (!PROTECTED.has(p) && !this.varMap.has(p)) {
                        const newN = this.genVar();
                        this.varMap.set(p, newN);
                        vars.push({ old: p, new: newN });
                    }
                });
            }
        }

        // Collect: for i, v in / for i = 
        const forRe = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g;
        while ((m = forRe.exec(code)) !== null) {
            [m[1], m[2]].filter(Boolean).forEach(v => {
                if (!PROTECTED.has(v) && !this.varMap.has(v)) {
                    const newN = this.genVar();
                    this.varMap.set(v, newN);
                    vars.push({ old: v, new: newN });
                }
            });
        }

        // Sort longest first
        vars.sort((a, b) => b.old.length - a.old.length);

        // Replace
        for (const v of vars) {
            const re = new RegExp('\\b' + v.old + '\\b', 'g');
            result = result.replace(re, (match, offset) => {
                return this.isInString(result, offset) ? match : v.new;
            });
        }

        if (vars.length > 0) this.logs.push(`🔤 Renamed ${vars.length} variables`);
        return result;
    }

    // 3. Add Junk Variables (SAFE - Max Security Only)
    addJunk(code) {
        if (this.preset !== 'maxSecurity') return code;

        const junks = [
            `local _j${this.counter++} = nil`,
            `local _j${this.counter++} = false`,
            `local _j${this.counter++} = 0`,
        ];

        // Add at beginning
        const junkCode = junks.join('\n') + '\n';
        this.logs.push(`💀 Added ${junks.length} junk variables`);
        return junkCode + code;
    }

    // 4. Compress (SAFE)
    compress(code) {
        let result = code
            .split('\n')
            .map(l => l.trim())
            .filter(l => l !== '')
            .join('\n');

        result = result.replace(/\n{3,}/g, '\n\n');
        this.logs.push(`📦 Compressed whitespace`);
        return result;
    }

    // 5. Wrap in Function (Max Security Only)
    wrap(code) {
        if (this.preset !== 'maxSecurity') return code;
        this.logs.push(`🎁 Added protection wrapper`);
        return `do\n${code}\nend`;
    }

    // Main
    obfuscate(source) {
        let code = source;

        code = this.removeComments(code);
        code = this.renameVars(code);
        code = this.addJunk(code);
        code = this.compress(code);
        code = this.wrap(code);

        const emoji = { performance: '⚡', balanced: '⚖️', maxSecurity: '🔒' };
        const header = [
            `--[[ ═══════════════════════════════════`,
            `     🛡️ LuaGuard v2.0 | ${emoji[this.preset]} ${this.preset}`,
            `     📅 ${new Date().toISOString().split('T')[0]}`,
            `     ═══════════════════════════════════ ]]`,
            ''
        ].join('\n');

        return { code: header + code, logs: this.logs };
    }
}

// ==========================================
// WEB SERVER
// ==========================================
const app = express();
app.get('/', (req, res) => res.send(`
<html>
<head><title>LuaGuard</title></head>
<body style="font-family:Arial;text-align:center;padding:50px;background:#0d1117;color:#fff">
<h1>🛡️ LuaGuard Bot v2.0</h1>
<p style="color:#3fb950;font-size:20px">✅ Online</p>
<p style="color:#8b949e">Phase 2 - Safe Mode</p>
</body></html>
`));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Server OK'));

// ==========================================
// BOT
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('\n╔═══════════════════════════════════╗');
console.log('║   🛡️ LuaGuard v2.0 - Phase 2      ║');
console.log('╠═══════════════════════════════════╣');
console.log(`║ Token: ${TOKEN ? '✅' : '❌'}  Client: ${CLIENT_ID ? '✅' : '❌'}           ║`);
console.log('╚═══════════════════════════════════╝\n');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Commands
const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('🛡️ Protect your Lua script')
        .addAttachmentOption(o => o.setName('file').setDescription('.lua file').setRequired(true))
        .addStringOption(o => o.setName('preset').setDescription('Level').addChoices(
            { name: '⚡ Performance - Light & Fast', value: 'performance' },
            { name: '⚖️ Balanced - Recommended', value: 'balanced' },
            { name: '🔒 Max Security - Full Protection', value: 'maxSecurity' }
        )),
    new SlashCommandBuilder().setName('help').setDescription('📖 Show help'),
    new SlashCommandBuilder().setName('ping').setDescription('🏓 Check status')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ Bot: ${client.user.tag}`);
    client.user.setActivity('/obfuscate', { type: ActivityType.Listening });

    if (CLIENT_ID) {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('✅ Commands registered!\n');
        } catch (e) { console.log('❌', e.message); }
    }
});

// Handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        return interaction.reply(`🏓 Pong! \`${Date.now() - interaction.createdTimestamp}ms\``);
    }

    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ LuaGuard Help')
            .setDescription('Protect Roblox Lua scripts!')
            .addFields(
                { name: '⚡ Performance', value: 'Comment removal only', inline: true },
                { name: '⚖️ Balanced', value: '+ Variable renaming', inline: true },
                { name: '🔒 Max Security', value: '+ Junk code + Wrapper', inline: true },
                { name: '📁 Files', value: '.lua .luau .txt', inline: true },
                { name: '📏 Max Size', value: '2 MB', inline: true }
            )
            .setFooter({ text: 'LuaGuard v2.0' });
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        // Validate
        if (!['.lua', '.luau', '.txt'].some(e => file.name.toLowerCase().endsWith(e))) {
            return interaction.reply({ content: '❌ Only .lua .luau .txt allowed!', ephemeral: true });
        }
        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({ content: '❌ Max 2MB!', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const res = await axios.get(file.url, { responseType: 'arraybuffer' });
            const source = res.data.toString('utf-8');

            if (!source.trim()) return interaction.editReply('❌ Empty file!');

            const start = Date.now();
            const obf = new LuaGuard(preset);
            const result = obf.obfuscate(source);
            const time = ((Date.now() - start) / 1000).toFixed(2);

            const buf = Buffer.from(result.code, 'utf-8');
            const outName = file.name.replace(/\.(lua|luau|txt)$/i, '_protected.lua');
            const attachment = new AttachmentBuilder(buf, { name: outName });

            const colors = { performance: 0x57F287, balanced: 0x5865F2, maxSecurity: 0xED4245 };
            const emoji = { performance: '⚡', balanced: '⚖️', maxSecurity: '🔒' };

            const embed = new EmbedBuilder()
                .setColor(colors[preset])
                .setTitle('✅ Protected!')
                .addFields(
                    { name: '📁 File', value: `\`${file.name}\``, inline: true },
                    { name: '⚙️ Preset', value: `${emoji[preset]} ${preset}`, inline: true },
                    { name: '⏱️ Time', value: `\`${time}s\``, inline: true },
                    { name: '📊 Size', value: `\`${source.length} → ${result.code.length}\``, inline: true },
                    { name: '🔧 Applied', value: result.logs.join('\n') || 'None', inline: false }
                )
                .setFooter({ text: 'LuaGuard v2.0 • Roblox Ready ✓' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ Error: ${e.message}`);
        }
    }
});

if (TOKEN) client.login(TOKEN);
else console.log('❌ No token!');
