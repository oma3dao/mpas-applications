import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterResult} from '../adapter/guard.mjs';
import {selectedDrift} from '../adapter/drift.mjs';
const tools=JSON.parse(await readFile(new URL('../bridge/src/tools.json',import.meta.url),'utf8'));
const secret='SECRET_SENTINEL',plain='public configuration';
const env={PUBLIC:{type:'plain_text',value:plain},SECRET:{type:'secret_text',value:secret},BAD:{value:secret},DELETED:null};
const project={id:'kept-project-id',name:'site',deployment_configs:{production:{env_vars:env},preview:{env_vars:env}},build_config:{web_analytics_token:secret},env_vars:env,latest_deployment:{id:'kept-deploy-id',env_vars:env,latest_stage:{name:'deploy',status:'success'}},unknown:secret};
function result(raw,extras={}){return {content:[{type:'text',text:JSON.stringify(raw)}],...extras};}
for(const name of tools.map(t=>t.name).filter(n=>n.startsWith('pages_'))){
 for(const data of [{success:true,result:project},{success:true,result:[project]},[project]]){
  const actual=filterResult(name,result(data,{structuredContent:{secret},_meta:{secret},annotations:{secret}}));
  const text=JSON.stringify(actual);assert(!text.includes(secret));assert(text.includes(plain));assert(text.includes('kept-project-id'));assert(text.includes('kept-deploy-id'));assert.equal(actual.content.length,1);
 }
 for(const bad of [{isError:true,...result({secret})},{content:[{type:'text',text:secret}]},{content:[{type:'resource',resource:{text:secret}}]},{content:[{type:'text',text:'{}'},{type:'text',text:secret}]},result({success:false,errors:[secret]}),result(null),result(secret)]){
  const actual=filterResult(name,bad);assert(actual.isError);assert(!JSON.stringify(actual).includes(secret));
 }
 // Formatter markers can occur inside filtered-out fields too. Never forward
 // their omitted-key list or prefixes from truncated secret values.
 for(const raw of [
  {result:[project,'--- TRUNCATED --- 3 more items']},
  {result:{...project,'--- TRUNCATED ---':`omitted: ${secret}`}},
  {result:{...project,name:'site --- TRUNCATED --- 500 chars'}},
  {result:{...project,unknown:{'--- TRUNCATED ---':secret}}},
  {result:{...project,env_vars:{PUBLIC:{type:'plain_text',value:'value --- TRUNCATED --- 500 chars'},SECRET:{type:'secret_text',value:secret}}}},
  {result:[project,'--- TRUN']},
 ]){
  const actual=filterResult(name,result(raw));assert.equal(actual.content.length,2);assert(actual.content[1].text.includes('partial result'));assert(!JSON.stringify(actual).includes(secret));
  assert(!actual.content[0].text.includes('more items'));assert(!actual.content[0].text.includes('500 chars'));
 }
}
const dns=result({result:{id:'opaque-id',content:'normal DNS data'}});assert.deepEqual(filterResult('dns_records_get',dns),dns);
assert.deepEqual(selectedDrift(tools,structuredClone(tools)),[]);
assert.deepEqual(selectedDrift(tools,[...tools,{name:'unrelated-tool',inputSchema:{}}]),[]);
const changed=structuredClone(tools);changed[0].description='UPSTREAM_SECRET_DIAGNOSTIC';changed.pop();
const drift=selectedDrift(tools,changed);assert.equal(drift.length,2);assert(drift.some(x=>x.reason==='changed'));assert(drift.some(x=>x.reason==='missing'));assert(!JSON.stringify(drift).includes('UPSTREAM_SECRET_DIAGNOSTIC'));
console.log('Pages plaintext/secret separation, nested/error/metadata channels, truncation markers and selected-only drift diagnostics passed.');
