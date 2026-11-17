// Offline integration: fake npx is scoped to this child's PATH; no provider I/O.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
const dir=await mkdtemp(path.join(tmpdir(),'cloudflare-guard-test-'));
const reviewed=JSON.parse(await readFile(new URL('../bridge/src/tools.json',import.meta.url),'utf8'));
try{
 await writeFile(path.join(dir,'npx'),`#!/usr/bin/env node
const {createInterface}=require('node:readline');
const tools=JSON.parse(require('node:fs').readFileSync(process.env.TEST_TOOLS,'utf8'));
if(process.env.TEST_MODE==='drift'){tools[0].description='live changed contract';tools.splice(tools.findIndex(t=>t.name==='pages_get'),1);}
tools.push({name:'unrelated_new_tool',inputSchema:{type:'object'}});
createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line);if(!m.id)return;
 let result;
 if(m.method==='initialize')result={protocolVersion:'2024-11-05',capabilities:{logging:{}},serverInfo:{name:'fake',version:'1'}};
 else if(m.method==='tools/list'){
  const start=m.params?.cursor?13:0;
  result={tools:tools.slice(start,start+13)};
  if(start===0)result.nextCursor='page-2';else result.tools=tools.slice(start);
 }else{
  console.error('SECRET_STDERR');
  console.log(JSON.stringify({jsonrpc:'2.0',method:'notifications/message',params:{data:'SECRET_NOTIFICATION'}}));
  if(m.params.arguments?.malformed){console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,error:{code:-1,message:'SECRET_ERROR'}}));return;}
  result={content:[{type:'text',text:JSON.stringify({success:true,result:{id:'kept-id',env_vars:{PUBLIC:{type:'plain_text',value:'public'},SECRET:{type:'secret_text',value:'SECRET_VALUE'}},build_config:{web_analytics_token:'SECRET_ANALYTICS'},'--- TRUNCATED ---':'SECRET_OMITTED_NAMES'}})}],_meta:{secret:'SECRET_META'}};
 }
 console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,result}));
});
`);
 await chmod(path.join(dir,'npx'),0o755);
 for(const mode of ['same','drift']){
  const child=spawn(process.execPath,[fileURLToPath(new URL('../adapter/transport.mjs',import.meta.url))],{env:{...process.env,PATH:dir+path.delimiter+process.env.PATH,CLOUDFLARE_API_TOKEN:'NON_SECRET_TEST',TEST_TOOLS:fileURLToPath(new URL('../bridge/src/tools.json',import.meta.url)),TEST_MODE:mode},stdio:['pipe','pipe','pipe']});
  const pending=new Map();let id=0,stderr='',all='';child.stderr.on('data',b=>stderr+=b);
  createInterface({input:child.stdout}).on('line',line=>{all+=line;const m=JSON.parse(line);pending.get(m.id)?.(m);pending.delete(m.id);});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>reject(new Error('Transport timeout')),5000);pending.set(key,m=>{clearTimeout(timer);resolve(m);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:key,method,params})+'\n');});
  try{
   const init=await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'test',version:'1'}});assert.deepEqual(init.result.capabilities,{tools:{}});
   const list=await call('tools/list');assert.equal(list.result.tools.length,mode==='same'?24:23);assert(!list.result.tools.some(t=>t.name==='unrelated_new_tool'));
   if(mode==='same')assert.deepEqual(list.result.tools,reviewed);else assert.equal(list.result.tools[0].description,'live changed contract');
   // Deliberate config-only overrides must not hit hidden transport argument
   // restrictions. This wrapper alone is NOT an authorization engine.
   for(const [name,args]of [
    ['pages_get',{}],
    ['pages_deployments_create',{body:{manifest:'{}','_worker.js':'reviewed code','_headers':'reviewed headers'}}],
   ]){
    const r=await call('tools/call',{name,arguments:args});assert(!r.result.isError);assert(JSON.stringify(r).includes('kept-id'));assert(JSON.stringify(r).includes('public'));assert(r.result.content[1].text.includes('partial result'));
   }
   // Drift/missing definition does not gate a selected operation's execution.
   const missing='pages_get';assert(!(await call('tools/call',{name:missing,arguments:{}})).result.isError);
   for(const name of ['accounts_tokens_create','user_tokens_create','builds_tokens_create','execute','pages_create','pages_edit'])assert((await call('tools/call',{name,arguments:{}})).result.isError);
   assert((await call('tools/call',{name:'pages_get',arguments:{malformed:true}})).result.isError);
   assert((await call('resources/read')).error);
   // Wait for process exit to drain stderr before diagnostic assertions.
  }finally{child.stdin.end();await new Promise(resolve=>child.on('exit',resolve));}
  assert(!all.includes('SECRET_'));
  assert(!stderr.includes('SECRET_'));
  if(mode==='same')assert.equal(stderr,'');else{assert(stderr.includes('cloudflare_selected_contract_drift'));assert(stderr.includes('changed'));assert(stderr.includes('missing'));}
 }
 console.log('Offline stdio: live paginated discovery, warning-only drift, override forwarding, Pages filtering and sanitized diagnostics passed.');
}finally{await rm(dir,{recursive:true,force:true});}
