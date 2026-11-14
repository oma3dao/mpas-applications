// Offline integration: a fake npx replaces transport only inside this test's PATH.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
const dir=await mkdtemp(path.join(tmpdir(),'cloudflare-guard-test-'));
let child;
try{
 await writeFile(path.join(dir,'npx'),`#!/usr/bin/env node
const {createInterface}=require('node:readline');
createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line);if(!m.id)return;
 let result;
 if(m.method==='initialize')result={protocolVersion:'2024-11-05',capabilities:{logging:{}},serverInfo:{name:'fake',version:'1'}};
 else {
  console.error('SECRET_STDERR');
  console.log(JSON.stringify({jsonrpc:'2.0',method:'notifications/message',params:{data:'SECRET_NOTIFICATION'}}));
  if(m.params.arguments?.malformed){console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,error:{code:-1,message:'SECRET_ERROR'}}));return;}
  result={content:[{type:'text',text:JSON.stringify({success:true,result:{id:'kept-id',name:'site',env_vars:{A:'SECRET_ENV'},build_config:{web_analytics_token:'SECRET_ANALYTICS'},latest_stage:{status:'success'}}})}],_meta:{secret:'SECRET_META'}};
 }
 console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,result}));
});
`);
 await chmod(path.join(dir,'npx'),0o755);
 child=spawn(process.execPath,[fileURLToPath(new URL('../adapter/transport.mjs',import.meta.url))],{env:{...process.env,PATH:dir+path.delimiter+process.env.PATH,CLOUDFLARE_API_TOKEN:'NON_SECRET_TEST'},stdio:['pipe','pipe','pipe']});
 const pending=new Map();let id=0,stderr='',all='';
 child.stderr.on('data',b=>stderr+=b);
 createInterface({input:child.stdout}).on('line',line=>{all+=line;const m=JSON.parse(line);pending.get(m.id)?.(m);pending.delete(m.id);});
 function call(method,params={}){return new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>reject(new Error('Transport timeout')),5000);pending.set(key,m=>{clearTimeout(timer);resolve(m);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:key,method,params})+'\n');});}
 const init=await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'test',version:'1'}});assert.deepEqual(init.result.capabilities,{tools:{}});
 const list=await call('tools/list');assert.equal(list.result.tools.length,26);assert(!list.result.tools.some(t=>t.name==='execute'));
 for(const name of ['pages_get','pages_list','pages_edit']){
  const r=await call('tools/call',{name,arguments:{}});assert(!r.result.isError);assert(JSON.stringify(r).includes('kept-id'));
 }
 for(const name of ['accounts_tokens_create','user_tokens_create','builds_tokens_create','execute'])assert((await call('tools/call',{name,arguments:{}})).result.isError);
 assert((await call('tools/call',{name:'pages_edit',arguments:{body:{build_config:{build_command:'echo $SECRET'}}}})).result.isError);
 assert((await call('tools/call',{name:'pages_get',arguments:{malformed:true}})).result.isError);
 assert((await call('resources/read')).error);
 assert(!all.includes('SECRET_'));assert.equal(stderr,'');
 console.log('Credential-side stdio integration passed: unchanged tools, filtered responses, blocked methods/credentials/commands, no diagnostic leaks. Fake upstream only.');
}finally{child?.stdin.end();child?.kill();await rm(dir,{recursive:true,force:true});}
