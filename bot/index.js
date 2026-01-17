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
// LUAGUARD v5.3 FINAL
// ==========================================
class LuaGuardFinal {
    constructor(preset) {
        this.preset = preset;
        this.varCounter = 0;
        this.varMap = new Map();
        this.logs = [];
        
        // =============================================
        // CHARACTER SETS (SEMUA VALID DI DELTA)
        // =============================================
        this.chars = {
            lower: 'abcdefghijklmnopqrstuvwxyz',
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            numbers: '0123456789',
            hex: '0123456789ABCDEF',
            confusingL: ['l', 'I', '1', 'i'],
            confusingO: ['o', 'O', '0', 'Q'],
            similar: ['S', '5', 'Z', '2', 'B', '8', 'G', '6']
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
    // 10 STYLE VARIABLE GENERATOR
    // =============================================
    genVarName() {
        this.varCounter++;
        const id = this.varCounter.toString(36).toUpperCase();
        
        const styles = [
            // Style 1: _lIl1Il (confusing l/I/1)
            () => {
                let n = '_';
                for (let i = 0; i < this.rand(5, 8); i++) n += this.randItem(this.chars.confusingL);
                return n + id;
            },
            // Style 2: _0xABCDEF (hex)
            () => {
                let h = '';
                for (let i = 0; i < 6; i++) h += this.randChar(this.chars.hex);
                return '_0x' + h + id;
            },
            // Style 3: _oO0OoO (confusing o/O/0)
            () => {
                let n = '_';
                for (let i = 0; i < this.rand(5, 7); i++) n += this.randItem(this.chars.confusingO);
                return n + id;
            },
            // Style 4: _S5Z2B8 (similar looking)
            () => {
                let n = '_';
                for (let i = 0; i < this.rand(5, 7); i++) n += this.randItem(this.chars.similar);
                return n + id;
            },
            // Style 5: _xYaBcD (alternating case)
            () => {
                let n = '_';
                for (let i = 0; i < this.rand(6, 8); i++) {
                    n += i % 2 === 0 ? this.randChar(this.chars.lower) : this.randChar(this.chars.upper);
                }
                return n + id;
            },
            // Style 6: _ABCD123 (upper + numbers)
            () => {
                let n = '_';
                for (let i = 0; i < 4; i++) n += this.randChar(this.chars.upper);
                for (let i = 0; i < 3; i++) n += this.randChar(this.chars.numbers);
                return n + id;
            },
            // Style 7: _abcd789 (lower + numbers)
            () => {
                let n = '_';
                for (let i = 0; i < 4; i++) n += this.randChar(this.chars.lower);
                for (let i = 0; i < 3; i++) n += this.randChar(this.chars.numbers);
                return n + id;
            },
            // Style 8: __a__b__c (underscore heavy)
            () => {
                let n = '_';
                for (let i = 0; i < 3; i++) n += '_' + this.randChar(this.chars.lower) + '_';
                return n + id;
            },
            // Style 9: _v1d2f3 (letter-number pairs)
            () => {
                let n = '_';
                for (let i = 0; i < 3; i++) {
                    n += this.randChar(this.chars.lower) + this.rand(0, 9);
                }
                return n + id;
            },
            // Style 10: _XyZaBc123 (mixed everything)
            () => {
                let n = '_';
                const all = this.chars.lower + this.chars.upper + this.chars.numbers;
                for (let i = 0; i < this.rand(6, 9); i++) n += this.randChar(all);
                return n + id;
            }
        ];

        return styles[this.rand(0, styles.length - 1)]();
    }

    // =============================================
    // CHECK IF INSIDE STRING
    // =============================================
    isInString(code, pos) {
        let inStr = false, q = '';
        for (let i = 0; i < pos && i < code.length; i++) {
            const c = code[i], prev = i > 0 ? code[i - 1] : '';
            if ((c === '"' || c === "'") && prev !== '\\') {
                if (!inStr) { inStr = true; q = c; }
                else if (c === q) { inStr = false; }
            }
        }
        return inStr;
    }

    // =============================================
    // STRING ENCODER (4 METHODS)
    // =============================================
    encodeString(str) {
        if (!str) return '""';
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);
            const m = this.rand(0, 3);
            if (m === 0) codes.push(c);
            else if (m === 1) codes.push('0x' + c.toString(16).toUpperCase());
            else if (m === 2) { const a = this.rand(1, c - 1); codes.push('(' + a + '+' + (c - a) + ')'); }
            else { const b = c + this.rand(1, 30); codes.push('(' + b + '-' + (b - c) + ')'); }
        }
        return 'string.char(' + codes.join(',') + ')';
    }

    // =============================================
    // NUMBER ENCODER (4 METHODS)
    // =============================================
    encodeNumber(num) {
        if (num < 10 || num > 50000 || !Number.isInteger(num)) return num.toString();
        const m = this.rand(0, 3);
        if (m === 0) return '0x' + num.toString(16).toUpperCase();
        if (m === 1) { const a = this.rand(1, num - 1); return '(' + a + '+' + (num - a) + ')'; }
        if (m === 2) { const b = num + this.rand(1, 50); return '(' + b + '-' + (b - num) + ')'; }
        return '(-(-' + num + '))';
    }

    // =============================================
    // TRANSFORM 1: REMOVE COMMENTS
    // =============================================
    removeComments(code) {
        let result = code;
        let count = 0;

        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => { count++; return ''; });

        const lines = result.split('\n');
        result = lines.map(line => {
            let inStr = false, q = '';
            for (let i = 0; i < line.length - 1; i++) {
                const c = line[i], prev = i > 0 ? line[i - 1] : '';
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

        // Local declarations
        let m;
        const localRe = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        while ((m = localRe.exec(code)) !== null) {
            if (!PROTECTED.has(m[1]) && !this.varMap.has(m[1])) {
                const n = this.genVarName();
                this.varMap.set(m[1], n);
                vars.push({ old: m[1], new: n });
            }
        }

        // Function params
        const funcRe = /function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
        while ((m = funcRe.exec(code)) !== null) {
            if (m[1].trim()) {
                m[1].split(',').map(p => p.trim()).filter(p => p && p !== '...').forEach(p => {
                    if (!PROTECTED.has(p) && !this.varMap.has(p)) {
                        const n = this.genVarName();
                        this.varMap.set(p, n);
                        vars.push({ old: p, new: n });
                    }
                });
            }
        }

        // For loops
        const forRe = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g;
        while ((m = forRe.exec(code)) !== null) {
            [m[1], m[2]].filter(Boolean).forEach(v => {
                if (!PROTECTED.has(v) && !this.varMap.has(v)) {
                    const n = this.genVarName();
                    this.varMap.set(v, n);
                    vars.push({ old: v, new: n });
                }
            });
        }

        vars.sort((a, b) => b.old.length - a.old.length);

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

        let result = '', i = 0, encoded = 0;

        while (i < code.length) {
            if ((code[i] === '"' || code[i] === "'") && (i === 0 || code[i - 1] !== '\\')) {
                const q = code[i];
                let content = '';
                i++;
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) {
                        content += code[i] + code[i + 1];
                        i += 2;
                    } else if (code[i] === q) {
                        break;
                    } else {
                        content += code[i];
                        i++;
                    }
                }
                i++;

                if (content.length >= 4 && !content.includes('\\') && !content.includes('\n')) {
                    result += this.encodeString(content);
                    encoded++;
                } else {
                    result += q + content + q;
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

        const result = code.replace(/\b(\d+)\b/g, (match, num, offset) => {
            if (self.isInString(code, offset)) return match;
            const prev = offset > 0 ? code[offset - 1] : '';
            const next = offset + match.length < code.length ? code[offset + match.length] : '';
            if (prev === '.' || next === '.') return match;

            const n = parseInt(num);
            if (isNaN(n) || n < 10 || n > 50000) return match;

            count++;
            return self.encodeNumber(n);
        });

        if (count > 0) this.logs.push('Numbers: ' + count);
        return result;
    }

    // =============================================
    // TRANSFORM 5: INJECT DEAD CODE (SIMPLE & SAFE)
    // =============================================
    injectDeadCode(code) {
        if (this.preset !== 'maxSecurity') return code;

        const lines = code.split('\n');
        const newLines = [];
        let injected = 0;

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

        // Add original with random injections
        for (let i = 0; i < lines.length; i++) {
            newLines.push(lines[i]);
            if (i > 0 && i < lines.length - 1 && this.rand(1, 100) <= 8) {
                newLines.push(deadPatterns[this.rand(0, deadPatterns.length - 1)]());
                injected++;
            }
        }

        this.logs.push('DeadCode: +' + injected);
        return newLines.join('\n');
    }

    // =============================================
    // TRANSFORM 6: CLEAN CODE
    // =============================================
    cleanCode(code) {
        const lines = code.split('\n').map(l => l.trim()).filter(l => l !== '');
        this.logs.push('Cleaned');
        return lines.join('\n');
    }

    // =============================================
    // TRANSFORM 7: ADD WRAPPER (do...end ONLY - NO ANTI-TAMPER)
    // =============================================
    addWrapper(code) {
        if (this.preset === 'performance') return code;
        this.logs.push('Wrapped');
        return 'do\n' + code + '\nend';
    }

    // =============================================
    // GENERATE HEADER
    // =============================================
    getHeader() {
        const id = Math.random().toString(36).substring(2, 10).toUpperCase();
        const presets = { performance: 'Perf', balanced: 'Balanced', maxSecurity: 'MaxSec' };
        return '-- LuaGuard v5.3 [' + id + '] ' + presets[this.preset] + '\n';
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
        code = this.cleanCode(code);
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
<head><title>LuaGuard v5.3</title>
<style>
body{font-family:Arial;background:#0d1117;color:#c9d1d9;text-align:center;padding:50px}
h1{color:#58a6ff}
.ok{color:#3fb950;font-size:1.3em}
.box{background:#161b22;padding:25px;border-radius:12px;max-width:450px;margin:25px auto;border:1px solid #30363d}
ul{text-align:left;padding-left:20px}
li{margin:8px 0}
</style>
</head>
<body>
<h1>LuaGuard v5.3 Final</h1>
<p class="ok">● Online</p>
<div class="box">
<p><b>Features:</b></p>
<ul>
<li>✅ 10 Variable Styles</li>
<li>✅ String Encoding (4 methods)</li>
<li>✅ Number Obfuscation (4 methods)</li>
<li>✅ Dead Code Injection</li>
<li>✅ Safe Wrapper</li>
<li>❌ Anti-Tamper (Disabled - causes crash)</li>
</ul>
</div>
<p style="color:#8b949e">Delta Compatible</p>
</body>
</html>
    `);
});
app.listen(process.env.PORT || 3000, () => console.log('[Server] OK'));

// ==========================================
// DISCORD BOT
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('\n[LuaGuard v5.3 Final]');
console.log('Token: ' + (TOKEN ? 'OK' : 'MISSING'));
console.log('Client: ' + (CLIENT_ID ? 'OK' : 'MISSING') + '\n');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate Lua script')
        .addAttachmentOption(o => o.setName('file').setDescription('.lua file').setRequired(true))
        .addStringOption(o => o.setName('preset').setDescription('Level').addChoices(
            { name: '⚡ Performance', value: 'performance' },
            { name: '⚖️ Balanced', value: 'balanced' },
            { name: '🔒 Max Security', value: 'maxSecurity' }
        )),
    new SlashCommandBuilder().setName('help').setDescription('Show features'),
    new SlashCommandBuilder().setName('ping').setDescription('Check latency')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log('[Bot] ' + client.user.tag);
    client.user.setActivity('/obfuscate', { type: ActivityType.Watching });
    if (CLIENT_ID) {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('[Bot] Commands OK\n');
        } catch (e) { console.error(e.message); }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        return interaction.reply('🏓 ' + (Date.now() - interaction.createdTimestamp) + 'ms');
    }

    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x58a6ff)
            .setTitle('🛡️ LuaGuard v5.3 Final')
            .setDescription('Advanced Lua Obfuscator')
            .addFields(
                { name: '⚡ Performance', value: '```Comments + Clean```', inline: true },
                { name: '⚖️ Balanced', value: '```+ Vars + Strings```', inline: true },
                { name: '🔒 Max Security', value: '```+ Numbers + Dead```', inline: true },
                { name: '🎨 10 Variable Styles', value: '_lIl1Il, _0xABCD, _oO0OoO, _S5Z2B8, _xYaBcD, _ABCD123, _abcd789, __a__b__, _v1d2f3, _XyZaBc123', inline: false }
            )
            .setFooter({ text: 'Delta Compatible • No Anti-Tamper' });
        return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        if (!['.lua', '.luau', '.txt'].some(e => file.name.toLowerCase().endsWith(e))) {
            return interaction.reply({ content: '❌ Invalid file type', ephemeral: true });
        }
        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({ content: '❌ Max 2MB', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const res = await axios.get(file.url, { responseType: 'arraybuffer' });
            const source = res.data.toString('utf-8');

            if (!source.trim()) return interaction.editReply('❌ Empty file');

            const start = Date.now();
            const obf = new LuaGuardFinal(preset);
            const result = obf.obfuscate(source);
            const time = ((Date.now() - start) / 1000).toFixed(2);

            const buf = Buffer.from(result.code, 'utf-8');
            const outName = file.name.replace(/\.(lua|luau|txt)$/i, '_obf.lua');
            const attachment = new AttachmentBuilder(buf, { name: outName });

            const colors = { performance: 0x3fb950, balanced: 0x58a6ff, maxSecurity: 0xf85149 };
            const icons = { performance: '⚡', balanced: '⚖️', maxSecurity: '🔒' };

            const embed = new EmbedBuilder()
                .setColor(colors[preset])
                .setTitle(icons[preset] + ' Obfuscation Complete')
                .addFields(
                    { name: '📄 File', value: '`' + file.name + '`', inline: true },
                    { name: '⚙️ Preset', value: preset, inline: true },
                    { name: '⏱️ Time', value: time + 's', inline: true },
                    { name: '📊 Size', value: source.length + ' → ' + result.code.length + ' bytes', inline: true },
                    { name: '🔧 Transforms', value: '```' + result.logs.join('\n') + '```', inline: false }
                )
                .setFooter({ text: 'LuaGuard v5.3 Final | Delta Compatible' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (e) {
            console.error(e);
            await interaction.editReply('❌ Error: ' + e.message);
        }
    }
});

if (TOKEN) client.login(TOKEN);
