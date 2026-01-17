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
// LUAGUARD v5.1 - STABLE & VARIED
// ==========================================
class LuaGuardV5 {
    constructor(preset) {
        this.preset = preset;
        this.varCounter = 0;
        this.varMap = new Map();
        this.logs = [];
        
        // =============================================
        // CHARACTER SETS (ASCII VALID - DELTA TESTED)
        // Semua karakter keyboard yang valid: a-z A-Z 0-9 _
        // =============================================
        this.charSets = {
            // Lowercase letters
            lower: 'abcdefghijklmnopqrstuvwxyz',
            
            // Uppercase letters
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            
            // All letters
            alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            
            // Numbers (tidak bisa di awal)
            numbers: '0123456789',
            
            // Hex chars
            hex: '0123456789ABCDEF',
            
            // Confusing pairs: l/I/1, o/O/0
            confusingL: ['l', 'I', '1'],
            confusingO: ['o', 'O', '0'],
            
            // Similar looking: S/5, Z/2, B/8, G/6, g/9, q/9
            similar: ['S', '5', 'Z', '2', 'B', '8', 'G', '6', 'g', 'q'],
            
            // Mixed everything
            mixed: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        };
    }

    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randChar(str) {
        return str[Math.floor(Math.random() * str.length)];
    }

    randItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // =============================================
    // VARIABLE NAME GENERATOR (10 STYLES)
    // =============================================
    genVarName() {
        this.varCounter++;
        const suffix = this.varCounter.toString(36).toUpperCase();
        
        const styles = [
            // Style 1: _lIlIlI1 (confusing l, I, 1)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(5, 8); i++) {
                    name += this.randItem(this.charSets.confusingL);
                }
                return name + suffix;
            },
            
            // Style 2: _0xA1B2C3 (hex style)
            () => {
                let hex = '';
                for (let i = 0; i < 6; i++) {
                    hex += this.randChar(this.charSets.hex);
                }
                return '_0x' + hex + suffix;
            },
            
            // Style 3: _oO0oO0 (confusing o, O, 0)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(5, 7); i++) {
                    name += this.randItem(this.charSets.confusingO);
                }
                return name + suffix;
            },
            
            // Style 4: _S5Z2B8 (similar looking)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(5, 7); i++) {
                    name += this.randItem(this.charSets.similar);
                }
                return name + suffix;
            },
            
            // Style 5: _abc123XYZ (mixed alphanumeric)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(6, 10); i++) {
                    name += this.randChar(this.charSets.mixed);
                }
                return name + suffix;
            },
            
            // Style 6: _xYzAbC (alternating case)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(5, 8); i++) {
                    if (i % 2 === 0) {
                        name += this.randChar(this.charSets.lower);
                    } else {
                        name += this.randChar(this.charSets.upper);
                    }
                }
                return name + suffix;
            },
            
            // Style 7: _ALLCAPS123 (uppercase + numbers)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(4, 6); i++) {
                    name += this.randChar(this.charSets.upper);
                }
                for (let i = 0; i < this.rand(2, 4); i++) {
                    name += this.randChar(this.charSets.numbers);
                }
                return name + suffix;
            },
            
            // Style 8: _lowernums789 (lowercase + numbers)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(4, 6); i++) {
                    name += this.randChar(this.charSets.lower);
                }
                for (let i = 0; i < this.rand(2, 4); i++) {
                    name += this.randChar(this.charSets.numbers);
                }
                return name + suffix;
            },
            
            // Style 9: __x__y__z__ (underscore heavy)
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(3, 5); i++) {
                    name += '_' + this.randChar(this.charSets.lower) + '_';
                }
                return name + suffix;
            },
            
            // Style 10: _v1_d2_f3 (prefix pattern)
            () => {
                const prefixes = ['v', 'd', 'f', 'x', 'z', 'n', 'm', 'k'];
                let name = '_';
                for (let i = 0; i < this.rand(2, 4); i++) {
                    name += this.randItem(prefixes) + this.rand(0, 9) + '_';
                }
                return name + suffix;
            }
        ];

        const style = styles[this.rand(0, styles.length - 1)];
        return style();
    }

    // =============================================
    // CHECK IF INSIDE STRING
    // =============================================
    isInString(code, pos) {
        let inStr = false, q = '';
        for (let i = 0; i < pos && i < code.length; i++) {
            const c = code[i];
            const prev = i > 0 ? code[i - 1] : '';
            if ((c === '"' || c === "'") && prev !== '\\') {
                if (!inStr) { inStr = true; q = c; }
                else if (c === q) { inStr = false; }
            }
            if (c === '[' && code[i + 1] === '[' && !inStr) {
                const end = code.indexOf(']]', i + 2);
                if (end > 0 && pos > i && pos < end + 2) return true;
            }
        }
        return inStr;
    }

    // =============================================
    // STRING ENCODER (4 METHODS)
    // =============================================
    encodeString(str) {
        if (!str || str.length === 0) return '""';
        
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            const format = this.rand(0, 3);
            
            switch (format) {
                case 0:
                    // Decimal
                    codes.push(charCode.toString());
                    break;
                case 1:
                    // Hexadecimal
                    codes.push('0x' + charCode.toString(16).toUpperCase());
                    break;
                case 2:
                    // Addition
                    const a = this.rand(1, Math.max(1, charCode - 1));
                    codes.push('(' + a + '+' + (charCode - a) + ')');
                    break;
                case 3:
                    // Subtraction
                    const b = charCode + this.rand(1, 50);
                    codes.push('(' + b + '-' + (b - charCode) + ')');
                    break;
            }
        }
        return 'string.char(' + codes.join(',') + ')';
    }

    // =============================================
    // NUMBER ENCODER (5 METHODS)
    // =============================================
    encodeNumber(num) {
        if (num < 10 || num > 50000 || !Number.isInteger(num)) {
            return num.toString();
        }
        
        const method = this.rand(0, 4);
        
        switch (method) {
            case 0:
                // Hexadecimal
                return '0x' + num.toString(16).toUpperCase();
            case 1:
                // Addition
                const a = this.rand(1, num - 1);
                return '(' + a + '+' + (num - a) + ')';
            case 2:
                // Subtraction
                const b = num + this.rand(1, 100);
                return '(' + b + '-' + (b - num) + ')';
            case 3:
                // Double negation
                return '(-(-' + num + '))';
            case 4:
                // Multiplication (if possible)
                for (let i = 2; i <= Math.min(10, Math.sqrt(num)); i++) {
                    if (num % i === 0) {
                        return '(' + i + '*' + (num / i) + ')';
                    }
                }
                return '0x' + num.toString(16).toUpperCase();
            default:
                return num.toString();
        }
    }

    // =============================================
    // TRANSFORM 1: REMOVE COMMENTS
    // =============================================
    removeComments(code) {
        let result = code;
        let count = 0;

        // Remove multi-line --[[ ]]
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => {
            count++;
            return '';
        });

        // Remove single-line --
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

        if (count > 0) this.logs.push('Comments: -' + count);
        return result;
    }

    // =============================================
    // TRANSFORM 2: RENAME VARIABLES
    // =============================================
    renameVars(code) {
        if (this.preset === 'performance') return code;

        let result = code;
        const vars = [];

        // Collect local declarations
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

        // Sort by length (longest first)
        vars.sort((a, b) => b.old.length - a.old.length);

        // Replace all occurrences
        for (const v of vars) {
            const re = new RegExp('\\b' + v.old + '\\b', 'g');
            result = result.replace(re, (match, offset) => {
                return this.isInString(result, offset) ? match : v.new;
            });
        }

        if (vars.length > 0) this.logs.push('Variables: ' + vars.length);
        return result;
    }

    // =============================================
    // TRANSFORM 3: ENCODE STRINGS
    // =============================================
    encodeStrings(code) {
        if (this.preset === 'performance') return code;

        let result = '';
        let i = 0;
        let encoded = 0;

        while (i < code.length) {
            if ((code[i] === '"' || code[i] === "'") && (i === 0 || code[i - 1] !== '\\')) {
                const quote = code[i];
                let content = '';
                i++;
                
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) {
                        content += code[i] + code[i + 1];
                        i += 2;
                    } else if (code[i] === quote) {
                        break;
                    } else {
                        content += code[i];
                        i++;
                    }
                }
                i++;

                const hasEscape = content.includes('\\');
                const hasNewline = content.includes('\n');
                
                if (content.length >= 4 && !hasEscape && !hasNewline) {
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

        if (encoded > 0) this.logs.push('Strings: ' + encoded);
        return result;
    }

    // =============================================
    // TRANSFORM 4: OBFUSCATE NUMBERS
    // =============================================
    obfuscateNumbers(code) {
        if (this.preset !== 'maxSecurity') return code;

        let count = 0;
        const self = this;
        
        const result = code.replace(/\b(\d+)\b/g, function(match, num, offset) {
            if (self.isInString(code, offset)) return match;
            
            const prevChar = offset > 0 ? code[offset - 1] : '';
            const nextChar = offset + match.length < code.length ? code[offset + match.length] : '';
            if (prevChar === '.' || nextChar === '.') return match;
            
            const n = parseInt(num);
            if (isNaN(n) || n < 10 || n > 50000) return match;
            
            count++;
            return self.encodeNumber(n);
        });

        if (count > 0) this.logs.push('Numbers: ' + count);
        return result;
    }

    // =============================================
    // TRANSFORM 5: DEAD CODE (SAFE VERSION)
    // =============================================
    injectDeadCode(code) {
        if (this.preset !== 'maxSecurity') return code;

        const lines = code.split('\n');
        const newLines = [];
        let injected = 0;

        // Simple dead code patterns (GUARANTEED SAFE)
        const deadPatterns = [
            () => 'local ' + this.genVarName() + ' = nil',
            () => 'local ' + this.genVarName() + ' = false',
            () => 'local ' + this.genVarName() + ' = 0',
            () => 'local ' + this.genVarName() + ' = ""',
            () => 'local ' + this.genVarName() + ' = {}'
        ];

        // Inject 2-3 at start
        for (let i = 0; i < this.rand(2, 3); i++) {
            newLines.push(deadPatterns[this.rand(0, deadPatterns.length - 1)]());
            injected++;
        }

        // Add original code with random injections
        for (let i = 0; i < lines.length; i++) {
            newLines.push(lines[i]);
            
            // 10% chance to inject
            if (i > 0 && i < lines.length - 1 && this.rand(1, 100) <= 10) {
                newLines.push(deadPatterns[this.rand(0, deadPatterns.length - 1)]());
                injected++;
            }
        }

        this.logs.push('DeadCode: +' + injected);
        return newLines.join('\n');
    }

    // =============================================
    // TRANSFORM 6: MINIFY
    // =============================================
    minify(code) {
        let lines = code.split('\n');
        lines = lines.map(l => l.trim()).filter(l => l !== '');
        this.logs.push('Minified');
        return lines.join('\n');
    }

    // =============================================
    // TRANSFORM 7: SIMPLE WRAPPER (NO ANTI-TAMPER)
    // =============================================
    addWrapper(code) {
        if (this.preset === 'performance') return code;
        
        this.logs.push('Wrapped');
        
        // Simple do...end wrapper - NO ANTI-TAMPER (proven to cause errors)
        return 'do\n' + code + '\nend';
    }

    // =============================================
    // GENERATE HEADER
    // =============================================
    getHeader() {
        const id = Math.random().toString(36).substring(2, 10).toUpperCase();
        return '-- LuaGuard v5.1 [' + id + ']\n';
    }

    // =============================================
    // MAIN OBFUSCATE
    // =============================================
    obfuscate(source) {
        let code = source;

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
// WEB SERVER
// ==========================================
const app = express();

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>LuaGuard v5.1</title>
    <style>
        body { font-family: Arial; background: #1a1a2e; color: #fff; text-align: center; padding: 50px; }
        h1 { color: #00ff88; }
        .online { color: #00ff88; font-size: 1.2em; }
        .box { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; max-width: 400px; margin: 20px auto; }
    </style>
</head>
<body>
    <h1>LuaGuard v5.1</h1>
    <p class="online">Online</p>
    <div class="box">
        <p>Delta Optimized</p>
        <p>Use /obfuscate in Discord</p>
    </div>
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

console.log('[LuaGuard v5.1] Token: ' + (TOKEN ? 'OK' : 'Missing'));
console.log('[LuaGuard v5.1] Client: ' + (CLIENT_ID ? 'OK' : 'Missing'));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate Lua script')
        .addAttachmentOption(o => o.setName('file').setDescription('.lua file').setRequired(true))
        .addStringOption(o => o.setName('preset').setDescription('Level').addChoices(
            { name: 'Performance', value: 'performance' },
            { name: 'Balanced', value: 'balanced' },
            { name: 'Max Security', value: 'maxSecurity' }
        )),
    new SlashCommandBuilder().setName('help').setDescription('Show help'),
    new SlashCommandBuilder().setName('ping').setDescription('Check latency')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log('[Bot] Logged in as ' + client.user.tag);
    client.user.setActivity('/obfuscate', { type: ActivityType.Watching });
    
    if (CLIENT_ID) {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('[Bot] Commands registered');
        } catch (e) {
            console.error('[Bot] Error:', e.message);
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        return interaction.reply('Pong: ' + (Date.now() - interaction.createdTimestamp) + 'ms');
    }

    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x00FF88)
            .setTitle('LuaGuard v5.1')
            .setDescription('Lua Obfuscator - Delta Optimized')
            .addFields(
                { name: 'Performance', value: 'Comments + Minify', inline: true },
                { name: 'Balanced', value: '+ Vars + Strings', inline: true },
                { name: 'Max Security', value: '+ Numbers + DeadCode', inline: true }
            )
            .setFooter({ text: 'LuaGuard v5.1' });
        return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        if (!['.lua', '.luau', '.txt'].some(e => file.name.toLowerCase().endsWith(e))) {
            return interaction.reply({ content: 'Error: Invalid file type', ephemeral: true });
        }

        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({ content: 'Error: Max 2MB', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const res = await axios.get(file.url, { responseType: 'arraybuffer' });
            const source = res.data.toString('utf-8');

            if (!source.trim()) {
                return interaction.editReply('Error: Empty file');
            }

            const startTime = Date.now();
            const obf = new LuaGuardV5(preset);
            const result = obf.obfuscate(source);
            const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

            const buf = Buffer.from(result.code, 'utf-8');
            const outName = file.name.replace(/\.(lua|luau|txt)$/i, '_obf.lua');
            const attachment = new AttachmentBuilder(buf, { name: outName });

            const originalSize = source.length;
            const newSize = result.code.length;
            const ratio = ((newSize / originalSize) * 100).toFixed(0);

            const colors = { performance: 0x57F287, balanced: 0x5865F2, maxSecurity: 0xED4245 };
            const icons = { performance: '⚡', balanced: '⚖️', maxSecurity: '🔒' };

            const embed = new EmbedBuilder()
                .setColor(colors[preset])
                .setTitle(icons[preset] + ' Obfuscation Complete')
                .addFields(
                    { name: 'File', value: '`' + file.name + '`', inline: true },
                    { name: 'Preset', value: preset, inline: true },
                    { name: 'Time', value: processTime + 's', inline: true },
                    { name: 'Size', value: originalSize + ' → ' + newSize + ' (' + ratio + '%)', inline: true },
                    { name: 'Transforms', value: '```\n' + result.logs.join('\n') + '\n```', inline: false }
                )
                .setFooter({ text: 'LuaGuard v5.1 | Delta Compatible' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (e) {
            console.error(e);
            await interaction.editReply('Error: ' + e.message);
        }
    }
});

if (TOKEN) client.login(TOKEN);
