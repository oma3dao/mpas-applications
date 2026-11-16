import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadPlugin,validatePayloadAgainstPlugin,evaluatePolicy,validatePolicyConfig,computeToolSurfaceHash} from '../bridge/node_modules/@oma3/mpas/dist/index.js';
// No local-SDK override: test the released dependency installed from the lockfile.
import {DIRECT_UPLOAD_FIELDS,PATH_CONSTRAINTS} from './request-restrictions.mjs';
const read=async p=>JSON.parse(await fs.readFile(new URL('../'+p,import.meta.url),'utf8'));
const loaded=await loadPlugin(fileURLToPath(new URL('../plugin.json',import.meta.url)));assert.equal(loaded.ok,true,JSON.stringify(loaded));
const plugin=loaded.plugin,selection=await read('tool-selection.json'),snapshot=await read('build-artifacts/tools-list.snapshot.json');
assert.equal(plugin.version,'1');
assert(Object.values(plugin.operations).every(op=>!Object.hasOwn(op,'display')));
const blocked=new Set(['pages_create','pages_edit']);
const account='a'.repeat(32),zone='b'.repeat(32),record='c'.repeat(32),deployment='12345678-1234-1234-1234-123456789abc';
let config=JSON.stringify(await read('adapter-config.example.json'));
for(const [key,val] of Object.entries({PROPOSER_DID:'did:example:proposer',APPROVER_DID:'did:example:approver',MUSE_DID:'did:example:muse',GROK_DID:'did:example:grok',ACCOUNT_ID:account,ZONE_ID:zone}))config=config.replaceAll('REPLACE_WITH_'+key,val);
config=JSON.parse(config);assert.equal(config.passThrough,'deny');assert.equal(validatePolicyConfig(config.policy).ok,true,'Restricted v1 config must validate with the released SDK');
assert.deepEqual(Object.keys(plugin.operations).sort(),Object.keys(selection.tools).sort());assert.deepEqual(plugin.toolSurface.hash,computeToolSurfaceHash(snapshot.tools));
const approved=[{signerDid:'did:example:approver',decision:'approve'}];let count=0;
const status=(name,args,approvals=[],who='proposer',policy=config.policy)=>evaluatePolicy({executionPayload:{name,arguments:args},actionEnvelope:{proposer:{did:'did:example:'+who}}},{approvals},policy).status;
const valid=(name,args,p=plugin)=>validatePayloadAgainstPlugin({name,arguments:args},p).ok;
function expect(name,args,ap,want,who='proposer'){assert.equal(status(name,args,ap,who),want,name+' '+who);count++;}
function argsFor(name){
 const schema=plugin.operations[name].executionPayloadSchema.properties.arguments;
 const values={account_id:account,zone_id:zone,dns_record_id:record,deployment_id:deployment,project_name:'new-project',domain_name:'www.example.com'};
 const args={path:Object.fromEntries(Object.keys(schema.properties.path.properties).map(k=>[k,values[k]]))};
 if(name==='pages_create')args.body={name:'new-project',production_branch:'main'};
 else if(name==='pages_domains_create')args.body={name:'www.example.com'};
 else if(name==='pages_deployments_create')args.body={branch:'main'};
 else if(name==='pages_source_connect')args.body={type:'github',config:Object.fromEntries(Object.entries(schema.$defs.pages_source_config.properties).map(([k,v])=>[k,v.enum?.[0]??(v.type==='array'?[]:v.type==='boolean'?true:'reviewed-repo')]))};
 else if(['dns_records_create','dns_records_edit','dns_records_update'].includes(name))args.body={name:'new.example.com',type:'A',content:'192.0.2.1'};
 else if(schema.required?.includes('body'))args.body={};
 return args;
}
for(const name of Object.keys(plugin.operations)){
 const args=argsFor(name),read=name.endsWith('_get')||name.endsWith('_list');
 assert(valid(name,args),'valid baseline '+name);
 for(const ap of [[],[{signerDid:'did:example:proposer',decision:'approve'}],[{signerDid:'did:example:other',decision:'approve'}]])expect(name,args,ap,blocked.has(name)?'rejected':read?'satisfied':'additionalApprovalsRequired');
 expect(name,args,approved,blocked.has(name)?'rejected':'satisfied');for(const who of ['muse','grok'])for(const ap of [[],approved])expect(name,args,ap,blocked.has(name)?'rejected':'satisfied',who);
 expect(name,args,approved,'rejected','unknown');
 const scope='zone_id' in args.path?'zone_id':'account_id';
 for(const who of ['proposer','muse','grok']){
  expect(name,{...args,path:{...args.path,[scope]:'d'.repeat(32)}},approved,'rejected',who);
  const missing=structuredClone(args);delete missing.path[scope];expect(name,missing,approved,'rejected',who);
 }
 // Every selected path field rejects traversal, separators and encoded variants.
 for(const key of Object.keys(args.path))for(const bad of ['', '.', '..', '%2e', '%2e%2e', '%252e%252e', '/', '../x','a/b','a\\b','a?x','a#x','a\n',' .. ','https://example.com']){
  assert.equal(valid(name,{...args,path:{...args.path,[key]:bad}}),false,name+' '+key+' '+JSON.stringify(bad));count++;
 }
}
// Demonstrate the cited URL-normalization effect without making a request.
assert.equal(new URL('https://api.cloudflare.com/client/v4/zones/'+zone+'/dns_records/'+encodeURIComponent('..')).pathname,'/client/v4/zones/'+zone+'/');
// No identifier allowlist: new provider-issued IDs and names remain usable.
for(const id of [record,'0123456789abcdef0123456789abcdef','id.with~unreserved-chars']){
 const args={path:{zone_id:zone,dns_record_id:id}};assert(valid('dns_records_delete',args));assert(valid('dns_records_get',args));
}
for(const name of ['dns_records_create','dns_records_edit','dns_records_update']){
 const definitions=snapshot.tools.find(t=>t.name===name).inputSchema.$defs;
 const types=new Set(Object.values(definitions).flatMap(x=>x.allOf||[]).flatMap(x=>x.properties?.type?.enum||[]));assert.equal(types.size,21);
 for(const type of types){const args=argsFor(name);args.body.type=type;
  if(!['A','AAAA','CNAME','MX','NS','OPENPGPKEY','PTR','TXT'].includes(type)){delete args.body.content;args.body.data={};}
  assert(valid(name,args),name+' '+type);expect(name,args,approved,'satisfied');
  args.body.unknown=true;assert(!valid(name,args));
 }
 assert.equal(plugin.operations[name].impact,'critical');
}
const git=argsFor('pages_deployments_create');assert(valid('pages_deployments_create',git));expect('pages_deployments_create',git,approved,'satisfied');
for(const field of DIRECT_UPLOAD_FIELDS)for(const value of ['payload',{content:'payload'},null]){
 const args={...git,body:{...git.body,[field]:value}};
 assert.equal(valid('pages_deployments_create',args),typeof value==='string'||(typeof value==='object'&&value!==null&&!['manifest','pages_build_output_dir','wrangler_config_hash'].includes(field)),field);
 for(const who of ['proposer','muse','grok'])expect('pages_deployments_create',args,approved,'rejected',who);
}
// All multipart/file fields from the capture are covered, not only Worker JS.
const deploymentBody=snapshot.tools.find(t=>t.name==='pages_deployments_create').inputSchema.properties.body.properties;
for(const [field,schema]of Object.entries(deploymentBody))if(schema.anyOf?.some(x=>x.properties?.content))assert(DIRECT_UPLOAD_FIELDS.includes(field));
for(const name of ['pages_create','pages_edit'])for(const env of ['preview','production']){
 for(const entry of [{type:'plain_text',value:'public setting'},null]){
  const args=argsFor(name);args.body.deployment_configs={[env]:{env_vars:{ANY_NEW_NAME:entry}}};
  assert(valid(name,args),JSON.stringify(args));expect(name,args,approved,'rejected');
 }
 for(const entry of [{type:'secret_text'},{value:'unclassified'},{type:'plain_text',value:7},{type:'other',value:'x'},[],7]){
  const args=argsFor(name);args.body.deployment_configs={[env]:{env_vars:{'new/name~key':entry}}};assert(!valid(name,args));
 }
 for(const field of ['build_command','web_analytics_token']){
  const args=argsFor(name);args.body.build_config={[field]:'TEST_SENTINEL'};assert(valid(name,args));
  for(const who of ['proposer','muse','grok'])expect(name,args,approved,'rejected',who);
 }
}
// All arbitrary-name environment writes are denied, including plaintext.
for(const name of blocked){
 assert(config.policy.policies[name].some(r=>r.reject===true&&!r.match));
 for(const env of ['preview','production'])for(const key of ['ANY_NEW_NAME','new/name~key','__proto__','constructor'])for(const type of ['plain_text','secret_text']){
  const args=argsFor(name);args.body.deployment_configs={[env]:{env_vars:{[key]:{type,value:'fixture'}}}};
  assert(valid(name,args));
  for(const who of ['proposer','muse','grok','unknown'])for(const ap of [[],approved])expect(name,args,ap,'rejected',who);
 }
}
// Mechanical override test only, NOT a recommended release configuration:
// removing the blanket denial enables secret writes too; the released engine
// cannot selectively inspect arbitrary keys. Transport must not decide policy.
const before=JSON.stringify(plugin),overridePolicy=structuredClone(config.policy);
for(const name of [...blocked,'pages_deployments_create']) {
 overridePolicy.policies[name]=overridePolicy.policies[name].filter(r=>!(r.reject&&!r.match)&&!r.match?.conditions?.some(c=>c.path.startsWith('/arguments/body/')));
}
for(const [name,args] of [
 ['pages_deployments_create',{...git,body:{branch:'main',manifest:'{}','_worker.js':'reviewed code'}}],
 ['pages_edit',{...argsFor('pages_edit'),body:{build_config:{build_command:'reviewed command'},deployment_configs:{production:{env_vars:{SECRET:{type:'secret_text',value:'known to caller'}}}}}}],
]){assert(valid(name,args));assert.equal(status(name,args,approved),'rejected');assert.equal(status(name,args,[],'proposer',overridePolicy),'additionalApprovalsRequired');assert.equal(status(name,args,approved,'proposer',overridePolicy),'satisfied');}
assert.equal(JSON.stringify(plugin),before);
console.log(`Cloudflare restricted v1: ${count} policy/path cases; Pages create/edit denied for all proposers; Git deployments allowed; provider-valid schemas and config-only authorization passed.`);
