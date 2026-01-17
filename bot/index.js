require('dotenv').config();
const {Client,GatewayIntentBits,REST,Routes,SlashCommandBuilder,ActivityType,EmbedBuilder,AttachmentBuilder}=require('discord.js');
const axios=require('axios');
const express=require('express');

// ==========================================
// PROTECTED NAMES
// ==========================================
const PROTECTED=new Set(['game','workspace','script','plugin','shared','Enum','Instance','Vector3','Vector2','CFrame','Color3','BrickColor','UDim','UDim2','Ray','TweenInfo','Region3','Rect','NumberRange','NumberSequence','ColorSequence','PhysicalProperties','Random','Axes','Faces','typeof','require','spawn','delay','wait','tick','time','warn','settings','UserSettings','version','printidentity','elapsedTime','getgenv','getrenv','getfenv','setfenv','getrawmetatable','setrawmetatable','hookfunction','hookmetamethod','newcclosure','islclosure','iscclosure','loadstring','checkcaller','getcallingscript','identifyexecutor','getexecutorname','syn','fluxus','KRNL_LOADED','Drawing','cleardrawcache','isreadonly','setreadonly','firesignal','getconnections','fireproximityprompt','gethui','gethiddenproperty','sethiddenproperty','setsimulationradius','getcustomasset','getsynasset','isnetworkowner','fireclickdetector','firetouchinterest','isrbxactive','request','http_request','HttpGet','httpget','HttpPost','readfile','writefile','appendfile','loadfile','isfile','isfolder','makefolder','delfolder','delfile','listfiles','getscriptbytecode','rconsoleprint','rconsolename','rconsoleclear','rconsoleinput','setclipboard','setfflag','getnamecallmethod','task','_G','_VERSION','assert','collectgarbage','coroutine','debug','dofile','error','gcinfo','getmetatable','setmetatable','ipairs','pairs','next','load','loadfile','newproxy','os','io','pcall','xpcall','print','rawequal','rawget','rawset','rawlen','select','string','table','math','bit32','utf8','tonumber','tostring','type','unpack','and','break','do','else','elseif','end','false','for','function','goto','if','in','local','nil','not','or','repeat','return','then','true','until','while','continue','self','this','Callback','Connect','Wait','Fire','Value','Name','Parent','Text','Title','Duration','Enabled','CurrentValue','Range','Increment','Options','CurrentOption','Color','Players','LocalPlayer','Character','Humanoid','HumanoidRootPart','Head','Torso','UpperTorso','LowerTorso','RightArm','LeftArm','RightLeg','LeftLeg','WalkSpeed','JumpPower','Health','MaxHealth','Workspace','ReplicatedStorage','ServerStorage','ServerScriptService','StarterGui','StarterPack','StarterPlayer','Teams','SoundService','Lighting','Debris','TweenService','RunService','UserInputService','ContextActionService','GuiService','MarketplaceService','PolicyService','Players','Chat','TextService','PathfindingService','PhysicsService','CollectionService','ProximityPromptService','GetService','FindFirstChild','WaitForChild','Clone','Destroy','ClearAllChildren','GetChildren','GetDescendants','IsA','GetFullName','GetPropertyChangedSignal','Changed','ChildAdded','ChildRemoved','AncestryChanged','Touched','TouchEnded','Hit','Equipped','Unequipped','Activated','Deactivated','MouseButton1Click','MouseButton2Click','MouseEnter','MouseLeave','InputBegan','InputEnded','InputChanged','Heartbeat','RenderStepped','Stepped','BindToRenderStep','UnbindFromRenderStep','IsClient','IsServer','IsStudio','Kick','Ban','TeleportService','Teleport','GetProductInfo','PromptPurchase','PromptGamePassPurchase','UserOwnsGamePassAsync','GetGamePassInfo','ProcessReceipt','GetPlayerFromCharacter']);

// ==========================================
// LUAGUARD v5.5 HYBRID CLASS
// ==========================================
class LuaGuardHybrid{
constructor(preset){
this.preset=preset;
this.varCounter=0;
this.varMap=new Map();
this.logs=[];
this.stringStore=[];
this.xorKey=this.rand(50,200);
this.decryptorName='';
this.tableName='';
this.chars={
lower:'abcdefghijklmnopqrstuvwxyz',
upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
numbers:'0123456789',
hex:'0123456789ABCDEF',
confusingL:['l','I','1','i'],
confusingO:['o','O','0','Q'],
similar:['S','5','Z','2','B','8','G','6']
};
}

rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
randChar(str){return str[Math.floor(Math.random()*str.length)];}
randItem(arr){return arr[Math.floor(Math.random()*arr.length)];}

// ==========================================
// 10 VARIABLE STYLES (RESTORED)
// ==========================================
genVarName(){
this.varCounter++;
const id=this.varCounter.toString(36).toUpperCase();
const styles=[
()=>{let n='_';for(let i=0;i<this.rand(5,8);i++)n+=this.randItem(this.chars.confusingL);return n+id;},
()=>{let h='';for(let i=0;i<6;i++)h+=this.randChar(this.chars.hex);return '_0x'+h+id;},
()=>{let n='_';for(let i=0;i<this.rand(5,7);i++)n+=this.randItem(this.chars.confusingO);return n+id;},
()=>{let n='_';for(let i=0;i<this.rand(5,7);i++)n+=this.randItem(this.chars.similar);return n+id;},
()=>{let n='_';for(let i=0;i<this.rand(6,8);i++){n+=i%2===0?this.randChar(this.chars.lower):this.randChar(this.chars.upper);}return n+id;},
()=>{let n='_';for(let i=0;i<4;i++)n+=this.randChar(this.chars.upper);for(let i=0;i<3;i++)n+=this.randChar(this.chars.numbers);return n+id;},
()=>{let n='_';for(let i=0;i<4;i++)n+=this.randChar(this.chars.lower);for(let i=0;i<3;i++)n+=this.randChar(this.chars.numbers);return n+id;},
()=>{let n='_';for(let i=0;i<3;i++)n+='_'+this.randChar(this.chars.lower)+'_';return n+id;},
()=>{let n='_';for(let i=0;i<3;i++){n+=this.randChar(this.chars.lower)+this.rand(0,9);}return n+id;},
()=>{let n='_';const all=this.chars.lower+this.chars.upper+this.chars.numbers;for(let i=0;i<this.rand(6,9);i++)n+=this.randChar(all);return n+id;}
];
return styles[this.rand(0,styles.length-1)]();
}

// ==========================================
// IS IN STRING CHECK (RESTORED)
// ==========================================
isInString(code,pos){
let inStr=false,q='';
for(let i=0;i<pos&&i<code.length;i++){
const c=code[i],prev=i>0?code[i-1]:'';
if((c==='"'||c==="'")&&prev!=='\\'){
if(!inStr){inStr=true;q=c;}
else if(c===q){inStr=false;}
}
}
return inStr;
}

// ==========================================
// REMOVE COMMENTS (RESTORED)
// ==========================================
removeComments(code){
let result=code;
let count=0;
result=result.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g,()=>{count++;return '';});
const lines=result.split('\n');
result=lines.map(line=>{
let inStr=false,q='';
for(let i=0;i<line.length-1;i++){
const c=line[i],prev=i>0?line[i-1]:'';
if((c==='"'||c==="'")&&prev!=='\\'){
if(!inStr){inStr=true;q=c;}
else if(c===q){inStr=false;}
}
if(!inStr&&c==='-'&&line[i+1]==='-'){
count++;
return line.slice(0,i).trimEnd();
}
}
return line;
}).join('\n');
if(count>0)this.logs.push('Comments: -'+count);
return result;
}

// ==========================================
// EXTRACT STRINGS (PLACEHOLDER SYSTEM)
// ==========================================
extractStrings(code){
if(this.preset==='performance')return code;
let result='',i=0;
while(i<code.length){
if((code[i]==='"'||code[i]==="'")&&(i===0||code[i-1]!=='\\')){
const q=code[i];
let content='';
i++;
while(i<code.length){
if(code[i]==='\\'&&i+1<code.length){
content+=code[i]+code[i+1];
i+=2;
}else if(code[i]===q){
break;
}else{
content+=code[i];
i++;
}
}
i++;
const hasControlChars=/[\x00-\x1F\x7F-\xFF]/.test(content);
const hasComplexEscape=/\\[^nrt"'\\]/.test(content);
const isSafe=content.length>=1&&content.length<=500&&!hasControlChars&&!hasComplexEscape;
if(isSafe&&this.preset==='maxSecurity'){
const id=this.stringStore.length;
this.stringStore.push(content);
result+=`__LSTR${id}__`;
}else if(isSafe&&this.preset==='balanced'){
result+=this.encodeStringBasic(content);
}else{
result+=q+content+q;
}
}else{
result+=code[i];
i++;
}
}
if(this.stringStore.length>0)this.logs.push('Strings: '+this.stringStore.length+' extracted');
return result;
}

// ==========================================
// ENCODE STRING BASIC (BALANCED MODE)
// ==========================================
encodeStringBasic(str){
if(!str)return '""';
const codes=[];
for(let i=0;i<str.length;i++){
const c=str.charCodeAt(i);
if(c<32||c>126){codes.push(c);continue;}
const m=this.rand(0,3);
if(m===0){codes.push(c);}
else if(m===1){codes.push('0x'+c.toString(16).toUpperCase());}
else if(m===2&&c>2){const a=this.rand(1,c-1);codes.push('('+a+'+'+(c-a)+')');}
else if(m===3){const b=c+this.rand(1,30);codes.push('('+b+'-'+(b-c)+')');}
else{codes.push(c);}
}
return 'string.char('+codes.join(',')+')';
}

// ==========================================
// ENCODE NUMBER (RESTORED)
// ==========================================
encodeNumber(num){
if(num<10||num>9999||!Number.isInteger(num))return num.toString();
const m=this.rand(0,3);
if(m===0){return '0x'+num.toString(16).toUpperCase();}
if(m===1&&num>1){const a=this.rand(1,num-1);return '('+a+'+'+(num-a)+')';}
if(m===2){const b=num+this.rand(1,50);return '('+b+'-'+(b-num)+')';}
return num.toString();
}

// ==========================================
// RENAME VARIABLES (RESTORED + FIXED)
// ==========================================
renameVars(code){
if(this.preset==='performance')return code;
let result=code;
const vars=[];
let m;
const localRe=/\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
while((m=localRe.exec(code))!==null){
if(!PROTECTED.has(m[1])&&!this.varMap.has(m[1])&&!m[1].startsWith('__LSTR')){
const n=this.genVarName();
this.varMap.set(m[1],n);
vars.push({old:m[1],new:n});
}
}
const funcRe=/function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
while((m=funcRe.exec(code))!==null){
if(m[1].trim()){
m[1].split(',').map(p=>p.trim()).filter(p=>p&&p!=='...').forEach(p=>{
if(!PROTECTED.has(p)&&!this.varMap.has(p)&&!p.startsWith('__LSTR')){
const n=this.genVarName();
this.varMap.set(p,n);
vars.push({old:p,new:n});
}
});
}
}
const forRe=/\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g;
while((m=forRe.exec(code))!==null){
[m[1],m[2]].filter(Boolean).forEach(v=>{
if(!PROTECTED.has(v)&&!this.varMap.has(v)&&!v.startsWith('__LSTR')){
const n=this.genVarName();
this.varMap.set(v,n);
vars.push({old:v,new:n});
}
});
}
vars.sort((a,b)=>b.old.length-a.old.length);
for(const v of vars){
const re=new RegExp('\\b'+v.old+'\\b','g');
result=result.replace(re,(match,offset)=>{
if(this.isInString(result,offset))return match;
return v.new;
});
}
if(vars.length>0)this.logs.push('Variables: '+vars.length);
return result;
}

// ==========================================
// OBFUSCATE NUMBERS (RESTORED)
// ==========================================
obfuscateNumbers(code){
if(this.preset!=='maxSecurity')return code;
let count=0;
const self=this;
const result=code.replace(/\b(\d+)\b/g,(match,num,offset)=>{
if(self.isInString(code,offset))return match;
const prev=offset>0?code[offset-1]:'';
const next=offset+match.length<code.length?code[offset+match.length]:'';
if(prev==='.'||next==='.'||prev==='_'||prev==='x'||prev==='X'||prev==='L')return match;
const n=parseInt(num);
if(isNaN(n)||n<10||n>9999)return match;
count++;
return self.encodeNumber(n);
});
if(count>0)this.logs.push('Numbers: '+count);
return result;
}

// ==========================================
// INJECT DEAD CODE (RESTORED 5 PATTERNS)
// ==========================================
injectDeadCode(code){
if(this.preset!=='maxSecurity')return code;
const lines=code.split('\n');
const newLines=[];
let injected=0;
const deadPatterns=[
()=>'local '+this.genVarName()+'=nil',
()=>'local '+this.genVarName()+'=false',
()=>'local '+this.genVarName()+'=0',
()=>'local '+this.genVarName()+'=""',
()=>'local '+this.genVarName()+'={}'
];
for(let i=0;i<this.rand(2,3);i++){
newLines.push(deadPatterns[this.rand(0,deadPatterns.length-1)]());
injected++;
}
for(let i=0;i<lines.length;i++){
newLines.push(lines[i]);
if(i>0&&i<lines.length-1&&this.rand(1,100)<=10){
newLines.push(deadPatterns[this.rand(0,deadPatterns.length-1)]());
injected++;
}
}
this.logs.push('DeadCode: +'+injected);
return newLines.join('\n');
}

// ==========================================
// XOR ENCRYPTION SYSTEM (NEW)
// ==========================================
generateSecurityBlock(){
if(this.stringStore.length===0)return '';
this.decryptorName=this.genVarName();
this.tableName=this.genVarName();
const encryptedTable=this.stringStore.map(str=>{
const bytes=[];
for(let i=0;i<str.length;i++){
const c=str.charCodeAt(i);
const escaped=(c===92||c===34||c===39)?c:c^this.xorKey;
bytes.push(escaped===c?c:c^this.xorKey);
}
const finalBytes=[];
for(let i=0;i<str.length;i++){
finalBytes.push(str.charCodeAt(i)^this.xorKey);
}
return '{'+finalBytes.join(',')+'}';
});
const tableCode='local '+this.tableName+'={'+encryptedTable.join(',')+'}';
const decryptCode='local '+this.decryptorName+'=function(t) local r="" for i=1,#t do r=r..string.char(bit32.bxor(t[i],'+this.xorKey+')) end return r end';
this.logs.push('XOR Key: '+this.xorKey);
return decryptCode+';'+tableCode+';';
}

restoreStrings(code){
if(this.stringStore.length===0)return code;
return code.replace(/__LSTR(\d+)__/g,(match,id)=>{
const idx=parseInt(id);
return this.decryptorName+'('+this.tableName+'['+(idx+1)+'])';
});
}

// ==========================================
// CLEAN CODE (RESTORED)
// ==========================================
cleanCode(code){
const lines=code.split('\n').map(l=>l.trim()).filter(l=>l!=='');
this.logs.push('Cleaned');
return lines.join('\n');
}

// ==========================================
// MINIFY SINGLE LINE (FIXED SAFE)
// ==========================================
minifySingleLine(code){
let result=code;
result=result.replace(/[\r\n]+/g,' ');
result=result.replace(/\s+/g,' ');
result=result.replace(/\s*([=+\-*/%^,{}()[\];])\s*/g,'$1');
const keywords=['local','function','return','if','then','else','elseif','end','do','while','for','in','and','or','not','break','repeat','until','true','false','nil'];
keywords.forEach(kw=>{
const re1=new RegExp('\\b'+kw+'([a-zA-Z0-9_])','g');
result=result.replace(re1,kw+' $1');
const re2=new RegExp('([a-zA-Z0-9_])'+kw+'\\b','g');
result=result.replace(re2,'$1 '+kw);
});
result=result.replace(/\s*#\s*/g,' # ');
result=result.replace(/# ([a-zA-Z_])/g,'#$1');
this.logs.push('Minified: 1-line');
return result.trim();
}

// ==========================================
// ADD WRAPPER (RESTORED)
// ==========================================
addWrapper(code){
if(this.preset==='performance')return code;
this.logs.push('Wrapped');
return 'do '+code+' end';
}

// ==========================================
// GET HEADER (RESTORED)
// ==========================================
getHeader(){
const id=Math.random().toString(36).substring(2,10).toUpperCase();
const presets={performance:'Perf',balanced:'Balanced',maxSecurity:'MaxSec'};
return '-- LuaGuard v5.5 ['+id+'] '+presets[this.preset]+'\n';
}

// ==========================================
// MAIN OBFUSCATE (HYBRID FLOW)
// ==========================================
obfuscate(source){
let code=source;
code=this.removeComments(code);
code=this.extractStrings(code);
code=this.renameVars(code);
if(this.preset==='maxSecurity'){
code=this.obfuscateNumbers(code);
code=this.injectDeadCode(code);
code=this.cleanCode(code);
const securityBlock=this.generateSecurityBlock();
code=this.restoreStrings(code);
if(securityBlock){
code=securityBlock+code;
}
code=this.minifySingleLine(code);
}else{
code=this.cleanCode(code);
}
code=this.addWrapper(code);
return{
code:this.getHeader()+code,
logs:this.logs
};
}
}

// ==========================================
// WEB SERVER (RESTORED FULL HTML)
// ==========================================
const app=express();
app.get('/',(req,res)=>{
res.send(`<!DOCTYPE html><html><head><title>LuaGuard v5.5</title>
<style>
body{font-family:Arial,sans-serif;background:#0d1117;color:#c9d1d9;text-align:center;padding:50px;margin:0}
h1{color:#58a6ff;font-size:2.5em}
.ok{color:#3fb950;font-size:1.3em}
.box{background:#161b22;padding:25px;border-radius:12px;max-width:500px;margin:25px auto;border:1px solid #30363d}
ul{text-align:left;padding-left:20px}
li{margin:8px 0}
.new{color:#f0883e}
.footer{color:#8b949e;margin-top:30px}
</style></head><body>
<h1>🛡️ LuaGuard v5.5</h1>
<p class="ok">● Online & Ready</p>
<div class="box">
<h3>⚡ Performance</h3>
<p>Comments removal only</p>
</div>
<div class="box">
<h3>⚖️ Balanced</h3>
<p>+ Variable rename + String encode</p>
</div>
<div class="box">
<h3>🔒 Max Security (Hybrid)</h3>
<ul>
<li>✅ 10 Variable Styles</li>
<li>✅ String Extraction</li>
<li>✅ Number Obfuscation</li>
<li>✅ Dead Code Injection</li>
<li class="new">🆕 XOR String Encryption</li>
<li class="new">🆕 Constant Table</li>
<li class="new">🆕 Single-Line Minify</li>
</ul>
</div>
<p class="footer">Delta Executor Compatible</p>
</body></html>`);
});
app.listen(process.env.PORT||3000,()=>console.log('[Server] Running on port '+(process.env.PORT||3000)));

// ==========================================
// DISCORD BOT (RESTORED ALL COMMANDS)
// ==========================================
const TOKEN=process.env.DISCORD_TOKEN;
const CLIENT_ID=process.env.CLIENT_ID;

console.log('\n========================================');
console.log('  LuaGuard v5.5 Hybrid');
console.log('========================================');
console.log('Token: '+(TOKEN?'✅ OK':'❌ MISSING'));
console.log('Client ID: '+(CLIENT_ID?'✅ OK':'❌ MISSING'));
console.log('========================================\n');

const client=new Client({intents:[GatewayIntentBits.Guilds]});

const commands=[
new SlashCommandBuilder()
.setName('obfuscate')
.setDescription('Obfuscate Lua script')
.addAttachmentOption(o=>o.setName('file').setDescription('.lua file').setRequired(true))
.addStringOption(o=>o.setName('preset').setDescription('Security level').addChoices(
{name:'⚡ Performance',value:'performance'},
{name:'⚖️ Balanced',value:'balanced'},
{name:'🔒 Max Security',value:'maxSecurity'}
)),
new SlashCommandBuilder().setName('help').setDescription('Show all features'),
new SlashCommandBuilder().setName('ping').setDescription('Check bot latency')
].map(c=>c.toJSON());

const rest=new REST({version:'10'}).setToken(TOKEN);

client.once('ready',async()=>{
console.log('[Bot] Logged in as '+client.user.tag);
client.user.setActivity('/obfuscate',{type:ActivityType.Watching});
if(CLIENT_ID){
try{
await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands});
console.log('[Bot] Slash commands registered');
}catch(e){console.error('[Bot] Command registration failed:',e.message);}
}
});

client.on('interactionCreate',async interaction=>{
if(!interaction.isChatInputCommand())return;

// ==========================================
// PING COMMAND (RESTORED)
// ==========================================
if(interaction.commandName==='ping'){
const latency=Date.now()-interaction.createdTimestamp;
return interaction.reply({content:'🏓 Pong! Latency: **'+latency+'ms**',ephemeral:false});
}

// ==========================================
// HELP COMMAND (RESTORED)
// ==========================================
if(interaction.commandName==='help'){
const embed=new EmbedBuilder()
.setColor(0x58a6ff)
.setTitle('🛡️ LuaGuard v5.5 - Help')
.setDescription('Advanced Lua Obfuscator with Hybrid Protection')
.addFields(
{name:'⚡ Performance',value:'```\n• Comment removal\n• Basic cleaning\n```',inline:true},
{name:'⚖️ Balanced',value:'```\n• + Variable rename\n• + String encode\n```',inline:true},
{name:'🔒 Max Security',value:'```\n• + XOR Encryption\n• + Constant Table\n• + Number obfuscation\n• + Dead code\n• + Minification\n```',inline:true},
{name:'📋 Commands',value:'`/obfuscate` - Protect your script\n`/ping` - Check latency\n`/help` - This message',inline:false},
{name:'🆕 v5.5 Updates',value:'• XOR String Encryption\n• Constant Table Storage\n• Single-Line Output\n• Hybrid Max Security',inline:false}
)
.setFooter({text:'Delta Executor Compatible'})
.setTimestamp();
return interaction.reply({embeds:[embed]});
}

// ==========================================
// OBFUSCATE COMMAND (RESTORED FULL)
// ==========================================
if(interaction.commandName==='obfuscate'){
const file=interaction.options.getAttachment('file');
const preset=interaction.options.getString('preset')||'balanced';

// File validation (RESTORED)
if(!['.lua','.luau','.txt'].some(e=>file.name.toLowerCase().endsWith(e))){
return interaction.reply({content:'❌ Invalid file type. Please upload .lua, .luau, or .txt',ephemeral:true});
}
if(file.size>2*1024*1024){
return interaction.reply({content:'❌ File too large. Maximum size is 2MB',ephemeral:true});
}

await interaction.deferReply();

try{
const res=await axios.get(file.url,{responseType:'arraybuffer'});
const source=res.data.toString('utf-8');

if(!source.trim()){
return interaction.editReply('❌ Empty file');
}

// Process with timing (RESTORED)
const startTime=Date.now();
const obf=new LuaGuardHybrid(preset);
const result=obf.obfuscate(source);
const endTime=Date.now();
const processTime=((endTime-startTime)/1000).toFixed(2);

// Output file naming (RESTORED)
const buf=Buffer.from(result.code,'utf-8');
const outName=file.name.replace(/\.(lua|luau|txt)$/i,'_obf.lua');
const attachment=new AttachmentBuilder(buf,{name:outName});

// Colors and icons (RESTORED)
const colors={performance:0x3fb950,balanced:0x58a6ff,maxSecurity:0xf85149};
const icons={performance:'⚡',balanced:'⚖️',maxSecurity:'🔒'};
const presetNames={performance:'Performance',balanced:'Balanced',maxSecurity:'Max Security'};

// Detailed embed (RESTORED)
const embed=new EmbedBuilder()
.setColor(colors[preset])
.setTitle(icons[preset]+' Obfuscation Complete')
.addFields(
{name:'📄 Input File',value:'`'+file.name+'`',inline:true},
{name:'⚙️ Preset',value:presetNames[preset],inline:true},
{name:'⏱️ Time',value:processTime+'s',inline:true},
{name:'📊 Size',value:'`'+source.length+'` → `'+result.code.length+'` bytes',inline:true},
{name:'📈 Ratio',value:((result.code.length/source.length)*100).toFixed(1)+'%',inline:true},
{name:'🔐 XOR Key',value:preset==='maxSecurity'?'`'+obf.xorKey+'`':'N/A',inline:true},
{name:'🔧 Transforms',value:'```\n'+result.logs.join('\n')+'\n```',inline:false}
)
.setFooter({text:'LuaGuard v5.5 Hybrid | Delta Compatible'})
.setTimestamp();

await interaction.editReply({embeds:[embed],files:[attachment]});

}catch(e){
console.error('[Error]',e);
await interaction.editReply('❌ Error: '+e.message);
}
}
});

// Login
if(TOKEN){
client.login(TOKEN);
}else{
console.error('[Bot] No token provided!');
}
