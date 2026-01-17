require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, 
    SlashCommandBuilder, ActivityType, EmbedBuilder, 
    AttachmentBuilder
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
// 🛡️ PROTECTED NAMES (JANGAN UBAH)
// ==========================================
const PROTECTED = new Set([
    // Core
    'game','workspace','script','plugin','shared','Enum','Instance',
    'Vector3','Vector2','CFrame','Color3','BrickColor','UDim','UDim2',
    'Ray','TweenInfo','Region3','Rect','NumberRange','NumberSequence',
    'ColorSequence','PhysicalProperties','Random','Axes','Faces',
    // Functions
    'typeof','require','spawn','delay','wait','tick','time','warn',
    'settings','UserSettings','version','printidentity','elapsedTime',
    // Executor Specific
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
    // Keywords
    'and','break','do','else','elseif','end','false','for','function',
    'goto','if','in','local','nil','not','or','repeat','return',
    'then','true','until','while','continue',
    // Common
    'self','this','Callback','Connect','Wait','Fire','Value'
]);

// ==========================================
// 🔧 LUAGUARD PRO OBFUSCATOR
// ==========================================
class LuaGuardPro {
    constructor(preset) {
        this.preset = preset;
        this.counter = 0;
        this.varMap = new Map();
        this.logs = [];
    }

    // Generate Hex Name (_0x00A1)
    hexName() {
        const hex = (this.counter++).toString(16).toUpperCase().padStart(4, '0');
        return `_0x${hex}`;
    }

    // Cek posisi dalam string
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

    // Encode string ke string.char()
    encodeString(str) {
        if (!str) return '""';
        const codes = [];
        for (let i = 0; i < str.length; i++) codes.push(str.charCodeAt(i));
        return `string.char(${codes.join(',')})`;
    }

    // Number ke Hex
    toHex(num) {
        return `0x${num.toString(16).toUpperCase()}`;
    }

    // 1. Remove Comments (Safe Mode)
    removeComments(code) {
        let result = code;
        let count = 0;

        // Hapus Multiline --[[ ]]
        result = result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, () => { count++; return ' '; });

        // Hapus Singleline -- (Per baris)
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
        
        // Pola Local
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

        // Pola Parameter Function
        const funcRe = /function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
        while ((m = funcRe.exec(code)) !== null) {
            if (m[1].trim()) {
                m[1].split(',').map(p => p.trim()).filter(p => p && p !== '...').forEach(p => {
                    if (!PROTECTED.has(p) && !this.varMap.has(p)) {
                        const newN = this.hexName();
                        this.varMap.set(p, newN);
                        vars.push({ old: p, new: newN });
                    }
                });
            }
        }

        // Pola Loop
        const forRe = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g;
        while ((m = forRe.exec(code)) !== null) {
            [m[1], m[2]].filter(Boolean).forEach(v => {
                if (!PROTECTED.has(v) && !this.varMap.has(v)) {
                    const newN = this.hexName();
                    this.varMap.set(v, newN);
                    vars.push({ old: v, new: newN });
                }
            });
        }

        // Replace (Longest first)
        vars.sort((a, b) => b.old.length - a.old.length);
        for (const v of vars) {
            const re = new RegExp('\\b' + v.old + '\\b', 'g');
            result = result.replace(re, (match, offset) => {
                return this.isInString(result, offset) ? match : v.new;
            });
        }

        if (vars.length > 0) this.logs.push(`Renamed ${vars.length} variables`);
        return result;
    }

    // 3. Encode Strings (Max Security)
    encodeStrings(code) {
        if (this.preset !== 'maxSecurity') return code;

        let result = '';
        let i = 0;
        let encoded = 0;

        while (i < code.length) {
            if ((code[i] === '"' || code[i] === "'") && (i === 0 || code[i-1] !== '\\')) {
                const q = code[i];
                let content = '';
                i++;
                while (i < code.length && !(code[i] === q && code[i-1] !== '\\')) {
                    content += code[i];
                    i++;
                }
                i++; // skip closing quote

                // Encode logic: panjang > 3 dan tidak mengandung escape
                if (content.length > 3 && !content.includes('\\') && !content.includes('\n')) {
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

        if (encoded > 0) this.logs.push(`Encoded ${encoded} strings`);
        return result;
    }

    // 4. Obfuscate Numbers
    obfuscateNumbers(code) {
        if (this.preset !== 'maxSecurity') return code;
        let count = 0;
        const result = code.replace(/\b(\d+)\b/g, (match, num, offset) => {
            if (this.isInString(code, offset)) return match;
            const n = parseInt(num);
            if (isNaN(n) || n > 100000 || n < 10) return match;
            count++;
            return this.toHex(n);
        });
        if (count > 0) this.logs.push(`Converted ${count} numbers`);
        return result;
    }

    // 5. Minify (SAFE MODE - NO AGGRESSIVE MERGING)
    minify(code) {
        // Hanya hapus baris kosong dan trim. JANGAN gabung baris untuk hindari syntax error.
        let lines = code.split('\n');
        lines = lines.map(l => l.trim()).filter(l => l !== '');
        this.logs.push('Cleaned structure');
        return lines.join('\n');
    }

    // 6. Wrapper (DO BLOCK - SAFER THAN IIFE)
    wrapCode(code) {
        if (this.preset === 'performance') return code;
        this.logs.push('Added safety wrapper');
        // Gunakan 'do ... end' untuk membuat scope lokal tanpa memanggil fungsi (menghindari call nil value)
        return `do\n${code}\nend`;
    }

    // Header Generator
    generateHeader() {
        const date = new Date().toISOString().split('T')[0];
        const pMap = {
            'performance': 'Performance',
            'balanced': 'Balanced',
            'maxSecurity': 'Max Security'
        };
        return [
            '-- /////////////////////////////////////////////////////////////////',
            '-- /// LuaGuard Protected Script',
            `-- /// Preset: ${pMap[this.preset]}`,
            `-- /// Date: ${date}`,
            '-- /// Status: Active',
            '-- /////////////////////////////////////////////////////////////////',
            ''
        ].join('\n');
    }

    obfuscate(source) {
        let code = source;
        code = this.removeComments(code);
        code = this.renameVars(code);
        code = this.encodeStrings(code);
        code = this.obfuscateNumbers(code);
        code = this.minify(code);
        code = this.wrapCode(code);
        return { code: this.generateHeader() + code, logs: this.logs };
    }
}

// ==========================================
// 🌐 WEB SERVER
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('LuaGuard Bot Online'));
app.listen(process.env.PORT || 3000, () => console.log('Server OK'));

// ==========================================
// 🤖 DISCORD BOT
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

console.log('\n[LuaGuard] Starting...');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Protect Lua Script')
        .addAttachmentOption(o => o.setName('file').setDescription('.lua file').setRequired(true))
        .addStringOption(o => o.setName('preset').setDescription('Level').addChoices(
            { name: 'Performance', value: 'performance' },
            { name: 'Balanced', value: 'balanced' },
            { name: 'Max Security', value: 'maxSecurity' }
        )),
    new SlashCommandBuilder().setName('help').setDescription('Show help')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`[LuaGuard] Logged in as ${client.user.tag}`);
    client.user.setActivity('/obfuscate', { type: ActivityType.Listening });
    if (CLIENT_ID) {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('[LuaGuard] Commands registered\n');
        } catch (e) { console.error(e); }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ LuaGuard Help')
            .setDescription('Professional Lua Obfuscator')
            .addFields(
                { name: 'Presets', value: '⚡ Performance\n⚖️ Balanced\n🔒 Max Security' },
                { name: 'Supported', value: 'Lua, Luau, txt' }
            );
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        if (!['.lua', '.luau', '.txt'].some(e => file.name.toLowerCase().endsWith(e))) {
            return interaction.reply({ content: '❌ File must be .lua .luau .txt', ephemeral: true });
        }
        if (file.size > 2 * 1024 * 1024) return interaction.reply({ content: '❌ Max 2MB', ephemeral: true });

        await interaction.deferReply();

        try {
            const res = await axios.get(file.url, { responseType: 'arraybuffer' });
            const source = res.data.toString('utf-8');

            if (!source.trim()) return interaction.editReply('❌ Empty file');

            const start = Date.now();
            const obf = new LuaGuardPro(preset);
            const result = obf.obfuscate(source);
            const time = ((Date.now() - start) / 1000).toFixed(2);

            const buf = Buffer.from(result.code, 'utf-8');
            const outName = file.name.replace(/\.(lua|luau|txt)$/i, '_protected.lua');
            const attachment = new AttachmentBuilder(buf, { name: outName });

            const embed = new EmbedBuilder()
                .setColor(preset === 'maxSecurity' ? 0xED4245 : 0x5865F2)
                .setTitle('✅ Obfuscation Successful')
                .addFields(
                    { name: 'File', value: `\`${file.name}\``, inline: true },
                    { name: 'Preset', value: preset, inline: true },
                    { name: 'Size', value: `${source.length} → ${result.code.length} bytes`, inline: true },
                    { name: 'Transforms', value: result.logs.map(l => `> ${l}`).join('\n') || 'None', inline: false }
                )
                .setFooter({ text: 'LuaGuard v2.0 • Luraph Style Output' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ Error: ${e.message}`);
        }
    }
});

if (TOKEN) client.login(TOKEN);
else console.log('❌ No Token');
