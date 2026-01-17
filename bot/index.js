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
// LUAGUARD v5.2 - ULTRA SAFE
// ==========================================
class LuaGuardSafe {
    constructor(preset) {
        this.preset = preset;
        this.varCounter = 0;
        this.varMap = new Map();
        this.logs = [];
    }

    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Simple variable name - hanya huruf dan angka
    genVarName() {
        this.varCounter++;
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        let name = '_';
        for (let i = 0; i < 4; i++) {
            name += letters[this.rand(0, 25)];
        }
        return name + this.varCounter;
    }

    // Check if inside string
    isInString(code, pos) {
        let inStr = false;
        let q = '';
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
        }
        return inStr;
    }

    // Simple string encode - HANYA decimal
    encodeString(str) {
        if (!str || str.length === 0) return '""';
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            codes.push(str.charCodeAt(i));
        }
        return 'string.char(' + codes.join(',') + ')';
    }

    // TRANSFORM 1: Remove Comments
    removeComments(code) {
        let result = code;
        
        // Remove --[[ ]]
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, '');
        
        // Remove -- line comments
        const lines = result.split('\n');
        result = lines.map(line => {
            let inStr = false;
            let q = '';
            for (let i = 0; i < line.length - 1; i++) {
                const c = line[i];
                const prev = i > 0 ? line[i - 1] : '';
                if ((c === '"' || c === "'") && prev !== '\\') {
                    if (!inStr) {
                        inStr = true;
                        q = c;
                    } else if (c === q) {
                        inStr = false;
                    }
                }
                if (!inStr && c === '-' && line[i + 1] === '-') {
                    return line.slice(0, i).trimEnd();
                }
            }
            return line;
        }).join('\n');
        
        this.logs.push('Comments removed');
        return result;
    }

    // TRANSFORM 2: Rename Variables
    renameVars(code) {
        if (this.preset === 'performance') return code;
        
        let result = code;
        const vars = [];
        
        // Find local declarations
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
        
        // Find function params
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
        
        // Find for loop vars
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
        
        // Sort longest first
        vars.sort((a, b) => b.old.length - a.old.length);
        
        // Replace
        for (const v of vars) {
            const re = new RegExp('\\b' + v.old + '\\b', 'g');
            result = result.replace(re, (match, offset) => {
                return this.isInString(result, offset) ? match : v.new;
            });
        }
        
        this.logs.push('Variables: ' + vars.length);
        return result;
    }

    // TRANSFORM 3: Encode Strings (SAFE VERSION)
    encodeStrings(code) {
        if (this.preset === 'performance') return code;
        
        let result = '';
        let i = 0;
        
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
                
                // HANYA encode jika TIDAK ada escape dan panjang >= 4
                const hasEscape = content.includes('\\');
                const hasNewline = content.includes('\n');
                
                if (content.length >= 4 && !hasEscape && !hasNewline) {
                    result += this.encodeString(content);
                } else {
                    result += quote + content + quote;
                }
            } else {
                result += code[i];
                i++;
            }
        }
        
        this.logs.push('Strings encoded');
        return result;
    }

    // TRANSFORM 4: Clean empty lines only (NO AGGRESSIVE MINIFY)
    cleanCode(code) {
        const lines = code.split('\n');
        const cleaned = lines.filter(line => line.trim() !== '');
        this.logs.push('Cleaned');
        return cleaned.join('\n');
    }

    // MAIN OBFUSCATE
    obfuscate(source) {
        let code = source;
        
        code = this.removeComments(code);
        code = this.renameVars(code);
        
        // HANYA encode strings untuk maxSecurity
        if (this.preset === 'maxSecurity') {
            code = this.encodeStrings(code);
        }
        
        code = this.cleanCode(code);
        
        // TIDAK ADA HEADER
        // TIDAK ADA WRAPPER
        // Output langsung kode yang sudah di-obfuscate
        
        return {
            code: code,
            logs: this.logs
        };
    }
}

// ==========================================
// WEB SERVER
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('LuaGuard v5.2 Safe Mode'));
app.listen(process.env.PORT || 3000, () => console.log('[Server] OK'));

// ==========================================
// BOT
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('[LuaGuard v5.2 Safe] Starting...');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate Lua script (Safe Mode)')
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
    console.log('[Bot] ' + client.user.tag);
    client.user.setActivity('/obfuscate', { type: ActivityType.Watching });
    
    if (CLIENT_ID) {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('[Bot] Commands OK');
        } catch (e) {
            console.error(e.message);
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        return interaction.reply('Pong: ' + (Date.now() - interaction.createdTimestamp) + 'ms');
    }

    if (interaction.commandName === 'help') {
        return interaction.reply('Use /obfuscate to protect your Lua script. Safe Mode - No wrapper, no header.');
    }

    if (interaction.commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        if (!['.lua', '.luau', '.txt'].some(e => file.name.toLowerCase().endsWith(e))) {
            return interaction.reply({ content: 'Error: Invalid file', ephemeral: true });
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
            const obf = new LuaGuardSafe(preset);
            const result = obf.obfuscate(source);
            const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

            const buf = Buffer.from(result.code, 'utf-8');
            const outName = file.name.replace(/\.(lua|luau|txt)$/i, '_obf.lua');
            const attachment = new AttachmentBuilder(buf, { name: outName });

            const embed = new EmbedBuilder()
                .setColor(0x00FF88)
                .setTitle('Obfuscation Complete (Safe Mode)')
                .addFields(
                    { name: 'File', value: file.name, inline: true },
                    { name: 'Preset', value: preset, inline: true },
                    { name: 'Time', value: processTime + 's', inline: true },
                    { name: 'Size', value: source.length + ' → ' + result.code.length, inline: true },
                    { name: 'Transforms', value: result.logs.join(', '), inline: false }
                )
                .setFooter({ text: 'LuaGuard v5.2 Safe Mode' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (e) {
            console.error(e);
            await interaction.editReply('Error: ' + e.message);
        }
    }
});

if (TOKEN) client.login(TOKEN);
