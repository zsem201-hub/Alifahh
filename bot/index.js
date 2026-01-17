require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, 
    SlashCommandBuilder, ActivityType, EmbedBuilder, 
    AttachmentBuilder 
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
// 1. OBFUSCATOR PHASE 1 (FIXED & TESTED)
// ==========================================

// Daftar nama yang TIDAK BOLEH diganti (Roblox & Lua globals)
const PROTECTED_NAMES = new Set([
    // Roblox
    'game', 'workspace', 'script', 'Instance', 'Vector3', 'Vector2', 
    'CFrame', 'Color3', 'BrickColor', 'UDim', 'UDim2', 'Enum', 'Ray',
    'TweenInfo', 'NumberSequence', 'ColorSequence', 'Random', 'Region3',
    'typeof', 'require', 'spawn', 'delay', 'wait', 'task', 'tick', 'time',
    // Executor globals
    'getgenv', 'getrenv', 'getfenv', 'setfenv', 'loadstring', 'pcall', 
    'xpcall', 'rconsoleprint', 'printidentity', 'hookfunction', 'Drawing',
    'syn', 'fluxus', 'KRNL_LOADED', 'request', 'http_request', 'HttpGet',
    'fireclickdetector', 'firesignal', 'getconnections', 'gethui',
    'setsimulationradius', 'isnetworkowner', 'identifyexecutor',
    // Lua built-in
    '_G', '_VERSION', 'assert', 'collectgarbage', 'coroutine', 'debug',
    'error', 'getmetatable', 'setmetatable', 'ipairs', 'pairs', 'next',
    'load', 'print', 'warn', 'rawequal', 'rawget', 'rawset', 'rawlen',
    'select', 'tonumber', 'tostring', 'type', 'unpack', 'table', 'string',
    'math', 'bit32', 'utf8', 'os', 'io', 'newproxy',
    // Lua keywords
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 
    'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 
    'repeat', 'return', 'then', 'true', 'until', 'while', 'continue',
    // Common patterns
    'self', 'this'
]);

class LuaObfuscator {
    constructor(preset = 'balanced') {
        this.preset = preset;
        this.varCounter = 0;
        this.varMap = new Map();
        this.stats = { 
            varsRenamed: 0, 
            commentsRemoved: 0, 
            stringsEncoded: 0 
        };
    }

    // Generate nama variable baru
    generateVarName() {
        const id = this.varCounter++;
        return `_0x${id.toString(16).padStart(4, '0')}`;
    }

    // Cek apakah posisi tertentu ada di dalam string
    isInsideString(code, position) {
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < position && i < code.length; i++) {
            const char = code[i];
            const prevChar = i > 0 ? code[i - 1] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }
            
            // Long string [[ ]]
            if (char === '[' && code[i + 1] === '[' && !inString) {
                const endPos = code.indexOf(']]', i + 2);
                if (endPos !== -1 && position > i && position < endPos + 2) {
                    return true;
                }
            }
        }
        
        return inString;
    }

    // 1. Hapus Comments
    removeComments(code) {
        let result = code;
        let count = 0;

        // Hapus multi-line comments --[[ ... ]]
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => {
            count++;
            return '';
        });

        // Hapus single-line comments (hati-hati dengan string)
        const lines = result.split('\n');
        const cleanLines = lines.map(line => {
            let inString = false;
            let stringChar = '';
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';
                
                if ((char === '"' || char === "'") && prevChar !== '\\') {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                    }
                }
                
                if (char === '-' && line[i + 1] === '-' && !inString) {
                    if (line[i + 2] !== '[') {
                        count++;
                        return line.substring(0, i).trimEnd();
                    }
                }
            }
            
            return line;
        });

        this.stats.commentsRemoved = count;
        return cleanLines.join('\n');
    }

    // 2. Rename Variables
    renameVariables(code) {
        let result = code;
        
        // Cari semua deklarasi: local varName
        const localPattern = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        const declarations = [];
        let match;

        while ((match = localPattern.exec(code)) !== null) {
            const varName = match[1];
            if (!PROTECTED_NAMES.has(varName) && !this.varMap.has(varName)) {
                const newName = this.generateVarName();
                this.varMap.set(varName, newName);
                declarations.push({ old: varName, new: newName });
            }
        }

        // Cari parameter function
        const funcPattern = /function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
        while ((match = funcPattern.exec(code)) !== null) {
            if (match[1].trim()) {
                const params = match[1].split(',').map(p => p.trim());
                for (const param of params) {
                    if (param && param !== '...' && !PROTECTED_NAMES.has(param) && !this.varMap.has(param)) {
                        const newName = this.generateVarName();
                        this.varMap.set(param, newName);
                        declarations.push({ old: param, new: newName });
                    }
                }
            }
        }

        // Cari for loop variables
        const forPattern = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*(?:=|in)/g;
        while ((match = forPattern.exec(code)) !== null) {
            const vars = [match[1], match[2]].filter(Boolean);
            for (const v of vars) {
                if (!PROTECTED_NAMES.has(v) && !this.varMap.has(v)) {
                    const newName = this.generateVarName();
                    this.varMap.set(v, newName);
                    declarations.push({ old: v, new: newName });
                }
            }
        }

        // Replace semua variable (dari yang terpanjang dulu untuk hindari partial replace)
        const sortedDecls = declarations.sort((a, b) => b.old.length - a.old.length);
        
        for (const decl of sortedDecls) {
            const escapedOld = decl.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedOld}\\b`, 'g');
            
            result = result.replace(regex, (match, offset) => {
                if (this.isInsideString(result, offset)) {
                    return match;
                }
                return decl.new;
            });
        }

        this.stats.varsRenamed = this.varMap.size;
        return result;
    }

    // 3. Encode Strings (Metode Aman - Hex Escape)
    encodeStrings(code) {
        if (this.preset === 'performance') {
            return code; // Skip untuk performance mode
        }

        let result = '';
        let i = 0;
        let encoded = 0;

        while (i < code.length) {
            // Cek string dengan "
            if (code[i] === '"' && (i === 0 || code[i-1] !== '\\')) {
                let str = '"';
                i++;
                let content = '';
                
                while (i < code.length && !(code[i] === '"' && code[i-1] !== '\\')) {
                    content += code[i];
                    i++;
                }
                
                if (i < code.length) {
                    i++; // Skip closing "
                    
                    // Encode jika cukup panjang dan mode maxSecurity
                    if (content.length >= 3 && this.preset === 'maxSecurity') {
                        // Convert ke hex escape: \xNN
                        let hexStr = '"';
                        for (let j = 0; j < content.length; j++) {
                            const charCode = content.charCodeAt(j);
                            if (charCode < 128 && charCode >= 32 && content[j] !== '"' && content[j] !== '\\') {
                                hexStr += '\\x' + charCode.toString(16).padStart(2, '0');
                            } else {
                                hexStr += content[j];
                            }
                        }
                        hexStr += '"';
                        result += hexStr;
                        encoded++;
                    } else {
                        result += '"' + content + '"';
                    }
                } else {
                    result += '"' + content;
                }
            }
            // Cek string dengan '
            else if (code[i] === "'" && (i === 0 || code[i-1] !== '\\')) {
                let content = '';
                i++;
                
                while (i < code.length && !(code[i] === "'" && code[i-1] !== '\\')) {
                    content += code[i];
                    i++;
                }
                
                if (i < code.length) {
                    i++;
                    
                    if (content.length >= 3 && this.preset === 'maxSecurity') {
                        let hexStr = '"';
                        for (let j = 0; j < content.length; j++) {
                            const charCode = content.charCodeAt(j);
                            if (charCode < 128 && charCode >= 32 && content[j] !== '"' && content[j] !== '\\') {
                                hexStr += '\\x' + charCode.toString(16).padStart(2, '0');
                            } else {
                                hexStr += content[j];
                            }
                        }
                        hexStr += '"';
                        result += hexStr;
                        encoded++;
                    } else {
                        result += "'" + content + "'";
                    }
                } else {
                    result += "'" + content;
                }
            }
            else {
                result += code[i];
                i++;
            }
        }

        this.stats.stringsEncoded = encoded;
        return result;
    }

    // 4. Minify Whitespace
    minifyWhitespace(code) {
        let result = code;

        // Hapus baris kosong berlebih
        result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        // Trim setiap baris
        result = result.split('\n').map(line => line.trim()).filter(line => line).join('\n');

        // Untuk maxSecurity, gabungkan jadi lebih compact
        if (this.preset === 'maxSecurity') {
            // Hapus newline setelah keyword tertentu jika aman
            result = result.replace(/\n+/g, ' ');
            result = result.replace(/\s+/g, ' ');
            result = result.replace(/\s*([=+\-*\/%<>~,;{}()\[\]])\s*/g, '$1');
            result = result.replace(/\bfunction\b/g, 'function ');
            result = result.replace(/\blocal\b/g, 'local ');
            result = result.replace(/\breturn\b/g, 'return ');
            result = result.replace(/\bif\b/g, 'if ');
            result = result.replace(/\bthen\b/g, ' then ');
            result = result.replace(/\belse\b/g, ' else ');
            result = result.replace(/\belseif\b/g, ' elseif ');
            result = result.replace(/\bend\b/g, ' end ');
            result = result.replace(/\bdo\b/g, ' do ');
            result = result.replace(/\bfor\b/g, 'for ');
            result = result.replace(/\bwhile\b/g, 'while ');
            result = result.replace(/\bin\b/g, ' in ');
            result = result.replace(/\band\b/g, ' and ');
            result = result.replace(/\bor\b/g, ' or ');
            result = result.replace(/\bnot\b/g, 'not ');
        }

        return result;
    }

    // Main Obfuscate Function
    obfuscate(sourceCode) {
        let code = sourceCode;
        const logs = [];

        // Step 1: Remove Comments
        code = this.removeComments(code);
        if (this.stats.commentsRemoved > 0) {
            logs.push(`🧹 Removed ${this.stats.commentsRemoved} comments`);
        }

        // Step 2: Rename Variables
        code = this.renameVariables(code);
        if (this.stats.varsRenamed > 0) {
            logs.push(`🔤 Renamed ${this.stats.varsRenamed} variables`);
        }

        // Step 3: Encode Strings (hanya untuk balanced/maxSecurity)
        if (this.preset !== 'performance') {
            code = this.encodeStrings(code);
            if (this.stats.stringsEncoded > 0) {
                logs.push(`🔐 Encoded ${this.stats.stringsEncoded} strings`);
            }
        }

        // Step 4: Minify Whitespace
        const beforeLen = code.length;
        code = this.minifyWhitespace(code);
        const afterLen = code.length;
        const reduction = (((beforeLen - afterLen) / beforeLen) * 100).toFixed(1);
        logs.push(`📦 Minified (${reduction}% smaller)`);

        // Add header
        const header = `-- Protected by LuaGuard v1.0\n-- Preset: ${this.preset}\n-- github.com/user/luaguard\n\n`;

        return {
            code: header + code,
            logs: logs,
            stats: this.stats
        };
    }
}

// ==========================================
// 2. WEB SERVER (Keep Alive)
// ==========================================
const app = express();
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>LuaGuard Bot</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
            <h1>🛡️ LuaGuard Bot</h1>
            <p style="color:green;font-size:20px;">✅ Bot is Online!</p>
            <p>Use /obfuscate command in Discord</p>
        </body>
        </html>
    `);
});
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web Server Running'));

// ==========================================
// 3. BOT CONFIGURATION
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('\n========================================');
console.log('🔍 ENVIRONMENT CHECK');
console.log('========================================');
console.log(`DISCORD_TOKEN: ${TOKEN ? '✅ Found (' + TOKEN.length + ' chars)' : '❌ MISSING'}`);
console.log(`CLIENT_ID: ${CLIENT_ID ? '✅ Found (' + CLIENT_ID + ')' : '❌ MISSING'}`);
console.log('========================================\n');

if (!TOKEN) {
    console.error('❌ DISCORD_TOKEN is required!');
}
if (!CLIENT_ID) {
    console.error('❌ CLIENT_ID is required!');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Command Definition
const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('🛡️ Obfuscate Lua/Luau Script')
        .addAttachmentOption(opt => 
            opt.setName('file')
                .setDescription('Upload file .lua / .luau / .txt')
                .setRequired(true))
        .addStringOption(opt => 
            opt.setName('preset')
                .setDescription('Protection Level')
                .setRequired(false)
                .addChoices(
                    { name: '⚡ Performance - Fast, minimal changes', value: 'performance' },
                    { name: '⚖️ Balanced - Recommended', value: 'balanced' },
                    { name: '🔒 Max Security - Heavy obfuscation', value: 'maxSecurity' }
                )),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📖 Show help information')
].map(c => c.toJSON());

// Register Commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🤖 Bot logged in as: ${client.user.tag}`);
    client.user.setActivity('/obfuscate', { type: ActivityType.Listening });

    if (!CLIENT_ID) {
        console.error('❌ Cannot register commands: CLIENT_ID is missing!');
        return;
    }

    try {
        console.log('🔄 Registering slash commands...');
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log(`✅ Successfully registered ${data.length} commands!`);
    } catch (error) {
        console.error('❌ Failed to register commands:', error.message);
    }
});

// ==========================================
// 4. INTERACTION HANDLER
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // === HELP COMMAND ===
    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📖 LuaGuard Help')
            .setDescription('Protect your Lua/Luau scripts with obfuscation!')
            .addFields(
                { 
                    name: '🔹 /obfuscate', 
                    value: 'Upload a .lua file to obfuscate it.' 
                },
                { 
                    name: '⚡ Performance', 
                    value: 'Fast processing, minimal changes. Good for large scripts.' 
                },
                { 
                    name: '⚖️ Balanced', 
                    value: 'Recommended. Good protection with reasonable size.' 
                },
                { 
                    name: '🔒 Max Security', 
                    value: 'Maximum protection. Script will be heavily obfuscated.' 
                }
            )
            .setFooter({ text: 'LuaGuard Phase 1' });

        return interaction.reply({ embeds: [embed] });
    }

    // === OBFUSCATE COMMAND ===
    if (interaction.commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        // Validate file extension
        const validExt = ['.lua', '.luau', '.txt'];
        const hasValidExt = validExt.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!hasValidExt) {
            return interaction.reply({
                content: '❌ **Error:** Please upload a `.lua`, `.luau`, or `.txt` file!',
                ephemeral: true
            });
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({
                content: '❌ **Error:** File too large! Maximum size is 2MB.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            // Download file content
            const response = await axios.get(file.url, { responseType: 'arraybuffer' });
            const sourceCode = response.data.toString('utf-8');

            if (!sourceCode.trim()) {
                return interaction.editReply('❌ **Error:** File is empty!');
            }

            // Process obfuscation
            const startTime = Date.now();
            const obfuscator = new LuaObfuscator(preset);
            const result = obfuscator.obfuscate(sourceCode);
            const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

            // Create output file
            const outputBuffer = Buffer.from(result.code, 'utf-8');
            const outputName = file.name.replace(/\.(lua|luau|txt)$/i, '_protected.lua');
            const attachment = new AttachmentBuilder(outputBuffer, { name: outputName });

            // Create embed
            const presetEmoji = {
                'performance': '⚡',
                'balanced': '⚖️',
                'maxSecurity': '🔒'
            };

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Obfuscation Complete!')
                .setDescription(`Your script has been protected successfully.`)
                .addFields(
                    { name: '📁 File', value: `\`${file.name}\``, inline: true },
                    { name: '⚙️ Preset', value: `${presetEmoji[preset]} ${preset}`, inline: true },
                    { name: '⏱️ Time', value: `${processTime}s`, inline: true },
                    { name: '📊 Size', value: `${sourceCode.length} → ${result.code.length} bytes`, inline: true },
                    { name: '🔧 Transforms', value: result.logs.join('\n') || 'None', inline: false }
                )
                .setFooter({ text: 'LuaGuard Phase 1 • Roblox Compatible' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [attachment]
            });

        } catch (error) {
            console.error('Obfuscation error:', error);
            await interaction.editReply(`❌ **Error:** ${error.message}`);
        }
    }
});

// ==========================================
// 5. START BOT
// ==========================================
if (TOKEN) {
    client.login(TOKEN).catch(err => {
        console.error('❌ Failed to login:', err.message);
    });
} else {
    console.error('❌ Bot cannot start: DISCORD_TOKEN is missing!');
}
