require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, 
    SlashCommandBuilder, ActivityType, EmbedBuilder, 
    AttachmentBuilder
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
// PROTECTED NAMES
// ==========================================
const PROTECTED = new Set([
    'game','workspace','script','plugin','shared','Enum','Instance',
    'Vector3','Vector2','CFrame','Color3','BrickColor','UDim','UDim2',
    'Ray','TweenInfo','Region3','Rect','NumberRange','NumberSequence',
    'ColorSequence','PhysicalProperties','Random','Axes','Faces',
    'typeof','require','spawn','delay','wait','tick','time','warn',
    'settings','UserSettings','version','printidentity','elapsedTime',
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
    'setclipboard','setfflag','getnamecallmethod','task',
    '_G','_VERSION','assert','collectgarbage','coroutine','debug',
    'dofile','error','gcinfo','getmetatable','setmetatable',
    'ipairs','pairs','next','load','loadfile','newproxy',
    'os','io','pcall','xpcall','print','rawequal','rawget','rawset','rawlen',
    'select','string','table','math','bit32','utf8',
    'tonumber','tostring','type','unpack',
    'and','break','do','else','elseif','end','false','for','function',
    'goto','if','in','local','nil','not','or','repeat','return',
    'then','true','until','while','continue',
    'self','this','Callback','Connect','Wait','Fire','Value',
    'Name','Parent','Text','Title','Duration','Enabled','CurrentValue',
    'Range','Increment','Options','CurrentOption','Color'
]);

// ==========================================
// LUAGUARD ADVANCED OBFUSCATOR v3.0
// ==========================================
class LuaGuardAdvanced {
    constructor(preset) {
        this.preset = preset;
        this.counter = 0;
        this.varMap = new Map();
        this.stringTable = [];
        this.logs = [];
    }

    // Generate unique hex name
    hexName(prefix = '') {
        const hex = (this.counter++).toString(16).toUpperCase().padStart(4, '0');
        return `_${prefix}0x${hex}`;
    }

    // Random integer
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Check if position is inside string
    isInString(code, pos) {
        let inStr = false, q = '';
        for (let i = 0; i < pos && i < code.length; i++) {
            const c = code[i], prev = i > 0 ? code[i-1] : '';
            if ((c === '"' || c === "'") && prev !== '\\') {
                if (!inStr) { inStr = true; q = c; }
                else if (c === q) { inStr = false; }
            }
            if (c === '[' && code[i+1] === '[' && !inStr) {
                const end = code.indexOf(']]', i+2);
                if (end > 0 && pos > i && pos < end+2) return true;
            }
        }
        return inStr;
    }

    // Encode string to string.char()
    encodeStr(str) {
        if (!str || str.length === 0) return '""';
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            codes.push(str.charCodeAt(i));
        }
        return `string.char(${codes.join(',')})`;
    }

    // Convert integer to math expression
    numToMath(num) {
        if (num < 10 || num > 10000) return num.toString();
        
        const methods = [
            // Addition
            () => {
                const a = this.randInt(1, num - 1);
                const b = num - a;
                return `(${a}+${b})`;
            },
            // Multiplication
            () => {
                for (let i = 2; i <= Math.sqrt(num); i++) {
                    if (num % i === 0) {
                        return `(${i}*${num/i})`;
                    }
                }
                return null;
            },
            // Subtraction
            () => {
                const a = num + this.randInt(1, 100);
                const b = a - num;
                return `(${a}-${b})`;
            },
            // Hex
            () => `0x${num.toString(16).toUpperCase()}`
        ];

        // Try random method
        for (let i = 0; i < 3; i++) {
            const method = methods[this.randInt(0, methods.length - 1)];
            const result = method();
            if (result) return result;
        }
        return num.toString();
    }

    // ======================================
    // TRANSFORM 1: Remove Comments
    // ======================================
    removeComments(code) {
        let result = code;
        let count = 0;

        // Multi-line
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => { 
            count++; 
            return ''; 
        });

        // Single-line
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

        if (count > 0) this.logs.push(`Removed ${count} comments`);
        return result;
    }

    // ======================================
    // TRANSFORM 2: Rename Variables
    // ======================================
    renameVars(code) {
        if (this.preset === 'performance') return code;

        let result = code;
        const vars = [];

        // Collect all variable declarations
        const patterns = [
            /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
            /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g
        ];

        // Local declarations
        let m;
        while ((m = patterns[0].exec(code)) !== null) {
            const name = m[1];
            if (!PROTECTED.has(name) && !this.varMap.has(name)) {
                const newN = this.hexName('L');
                this.varMap.set(name, newN);
                vars.push({ old: name, new: newN });
            }
        }

        // Function parameters
        const funcRe = /function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
        while ((m = funcRe.exec(code)) !== null) {
            if (m[1].trim()) {
                const params = m[1].split(',').map(p => p.trim()).filter(p => p && p !== '...');
                for (const p of params) {
                    if (!PROTECTED.has(p) && !this.varMap.has(p)) {
                        const newN = this.hexName('P');
                        this.varMap.set(p, newN);
                        vars.push({ old: p, new: newN });
                    }
                }
            }
        }

        // For loop variables
        while ((m = patterns[1].exec(code)) !== null) {
            [m[1], m[2]].filter(Boolean).forEach(v => {
                if (!PROTECTED.has(v) && !this.varMap.has(v)) {
                    const newN = this.hexName('I');
                    this.varMap.set(v, newN);
                    vars.push({ old: v, new: newN });
                }
            });
        }

        // Sort by length (longest first)
        vars.sort((a, b) => b.old.length - a.old.length);

        // Replace all occurrences
        for (const v of vars) {
            const re = new RegExp('\\b' + v.old + '\\b', 'g');
            result = result.replace(re, (match, offset) => {
                return this.isInString(result, offset) ? match : v.new;
            });
        }

        if (vars.length > 0) this.logs.push(`Renamed ${vars.length} variables`);
        return result;
    }

    // ======================================
    // TRANSFORM 3: Encode Strings
    // ======================================
    encodeStrings(code) {
        if (this.preset === 'performance') return code;

        let result = '';
        let i = 0;
        let encoded = 0;

        while (i < code.length) {
            if ((code[i] === '"' || code[i] === "'") && (i === 0 || code[i-1] !== '\\')) {
                const quote = code[i];
                let content = '';
                i++;
                
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) {
                        content += code[i] + code[i+1];
                        i += 2;
                    } else if (code[i] === quote) {
                        break;
                    } else {
                        content += code[i];
                        i++;
                    }
                }
                i++;

                // Encode conditions
                const hasEscape = content.includes('\\');
                const isSafe = content.length > 4 && !hasEscape;
                
                if (isSafe && this.preset === 'maxSecurity') {
                    result += this.encodeStr(content);
                    encoded++;
                } else {
                    result += quote + content + quote;
                }
            } else {
                result += code[i];
                i++;
            }
        }

        if (encoded > 0) this.logs.push(`Encoded ${encoded} strings`);
        return result;
    }

    // ======================================
    // TRANSFORM 4: Number Obfuscation (Safe)
    // ======================================
    obfuscateNumbers(code) {
        if (this.preset !== 'maxSecurity') return code;

        let count = 0;
        
        // Only match whole integers (not decimals, not in variable names)
        const result = code.replace(/(?<![.\w])(\d+)(?![.\w])/g, (match, num, offset) => {
            // Skip if inside string
            if (this.isInString(code, offset)) return match;
            
            const n = parseInt(num);
            
            // Only process safe integers
            if (isNaN(n) || n < 10 || n > 10000) return match;
            
            // Skip if it looks like it's part of a decimal (check previous char)
            const prevChar = offset > 0 ? code[offset - 1] : '';
            if (prevChar === '.') return match;
            
            count++;
            return this.numToMath(n);
        });

        if (count > 0) this.logs.push(`Obfuscated ${count} numbers`);
        return result;
    }

    // ======================================
    // TRANSFORM 5: Dead Code Injection
    // ======================================
    injectDeadCode(code) {
        if (this.preset !== 'maxSecurity') return code;

        const deadSnippets = [
            `local _dead${this.counter++} = nil`,
            `local _null${this.counter++} = false`,
            `local _void${this.counter++} = function() end`,
            `local _fake${this.counter++} = {}`,
            `if false then local _ = 0 end`
        ];

        // Select 2-4 random snippets
        const count = this.randInt(2, 4);
        const selected = [];
        for (let i = 0; i < count; i++) {
            const idx = this.randInt(0, deadSnippets.length - 1);
            selected.push(deadSnippets[idx]);
        }

        this.logs.push(`Injected ${count} dead code blocks`);
        return selected.join('\n') + '\n' + code;
    }

    // ======================================
    // TRANSFORM 6: Control Flow Obfuscation
    // ======================================
    addControlFlow(code) {
        if (this.preset !== 'maxSecurity') return code;

        const key = this.randInt(100, 999);
        const check = `local _cfkey = ${key}`;
        const verify = `if _cfkey ~= ${key} then return end`;

        this.logs.push('Added control flow check');
        return check + '\n' + verify + '\n' + code;
    }

    // ======================================
    // TRANSFORM 7: Clean Whitespace
    // ======================================
    cleanWhitespace(code) {
        let lines = code.split('\n');
        lines = lines.map(l => l.trim()).filter(l => l !== '');
        this.logs.push('Cleaned structure');
        return lines.join('\n');
    }

    // ======================================
    // TRANSFORM 8: Add Wrapper
    // ======================================
    addWrapper(code) {
        if (this.preset === 'performance') return code;
        this.logs.push('Added protection wrapper');
        return `do\n${code}\nend`;
    }

    // ======================================
    // GENERATE HEADER
    // ======================================
    getHeader() {
        const date = new Date().toISOString().split('T')[0];
        const id = Math.random().toString(36).substring(2, 10).toUpperCase();
        const presetNames = {
            'performance': 'Performance',
            'balanced': 'Balanced',
            'maxSecurity': 'Maximum Security'
        };
        
        return [
            '-- //////////////////////////////////////////////////////////////////',
            '-- //  _                  _____                     _',
            '-- // | |   _   _  __ _  / ____|_   _  __ _ _ __ __| |',
            '-- // | |  | | | |/ _` || |  __| | | |/ _` | \'__/ _` |',
            '-- // | |__| |_| | (_| || |_|_ | |_| | (_| | | | (_| |',
            '-- // |_____\\__,_|\\__,_| \\_____|\\__,_|\\__,_|_|  \\__,_|',
            '-- //',
            '-- // LuaGuard Obfuscator v3.0',
            `-- // Preset: ${presetNames[this.preset]}`,
            `-- // ID: ${id}`,
            `-- // Date: ${date}`,
            '-- // Roblox Executor Compatible',
            '-- //////////////////////////////////////////////////////////////////',
            ''
        ].join('\n');
    }

    // ======================================
    // MAIN OBFUSCATE FUNCTION
    // ======================================
    obfuscate(source) {
        let code = source;

        // Apply transforms in order
        code = this.removeComments(code);
        code = this.renameVars(code);
        code = this.encodeStrings(code);
        code = this.obfuscateNumbers(code);
        code = this.injectDeadCode(code);
        code = this.addControlFlow(code);
        code = this.cleanWhitespace(code);
        code = this.addWrapper(code);

        return {
            code: this.getHeader() + code,
            logs: this.logs
        };
    }
}

// ==========================================
// WEB SERVER
// ==========================================
const app = express();
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>LuaGuard v3.0</title>
            <style>
                body { font-family: 'Segoe UI', Arial; background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; text-align: center; padding: 50px; min-height: 100vh; margin: 0; }
                h1 { font-size: 2.5em; margin-bottom: 10px; }
                .status { color: #00ff88; font-size: 1.2em; }
                .version { color: #888; margin-top: 20px; }
                .box { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; max-width: 400px; margin: 30px auto; }
            </style>
        </head>
        <body>
            <h1>LuaGuard Bot</h1>
            <p class="status">Status: Online</p>
            <div class="box">
                <p>Advanced Lua Obfuscator</p>
                <p>Use <code>/obfuscate</code> in Discord</p>
            </div>
            <p class="version">Version 3.0 - Phase 3</p>
        </body>
        </html>
    `);
});
app.listen(process.env.PORT || 3000, () => console.log('[Server] Running'));

// ==========================================
// DISCORD BOT
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('\n╔══════════════════════════════════════╗');
console.log('║     LuaGuard Bot v3.0 - Phase 3      ║');
console.log('╠══════════════════════════════════════╣');
console.log(`║  Token:    ${TOKEN ? 'OK' : 'MISSING'}                       ║`);
console.log(`║  Client:   ${CLIENT_ID ? 'OK' : 'MISSING'}                       ║`);
console.log('╚══════════════════════════════════════╝\n');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Commands
const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Protect your Lua script with advanced obfuscation')
        .addAttachmentOption(o => 
            o.setName('file')
             .setDescription('Upload .lua, .luau, or .txt file')
             .setRequired(true))
        .addStringOption(o => 
            o.setName('preset')
             .setDescription('Protection level')
             .setRequired(false)
             .addChoices(
                 { name: 'Performance - Fast & Light', value: 'performance' },
                 { name: 'Balanced - Recommended', value: 'balanced' },
                 { name: 'Max Security - Full Protection', value: 'maxSecurity' }
             )),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help and feature information'),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency')
].map(c => c.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`[Bot] Logged in as: ${client.user.tag}`);
    client.user.setActivity('/obfuscate | v3.0', { type: ActivityType.Watching });

    if (CLIENT_ID) {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('[Bot] Commands registered!\n');
        } catch (e) {
            console.error('[Bot] Register error:', e.message);
        }
    }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // Ping command
    if (commandName === 'ping') {
        const latency = Date.now() - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        return interaction.reply(`Pong! Latency: ${latency}ms | API: ${apiLatency}ms`);
    }

    // Help command
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('LuaGuard Obfuscator v3.0')
            .setDescription('Advanced Lua script protection for Roblox')
            .addFields(
                { 
                    name: 'Performance', 
                    value: '```\n- Comment removal\n- Whitespace cleanup\n```', 
                    inline: true 
                },
                { 
                    name: 'Balanced', 
                    value: '```\n- All Performance\n- Variable renaming\n- String encoding\n```', 
                    inline: true 
                },
                { 
                    name: 'Max Security', 
                    value: '```\n- All Balanced\n- Number obfuscation\n- Dead code injection\n- Control flow\n```', 
                    inline: true 
                },
                {
                    name: 'Supported Files',
                    value: '`.lua` `.luau` `.txt`',
                    inline: true
                },
                {
                    name: 'Max Size',
                    value: '2 MB',
                    inline: true
                },
                {
                    name: 'Compatibility',
                    value: 'All Roblox Executors',
                    inline: true
                }
            )
            .setFooter({ text: 'LuaGuard v3.0 | Phase 3' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // Obfuscate command
    if (commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        // Validate file type
        const validExtensions = ['.lua', '.luau', '.txt'];
        const hasValidExt = validExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
        );
        
        if (!hasValidExt) {
            return interaction.reply({ 
                content: '**Error:** Only .lua, .luau, or .txt files are allowed!', 
                ephemeral: true 
            });
        }

        // Validate file size
        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({ 
                content: '**Error:** File size must be under 2MB!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        try {
            // Download file
            const response = await axios.get(file.url, { responseType: 'arraybuffer' });
            const source = response.data.toString('utf-8');

            if (!source.trim()) {
                return interaction.editReply('**Error:** File is empty!');
            }

            // Obfuscate
            const startTime = Date.now();
            const obfuscator = new LuaGuardAdvanced(preset);
            const result = obfuscator.obfuscate(source);
            const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

            // Create output file
            const outputBuffer = Buffer.from(result.code, 'utf-8');
            const outputName = file.name.replace(/\.(lua|luau|txt)$/i, '_protected.lua');
            const attachment = new AttachmentBuilder(outputBuffer, { name: outputName });

            // Calculate stats
            const originalSize = source.length;
            const newSize = result.code.length;
            const ratio = ((newSize / originalSize) * 100).toFixed(0);

            // Preset colors and icons
            const presetInfo = {
                'performance': { color: 0x57F287, icon: '⚡' },
                'balanced': { color: 0x5865F2, icon: '⚖️' },
                'maxSecurity': { color: 0xED4245, icon: '🔒' }
            };

            const embed = new EmbedBuilder()
                .setColor(presetInfo[preset].color)
                .setTitle(`${presetInfo[preset].icon} Obfuscation Complete!`)
                .setDescription('Your script has been protected successfully.')
                .addFields(
                    { name: '📄 Input', value: `\`${file.name}\``, inline: true },
                    { name: '📦 Output', value: `\`${outputName}\``, inline: true },
                    { name: '⚙️ Preset', value: preset, inline: true },
                    { name: '📊 Original', value: `${originalSize.toLocaleString()} bytes`, inline: true },
                    { name: '📈 Result', value: `${newSize.toLocaleString()} bytes`, inline: true },
                    { name: '📐 Ratio', value: `${ratio}%`, inline: true },
                    { name: '⏱️ Time', value: `${processTime}s`, inline: true },
                    { 
                        name: '🔧 Transforms Applied', 
                        value: '```\n' + result.logs.map(l => `✓ ${l}`).join('\n') + '\n```', 
                        inline: false 
                    }
                )
                .setFooter({ text: 'LuaGuard v3.0 | Roblox Compatible' })
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });

        } catch (error) {
            console.error('[Error]', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Obfuscation Failed')
                .setDescription(`\`\`\`${error.message}\`\`\``)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
});

// Start bot
if (TOKEN) {
    client.login(TOKEN).catch(e => console.error('[Bot] Login failed:', e.message));
} else {
    console.error('[Bot] No token provided!');
}
