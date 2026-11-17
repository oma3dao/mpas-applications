import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadPlugin,validatePayloadAgainstPlugin,evaluatePolicy,validatePolicyConfig,computeToolSurfaceHash,checkProposerAuthorization} from '../bridge/node_modules/@oma3/mpas/dist/index.js';
// No local-SDK override: test the released dependency installed from the lockfile.
import {DIRECT_UPLOAD_FIELDS,PATH_CONSTRAINTS} from './request-restrictions.mjs';
const read=async p=>JSON.parse(await fs.readFile(new URL('../'+p,import.meta.url),'utf8'));
const loaded=await loadPlugin(fileURLToPath(new URL('../plugin.json',import.meta.url)));assert.equal(loaded.ok,true,JSON.stringify(loaded));
const plugin=loaded.plugin,selection=await read('tool-selection.json'),snapshot=await read('build-artifacts/tools-list.snapshot.json');
assert.equal(plugin.version,'1');
assert(Object.values(plugin.operations).every(op=>!Object.hasOwn(op,'display')));
const blocked=new Set(['pages_create','pages_edit']);
const account='a'.repeat(32),zone='b'.repeat(32),record='c'.repeat(32),deployment='12345678-1234-1234-1234-123456789abc';
const template=await read('adapter-config.example.json');
for(const [name,rules] of Object.entries(template.policy.policies)){
 const scope=rules[0].match.conditions[0];
 assert.equal(scope.path,name.startsWith('dns_')?'/arguments/path/zone_id':'/arguments/path/account_id');
 if(name.startsWith('dns_'))assert.deepEqual(scope.value,['REPLACE_WITH_ZONE_ID_1','REPLACE_WITH_ZONE_ID_2']);
 else assert.equal(scope.value,'REPLACE_WITH_ACCOUNT_ID');
}
let config=JSON.stringify(template);
for(const [key,val] of Object.entries({ACCOUNT_ID:account,PROPOSER_DID:'did:example:proposer',APPROVER_DID:'did:example:approver',ZONE_ID_1:zone,ZONE_ID_2:'e'.repeat(32)}))config=config.replaceAll('REPLACE_WITH_'+key,val);
config=JSON.parse(config);assert.equal(config.passThrough,undefined);assert.equal(validatePolicyConfig(config.policy).ok,true,'Restricted v1 config must validate with the released SDK');
assert.equal(Object.keys(plugin.operations).length,14);assert.equal(plugin.toolSurface.toolNames.length,24);assert.deepEqual(Object.keys(plugin.operations).sort(),Object.keys(selection.tools).filter(n=>!selection.passThroughReads.includes(n)).sort());assert.deepEqual(Object.keys(config.policy.policies).sort(),Object.keys(plugin.operations).sort());assert.deepEqual(Object.keys(config.policy.signerGroups).sort(),['all','approvers','proposers']);assert.deepEqual(plugin.toolSurface.hash,computeToolSurfaceHash(snapshot.tools));
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
 expect(name,args,approved,'satisfied');
 assert.equal(checkProposerAuthorization('did:example:unknown',config.policy).allowed,false);
 const scope='zone_id' in args.path?'zone_id':'account_id';
 for(const who of ['proposer']){
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
 const args={path:{zone_id:zone,dns_record_id:id}};assert(valid('dns_records_delete',args));assert.equal(validatePayloadAgainstPlugin({name:'dns_records_get',arguments:args},plugin).error.code,'UNKNOWN_OPERATION');
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
 for(const who of ['proposer'])expect('pages_deployments_create',args,approved,'rejected',who);
}
// All multipart/file fields from the capture are covered, not only Worker JS.
const deploymentBody=snapshot.tools.find(t=>t.name==='pages_deployments_create').inputSchema.properties.body.properties;
for(const [field,schema]of Object.entries(deploymentBody))if(schema.anyOf?.some(x=>x.properties?.content))assert(DIRECT_UPLOAD_FIELDS.includes(field));
// Read eligibility is attestation plus proposer gating, not operation policy.
// CA routing skips plugin schema validation/evaluatePolicy for these names;
// this test checks the released SDK primitives, not a replacement verifier.
for(const name of selection.passThroughReads){
 assert(plugin.toolSurface.toolNames.includes(name));assert(!Object.hasOwn(plugin.operations,name));assert(!Object.hasOwn(config.policy.policies,name));
 const result=validatePayloadAgainstPlugin({name,arguments:{path:{dns_record_id:'..'}}},plugin);
 assert.equal(result.error.code,'UNKNOWN_OPERATION');
 assert.equal(checkProposerAuthorization('did:example:proposer',config.policy).allowed,true);
 assert.equal(checkProposerAuthorization('did:example:unknown',config.policy).allowed,false);count++;
}
for(const name of [...blocked,'execute','accounts_tokens_create']){
 assert(!plugin.toolSurface.toolNames.includes(name));assert(!Object.hasOwn(plugin.operations,name));assert(!Object.hasOwn(config.policy.policies,name));count++;
}
// Both approved zone IDs work; names must never be substituted for IDs.
for(const name of Object.keys(plugin.operations).filter(n=>n.startsWith('dns_'))){
 const args=argsFor(name);args.path.zone_id='e'.repeat(32);expect(name,args,approved,'satisfied');
 args.path.zone_id='example.com';expect(name,args,approved,'rejected');
}
// Config-only direct-upload override keeps the same plugin bytes and schemas.
const before=JSON.stringify(plugin),overridePolicy=structuredClone(config.policy);
overridePolicy.policies.pages_deployments_create=overridePolicy.policies.pages_deployments_create.filter(r=>!r.match.conditions.some(c=>c.path.startsWith('/arguments/body/')));
const upload={...git,body:{branch:'main',manifest:'{}','_worker.js':'reviewed code'}};
assert(valid('pages_deployments_create',upload));assert.equal(status('pages_deployments_create',upload,approved),'rejected');
assert.equal(status('pages_deployments_create',upload,[],'proposer',overridePolicy),'additionalApprovalsRequired');
assert.equal(status('pages_deployments_create',upload,approved,'proposer',overridePolicy),'satisfied');assert.equal(JSON.stringify(plugin),before);
console.log(`Cloudflare: ${count} policy/path cases; 10 attested pass-through reads, 14 governed writes, two excluded project tools; default approvals, scope exceptions and upload overrides passed.`);
