#!/usr/bin/env node
// CA-owned MCP forwarding and response sanitation. No input-argument policy.
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {filterResult,blocked} from './guard.mjs';
import {selectedDrift} from './drift.mjs';
const reviewed=JSON.parse(readFileSync(new URL('../bridge/src/tools.json',import.meta.url),'utf8'));
const selected=new Set(reviewed.map(t=>t.name));
const child=spawn('npx',['-y','mcp-remote@0.1.38','https://mcp.cloudflare.com/mcp?codemode=false','--header','Authorization: Bearer ${CLOUDFLARE_API_TOKEN}'],{stdio:['pipe','pipe','ignore'],env:process.env});
const pending=new Map();let seq=0;
const send=o=>process.stdout.write(JSON.stringify(o)+'\n');
const fail=id=>send({jsonrpc:'2.0',id,result:blocked()});
const warn=changes=>process.stderr.write(JSON.stringify({level:'warn',code:'cloudflare_selected_contract_drift',changes})+'\n');
function forward(message,context) {
 const id=++seq;pending.set(id,context);child.stdin.write(JSON.stringify({...message,id})+'\n');
}
createInterface({input:process.stdin}).on('line',line=>{
 try{
  const m=JSON.parse(line);if(!m||m.jsonrpc!=='2.0')return;
  if(m.method==='notifications/initialized'){child.stdin.write(JSON.stringify(m)+'\n');return;}
  if(!Object.hasOwn(m,'id'))return;
  if(m.method==='ping'){send({jsonrpc:'2.0',id:m.id,result:{}});return;}
  if(!['initialize','tools/list','tools/call'].includes(m.method)){send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Unsupported method'}});return;}
  // The CA rejects unsupported operations using the plugin and passThrough:deny.
  // Selected-name routing is also necessary to choose the correct response filter.
  if(m.method==='tools/call'&&!selected.has(m.params?.name)){fail(m.id);return;}
  if(m.method==='tools/list'){
   // Always collect a complete live inventory before comparing; never serve
   // local definitions as if they came from the hosted server.
   forward({jsonrpc:'2.0',method:'tools/list',params:{}},{id:m.id,method:m.method,tools:[],cursors:new Set(),pages:0});return;
  }
  forward(m,{id:m.id,method:m.method,name:m.params?.name});
 }catch{/* Do not echo malformed input. */}
});
function finishList(p,incomplete=false){
 const changes=selectedDrift(reviewed,p.tools);
 if(changes.length)warn(changes);
 if(incomplete)process.stderr.write('{"level":"warn","code":"cloudflare_live_inventory_incomplete"}\n');
 // Return live selected definitions, including changed ones. Missing tools
 // remain missing; neither drift nor an incomplete list blocks tools/call.
 send({jsonrpc:'2.0',id:p.id,result:{tools:p.tools.filter(t=>selected.has(t?.name))}});
}
createInterface({input:child.stdout}).on('line',line=>{
 let p;
 try{
  const m=JSON.parse(line);p=pending.get(m.id);if(!p)return;pending.delete(m.id);
  if(p.method==='tools/list'){
   if(m.error||!Array.isArray(m.result?.tools)){finishList(p,true);return;}
   p.tools.push(...m.result.tools);p.pages++;
   const cursor=m.result.nextCursor;
   if(cursor!==undefined){
    if(typeof cursor!=='string'||!cursor||p.cursors.has(cursor)||p.pages>=100){finishList(p,true);return;}
    p.cursors.add(cursor);forward({jsonrpc:'2.0',method:'tools/list',params:{cursor}},p);return;
   }
   finishList(p);return;
  }
  if(m.error){fail(p.id);return;}
  if(p.method==='initialize'){
   send({jsonrpc:'2.0',id:p.id,result:{protocolVersion:m.result.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'cloudflare-credential-guard',version:'1.1.0'}}});return;
  }
  send({jsonrpc:'2.0',id:p.id,result:filterResult(p.name,m.result)});
 }catch{if(p)fail(p.id); /* Never echo raw protocol data. */}
});
function stop(){for(const p of pending.values())fail(p.id);pending.clear();process.exitCode=1;process.stdin.destroy();}
child.on('error',stop);child.on('exit',stop);child.stdin.on('error',()=>{});
process.stdin.on('end',()=>child.kill());
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
