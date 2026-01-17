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
// LURAPH-STYLE OBFUSCATOR
// ==========================================
class LuraphStyleObfuscator {
    constructor(preset) {
        this.preset = preset;
        this.varCounter = 0;
        this.varMap = new Map();
        this.logs = [];
        
        // =============================================
        // CHARACTER SETS - EDIT DISINI UNTUK CUSTOM
        // =============================================
        this.charSets = {
            // Set 1: Karakter yang mirip (l, I, 1, i)
            confusing1: ['l', 'I', '1', 'i', 'L', 'j', 'h', 'g', 'y', 'd', 's', '$', '5', 'u', 'p', 'm', 'n', 'x', 'b', 'v', 'z', 'c', 'y', 't', 'q'],
            
            // Set 2: Karakter O dan 0 yang mirip
            confusing2: ['o', 'O', '0', 'Q', '5', 'Z', '2', 'B', '8', '7', 'J', 'L', 'p', 'u', 'r', 'h', 'K', 'g', '9', 'w', 'q', 'y', 'z'],
            
            // Set 3: Campuran karakter yang membingungkan
            mixed: ['l', 'I', '1', 'i', 'O', '0', 'S', '5', 'Z', '2', 'B', '8', '7', 'J', 'L', 'p', 'u', 'r', 'h', 'K', 'g', '9', 'w', 'q', 'y', 'z'],
            
            // Set 4: Huruf untuk hex
            hex: '0123456789ABCDEFGHIJKLMNOVQRSTUVWXYZ',
            
            // Set 5: Underscore heavy
            underscore: ['_', 'l', 'I', '_', '_', '1', '#', '&', '$', '!', '+', '-', '@', '€', '*', '~', '{', '}', '(', ')']
            
            // TAMBAHKAN SET BARU DISINI:
            // custom1: ['a', 'b', 'c', ...],
            // symbols: ['α', 'β', 'γ', ...], // Unicode (hati-hati support)
        };
    }

    // Random integer
    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Random item from array
    randItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // =============================================
    // VARIABLE NAME GENERATOR - EDIT DISINI
    // =============================================
    genVarName() {
        const styles = [
            // Style 1: IllIlIlI (l, I, 1 mix)
            () => {
                let name = '_';
                const chars = this.charSets.confusing1;
                for (let i = 0; i < this.rand(6, 10); i++) {
                    name += this.randItem(chars);
                }
                return name;
            },
            
            // Style 2: _0xABCD1234 (hex style)
            () => {
                let hex = '';
                for (let i = 0; i < 8; i++) {
                    hex += this.charSets.hex[this.rand(0, 15)];
                }
                return `_0x${hex}`;
            },
            
            // Style 3: _OoO0oO0O (o, O, 0 mix)
            () => {
                let name = '_';
                const chars = this.charSets.confusing2;
                for (let i = 0; i < this.rand(5, 8); i++) {
                    name += this.randItem(chars);
                }
                return name;
            },
            
            // Style 4: _S5Z2B8 (mixed confusing)
            () => {
                let name = '_';
                const chars = this.charSets.mixed;
                for (let i = 0; i < this.rand(6, 9); i++) {
                    name += this.randItem(chars);
                }
                return name;
            },
            
            // Style 5: ___l_I_1__ (underscore heavy)
            () => {
                let name = '';
                const chars = this.charSets.underscore;
                for (let i = 0; i < this.rand(8, 12); i++) {
                    name += this.randItem(chars);
                }
                return name;
            }
            
            // TAMBAHKAN STYLE BARU DISINI:
            // () => { ... return name; },
        ];

        this.varCounter++;
        const style = styles[this.rand(0, styles.length - 1)];
        return style() + this.varCounter.toString(36);
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
            if (c === '[' && code[i+1] === '[' && !inStr) {
                const end = code.indexOf(']]', i+2);
                if (end > 0 && pos > i && pos < end+2) return true;
            }
        }
        return inStr;
    }

    // =============================================
    // STRING ENCODER - EDIT DISINI UNTUK VARIASI
    // =============================================
    encodeString(str) {
        if (!str || str.length === 0) return '""';
        
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            
            // Random format untuk setiap karakter
            const format = this.rand(0, 2);
            if (format === 0) {
                // Decimal biasa
                codes.push(code.toString());
            } else if (format === 1) {
                // Hexadecimal
                codes.push(`0x${code.toString(16).toUpperCase()}`);
            } else {
                // Math expression
                const a = this.rand(1, Math.max(1, code - 1));
                codes.push(`(${a}+${code - a})`);
            }
        }
        return `string.char(${codes.join(',')})`;
    }

    // =============================================
    // NUMBER ENCODER - EDIT DISINI UNTUK VARIASI
    // =============================================
    encodeNumber(num) {
        if (num < 2 || num > 50000 || !Number.isInteger(num)) return num.toString();
        
        const method = this.rand(0, 4);
        
        switch(method) {
            case 0: // Hex
                return `0x${num.toString(16).toUpperCase()}`;
            case 1: // Addition
                const a = this.rand(1, num - 1);
                return `(${a}+${num - a})`;
            case 2: // Subtraction
                const b = num + this.rand(1, 100);
                return `(${b}-${b - num})`;
            case 3: // Double negation
                return `(-(-${num}))`;
            case 4: // Multiplication (if possible)
                for (let i = 2; i <= Math.min(10, Math.sqrt(num)); i++) {
                    if (num % i === 0) return `(${i}*${num/i})`;
                }
                return `0x${num.toString(16).toUpperCase()}`;
            default:
                return num.toString();
        }
    }

    // ======== TRANSFORMS ========

    // 1. Remove Comments
    removeComments(code) {
        let result = code;
        let count = 0;

        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => { count++; return ''; });

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

        if (count > 0) this.logs.push(`Comments: -${count}`);
        return result;
    }

    // 2. Rename Variables
    renameVars(code) {
        if (this.preset === 'performance') return code;

        let result = code;
        const vars = [];

        // Collect all variables
        const localRe = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let m;
        while ((m = localRe.exec(code)) !== null) {
            const name = m[1];
            if (!PROTECTED.has(name) && !this.varMap.has(name)) {
                const newN = this.genVarName();
                this.varMap.set(name, newN);
                vars.push({ old: name, new: newN });
            }
        }

        // Function params
        const funcRe = /function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
        while ((m = funcRe.exec(code)) !== null) {
            if (m[1].trim()) {
                m[1].split(',').map(p => p.trim()).filter(p => p && p !== '...').forEach(p => {
                    if (!PROTECTED.has(p) && !this.varMap.has(p)) {
                        const newN = this.genVarName();
                        this.varMap.set(p, newN);
                        vars.push({ old: p, new: newN });
                    }
                });
            }
        }

        // For loop vars
        const forRe = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g;
        while ((m = forRe.exec(code)) !== null) {
            [m[1], m[2]].filter(Boolean).forEach(v => {
                if (!PROTECTED.has(v) && !this.varMap.has(v)) {
                    const newN = this.genVarName();
                    this.varMap.set(v, newN);
                    vars.push({ old: v, new: newN });
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

        if (vars.length > 0) this.logs.push(`Variables: ${vars.length}`);
        return result;
    }

    // 3. Encode Strings
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

                const hasEscape = content.includes('\\');
                if (content.length >= 3 && !hasEscape) {
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

    // 4. Obfuscate Numbers
    obfuscateNumbers(code) {
        if (this.preset !== 'maxSecurity') return code;

        let count = 0;
        const result = code.replace(/(?<![.\w])(\d+)(?![.\w\d])/g, (match, num, offset) => {
            if (this.isInString(code, offset)) return match;
            const prevChar = offset > 0 ? code[offset - 1] : '';
            if (prevChar === '.') return match;
            
            const n = parseInt(num);
            if (isNaN(n) || n < 2 || n > 50000) return match;
            
            count++;
            return this.encodeNumber(n);
        });

        if (count > 0) this.logs.push(`Numbers: ${count}`);
        return result;
    }

    // 5. Minify (SAFE - FIXED)
    minify(code) {
        // Hapus baris kosong dan trim setiap baris
        let lines = code.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        // Gabungkan dengan newline (AMAN)
        let result = lines.join('\n');
        
        // Hapus multiple newlines
        result = result.replace(/\n{2,}/g, '\n');
        
        this.logs.push('Minified');
        return result;
    }

    // 6. Add Wrapper
    addWrapper(code) {
        if (this.preset === 'performance') return code;
        
        const wrapperVar = this.genVarName();
        this.logs.push('Wrapped');
        
        if (this.preset === 'maxSecurity') {
            const key = this.rand(1000, 9999);
            return `local ${wrapperVar}=${key}\nif ${wrapperVar}~=${key} then return end\ndo\n${code}\nend`;
        }
        return `do\n${code}\nend`;
    }

    // Generate Header
    getHeader() {
        const id = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `--[[ LuaGuard v3.5 | ${id} ]]\n`;
    }

    // Main
    obfuscate(source) {
        let code = source;

        code = this.removeComments(code);
        code = this.renameVars(code);
        code = this.encodeStrings(code);
        code = this.obfuscateNumbers(code);
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
app.get('/', (req, res) => res.send('LuaGuard v3.5 Online'));
app.listen(process.env.PORT || 3000, () => console.log('[Server] OK'));

// ==========================================
// DISCORD BOT
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log(`\n[LuaGuard v3.5] Token: ${TOKEN ? 'OK' : 'X'} | Client: ${CLIENT_ID ? 'OK' : 'X'}\n`);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate Lua script (Luraph style)')
        .addAttachmentOption(o => o.setName('file').setDescription('.lua file').setRequired(true))
        .addStringOption(o => o.setName('preset').setDescription('Level').addChoices(
            { name: 'Performance', value: 'performance' },
            { name: 'Balanced', value: 'balanced' },
            { name: 'Max Security', value: 'maxSecurity' }
        )),
    new SlashCommandBuilder().setName('help').setDescription('Help'),
    new SlashCommandBuilder().setName('ping').setDescription('Ping')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`[Bot] ${client.user.tag}`);
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
        return interaction.reply(`Pong: ${Date.now() - interaction.createdTimestamp}ms`);
    }

    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('LuaGuard v3.5')
            .setDescription('Luraph-style Lua Obfuscator')
            .addFields(
                { name: 'Performance', value: 'Comments removal', inline: true },
                { name: 'Balanced', value: '+ Var rename + Strings', inline: true },
                { name: 'Max Security', value: '+ Numbers + Anti-tamper', inline: true }
            );
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
            if (!source.trim()) return interaction.editReply('Error: Empty file');

            const start = Date.now();
            const obf = new LuraphStyleObfuscator(preset);
            const result = obf.obfuscate(source);
            const time = ((Date.now() - start) / 1000).toFixed(2);

            const buf = Buffer.from(result.code, 'utf-8');
            const outName = file.name.replace(/\.(lua|luau|txt)$/i, '_obf.lua');
            const attachment = new AttachmentBuilder(buf, { name: outName });

            const embed = new EmbedBuilder()
                .setColor(preset === 'maxSecurity' ? 0xED4245 : 0x5865F2)
                .setTitle('Obfuscation Complete')
                .addFields(
                    { name: 'File', value: `\`${file.name}\``, inline: true },
                    { name: 'Preset', value: preset, inline: true },
                    { name: 'Time', value: `${time}s`, inline: true },
                    { name: 'Size', value: `${source.length} → ${result.code.length}`, inline: true },
                    { name: 'Transforms', value: result.logs.join(' | ') || 'None', inline: false }
                )
                .setFooter({ text: 'LuaGuard v3.5 | Luraph Style' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (e) {
            console.error(e);
            await interaction.editReply(`Error: ${e.message}`);
        }
    }
});

if (TOKEN) client.login(TOKEN);
