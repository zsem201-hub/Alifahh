require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, 
    SlashCommandBuilder, ActivityType, EmbedBuilder, 
    AttachmentBuilder
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
// PROTECTED NAMES (JANGAN DIGANTI)
// ==========================================
const PROTECTED = new Set([
    // Roblox Core
    'game','workspace','script','plugin','shared','Enum','Instance',
    'Vector3','Vector2','CFrame','Color3','BrickColor','UDim','UDim2',
    'Ray','TweenInfo','Region3','Rect','NumberRange','NumberSequence',
    'ColorSequence','PhysicalProperties','Random','Axes','Faces',
    // Roblox Functions
    'typeof','require','spawn','delay','wait','tick','time','warn',
    'settings','UserSettings','version','printidentity','elapsedTime',
    // Executor Globals
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
    // Lua Standard
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
    // Common Patterns
    'self','this','Callback','Connect','Wait','Fire','Value',
    'Name','Parent','Text','Title','Duration','Enabled','CurrentValue',
    'Range','Increment','Options','CurrentOption','Color'
]);

// ==========================================
// LUAGUARD v5.0 - DELTA OPTIMIZED (FULL)
// ==========================================
class LuaGuardV5 {
    constructor(preset) {
        this.preset = preset;
        this.varCounter = 0;
        this.varMap = new Map();
        this.logs = [];
        
        // =============================================
        // CHARACTER SETS (ASCII ONLY - Delta Compatible)
        // =============================================
        this.charSets = {
            // Style 1: Confusing characters (l, I, 1, i, L)
            confusing: ['l', 'I', '1', 'i', 'L'],
            
            // Style 2: Hex characters
            hex: '0123456789ABCDEF',
            
            // Style 3: Similar looking (o, O, 0)
            similar: ['o', 'O', '0'],
            
            // Style 4: Mixed alphanumeric
            mixed: ['S', '5', 'Z', '2', 'B', '8', 'G', '6', 'q', '9'],
            
            // Style 5: Underscore heavy
            underscore: ['_', 'l', 'I', '_', '1', '_']
        };
    }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    
    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randItem(arr) {
        if (typeof arr === 'string') {
            return arr[Math.floor(Math.random() * arr.length)];
        }
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ==========================================
    // VARIABLE NAME GENERATOR (5 STYLES)
    // ==========================================
    genVarName() {
        const styles = [
            // Style 1: _IllIlIl1 (Confusing l, I, 1)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(6, 10); i++) {
                    name += this.randItem(this.charSets.confusing);
                }
                return name;
            },
            
            // Style 2: _0xABCDEF (Hex style)
            () => {
                let hex = '';
                for (let i = 0; i < this.rand(6, 8); i++) {
                    hex += this.randItem(this.charSets.hex);
                }
                return `_0x${hex}`;
            },
            
            // Style 3: _OoO0oO (Similar o, O, 0)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(5, 8); i++) {
                    name += this.randItem(this.charSets.similar);
                }
                return name;
            },
            
            // Style 4: _S5Z2B8 (Mixed confusing)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(6, 9); i++) {
                    name += this.randItem(this.charSets.mixed);
                }
                return name;
            },
            
            // Style 5: __l_I_1__ (Underscore heavy)
            () => {
                let name = '';
                for (let i = 0; i < this.rand(8, 12); i++) {
                    name += this.randItem(this.charSets.underscore);
                }
                // Pastikan tidak dimulai dengan angka
                if (/^[0-9]/.test(name)) name = '_' + name;
                return name;
            }
        ];

        this.varCounter++;
        const style = styles[this.rand(0, styles.length - 1)];
        // Tambahkan suffix unik untuk mencegah duplikat
        return style() + this.varCounter.toString(36).toUpperCase();
    }

    // ==========================================
    // STRING POSITION CHECK
    // ==========================================
    isInString(code, pos) {
        let inStr = false, q = '';
        for (let i = 0; i < pos && i < code.length; i++) {
            const c = code[i];
            const prev = i > 0 ? code[i - 1] : '';
            if ((c === '"' || c === "'") && prev !== '\\') {
                if (!inStr) { 
                    inStr = true; 
                    q = c; 
                } else if (c === q) { 
                    inStr = false; 
                }
            }
            // Check long string [[ ]]
            if (c === '[' && code[i + 1] === '[' && !inStr) {
                const end = code.indexOf(']]', i + 2);
                if (end > 0 && pos > i && pos < end + 2) return true;
            }
        }
        return inStr;
    }

    // ==========================================
    // STRING ENCODER (3 METHODS)
    // ==========================================
    encodeString(str) {
        if (!str || str.length === 0) return '""';
        
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            const format = this.rand(0, 2);
            
            switch (format) {
                case 0:
                    // Decimal
                    codes.push(charCode.toString());
                    break;
                case 1:
                    // Hexadecimal
                    codes.push(`0x${charCode.toString(16).toUpperCase()}`);
                    break;
                case 2:
                    // Math expression
                    const a = this.rand(1, Math.max(1, charCode - 1));
                    const b = charCode - a;
                    codes.push(`(${a}+${b})`);
                    break;
            }
        }
        return `string.char(${codes.join(',')})`;
    }

    // ==========================================
    // NUMBER ENCODER (5 METHODS)
    // ==========================================
    encodeNumber(num) {
        if (num < 10 || num > 50000 || !Number.isInteger(num)) {
            return num.toString();
        }
        
        const method = this.rand(0, 4);
        
        switch (method) {
            case 0:
                // Hexadecimal
                return `0x${num.toString(16).toUpperCase()}`;
            
            case 1:
                // Addition
                const a = this.rand(1, num - 1);
                return `(${a}+${num - a})`;
            
            case 2:
                // Subtraction
                const b = num + this.rand(1, 100);
                return `(${b}-${b - num})`;
            
            case 3:
                // Double negation
                return `(-(-${num}))`;
            
            case 4:
                // Multiplication (if divisible)
                for (let i = 2; i <= Math.min(10, Math.sqrt(num)); i++) {
                    if (num % i === 0) {
                        return `(${i}*${num / i})`;
                    }
                }
                return `0x${num.toString(16).toUpperCase()}`;
            
            default:
                return num.toString();
        }
    }

    // ==========================================
    // TRANSFORM 1: REMOVE COMMENTS
    // ==========================================
    removeComments(code) {
        let result = code;
        let count = 0;

        // Remove multi-line comments --[[ ]] or --[=[ ]=]
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => {
            count++;
            return '';
        });

        // Remove single-line comments --
        const lines = result.split('\n');
        result = lines.map(line => {
            let inStr = false, q = '';
            for (let i = 0; i < line.length - 1; i++) {
                const c = line[i];
                const prev = i > 0 ? line[i - 1] : '';
                if ((c === '"' || c === "'") && prev !== '\\') {
                    if (!inStr) { inStr = true; q = c; }
                    else if (c === q) { inStr = false; }
                }
                if (!inStr && c === '-' && line[i + 1] === '-') {
                    count++;
                    return line.slice(0, i).trimEnd();
                }
            }
            return line;
        }).join('\n');

        if (count > 0) this.logs.push(`Comments: -${count}`);
        return result;
    }

    // ==========================================
    // TRANSFORM 2: RENAME VARIABLES
    // ==========================================
    renameVars(code) {
        if (this.preset === 'performance') return code;

        let result = code;
        const vars = [];

        // Collect local variable declarations
        const localRe = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let m;
        while ((m = localRe.exec(code)) !== null) {
            const name = m[1];
            if (!PROTECTED.has(name) && !this.varMap.has(name)) {
                const newName = this.genVarName();
                this.varMap.set(name, newName);
                vars.push({ old: name, new: newName });
            }
        }

        // Collect function parameters
        const funcRe = /function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
        while ((m = funcRe.exec(code)) !== null) {
            if (m[1].trim()) {
                const params = m[1].split(',').map(p => p.trim()).filter(p => p && p !== '...');
                for (const param of params) {
                    if (!PROTECTED.has(param) && !this.varMap.has(param)) {
                        const newName = this.genVarName();
                        this.varMap.set(param, newName);
                        vars.push({ old: param, new: newName });
                    }
                }
            }
        }

        // Collect for loop variables
        const forRe = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g;
        while ((m = forRe.exec(code)) !== null) {
            const loopVars = [m[1], m[2]].filter(Boolean);
            for (const v of loopVars) {
                if (!PROTECTED.has(v) && !this.varMap.has(v)) {
                    const newName = this.genVarName();
                    this.varMap.set(v, newName);
                    vars.push({ old: v, new: newName });
                }
            }
        }

        // Sort by length (longest first to avoid partial replacement)
        vars.sort((a, b) => b.old.length - a.old.length);

        // Replace all occurrences
        for (const v of vars) {
            const re = new RegExp('\\b' + v.old + '\\b', 'g');
            result = result.replace(re, (match, offset) => {
                return this.isInString(result, offset) ? match : v.new;
            });
        }

        if (vars.length > 0) this.logs.push(`Variables: ${vars.length}`);
        return result;
    }

    // ==========================================
    // TRANSFORM 3: ENCODE STRINGS
    // ==========================================
    encodeStrings(code) {
        if (this.preset === 'performance') return code;

        let result = '';
        let i = 0;
        let encoded = 0;

        while (i < code.length) {
            // Check for string start
            if ((code[i] === '"' || code[i] === "'") && (i === 0 || code[i - 1] !== '\\')) {
                const quote = code[i];
                let content = '';
                i++; // Skip opening quote
                
                // Collect string content
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) {
                        // Keep escape sequences
                        content += code[i] + code[i + 1];
                        i += 2;
                    } else if (code[i] === quote) {
                        break;
                    } else {
                        content += code[i];
                        i++;
                    }
                }
                i++; // Skip closing quote

                // Decide whether to encode
                const hasEscape = content.includes('\\');
                const hasNewline = content.includes('\n');
                const isLongEnough = content.length >= 4;
                
                if (isLongEnough && !hasEscape && !hasNewline) {
                    result += this.encodeString(content);
                    encoded++;
                } else {
                    result += quote + content + quote;
                }
            } else {
                result += code[i];
                i++;
            }
        }

        if (encoded > 0) this.logs.push(`Strings: ${encoded}`);
        return result;
    }

    // ==========================================
    // TRANSFORM 4: OBFUSCATE NUMBERS
    // ==========================================
    obfuscateNumbers(code) {
        if (this.preset !== 'maxSecurity') return code;

        let count = 0;
        const self = this;
        
        const result = code.replace(/\b(\d+)\b/g, function(match, num, offset) {
            // Skip if inside string
            if (self.isInString(code, offset)) return match;
            
            // Skip decimals (check surrounding chars)
            const prevChar = offset > 0 ? code[offset - 1] : '';
            const nextChar = offset + match.length < code.length ? code[offset + match.length] : '';
            if (prevChar === '.' || nextChar === '.') return match;
            
            const n = parseInt(num);
            if (isNaN(n) || n < 10 || n > 50000) return match;
            
            count++;
            return self.encodeNumber(n);
        });

        if (count > 0) this.logs.push(`Numbers: ${count}`);
        return result;
    }

    // ==========================================
    // TRANSFORM 5: INJECT DEAD CODE (SAFE)
    // ==========================================
    injectDeadCode(code) {
        if (this.preset !== 'maxSecurity') return code;

        const deadSnippets = [
            () => `local ${this.genVarName()} = nil`,
            () => `local ${this.genVarName()} = false`,
            () => `local ${this.genVarName()} = {}`,
            () => `local ${this.genVarName()} = function() end`,
            () => `local ${this.genVarName()} = 0`,
            () => `local ${this.genVarName()} = ""`,
            () => `local ${this.genVarName()} = type(nil)`,
            () => `local ${this.genVarName()} = select(1, nil)`
        ];

        const lines = code.split('\n');
        const newLines = [];
        let injected = 0;

        // Inject 2-3 at beginning
        const startCount = this.rand(2, 3);
        for (let i = 0; i < startCount; i++) {
            const snippet = deadSnippets[this.rand(0, deadSnippets.length - 1)]();
            newLines.push(snippet);
            injected++;
        }

        // Inject randomly in middle
        for (let i = 0; i < lines.length; i++) {
            newLines.push(lines[i]);
            
            // 15% chance to inject after each line (not at end)
            if (i > 0 && i < lines.length - 1 && this.rand(1, 100) <= 15) {
                const snippet = deadSnippets[this.rand(0, deadSnippets.length - 1)]();
                newLines.push(snippet);
                injected++;
            }
        }

        this.logs.push(`DeadCode: +${injected}`);
        return newLines.join('\n');
    }

    // ==========================================
    // TRANSFORM 6: MINIFY (SAFE)
    // ==========================================
    minify(code) {
        // Remove empty lines and trim each line
        let lines = code.split('\n');
        lines = lines.map(l => l.trim()).filter(l => l !== '');
        
        // Remove multiple consecutive newlines
        let result = lines.join('\n');
        result = result.replace(/\n{2,}/g, '\n');
        
        this.logs.push('Minified');
        return result;
    }

    // ==========================================
    // TRANSFORM 7: ADD WRAPPER (SAFE)
    // ==========================================
    addWrapper(code) {
        if (this.preset === 'performance') return code;
        
        this.logs.push('Wrapped');
        
        if (this.preset === 'maxSecurity') {
            // Anti-tamper dengan logic sederhana (ASCII only, no complex nesting)
            const keyVar = this.genVarName();
            const keyVal = this.rand(1000, 9999);
            
            return `local ${keyVar} = ${keyVal}
if ${keyVar} ~= ${keyVal} then
return
end
do
${code}
end`;
        }
        
        // Balanced: simple wrapper
        return `do
${code}
end`;
    }

    // ==========================================
    // GENERATE HEADER
    // ==========================================
    getHeader() {
        const id = Math.random().toString(36).substring(2, 10).toUpperCase();
        const date = new Date().toISOString().split('T')[0];
        const presetLabel = {
            'performance': 'Performance',
            'balanced': 'Balanced',
            'maxSecurity': 'MaxSecurity'
        };
        
        return `-- LuaGuard v5.0 [${id}] ${presetLabel[this.preset]} ${date}\n`;
    }

    // ==========================================
    // MAIN OBFUSCATE FUNCTION
    // ==========================================
    obfuscate(source) {
        let code = source;

        // Apply transforms in order
        code = this.removeComments(code);
        code = this.renameVars(code);
        code = this.encodeStrings(code);
        code = this.obfuscateNumbers(code);
        code = this.injectDeadCode(code);
        code = this.minify(code);
        code = this.addWrapper(code);

        return {
            code: this.getHeader() + code,
            logs: this.logs
        };
    }
}

// ==========================================
// WEB SERVER (RENDER KEEP-ALIVE)
// ==========================================
const app = express();

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>LuaGuard v5.0</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            text-align: center;
            padding: 50px;
            min-height: 100vh;
            margin: 0;
        }
        h1 { color: #00ff88; font-size: 2.5em; }
        .status { color: #00ff88; font-size: 1.3em; margin: 20px 0; }
        .box {
            background: rgba(255,255,255,0.1);
            padding: 25px;
            border-radius: 15px;
            max-width: 500px;
            margin: 30px auto;
            border: 1px solid rgba(255,255,255,0.2);
        }
        code {
            background: #0d1117;
            padding: 3px 8px;
            border-radius: 5px;
            color: #58a6ff;
        }
        .features { text-align: left; margin-top: 15px; }
        .features li { margin: 8px 0; }
    </style>
</head>
<body>
    <h1>LuaGuard Obfuscator</h1>
    <p class="status">● Online</p>
    <div class="box">
        <p><strong>Version 5.0</strong> - Delta Optimized</p>
        <p>Use <code>/obfuscate</code> in Discord</p>
        <ul class="features">
            <li>✅ Comment Removal</li>
            <li>✅ Variable Renaming (5 Styles)</li>
            <li>✅ String Encoding (3 Methods)</li>
            <li>✅ Number Obfuscation (5 Methods)</li>
            <li>✅ Dead Code Injection</li>
            <li>✅ Anti-Tamper Protection</li>
        </ul>
    </div>
    <p style="color:#888">Roblox Executor Compatible</p>
</body>
</html>
    `);
});

app.listen(process.env.PORT || 3000, () => {
    console.log('[Server] LuaGuard v5.0 Running');
});

// ==========================================
// DISCORD BOT
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('\n╔══════════════════════════════════════════╗');
console.log('║      LuaGuard v5.0 - Delta Optimized     ║');
console.log('╠══════════════════════════════════════════╣');
console.log(`║  Token:    ${TOKEN ? '✓ Loaded' : '✗ Missing'}                       ║`);
console.log(`║  Client:   ${CLIENT_ID ? '✓ Loaded' : '✗ Missing'}                       ║`);
console.log('╚══════════════════════════════════════════╝\n');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate your Lua script')
        .addAttachmentOption(option => 
            option.setName('file')
                .setDescription('Upload .lua, .luau, or .txt file')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('preset')
                .setDescription('Protection level')
                .setRequired(false)
                .addChoices(
                    { name: '⚡ Performance - Fast & Light', value: 'performance' },
                    { name: '⚖️ Balanced - Recommended', value: 'balanced' },
                    { name: '🔒 Max Security - Full Protection', value: 'maxSecurity' }
                )),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help and features'),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency')
].map(cmd => cmd.toJSON());

// Register Commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    client.user.setActivity('/obfuscate | v5.0', { type: ActivityType.Watching });

    if (CLIENT_ID) {
        try {
            console.log('[Bot] Registering commands...');
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('[Bot] Commands registered!\n');
        } catch (error) {
            console.error('[Bot] Error registering commands:', error.message);
        }
    } else {
        console.warn('[Bot] CLIENT_ID missing - commands not registered');
    }
});

// Handle Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // PING Command
    if (commandName === 'ping') {
        const latency = Date.now() - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        return interaction.reply(`🏓 Pong!\nLatency: \`${latency}ms\`\nAPI: \`${apiLatency}ms\``);
    }

    // HELP Command
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x00FF88)
            .setTitle('🛡️ LuaGuard v5.0 - Help')
            .setDescription('Advanced Lua Obfuscator optimized for Roblox Executors')
            .addFields(
                { 
                    name: '⚡ Performance', 
                    value: '```\n• Comment Removal\n• Whitespace Cleanup\n```', 
                    inline: true 
                },
                { 
                    name: '⚖️ Balanced', 
                    value: '```\n• All Performance +\n• Variable Renaming\n• String Encoding\n• Wrapper\n```', 
                    inline: true 
                },
                { 
                    name: '🔒 Max Security', 
                    value: '```\n• All Balanced +\n• Number Obfuscation\n• Dead Code Injection\n• Anti-Tamper\n```', 
                    inline: true 
                },
                {
                    name: '📁 Supported Files',
                    value: '`.lua` `.luau` `.txt`',
                    inline: true
                },
                {
                    name: '📏 Max Size',
                    value: '2 MB',
                    inline: true
                },
                {
                    name: '🎮 Tested On',
                    value: 'Delta, Arceus X, Fluxus',
                    inline: true
                },
                {
                    name: '📖 Usage',
                    value: '1. Use `/obfuscate`\n2. Upload your script\n3. Select preset\n4. Download protected script!',
                    inline: false
                }
            )
            .setFooter({ text: 'LuaGuard v5.0 | Delta Optimized' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // OBFUSCATE Command
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
                content: '❌ **Error:** Only `.lua`, `.luau`, or `.txt` files are allowed!', 
                ephemeral: true 
            });
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({ 
                content: '❌ **Error:** File size must be under 2MB!', 
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
            const obfuscator = new LuaGuardV5(preset);
            const result = obfuscator.obfuscate(source);
            const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

            // Create output file
            const outputBuffer = Buffer.from(result.code, 'utf-8');
            const outputName = file.name.replace(/\.(lua|luau|txt)$/i, '_obf.lua');
            const attachment = new AttachmentBuilder(outputBuffer, { name: outputName });

            // Calculate stats
            const originalSize = source.length;
            const newSize = result.code.length;
            const ratio = ((newSize / originalSize) * 100).toFixed(0);

            // Preset info
            const presetInfo = {
                'performance': { color: 0x57F287, icon: '⚡', label: 'Performance' },
                'balanced': { color: 0x5865F2, icon: '⚖️', label: 'Balanced' },
                'maxSecurity': { color: 0xED4245, icon: '🔒', label: 'Max Security' }
            };

            const info = presetInfo[preset];

            const embed = new EmbedBuilder()
                .setColor(info.color)
                .setTitle(`${info.icon} Obfuscation Complete!`)
                .setDescription('Your script has been protected successfully.')
                .addFields(
                    { name: '📄 Input', value: `\`${file.name}\``, inline: true },
                    { name: '📦 Output', value: `\`${outputName}\``, inline: true },
                    { name: '⚙️ Preset', value: `${info.icon} ${info.label}`, inline: true },
                    { name: '📊 Original', value: `\`${originalSize.toLocaleString()}\` bytes`, inline: true },
                    { name: '📈 Result', value: `\`${newSize.toLocaleString()}\` bytes`, inline: true },
                    { name: '📐 Ratio', value: `\`${ratio}%\``, inline: true },
                    { name: '⏱️ Time', value: `\`${processTime}s\``, inline: true },
                    { 
                        name: '🔧 Transforms Applied', 
                        value: '```\n' + result.logs.map(l => '✓ ' + l).join('\n') + '\n```', 
                        inline: false 
                    }
                )
                .setFooter({ text: 'LuaGuard v5.0 | Delta Compatible' })
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });

        } catch (error) {
            console.error('[Error]', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Obfuscation Failed')
                .setDescription(`\`\`\`${error.message}\`\`\``)
                .setFooter({ text: 'Please try again or contact support' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
});

// Start Bot
if (TOKEN) {
    client.login(TOKEN).catch(error => {
        console.error('[Bot] Login failed:', error.message);
    });
} else {
    console.error('[Bot] DISCORD_TOKEN is missing!');
                }
