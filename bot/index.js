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
// LUAGUARD STABLE OBFUSCATOR
// ==========================================
class LuaGuard {
    constructor(preset) {
        this.preset = preset;
        this.counter = 0;
        this.varMap = new Map();
        this.logs = [];
    }

    // Generate Hex Name
    hexName() {
        return '_0x' + (this.counter++).toString(16).toUpperCase().padStart(4, '0');
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
            // Long string
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

    // 1. Remove Comments
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

    // 2. Rename Variables
    renameVars(code) {
        if (this.preset === 'performance') return code;

        let result = code;
        const vars = [];

        // Local declarations
        const localRe = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let m;
        while ((m = localRe.exec(code)) !== null) {
            const name = m[1];
            if (!PROTECTED.has(name) && !this.varMap.has(name)) {
                const newN = this.hexName();
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
                        const newN = this.hexName();
                        this.varMap.set(p, newN);
                        vars.push({ old: p, new: newN });
                    }
                }
            }
        }

        // For loop variables
        const forRe = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g;
        while ((m = forRe.exec(code)) !== null) {
            const loopVars = [m[1], m[2]].filter(Boolean);
            for (const v of loopVars) {
                if (!PROTECTED.has(v) && !this.varMap.has(v)) {
                    const newN = this.hexName();
                    this.varMap.set(v, newN);
                    vars.push({ old: v, new: newN });
                }
            }
        }

        // Sort by length (longest first) to avoid partial replacement
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

    // 3. Encode Strings (SAFE - Only long strings without escapes)
    encodeStrings(code) {
        if (this.preset !== 'maxSecurity') return code;

        let result = '';
        let i = 0;
        let encoded = 0;

        while (i < code.length) {
            // Check for string start
            if ((code[i] === '"' || code[i] === "'") && (i === 0 || code[i-1] !== '\\')) {
                const quote = code[i];
                let content = '';
                i++; // skip opening quote
                
                // Collect string content
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) {
                        // Keep escape sequences as-is
                        content += code[i] + code[i+1];
                        i += 2;
                    } else if (code[i] === quote) {
                        break;
                    } else {
                        content += code[i];
                        i++;
                    }
                }
                i++; // skip closing quote

                // Only encode if:
                // - Length > 4
                // - No escape sequences
                // - No special chars that might break
                const hasEscape = content.includes('\\');
                const hasNewline = content.includes('\n') || content.includes('\r');
                
                if (content.length > 4 && !hasEscape && !hasNewline) {
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

    // 4. Clean Whitespace (SAFE - Keep newlines)
    cleanWhitespace(code) {
        let lines = code.split('\n');
        
        // Trim each line and remove empty lines
        lines = lines.map(l => l.trim()).filter(l => l !== '');
        
        this.logs.push('Cleaned whitespace');
        return lines.join('\n');
    }

    // 5. Add Wrapper
    addWrapper(code) {
        if (this.preset === 'performance') return code;
        
        this.logs.push('Added protection wrapper');
        return `do\n${code}\nend`;
    }

    // Generate Header
    getHeader() {
        const date = new Date().toISOString().split('T')[0];
        const presetNames = {
            'performance': 'Performance',
            'balanced': 'Balanced',
            'maxSecurity': 'Maximum Security'
        };
        
        return [
            '-- //////////////////////////////////////////////////////////////////',
            '-- // LuaGuard Obfuscator v2.1',
            `-- // Preset: ${presetNames[this.preset]}`,
            `-- // Protected: ${date}`,
            '-- // Roblox Executor Compatible',
            '-- //////////////////////////////////////////////////////////////////',
            ''
        ].join('\n');
    }

    // Main obfuscate function
    obfuscate(source) {
        let code = source;

        // Apply transforms in safe order
        code = this.removeComments(code);
        code = this.renameVars(code);
        code = this.encodeStrings(code);
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
        <head><title>LuaGuard</title></head>
        <body style="font-family:Arial;background:#1a1a2e;color:#fff;text-align:center;padding:50px">
            <h1>LuaGuard Bot v2.1</h1>
            <p style="color:#0f0">Online</p>
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

console.log('\n=== LuaGuard Bot v2.1 ===');
console.log(`Token: ${TOKEN ? 'OK' : 'MISSING'}`);
console.log(`Client: ${CLIENT_ID || 'MISSING'}\n`);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Commands
const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Protect your Lua script')
        .addAttachmentOption(o => 
            o.setName('file')
             .setDescription('Upload .lua file')
             .setRequired(true))
        .addStringOption(o => 
            o.setName('preset')
             .setDescription('Protection level')
             .addChoices(
                 { name: 'Performance - Fast & Light', value: 'performance' },
                 { name: 'Balanced - Recommended', value: 'balanced' },
                 { name: 'Max Security - Full Protection', value: 'maxSecurity' }
             )),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information')
].map(c => c.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`Logged in as: ${client.user.tag}`);
    client.user.setActivity('/obfuscate', { type: ActivityType.Listening });

    if (CLIENT_ID) {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('Commands registered!\n');
        } catch (e) {
            console.error('Register error:', e.message);
        }
    }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // Help command
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('LuaGuard Obfuscator')
            .setDescription('Protect your Roblox Lua scripts!')
            .addFields(
                { 
                    name: 'Performance', 
                    value: '- Comment removal\n- Whitespace cleanup', 
                    inline: true 
                },
                { 
                    name: 'Balanced', 
                    value: '- All Performance features\n- Variable renaming', 
                    inline: true 
                },
                { 
                    name: 'Max Security', 
                    value: '- All Balanced features\n- String encoding', 
                    inline: true 
                }
            )
            .setFooter({ text: 'LuaGuard v2.1 - Stable Release' });
        
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

        // Validate file size (max 2MB)
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
            const obfuscator = new LuaGuard(preset);
            const result = obfuscator.obfuscate(source);
            const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

            // Create output file
            const outputBuffer = Buffer.from(result.code, 'utf-8');
            const outputName = file.name.replace(/\.(lua|luau|txt)$/i, '_protected.lua');
            const attachment = new AttachmentBuilder(outputBuffer, { name: outputName });

            // Calculate size change
            const originalSize = source.length;
            const newSize = result.code.length;
            const sizeChange = ((newSize / originalSize) * 100).toFixed(0);

            // Create embed
            const presetColors = {
                'performance': 0x57F287,
                'balanced': 0x5865F2,
                'maxSecurity': 0xED4245
            };

            const embed = new EmbedBuilder()
                .setColor(presetColors[preset])
                .setTitle('Obfuscation Complete!')
                .addFields(
                    { name: 'Input', value: `\`${file.name}\``, inline: true },
                    { name: 'Output', value: `\`${outputName}\``, inline: true },
                    { name: 'Preset', value: preset, inline: true },
                    { name: 'Original Size', value: `${originalSize.toLocaleString()} bytes`, inline: true },
                    { name: 'New Size', value: `${newSize.toLocaleString()} bytes`, inline: true },
                    { name: 'Ratio', value: `${sizeChange}%`, inline: true },
                    { name: 'Process Time', value: `${processTime}s`, inline: true },
                    { 
                        name: 'Transforms Applied', 
                        value: result.logs.map(l => `> ${l}`).join('\n') || '> None', 
                        inline: false 
                    }
                )
                .setFooter({ text: 'LuaGuard v2.1 | Roblox Compatible' })
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });

        } catch (error) {
            console.error('Error:', error);
            await interaction.editReply(`**Error:** ${error.message}`);
        }
    }
});

// Start bot
if (TOKEN) {
    client.login(TOKEN);
} else {
    console.error('No token provided!');
}
