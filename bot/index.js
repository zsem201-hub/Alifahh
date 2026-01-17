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
// LUAGUARD ADVANCED v4.0
// ==========================================
class LuaGuardV4 {
    constructor(preset) {
        this.preset = preset;
        this.varCounter = 0;
        this.varMap = new Map();
        this.stringTable = [];
        this.logs = [];
        this.xorKey = this.rand(50, 200);
        
        // Character sets untuk nama variable
        this.charSets = {
            confusing1: ['l', 'I', '1', 'i', 'L'],
            confusing2: ['o', 'O', '0', 'Q'],
            mixed: ['l', 'I', '1', 'O', '0', 'S', '5', 'Z', '2'],
            hex: '0123456789ABCDEF',
            underscore: ['_', 'l', 'I', '_', '1']
        };
    }

    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Generate variable name dengan berbagai style
    genVarName() {
        const styles = [
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(6, 10); i++) {
                    name += this.randItem(this.charSets.confusing1);
                }
                return name;
            },
            () => {
                let hex = '';
                for (let i = 0; i < 8; i++) {
                    hex += this.charSets.hex[this.rand(0, 15)];
                }
                return `_0x${hex}`;
            },
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(5, 8); i++) {
                    name += this.randItem(this.charSets.confusing2);
                }
                return name;
            },
            () => {
                let name = '_';
                for (let i = 0; i < this.rand(6, 9); i++) {
                    name += this.randItem(this.charSets.mixed);
                }
                return name;
            },
            () => {
                let name = '';
                for (let i = 0; i < this.rand(8, 12); i++) {
                    name += this.randItem(this.charSets.underscore);
                }
                return name;
            }
        ];

        this.varCounter++;
        const style = styles[this.rand(0, styles.length - 1)];
        return style() + this.varCounter.toString(36);
    }

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

    // XOR encrypt string
    xorEncrypt(str, key) {
        const result = [];
        for (let i = 0; i < str.length; i++) {
            result.push(str.charCodeAt(i) ^ key);
        }
        return result;
    }

    // Generate string decoder function
    genStringDecoder() {
        const decoderName = this.genVarName();
        const keyVar = this.genVarName();
        
        return {
            name: decoderName,
            code: `local ${keyVar}=${this.xorKey}
local ${decoderName}=function(${this.genVarName()})
local ${this.genVarName()}=""
for ${this.genVarName()}=1,#${this.genVarName()} do
${this.genVarName()}=${this.genVarName()}..string.char(bit32.bxor(${this.genVarName()}[${this.genVarName()}],${keyVar}))
end
return ${this.genVarName()}
end`
        };
    }

    // Encode string dengan XOR + table
    encodeStringXOR(str) {
        const encrypted = this.xorEncrypt(str, this.xorKey);
        return `{${encrypted.join(',')}}`;
    }

    // Encode string dengan variasi metode
    encodeString(str) {
        if (!str || str.length === 0) return '""';
        
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            const format = this.rand(0, 3);
            
            switch(format) {
                case 0: codes.push(code.toString()); break;
                case 1: codes.push(`0x${code.toString(16).toUpperCase()}`); break;
                case 2: 
                    const a = this.rand(1, Math.max(1, code - 1));
                    codes.push(`(${a}+${code - a})`);
                    break;
                case 3:
                    codes.push(`bit32.band(${code + this.rand(1,50)},${code})`);
                    break;
            }
        }
        return `string.char(${codes.join(',')})`;
    }

    // Encode number dengan variasi kompleks
    encodeNumber(num) {
        if (num < 2 || num > 50000 || !Number.isInteger(num)) return num.toString();
        
        const methods = [
            () => `0x${num.toString(16).toUpperCase()}`,
            () => {
                const a = this.rand(1, num - 1);
                return `(${a}+${num - a})`;
            },
            () => {
                const a = num + this.rand(1, 100);
                return `(${a}-${a - num})`;
            },
            () => `(-(-${num}))`,
            () => {
                for (let i = 2; i <= Math.min(10, Math.sqrt(num)); i++) {
                    if (num % i === 0) return `(${i}*${num/i})`;
                }
                return null;
            },
            () => `bit32.band(${num},${num})`,
            () => `bit32.bor(${num},0)`,
            () => {
                const shift = this.rand(1, 4);
                const base = num >> shift;
                if ((base << shift) === num) {
                    return `bit32.lshift(${base},${shift})`;
                }
                return null;
            }
        ];

        for (let i = 0; i < 5; i++) {
            const method = methods[this.rand(0, methods.length - 1)];
            const result = method();
            if (result) return result;
        }
        return `0x${num.toString(16).toUpperCase()}`;
    }

    // Generate opaque predicate (selalu true)
    genOpaqueTrue() {
        const predicates = [
            () => {
                const a = this.rand(1, 100);
                return `(${a}*${a}>=${0})`;
            },
            () => {
                const a = this.rand(1, 100);
                return `(type(${a})=="number")`;
            },
            () => `(true or false)`,
            () => `(not not true)`,
            () => {
                const a = this.rand(1, 50);
                const b = this.rand(51, 100);
                return `(${a}<${b})`;
            },
            () => `(1==1)`,
            () => `(nil==nil)`
        ];
        return predicates[this.rand(0, predicates.length - 1)]();
    }

    // Generate opaque predicate (selalu false)
    genOpaqueFalse() {
        const predicates = [
            () => {
                const a = this.rand(1, 100);
                return `(${a}*${a}<${0})`;
            },
            () => `(type(nil)=="number")`,
            () => `(false and true)`,
            () => `(not true)`,
            () => {
                const a = this.rand(51, 100);
                const b = this.rand(1, 50);
                return `(${a}<${b})`;
            },
            () => `(1==0)`,
            () => `(nil~=nil)`
        ];
        return predicates[this.rand(0, predicates.length - 1)]();
    }

    // Generate dead code yang terlihat nyata
    genDeadCode() {
        const deadCodes = [
            () => {
                const v = this.genVarName();
                return `local ${v}=function()return nil end`;
            },
            () => {
                const v = this.genVarName();
                return `local ${v}={}`;
            },
            () => {
                const v = this.genVarName();
                const n = this.rand(1, 1000);
                return `local ${v}=${this.encodeNumber(n)}`;
            },
            () => {
                const v = this.genVarName();
                return `local ${v}=function(${this.genVarName()})return ${this.genVarName()} end`;
            },
            () => {
                const v = this.genVarName();
                return `local ${v}=select(1,nil)`;
            },
            () => {
                return `if ${this.genOpaqueFalse()} then local ${this.genVarName()}=0 end`;
            },
            () => {
                const v = this.genVarName();
                return `local ${v}=rawget({},1)`;
            },
            () => {
                const v = this.genVarName();
                return `local ${v}=type(nil)`;
            }
        ];
        return deadCodes[this.rand(0, deadCodes.length - 1)]();
    }

    // Generate anti-tamper code
    genAntiTamper() {
        const checkVar = this.genVarName();
        const key1 = this.rand(1000, 9999);
        const key2 = key1;
        
        return `local ${checkVar}=${key1}
if ${checkVar}~=${key2} then return end
if ${this.genOpaqueFalse()} then while true do end end`;
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

    // 5. Inject Dead Code
    injectDeadCode(code) {
        if (this.preset !== 'maxSecurity') return code;

        const lines = code.split('\n');
        const newLines = [];
        let injected = 0;

        // Inject di awal
        for (let i = 0; i < this.rand(2, 4); i++) {
            newLines.push(this.genDeadCode());
            injected++;
        }

        // Inject di tengah-tengah
        for (let i = 0; i < lines.length; i++) {
            newLines.push(lines[i]);
            
            // Random inject setelah beberapa baris
            if (i > 0 && i < lines.length - 1 && this.rand(1, 10) <= 2) {
                newLines.push(this.genDeadCode());
                injected++;
            }
        }

        this.logs.push(`DeadCode: +${injected}`);
        return newLines.join('\n');
    }

    // 6. Add Opaque Predicates
    addOpaquePredicates(code) {
        if (this.preset !== 'maxSecurity') return code;

        let count = 0;
        
        // Wrap beberapa bagian dengan opaque predicates
        const result = code.replace(/\bif\s+(.+?)\s+then/g, (match, condition) => {
            if (this.rand(1, 3) === 1) {
                count++;
                return `if (${this.genOpaqueTrue()}) and (${condition}) then`;
            }
            return match;
        });

        if (count > 0) this.logs.push(`Opaque: +${count}`);
        return result;
    }

    // 7. Minify (Safe)
    minify(code) {
        let lines = code.split('\n').map(l => l.trim()).filter(l => l !== '');
        let result = lines.join('\n');
        result = result.replace(/\n{2,}/g, '\n');
        this.logs.push('Minified');
        return result;
    }

    // 8. Add Wrapper dengan Anti-Tamper
    addWrapper(code) {
        if (this.preset === 'performance') return code;
        
        this.logs.push('Wrapped');
        
        if (this.preset === 'maxSecurity') {
            const antiTamper = this.genAntiTamper();
            return `${antiTamper}\ndo\n${code}\nend`;
        }
        return `do\n${code}\nend`;
    }

    // Generate Header
    getHeader() {
        const id = Math.random().toString(36).substring(2, 12).toUpperCase();
        const date = new Date().toISOString().split('T')[0];
        return `--[[ LuaGuard v4.0 | ${id} | ${date} ]]\n`;
    }

    // Main obfuscate
    obfuscate(source) {
        let code = source;

        code = this.removeComments(code);
        code = this.renameVars(code);
        code = this.encodeStrings(code);
        code = this.obfuscateNumbers(code);
        code = this.injectDeadCode(code);
        code = this.addOpaquePredicates(code);
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
    <title>LuaGuard v4.0</title>
    <style>
        body{font-family:Arial;background:#0d1117;color:#c9d1d9;text-align:center;padding:50px}
        h1{color:#58a6ff}
        .online{color:#3fb950;font-size:1.2em}
        .box{background:#161b22;padding:20px;border-radius:10px;max-width:400px;margin:20px auto;border:1px solid #30363d}
        code{background:#21262d;padding:2px 6px;border-radius:3px}
    </style>
</head>
<body>
    <h1>LuaGuard Obfuscator</h1>
    <p class="online">● Online</p>
    <div class="box">
        <p>Version 4.0 - Phase 4</p>
        <p>Use <code>/obfuscate</code> in Discord</p>
    </div>
    <p style="color:#8b949e">Advanced Lua Protection</p>
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

console.log('\n╔════════════════════════════════════════╗');
console.log('║       LuaGuard v4.0 - Phase 4          ║');
console.log('╠════════════════════════════════════════╣');
console.log(`║  Token: ${TOKEN ? '✓ OK' : '✗ Missing'}                          ║`);
console.log(`║  Client: ${CLIENT_ID ? '✓ OK' : '✗ Missing'}                         ║`);
console.log('╚════════════════════════════════════════╝\n');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate Lua script with advanced protection')
        .addAttachmentOption(o => 
            o.setName('file')
             .setDescription('Upload .lua, .luau, or .txt file')
             .setRequired(true))
        .addStringOption(o => 
            o.setName('preset')
             .setDescription('Protection level')
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
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    client.user.setActivity('/obfuscate | v4.0', { type: ActivityType.Watching });

    if (CLIENT_ID) {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('[Bot] Commands registered!\n');
        } catch (e) {
            console.error('[Bot] Error:', e.message);
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        const latency = Date.now() - interaction.createdTimestamp;
        return interaction.reply(`🏓 Pong! Latency: \`${latency}ms\` | API: \`${client.ws.ping}ms\``);
    }

    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ LuaGuard v4.0 - Help')
            .setDescription('Advanced Lua Obfuscator for Roblox')
            .addFields(
                { 
                    name: '⚡ Performance', 
                    value: '```\n• Comment removal\n• Whitespace cleanup\n```', 
                    inline: true 
                },
                { 
                    name: '⚖️ Balanced', 
                    value: '```\n• Variable renaming\n• String encoding\n• Wrapper\n```', 
                    inline: true 
                },
                { 
                    name: '🔒 Max Security', 
                    value: '```\n• Number obfuscation\n• Dead code injection\n• Opaque predicates\n• Anti-tamper\n```', 
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
                    name: '🎮 Compatibility',
                    value: 'All Executors',
                    inline: true
                }
            )
            .setFooter({ text: 'LuaGuard v4.0 | Phase 4' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'obfuscate') {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';

        const validExt = ['.lua', '.luau', '.txt'];
        if (!validExt.some(e => file.name.toLowerCase().endsWith(e))) {
            return interaction.reply({ 
                content: '❌ **Error:** Only .lua, .luau, or .txt files allowed!', 
                ephemeral: true 
            });
        }

        if (file.size > 2 * 1024 * 1024) {
            return interaction.reply({ 
                content: '❌ **Error:** File too large! Max 2MB.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        try {
            const res = await axios.get(file.url, { responseType: 'arraybuffer' });
            const source = res.data.toString('utf-8');

            if (!source.trim()) {
                return interaction.editReply('❌ **Error:** File is empty!');
            }

            const startTime = Date.now();
            const obfuscator = new LuaGuardV4(preset);
            const result = obfuscator.obfuscate(source);
            const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

            const outputBuffer = Buffer.from(result.code, 'utf-8');
            const outputName = file.name.replace(/\.(lua|luau|txt)$/i, '_obf.lua');
            const attachment = new AttachmentBuilder(outputBuffer, { name: outputName });

            const originalSize = source.length;
            const newSize = result.code.length;
            const ratio = ((newSize / originalSize) * 100).toFixed(0);

            const presetInfo = {
                'performance': { color: 0x57F287, icon: '⚡' },
                'balanced': { color: 0x5865F2, icon: '⚖️' },
                'maxSecurity': { color: 0xED4245, icon: '🔒' }
            };

            const embed = new EmbedBuilder()
                .setColor(presetInfo[preset].color)
                .setTitle(`${presetInfo[preset].icon} Obfuscation Complete!`)
                .setDescription('Your script has been protected.')
                .addFields(
                    { name: '📄 Input', value: `\`${file.name}\``, inline: true },
                    { name: '📦 Output', value: `\`${outputName}\``, inline: true },
                    { name: '⚙️ Preset', value: preset, inline: true },
                    { name: '📊 Original', value: `\`${originalSize.toLocaleString()}\` bytes`, inline: true },
                    { name: '📈 Result', value: `\`${newSize.toLocaleString()}\` bytes`, inline: true },
                    { name: '📐 Ratio', value: `\`${ratio}%\``, inline: true },
                    { name: '⏱️ Time', value: `\`${processTime}s\``, inline: true },
                    { 
                        name: '🔧 Transforms', 
                        value: '```\n' + result.logs.join('\n') + '\n```', 
                        inline: false 
                    }
                )
                .setFooter({ text: 'LuaGuard v4.0 | Roblox Compatible' })
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });

        } catch (error) {
            console.error('[Error]', error);
            await interaction.editReply(`❌ **Error:** ${error.message}`);
        }
    }
});

if (TOKEN) {
    client.login(TOKEN).catch(e => console.error('[Bot] Login failed:', e.message));
} else {
    console.error('[Bot] No token provided!');
            }
