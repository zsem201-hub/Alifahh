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
        
        // Character sets untuk nama variable yang acak
        this.charSets = {
            ilI: ['l', 'I', '1', 'i', 'L'],           // Confusing chars
            oO0: ['o', 'O', '0', 'Q'],                // Similar looking
            mixed: ['l', 'I', '1', 'i', 'O', '0', 'S', '5', 'Z', '2', 'B', '8'],
            alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            hex: '0123456789ABCDEF'
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

    // Generate confusing variable name (Luraph style)
    genVarName() {
        const styles = [
            // Style 1: IllIlIlI (confusing l, I, 1)
            () => {
                let name = '_';
                const chars = this.charSets.ilI;
                for (let i = 0; i < this.rand(6, 10); i++) {
                    name += this.randItem(chars);
                }
                return name;
            },
            // Style 2: _0xABCD1234
            () => {
                let hex = '';
                for (let i = 0; i < 8; i++) {
                    hex += this.charSets.hex[this.rand(0, 15)];
                }
                return `_0x${hex}`;
            },
            // Style 3: _OoO0oO0O (confusing o, O, 0)
            () => {
                let name = '_';
                const chars = this.charSets.oO0;
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
            // Style 5: _____ (underscores with hidden chars)
            () => {
                let name = '';
                for (let i = 0; i < this.rand(8, 12); i++) {
                    name += Math.random() > 0.3 ? '_' : this.randItem(this.charSets.ilI);
                }
                return name;
            }
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

    // Encode string dengan variasi metode
    encodeString(str) {
        if (!str || str.length === 0) return '""';
        
        const methods = [
            // Method 1: string.char dengan variasi format angka
            () => {
                const codes = [];
                for (let i = 0; i < str.length; i++) {
                    const code = str.charCodeAt(i);
                    // Random format: decimal, hex, atau math expression
                    const format = this.rand(0, 2);
                    if (format === 0) {
                        codes.push(code.toString());
                    } else if (format === 1) {
                        codes.push(`0x${code.toString(16).toUpperCase()}`);
                    } else {
                        // Math expression
                        const a = this.rand(1, code - 1);
                        codes.push(`(${a}+${code - a})`);
                    }
                }
                return `string.char(${codes.join(',')})`;
            },
            // Method 2: Concatenated string.char
            () => {
                if (str.length > 10) return null; // Too long for this method
                const parts = [];
                for (let i = 0; i < str.length; i++) {
                    const code = str.charCodeAt(i);
                    parts.push(`string.char(${code})`);
                }
                return `(${parts.join('..')})`;
            },
            // Method 3: Mixed hex in string.char
            () => {
                const codes = [];
                for (let i = 0; i < str.length; i++) {
                    const code = str.charCodeAt(i);
                    codes.push(Math.random() > 0.5 ? `0x${code.toString(16).toUpperCase()}` : code);
                }
                return `string.char(${codes.join(',')})`;
            }
        ];

        const method = methods[this.rand(0, methods.length - 1)];
        const result = method();
        return result || methods[0]();
    }

    // Convert number dengan variasi
    encodeNumber(num) {
        if (num < 2 || num > 50000 || !Number.isInteger(num)) return num.toString();
        
        const methods = [
            // Hex
            () => `0x${num.toString(16).toUpperCase()}`,
            // Addition
            () => {
                const a = this.rand(1, num - 1);
                return `(${a}+${num - a})`;
            },
            // Subtraction
            () => {
                const a = num + this.rand(1, 100);
                return `(${a}-${a - num})`;
            },
            // Multiplication (if divisible)
            () => {
                for (let i = 2; i <= Math.min(10, Math.sqrt(num)); i++) {
                    if (num % i === 0) return `(${i}*${num/i})`;
                }
                return null;
            },
            // Bit operations
            () => {
                if (num <= 255) {
                    return `bit32.band(0x${(num + this.rand(1, 100)).toString(16).toUpperCase()},0x${num.toString(16).toUpperCase()})`;
                }
                return null;
            },
            // Double negation
            () => `(-(-${num}))`
        ];

        for (let i = 0; i < 3; i++) {
            const method = methods[this.rand(0, methods.length - 1)];
            const result = method();
            if (result) return result;
        }
        return `0x${num.toString(16).toUpperCase()}`;
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

    // 5. Minify (COMPACT)
    minify(code) {
        // Remove empty lines and trim
        let lines = code.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        // Join dengan semicolon dimana memungkinkan
        let result = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = lines[i + 1] || '';
            
            result += line;
            
            // Tambah newline hanya jika diperlukan
            const needsNewline = 
                line.endsWith('then') || 
                line.endsWith('do') || 
                line.endsWith('else') ||
                line.endsWith('function') ||
                line === 'end' ||
                nextLine.startsWith('end') ||
                nextLine.startsWith('else') ||
                nextLine.startsWith('elseif') ||
                nextLine.startsWith('until') ||
                line.endsWith('end') ||
                (line.includes('function') && line.endsWith(')'));
                
            if (needsNewline && i < lines.length - 1) {
                result += '\n';
            } else if (i < lines.length - 1) {
                // Coba gabung dengan semicolon atau spasi
                if (!line.endsWith(';') && !line.endsWith(',') && !nextLine.startsWith('local') && !nextLine.startsWith('if') && !nextLine.startsWith('for') && !nextLine.startsWith('while')) {
                    result += ';';
                } else {
                    result += ' ';
                }
            }
        }

        this.logs.push('Minified');
        return result;
    }

    // 6. Add Wrapper
    addWrapper(code) {
        if (this.preset === 'performance') return code;
        
        const wrapperVar = this.genVarName();
        this.logs.push('Wrapped');
        
        if (this.preset === 'maxSecurity') {
            // Anti-tamper wrapper
            const key = this.rand(1000, 9999);
            return `local ${wrapperVar}=${key};if(${wrapperVar}~=${key})then return end;do\n${code}\nend`;
        }
        return `do\n${code}\nend`;
    }

    // Generate Header (compact)
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
