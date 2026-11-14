#!/usr/bin/env node
// Installed on the CA host. No credentials in CLI arguments or diagnostics.
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {filterResult,assertSafeArguments,blocked} from './guard.mjs';
const selected=JSON.parse(readFileSync(new URL('../bridge/src/tools.json',import.meta.url),'utf8'));
const allowed=new Set(selected.map(t=>t.name));
const child=spawn('npx',['-y','mcp-remote@0.1.38','https://mcp.cloudflare.com/mcp?codemode=false','--header','Authorization: Bearer ${CLOUDFLARE_API_TOKEN}'],{stdio:['pipe','pipe','ignore'],env:process.env});
const pending=new Map();let seq=0;
const send=o=>process.stdout.write(JSON.stringify(o)+'\n');
const fail=id=>send({jsonrpc:'2.0',id,result:blocked()});
createInterface({input:process.stdin}).on('line',line=>{
 try{
  const m=JSON.parse(line);
  if(!m||m.jsonrpc!=='2.0')return;
  if(m.method==='notifications/initialized'){child.stdin.write(JSON.stringify(m)+'\n');return;}
  if(!Object.hasOwn(m,'id'))return;
  if(m.method==='tools/list'){send({jsonrpc:'2.0',id:m.id,result:{tools:selected}});return;}
  if(m.method==='ping'){send({jsonrpc:'2.0',id:m.id,result:{}});return;}
  if(!['initialize','tools/call'].includes(m.method)){send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Unsupported method'}});return;}
  if(m.method==='tools/call'){
   if(!allowed.has(m.params?.name)){fail(m.id);return;}
   try{assertSafeArguments(m.params.name,m.params.arguments);}catch{fail(m.id);return;}
  }
  const id=++seq;pending.set(id,{id:m.id,method:m.method,name:m.params?.name});
  child.stdin.write(JSON.stringify({...m,id})+'\n');
 }catch{/* Malformed input has no trustworthy correlation ID. */}
});
createInterface({input:child.stdout}).on('line',line=>{
 try{
  const m=JSON.parse(line),p=pending.get(m.id);if(!p)return;pending.delete(m.id);
  if(m.error){fail(p.id);return;}
  if(p.method==='initialize'){
   send({jsonrpc:'2.0',id:p.id,result:{protocolVersion:m.result.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'cloudflare-credential-guard',version:'1.0.0'}}});return;
  }
  send({jsonrpc:'2.0',id:p.id,result:filterResult(p.name,m.result)});
 }catch{/* Never echo raw upstream protocol data. */}
});
function stop(){for(const p of pending.values())fail(p.id);pending.clear();process.exitCode=1;process.stdin.destroy();}
child.on('error',stop);child.on('exit',stop);
child.stdin.on('error',()=>{});
process.stdin.on('end',()=>child.kill());
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
