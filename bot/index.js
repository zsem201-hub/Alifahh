require('dotenv').config();
const {Client,GatewayIntentBits,REST,Routes,SlashCommandBuilder,ActivityType,EmbedBuilder,AttachmentBuilder}=require('discord.js');
const axios=require('axios');
const express=require('express');
const PROTECTED=new Set(['game','workspace','script','plugin','shared','Enum','Instance','Vector3','Vector2','CFrame','Color3','BrickColor','UDim','UDim2','Ray','TweenInfo','Region3','Rect','NumberRange','NumberSequence','ColorSequence','PhysicalProperties','Random','Axes','Faces','typeof','require','spawn','delay','wait','tick','time','warn','settings','UserSettings','version','printidentity','elapsedTime','getgenv','getrenv','getfenv','setfenv','getrawmetatable','setrawmetatable','hookfunction','hookmetamethod','newcclosure','islclosure','iscclosure','loadstring','checkcaller','getcallingscript','identifyexecutor','getexecutorname','syn','fluxus','KRNL_LOADED','Drawing','cleardrawcache','isreadonly','setreadonly','firesignal','getconnections','fireproximityprompt','gethui','gethiddenproperty','sethiddenproperty','setsimulationradius','getcustomasset','getsynasset','isnetworkowner','fireclickdetector','firetouchinterest','isrbxactive','request','http_request','HttpGet','httpget','HttpPost','readfile','writefile','appendfile','loadfile','isfile','isfolder','makefolder','delfolder','delfile','listfiles','getscriptbytecode','rconsoleprint','rconsolename','rconsoleclear','rconsoleinput','setclipboard','setfflag','getnamecallmethod','task','_G','_VERSION','assert','collectgarbage','coroutine','debug','dofile','error','gcinfo','getmetatable','setmetatable','ipairs','pairs','next','load','loadfile','newproxy','os','io','pcall','xpcall','print','rawequal','rawget','rawset','rawlen','select','string','table','math','bit32','utf8','tonumber','tostring','type','unpack','and','break','do','else','elseif','end','false','for','function','goto','if','in','local','nil','not','or','repeat','return','then','true','until','while','continue','self','this','Callback','Connect','Wait','Fire','Value','Name','Parent','Text','Title','Duration','Enabled','CurrentValue','Range','Increment','Options','CurrentOption','Color']);
class LuaGuardFinal{
constructor(preset){
this.preset=preset;
this.varCounter=0;
this.varMap=new Map();
this.logs=[];
this.constantTable=[];
this.constantMap=new Map();
this.xorKey=this.rand(50,200);
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
rand(min,max){
return Math.floor(Math.random()*(max-min+1))+min;
}
randChar(str){
return str[Math.floor(Math.random()*str.length)];
}
randItem(arr){
return arr[Math.floor(Math.random()*arr.length)];
}
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
genShortVar(){
this.varCounter++;
const chars='_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
let name='';
let num=this.varCounter;
while(num>0){
name=chars[num%chars.length]+name;
num=Math.floor(num/chars.length);
}
return '_'+name;
}
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
xorEncrypt(str){
const result=[];
for(let i=0;i<str.length;i++){
result.push(str.charCodeAt(i)^this.xorKey);
}
return result;
}
generateDecryptor(){
const dName=this.genShortVar();
this.decryptorName=dName;
return 'local '+dName+'=function(_E)local _R=""for _I=1,#_E do _R=_R..string.char(bit32.bxor(_E[_I],'+this.xorKey+'))end return _R end';
}
addToConstantTable(str){
if(this.constantMap.has(str)){
return this.constantMap.get(str);
}
const index=this.constantTable.length;
this.constantTable.push(str);
this.constantMap.set(str,index);
return index;
}
generateConstantTable(){
if(this.constantTable.length===0)return '';
const ctName=this.genShortVar();
this.constantTableName=ctName;
const entries=this.constantTable.map(str=>{
const encrypted=this.xorEncrypt(str);
return '{'+encrypted.join(',')+'}';
});
return 'local '+ctName+'={'+entries.join(',')+'}';
}
getConstantAccess(index){
return this.decryptorName+'('+this.constantTableName+'['+(index+1)+'])';
}
encodeString(str){
if(!str)return '""';
const codes=[];
for(let i=0;i<str.length;i++){
const c=str.charCodeAt(i);
if(c<32||c>126){
codes.push(c);
continue;
}
const m=this.rand(0,3);
if(m===0){
codes.push(c);
}else if(m===1){
codes.push('0x'+c.toString(16).toUpperCase());
}else if(m===2&&c>2){
const a=this.rand(1,c-1);
codes.push('('+a+'+'+(c-a)+')');
}else if(m===3){
const b=c+this.rand(1,30);
codes.push('('+b+'-'+(b-c)+')');
}else{
codes.push(c);
}
}
return 'string.char('+codes.join(',')+')';
}
encodeNumber(num){
if(num<10||num>9999||!Number.isInteger(num))return num.toString();
const m=this.rand(0,3);
if(m===0){
return '0x'+num.toString(16).toUpperCase();
}
if(m===1&&num>1){
const a=this.rand(1,num-1);
return '('+a+'+'+(num-a)+')';
}
if(m===2){
const b=num+this.rand(1,50);
return '('+b+'-'+(b-num)+')';
}
return num.toString();
}
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
renameVars(code){
if(this.preset==='performance')return code;
let result=code;
const vars=[];
let m;
const useShort=this.preset==='luraph';
const localRe=/\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
while((m=localRe.exec(code))!==null){
if(!PROTECTED.has(m[1])&&!this.varMap.has(m[1])){
const n=useShort?this.genShortVar():this.genVarName();
this.varMap.set(m[1],n);
vars.push({old:m[1],new:n});
}
}
const funcRe=/function\s*[a-zA-Z_.:]*\s*\(([^)]*)\)/g;
while((m=funcRe.exec(code))!==null){
if(m[1].trim()){
m[1].split(',').map(p=>p.trim()).filter(p=>p&&p!=='...').forEach(p=>{
if(!PROTECTED.has(p)&&!this.varMap.has(p)){
const n=useShort?this.genShortVar():this.genVarName();
this.varMap.set(p,n);
vars.push({old:p,new:n});
}
});
}
}
const forRe=/\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*[=,in]/g;
while((m=forRe.exec(code))!==null){
[m[1],m[2]].filter(Boolean).forEach(v=>{
if(!PROTECTED.has(v)&&!this.varMap.has(v)){
const n=useShort?this.genShortVar():this.genVarName();
this.varMap.set(v,n);
vars.push({old:v,new:n});
}
});
}
vars.sort((a,b)=>b.old.length-a.old.length);
for(const v of vars){
const re=new RegExp('\\b'+v.old+'\\b','g');
result=result.replace(re,(match,offset)=>{
return this.isInString(result,offset)?match:v.new;
});
}
if(vars.length>0)this.logs.push('Variables: '+vars.length);
return result;
}
encodeStringsBasic(code){
if(this.preset==='performance')return code;
let result='',i=0,encoded=0;
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
const hasEscape=content.includes('\\');
const hasNewline=content.includes('\n')||content.includes('\r');
const validLength=content.length>=4&&content.length<=80;
const isSafe=validLength&&!hasControlChars&&!hasEscape&&!hasNewline;
if(isSafe){
result+=this.encodeString(content);
encoded++;
}else{
result+=q+content+q;
}
}else{
result+=code[i];
i++;
}
}
if(encoded>0)this.logs.push('Strings: '+encoded);
return result;
}
collectStringsForConstantTable(code){
const strings=[];
let i=0;
while(i<code.length){
if((code[i]==='"'||code[i]==="'")&&(i===0||code[i-1]!=='\\')){
const q=code[i];
const startPos=i;
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
const hasEscape=content.includes('\\');
const validLength=content.length>=2&&content.length<=100;
const isSafe=validLength&&!hasControlChars&&!hasEscape;
if(isSafe){
strings.push({start:startPos,end:i,content:content,quote:q});
}
}else{
i++;
}
}
return strings;
}
encodeStringsWithConstantTable(code){
const strings=this.collectStringsForConstantTable(code);
if(strings.length===0)return code;
strings.forEach(s=>{
this.addToConstantTable(s.content);
});
let result='';
let lastEnd=0;
for(const s of strings){
result+=code.slice(lastEnd,s.start);
const idx=this.constantMap.get(s.content);
result+=this.getConstantAccess(idx);
lastEnd=s.end;
}
result+=code.slice(lastEnd);
this.logs.push('ConstTable: '+strings.length+' strings');
return result;
}
obfuscateNumbers(code){
if(this.preset!=='maxSecurity'&&this.preset!=='luraph')return code;
let count=0;
const self=this;
const result=code.replace(/\b(\d+)\b/g,(match,num,offset)=>{
if(self.isInString(code,offset))return match;
const prev=offset>0?code[offset-1]:'';
const next=offset+match.length<code.length?code[offset+match.length]:'';
if(prev==='.'||next==='.'||prev==='_'||prev==='x'||prev==='X'){
return match;
}
const n=parseInt(num);
if(isNaN(n)||n<10||n>9999)return match;
count++;
return self.encodeNumber(n);
});
if(count>0)this.logs.push('Numbers: '+count);
return result;
}
injectDeadCode(code){
if(this.preset!=='maxSecurity'&&this.preset!=='luraph')return code;
const lines=code.split('\n');
const newLines=[];
let injected=0;
const deadPatterns=[
()=>'local '+this.genShortVar()+'=nil',
()=>'local '+this.genShortVar()+'=false',
()=>'local '+this.genShortVar()+'=0',
()=>'local '+this.genShortVar()+'=""',
()=>'local '+this.genShortVar()+'={}'
];
for(let i=0;i<this.rand(2,3);i++){
newLines.push(deadPatterns[this.rand(0,deadPatterns.length-1)]());
injected++;
}
for(let i=0;i<lines.length;i++){
newLines.push(lines[i]);
if(i>0&&i<lines.length-1&&this.rand(1,100)<=8){
newLines.push(deadPatterns[this.rand(0,deadPatterns.length-1)]());
injected++;
}
}
this.logs.push('DeadCode: +'+injected);
return newLines.join('\n');
}
cleanCode(code){
const lines=code.split('\n').map(l=>l.trim()).filter(l=>l!=='');
this.logs.push('Cleaned');
return lines.join('\n');
}
semicolonChain(code){
let result=code;
result=result.replace(/\n+/g,';');
result=result.replace(/;+/g,';');
result=result.replace(/;(\s*)(then|do|else|elseif)/g,' $2');
result=result.replace(/(then|do|else);/g,'$1 ');
result=result.replace(/;(end|until)/g,' $1');
result=result.replace(/^;+|;+$/g,'');
this.logs.push('Semicolons: chained');
return result;
}
minifySingleLine(code){
let result=code;
result=result.replace(/\s+/g,' ');
result=result.replace(/\s*([=+\-*\/%<>~,{}()[\];])\s*/g,'$1');
result=result.replace(/([a-zA-Z0-9_])(\s+)([a-zA-Z_])/g,(m,a,s,b)=>{
const keywords=['and','or','not','local','function','if','then','else','elseif','end','for','while','do','repeat','until','return','in','true','false','nil','break','continue'];
const needSpace=keywords.some(k=>a.endsWith(k)||b.startsWith(k))||/\d$/.test(a)&&/^[a-zA-Z_]/.test(b);
return needSpace?a+' '+b:a+b;
});
result=result.replace(/local(\w)/g,'local $1');
result=result.replace(/function(\w)/g,'function $1');
result=result.replace(/return(\w)/g,'return $1');
result=result.replace(/end(\w)/g,'end;$1');
result=result.replace(/do(\w)/g,'do $1');
result=result.replace(/then(\w)/g,'then $1');
result=result.replace(/else(\w)/g,'else $1');
result=result.replace(/in(\w)/g,'in $1');
result=result.replace(/and(\w)/g,'and $1');
result=result.replace(/or(\w)/g,'or $1');
result=result.replace(/not(\w)/g,'not $1');
this.logs.push('Minified: single-line');
return result;
}
addWrapper(code){
if(this.preset==='performance')return code;
this.logs.push('Wrapped');
return 'do '+code+' end';
}
getHeader(){
const id=Math.random().toString(36).substring(2,10).toUpperCase();
const presets={performance:'Perf',balanced:'Balanced',maxSecurity:'MaxSec',luraph:'Luraph'};
return '-- LuaGuard v5.4 ['+id+'] '+presets[this.preset]+'\n';
}
obfuscate(source){
let code=source;
code=this.removeComments(code);
code=this.renameVars(code);
if(this.preset==='luraph'){
code=this.encodeStringsWithConstantTable(code);
}else{
code=this.encodeStringsBasic(code);
}
code=this.obfuscateNumbers(code);
code=this.injectDeadCode(code);
code=this.cleanCode(code);
if(this.preset==='luraph'){
code=this.semicolonChain(code);
const decryptor=this.generateDecryptor();
const constTable=this.generateConstantTable();
if(this.constantTable.length>0){
code=decryptor+';'+constTable+';'+code;
}
code=this.minifySingleLine(code);
}
code=this.addWrapper(code);
return {
code:this.getHeader()+code,
logs:this.logs
};
}
}
const app=express();
app.get('/',(req,res)=>{
res.send('<!DOCTYPE html><html><head><title>LuaGuard v5.4</title><style>body{font-family:Arial;background:#0d1117;color:#c9d1d9;text-align:center;padding:50px}h1{color:#58a6ff}.ok{color:#3fb950;font-size:1.3em}.box{background:#161b22;padding:25px;border-radius:12px;max-width:500px;margin:25px auto;border:1px solid #30363d}ul{text-align:left;padding-left:20px}li{margin:8px 0}.new{color:#f0883e}</style></head><body><h1>LuaGuard v5.4</h1><p class="ok">● Online</p><div class="box"><p><b>Features:</b></p><ul><li>✅ 10 Variable Styles</li><li>✅ String Encoding</li><li>✅ Number Obfuscation</li><li>✅ Dead Code Injection</li><li class="new">🆕 XOR String Encryption</li><li class="new">🆕 Constant Table</li><li class="new">🆕 Single-Line Minification</li><li class="new">🆕 Semicolon Chaining</li></ul></div><p style="color:#8b949e">Delta Compatible | Luraph Style</p></body></html>');
});
app.listen(process.env.PORT||3000,()=>console.log('[Server] OK'));
const TOKEN=process.env.DISCORD_TOKEN;
const CLIENT_ID=process.env.CLIENT_ID;
console.log('\n[LuaGuard v5.4 - Tier 1]');
console.log('Token: '+(TOKEN?'OK':'MISSING'));
console.log('Client: '+(CLIENT_ID?'OK':'MISSING')+'\n');
const client=new Client({intents:[GatewayIntentBits.Guilds]});
const commands=[
new SlashCommandBuilder().setName('obfuscate').setDescription('Obfuscate Lua script').addAttachmentOption(o=>o.setName('file').setDescription('.lua file').setRequired(true)).addStringOption(o=>o.setName('preset').setDescription('Level').addChoices({name:'⚡ Performance',value:'performance'},{name:'⚖️ Balanced',value:'balanced'},{name:'🔒 Max Security',value:'maxSecurity'},{name:'💀 Luraph Mode',value:'luraph'})),
new SlashCommandBuilder().setName('help').setDescription('Show features'),
new SlashCommandBuilder().setName('ping').setDescription('Check latency')
].map(c=>c.toJSON());
const rest=new REST({version:'10'}).setToken(TOKEN);
client.once('ready',async()=>{
console.log('[Bot] '+client.user.tag);
client.user.setActivity('/obfuscate',{type:ActivityType.Watching});
if(CLIENT_ID){
try{
await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands});
console.log('[Bot] Commands OK\n');
}catch(e){console.error(e.message);}
}
});
client.on('interactionCreate',async interaction=>{
if(!interaction.isChatInputCommand())return;
if(interaction.commandName==='ping'){
return interaction.reply('🏓 '+(Date.now()-interaction.createdTimestamp)+'ms');
}
if(interaction.commandName==='help'){
const embed=new EmbedBuilder()
.setColor(0x58a6ff)
.setTitle('🛡️ LuaGuard v5.4')
.setDescription('Advanced Lua Obfuscator - Luraph Style')
.addFields(
{name:'⚡ Performance',value:'```Comments + Clean```',inline:true},
{name:'⚖️ Balanced',value:'```+ Vars + Strings```',inline:true},
{name:'🔒 Max Security',value:'```+ Numbers + Dead```',inline:true},
{name:'💀 Luraph Mode',value:'```XOR + ConstTable + SingleLine + Semicolons```',inline:false},
{name:'🆕 Tier 1 Features',value:'• XOR String Encryption\n• Constant Table\n• Single-Line Output\n• Semicolon Chaining',inline:false}
)
.setFooter({text:'Delta Compatible'});
return interaction.reply({embeds:[embed]});
}
if(interaction.commandName==='obfuscate'){
const file=interaction.options.getAttachment('file');
const preset=interaction.options.getString('preset')||'balanced';
if(!['.lua','.luau','.txt'].some(e=>file.name.toLowerCase().endsWith(e))){
return interaction.reply({content:'❌ Invalid file type',ephemeral:true});
}
if(file.size>2*1024*1024){
return interaction.reply({content:'❌ Max 2MB',ephemeral:true});
}
await interaction.deferReply();
try{
const res=await axios.get(file.url,{responseType:'arraybuffer'});
const source=res.data.toString('utf-8');
if(!source.trim())return interaction.editReply('❌ Empty file');
const start=Date.now();
const obf=new LuaGuardFinal(preset);
const result=obf.obfuscate(source);
const time=((Date.now()-start)/1000).toFixed(2);
const buf=Buffer.from(result.code,'utf-8');
const outName=file.name.replace(/\.(lua|luau|txt)$/i,'_obf.lua');
const attachment=new AttachmentBuilder(buf,{name:outName});
const colors={performance:0x3fb950,balanced:0x58a6ff,maxSecurity:0xf85149,luraph:0x9b59b6};
const icons={performance:'⚡',balanced:'⚖️',maxSecurity:'🔒',luraph:'💀'};
const embed=new EmbedBuilder()
.setColor(colors[preset])
.setTitle(icons[preset]+' Obfuscation Complete')
.addFields(
{name:'📄 File',value:'`'+file.name+'`',inline:true},
{name:'⚙️ Preset',value:preset,inline:true},
{name:'⏱️ Time',value:time+'s',inline:true},
{name:'📊 Size',value:source.length+' → '+result.code.length+' bytes',inline:true},
{name:'🔧 Transforms',value:'```'+result.logs.join('\n')+'```',inline:false}
)
.setFooter({text:'LuaGuard v5.4 | Delta Compatible'})
.setTimestamp();
await interaction.editReply({embeds:[embed],files:[attachment]});
}catch(e){
console.error(e);
await interaction.editReply('❌ Error: '+e.message);
}
}
});
if(TOKEN)client.login(TOKEN);
