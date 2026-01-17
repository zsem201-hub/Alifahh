require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, 
    SlashCommandBuilder, ActivityType, EmbedBuilder, 
    AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
// PROTECTED NAMES - JANGAN PERNAH DIGANTI
// ==========================================
const PROTECTED = new Set([
    // Roblox Core
    'game','workspace','script','plugin','shared',
    // Types & Constructors
    'Enum','Instance','Vector3','Vector2','CFrame','Color3','BrickColor',
    'UDim','UDim2','Ray','TweenInfo','Region3','Rect','NumberRange',
    'NumberSequence','ColorSequence','PhysicalProperties','Random',
    'Axes','Faces','PathWaypoint','DockWidgetPluginGuiInfo',
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
    'request','http_request','HttpGet','httpget','HttpPost',
    'readfile','writefile','appendfile','loadfile','isfile','isfolder',
    'makefolder','delfolder','delfile','listfiles','getscriptbytecode',
    'rconsoleprint','rconsolename','rconsoleclear','rconsoleinput',
    'setclipboard','setfflag','getnamecallmethod','hooknamecall',
    // Task Library
    'task','wait','spawn','delay','defer','cancel','desynchronize','synchronize',
    // Lua Globals
    '_G','_VERSION','assert','collectgarbage','coroutine','debug',
    'dofile','error','gcinfo','getmetatable','setmetatable',
    'ipairs','pairs','next','load','loadfile','newproxy',
    'os','io','pcall','xpcall','print','rawequal','rawget','rawset','rawlen',
    'select','string','table','math','bit32','utf8',
    'tonumber','tostring','type','unpack',
    // Lua Keywords
    'and','break','do','else','elseif','end','false','for','function',
    'goto','if','in','local','nil','not','or','repeat','return',
    'then','true','until','while','continue',
    // Common
    'self','this','super','Callback','Connect','Wait','Fire'
]);

// ==========================================
// LUAGUARD OBFUSCATOR - PHASE 2
// ==========================================
class LuaGuardObfuscator {
    constructor(preset) {
        this.preset = preset;
        this.counter = 0;
        this.mapping = new Map();
        this.logs = [];
        this.stats = {
            comments: 0,
            variables: 0,
            strings: 0,
            numbers: 0,
            deadCode: 0
        };
    }

    // Generate unique name
    genName(prefix = '_G') {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const id = this.counter++;
        let name = prefix;
        let n = id;
        do {
            name += chars[n % 26];
            n = Math.floor(n / 26);
        } while (n > 0);
        return name;
    }

    // Generate random hex name
    genHex() {
        return '_0x' + (this.counter++).toString(16).padStart(4, '0');
    }

    // Check if position is inside string
    isInString(code, pos) {
        let inStr = false;
        let quote = '';
        for (let i = 0; i < pos && i < code.length; i++) {
            const c = code[i];
            const prev = i > 0 ? code[i-1] : '';
            if ((c === '"' || c === "'") && prev !== '\\') {
                if (!inStr) { inStr = true; quote = c; }
                else if (c === quote) { inStr = false; }
            }
            if (c === '[' && code[i+1] === '[' && !inStr) {
                const end = code.indexOf(']]', i + 2);
                if (end !== -1 && pos > i && pos < end + 2) return true;
            }
        }
        return inStr;
    }

    // ====== TRANSFORM 1: Remove Comments ======
    removeComments(code) {
        let result = code;
        
        // Multi-line comments
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => {
            this.stats.comments++;
            return '';
        });

        // Single-line comments
        const lines = result.split('\n');
        result = lines.map(line => {
            let inStr = false, q = '';
            for (let i = 0; i < line.length - 1; i++) {
                const c = line[i];
                if ((c === '"' || c === "'") && (i === 0 || line[i-1] !== '\\')) {
                    if (!inStr) { inStr = true; q = c; }
                    else if (c === q) { inStr = false; }
                }
                if (!inStr && c === '-' && line[i+1] === '-' && line[i+2] !== '[') {
                    this.stats.comments++;
                    return line.substring(0, i).trimEnd();
                }
            }
            return line;
        }).join('\n');

        if (this.stats.comments > 0) {
            this.logs.push(`🧹 Removed ${this.stats.comments} comments`);
        }
        return result;
    }

    // ====== TRANSFORM 2: Rename Variables ======
    renameVariables(code) {
        if (this.preset === 'performance') return code;

        let result = code;
        const toRename = [];

        // Collect local declarations
        const localPattern = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;
        while ((match = localPattern.exec(code)) !== null) {
            const name = match[1];
            if (!PROTECTED.has(name) && !this.mapping.has(name)) {
                const newName = this.preset === 'maxSecurity' ? this.genHex() : this.genName('_v');
                this.mapping.set(name, newName);
                toRename.push({ old: name, new: newName });
            }
        }

        // Collect function parameters
        const funcPattern = /function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
        while ((match = funcPattern.exec(code)) !== null) {
            if (match[1].trim()) {
                const params = match[1].split(',').map(p => p.trim()).filter(p => p && p !== '...');
                for (const param of params) {
                    if (!PROTECTED.has(param) && !this.mapping.has(param)) {
                        const newName = this.preset === 'maxSecurity' ? this.genHex() : this.genName('_p');
                        this.mapping.set(param, newName);
                        toRename.push({ old: param, new: newName });
                    }
                }
            }
        }

        // Collect for loop variables
        const forPattern = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*(?:=|in)/g;
        while ((match = forPattern.exec(code)) !== null) {
            [match[1], match[2]].filter(Boolean).forEach(v => {
                if (!PROTECTED.has(v) && !this.mapping.has(v)) {
                    const newName = this.preset === 'maxSecurity' ? this.genHex() : this.genName('_i');
                    this.mapping.set(v, newName);
                    toRename.push({ old: v, new: newName });
                }
            });
        }

        // Sort by length (longest first)
        toRename.sort((a, b) => b.old.length - a.old.length);

        // Replace
        for (const item of toRename) {
            const regex = new RegExp(`\\b${item.old}\\b`, 'g');
            result = result.replace(regex, (m, offset) => {
                return this.isInString(result, offset) ? m : item.new;
            });
            this.stats.variables++;
        }

        if (this.stats.variables > 0) {
            this.logs.push(`🔤 Renamed ${this.stats.variables} variables`);
        }
        return result;
    }

    // ====== TRANSFORM 3: Encode Strings ======
    encodeStrings(code) {
        if (this.preset === 'performance') return code;

        let result = '';
        let i = 0;

        while (i < code.length) {
            // Double quote string
            if (code[i] === '"' && (i === 0 || code[i-1] !== '\\')) {
                let content = '';
                i++; // skip opening "
                while (i < code.length && !(code[i] === '"' && code[i-1] !== '\\')) {
                    content += code[i];
                    i++;
                }
                i++; // skip closing "

                // Encode if long enough and maxSecurity
                if (content.length >= 4 && this.preset === 'maxSecurity' && !/\\/.test(content)) {
                    const encoded = this.stringToCharCodes(content);
                    result += encoded;
                    this.stats.strings++;
                } else {
                    result += '"' + content + '"';
                }
            }
            // Single quote string
            else if (code[i] === "'" && (i === 0 || code[i-1] !== '\\')) {
                let content = '';
                i++;
                while (i < code.length && !(code[i] === "'" && code[i-1] !== '\\')) {
                    content += code[i];
                    i++;
                }
                i++;

                if (content.length >= 4 && this.preset === 'maxSecurity' && !/\\/.test(content)) {
                    const encoded = this.stringToCharCodes(content);
                    result += encoded;
                    this.stats.strings++;
                } else {
                    result += "'" + content + "'";
                }
            }
            else {
                result += code[i];
                i++;
            }
        }

        if (this.stats.strings > 0) {
            this.logs.push(`🔐 Encoded ${this.stats.strings} strings`);
        }
        return result;
    }

    // Convert string to string.char(...)
    stringToCharCodes(str) {
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            codes.push(str.charCodeAt(i));
        }
        return `string.char(${codes.join(',')})`;
    }

    // ====== TRANSFORM 4: Number Obfuscation ======
    obfuscateNumbers(code) {
        if (this.preset !== 'maxSecurity') return code;

        // Only obfuscate standalone numbers (not in variable names)
        let result = code.replace(/\b(\d+)\b/g, (match, num, offset) => {
            // Skip if inside string or part of variable name
            if (this.isInString(code, offset)) return match;
            
            const n = parseInt(num);
            if (isNaN(n) || n < 2 || n > 10000) return match;

            // Random math expression
            const methods = [
                () => `(${Math.floor(n/2)}+${n - Math.floor(n/2)})`,
                () => `(${n+10}-10)`,
                () => `(${n*2}/2)`,
                () => n <= 255 ? `(0x${n.toString(16)})` : match
            ];

            this.stats.numbers++;
            return methods[Math.floor(Math.random() * methods.length)]();
        });

        if (this.stats.numbers > 0) {
            this.logs.push(`🔢 Obfuscated ${this.stats.numbers} numbers`);
        }
        return result;
    }

    // ====== TRANSFORM 5: Dead Code Injection ======
    injectDeadCode(code) {
        if (this.preset !== 'maxSecurity') return code;

        const deadSnippets = [
            'local _dc1 = function() return nil end',
            'local _dc2 = (function() if false then return 0 end end)()',
            'local _dc3 = type(nil) == "nil" and nil or nil',
            'local _dc4 = select(1, nil)',
            'local _dc5 = rawget({}, 1)'
        ];

        // Insert 2-3 dead code snippets at random positions
        const lines = code.split('\n');
        const insertCount = Math.min(3, Math.floor(lines.length / 20) + 1);
        
        for (let i = 0; i < insertCount; i++) {
            const snippet = deadSnippets[Math.floor(Math.random() * deadSnippets.length)];
            const pos = Math.floor(Math.random() * (lines.length - 1)) + 1;
            lines.splice(pos, 0, snippet);
            this.stats.deadCode++;
        }

        if (this.stats.deadCode > 0) {
            this.logs.push(`💀 Injected ${this.stats.deadCode} dead code`);
        }
        return lines.join('\n');
    }

    // ====== TRANSFORM 6: Compress Whitespace ======
    compress(code) {
        let result = code;

        // Remove empty lines
        result = result.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => line.trim())
            .join('\n');

        // Multiple newlines to single
        result = result.replace(/\n{2,}/g, '\n');

        this.logs.push(`📦 Compressed whitespace`);
        return result;
    }

    // ====== TRANSFORM 7: Add Wrapper (Optional) ======
    addWrapper(code) {
        if (this.preset !== 'maxSecurity') return code;

        const wrapped = `(function()\n${code}\nend)()`;
        this.logs.push(`🎁 Added function wrapper`);
        return wrapped;
    }

    // ====== MAIN OBFUSCATE ======
    obfuscate(source) {
        let code = source;

        // Apply transforms in order
        code = this.removeComments(code);
        code = this.renameVariables(code);
        code = this.encodeStrings(code);
        code = this.obfuscateNumbers(code);
        code = this.injectDeadCode(code);
        code = this.compress(code);
        code = this.addWrapper(code);

        // Generate header
        const presetEmoji = { performance: '⚡', balanced: '⚖️', maxSecurity: '🔒' };
        const header = [
            '--[[ ══════════════════════════════════════════',
            `     🛡️ Protected by LuaGuard v2.0`,
            `     📋 Preset: ${presetEmoji[this.preset]} ${this.preset}`,
            `     📅 Date: ${new Date().toISOString()}`,
            '     ══════════════════════════════════════════ ]]',
            ''
        ].join('\n');

        return {
            code: header + code,
            logs: this.logs,
            stats: this.stats
        };
    }
}

// ==========================================
// WEB SERVER (Keep Alive)
// ==========================================
const app = express();
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>LuaGuard Bot</title>
        <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: #1a1a2e; color: white; }
            h1 { color: #00ff88; }
            .status { color: #00ff88; font-size: 24px; }
            .info { color: #888; margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>🛡️ LuaGuard Obfuscator</h1>
        <p class="status">✅ Bot is Online!</p>
        <p class="info">Use /obfuscate in Discord to protect your scripts</p>
        <p class="info">Phase 2 - Enhanced Protection</p>
    </body>
    </html>
    `);
});
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web Server Running'));

// ==========================================
// BOT SETUP
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('\n╔════════════════════════════════════════╗');
console.log('║      🛡️ LuaGuard Bot v2.0 (Phase 2)     ║');
console.log('╠════════════════════════════════════════╣');
console.log(`║ TOKEN:     ${TOKEN ? '✅ Loaded' : '❌ Missing'}                   ║`);
console.log(`║ CLIENT_ID: ${CLIENT_ID ? '✅ ' + CLIENT_ID.slice(0,10) + '...' : '❌ Missing'}       ║`);
console.log('╚════════════════════════════════════════╝\n');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('🛡️ Protect your Lua/Luau script')
        .addAttachmentOption(o => o
            .setName('file')
            .setDescription('Upload .lua, .luau, or .txt file')
            .setRequired(true))
        .addStringOption(o => o
            .setName('preset')
            .setDescription('Protection level')
            .addChoices(
                { name: '⚡ Performance - Fast, light protection', value: 'performance' },
                { name: '⚖️ Balanced - Recommended for most scripts', value: 'balanced' },
                { name: '🔒 Max Security - Heavy obfuscation', value: 'maxSecurity' }
            )),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📖 Show bot help and features'),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Check bot latency')
].map(c => c.toJSON());

// Register Commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ Logged in as: ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} servers\n`);
    
    client.user.setActivity('/obfuscate | Phase 2', { type: ActivityType.Watching });

    if (!CLIENT_ID) {
        console.log('❌ CLIENT_ID missing - commands not registered!');
        return;
    }

    try {
        console.log('🔄 Registering slash commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commands registered successfully!\n');
    } catch (e) {
        console.log('❌ Failed to register:', e.message);
    }
});

// ==========================================
// INTERACTION HANDLER
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // /ping
    if (interaction.commandName === 'ping') {
        const ping = Date.now() - interaction.createdTimestamp;
        return interaction.reply(`🏓 Pong! Latency: **${ping}ms** | API: **${client.ws.ping}ms**`);
    }

    // /help
    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ LuaGuard Obfuscator - Help')
            .setDescription('Protect your Roblox Lua scripts with advanced obfuscation!')
            .addFields(
                { name: '📌 Command', value: '`/obfuscate` - Upload and protect a script', inline: false },
                { name: '⚡ Performance', value: 'Fast processing, minimal changes\n• Comment removal\n• Basic compression', inline: true },
                { name: '⚖️ Balanced', value: 'Recommended for most\n• Variable renaming\n• Comment removal\n• Compression', inline: true },
                { name: '🔒 Max Security', value: 'Maximum protection\n• All balanced features\n• String encoding\n• Number obfuscation\n• Dead code injection\n• Function wrapper', inline: true },
                { name: '📁 Supported Files', value: '`.lua` `.luau` `.txt`', inline: true },
                { name: '📏 Max Size', value: '2 MB', inline: true },
                { name: '🎮 Compatibility', value: 'Roblox Executors', inline: true }
            )
            .setFooter({ text: 'LuaGuard v2.0 • Phase 2' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // /obfuscate
    if (interaction.commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        // Validate extension
        const validExt = ['.lua', '.luau', '.txt'];
        if (!validExt.some(ext => file.name.toLowerCase().endsWith(ext))) {
            return interaction.reply({ 
                content: '❌ **Invalid file!** Please upload `.lua`, `.luau`, or `.txt` file.', 
                ephemeral: true 
            });
        }

        // Validate size
        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({ 
                content: '❌ **File too large!** Maximum size is 2MB.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        try {
            // Download file
            const response = await axios.get(file.url, { responseType: 'arraybuffer' });
            const source = response.data.toString('utf-8');

            if (!source.trim()) {
                return interaction.editReply('❌ **Error:** File is empty!');
            }

            // Obfuscate
            const startTime = Date.now();
            const obfuscator = new LuaGuardObfuscator(preset);
            const result = obfuscator.obfuscate(source);
            const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

            // Create output
            const outputBuffer = Buffer.from(result.code, 'utf-8');
            const outputName = file.name.replace(/\.(lua|luau|txt)$/i, '_protected.lua');
            const attachment = new AttachmentBuilder(outputBuffer, { name: outputName });

            // Calculate stats
            const sizeChange = ((result.code.length - source.length) / source.length * 100).toFixed(1);
            const sizeIcon = sizeChange > 0 ? '📈' : '📉';

            // Embed
            const presetEmoji = { performance: '⚡', balanced: '⚖️', maxSecurity: '🔒' };
            const presetColor = { performance: 0x57F287, balanced: 0x5865F2, maxSecurity: 0xED4245 };

            const embed = new EmbedBuilder()
                .setColor(presetColor[preset])
                .setTitle('✅ Obfuscation Complete!')
                .setDescription(`Your script has been protected with **${presetEmoji[preset]} ${preset}** preset.`)
                .addFields(
                    { name: '📁 Input', value: `\`${file.name}\``, inline: true },
                    { name: '📄 Output', value: `\`${outputName}\``, inline: true },
                    { name: '⏱️ Time', value: `\`${processTime}s\``, inline: true },
                    { name: '📊 Original', value: `\`${source.length.toLocaleString()} bytes\``, inline: true },
                    { name: `${sizeIcon} Result`, value: `\`${result.code.length.toLocaleString()} bytes\``, inline: true },
                    { name: '📐 Change', value: `\`${sizeChange}%\``, inline: true },
                    { name: '🔧 Transforms Applied', value: result.logs.join('\n') || 'None', inline: false }
                )
                .setFooter({ text: `LuaGuard v2.0 • Phase 2 • Job ID: ${Date.now().toString(36)}` })
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });

        } catch (error) {
            console.error('Obfuscation error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Obfuscation Failed')
                .setDescription(`\`\`\`${error.message}\`\`\``)
                .setFooter({ text: 'Please try again or contact support' });

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
});

// Start Bot
if (TOKEN) {
    client.login(TOKEN).catch(e => console.error('❌ Login failed:', e.message));
} else {
    console.error('❌ Cannot start: DISCORD_TOKEN is missing!');
            }
