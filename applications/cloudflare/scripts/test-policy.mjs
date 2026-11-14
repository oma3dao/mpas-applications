import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadPlugin, validatePayloadAgainstPlugin, evaluatePolicy, validatePolicyConfig, computeToolSurfaceHash} from '../bridge/node_modules/@oma3/mpas/dist/index.js';
const read=async p=>JSON.parse(await fs.readFile(new URL('../'+p,import.meta.url),'utf8'));
const loaded=await loadPlugin(fileURLToPath(new URL('../plugin.json',import.meta.url)));assert.equal(loaded.ok,true,JSON.stringify(loaded));
const plugin=loaded.plugin, selection=await read('tool-selection.json'), snapshot=await read('build-artifacts/tools-list.snapshot.json');
const original=await read('adapter-config.example.json');
const config=JSON.parse(JSON.stringify(original).replaceAll('REPLACE_WITH_PROPOSER_DID','did:example:proposer').replaceAll('REPLACE_WITH_APPROVER_DID','did:example:approver'));
assert.equal(config.passThrough,'deny');
assert.deepEqual(Object.keys(plugin.operations).sort(),Object.keys(selection.tools).sort());
assert.deepEqual(plugin.toolSurface.toolNames,Object.keys(selection.tools).sort());
assert.deepEqual(computeToolSurfaceHash(snapshot.tools),plugin.toolSurface.hash);
assert.equal(validatePolicyConfig(config.policy).ok,true);
const approved=[{signerDid:'did:example:approver',decision:'approve'}];
const policy=(name,args,approvals=[])=>evaluatePolicy({executionPayload:{name,arguments:args},actionEnvelope:{proposer:{did:'did:example:proposer'}}},{approvals},config.policy).status;
let count=0;
const expect=(name,args,ap,status)=>{assert.equal(policy(name,args,ap),status,name+' '+JSON.stringify(args));count++;};
for(const name of Object.keys(plugin.operations)){
 const args={path:{}};
 if(name.startsWith('dns_')||name.startsWith('zones_')) args.path.zone_id='REPLACE_WITH_ZONE_ID';
 else args.path.account_id='REPLACE_WITH_ACCOUNT_ID';
 if(name.startsWith('pages_')&& !['pages_create','pages_list'].includes(name)) args.path.project_name='REPLACE_WITH_PAGES_PROJECT';
 if(['dns_records_delete','dns_records_edit','dns_records_update','dns_records_get'].includes(name))args.path.dns_record_id='REPLACE_WITH_DNS_RECORD_ID';
 if(['dns_records_create','dns_records_edit','dns_records_update'].includes(name))args.body={name:'REPLACE_WITH_DNS_NAME',type:'A',content:'192.0.2.1'};
 if(name==='pages_create')args.body={name:'REPLACE_WITH_PAGES_PROJECT',production_branch:'REPLACE_WITH_PRODUCTION_BRANCH'};
 if(name==='pages_domains_create')args.body={name:'REPLACE_WITH_CUSTOM_DOMAIN'};
 if(name.startsWith('pages_domains_')&&!['pages_domains_create','pages_domains_list'].includes(name))args.path.domain_name='REPLACE_WITH_CUSTOM_DOMAIN';
 if(name==='pages_deployments_create')args.body={branch:'REPLACE_WITH_PRODUCTION_BRANCH'};
 for(const ap of [[],[{signerDid:'did:example:proposer',decision:'approve'}],[{signerDid:'did:example:unrelated',decision:'approve'}]])expect(name,args,ap,'additionalApprovalsRequired');
 expect(name,args,approved,'satisfied');
 for(const key of ['account_id','zone_id','project_name','dns_record_id','domain_name'])if(args.path[key]){
  const missing=structuredClone(args);delete missing.path[key];expect(name,missing,approved,'rejected');
  const wrong=structuredClone(args);wrong.path[key]='wrong';expect(name,wrong,approved,'rejected');
 }
}
expect('execute',{code:'async()=>1'},approved,'rejected');
for(const name of ['execute','dns_records_batch','dns_records_import','accounts_tokens_create','workers_scripts_delete']){
 const v=validatePayloadAgainstPlugin({name,arguments:{}},plugin);assert.equal(v.ok,false);assert.equal(v.error.code,'UNKNOWN_OPERATION');assert(!plugin.toolSurface.toolNames.includes(name));
 assert(name==='execute'||!Object.hasOwn(config.policy.policies,name));
}
const dns={path:{zone_id:'REPLACE_WITH_ZONE_ID'},body:{name:'REPLACE_WITH_DNS_NAME',type:'A',content:'192.0.2.1'}};
assert.equal(validatePayloadAgainstPlugin({name:'dns_records_create',arguments:dns},plugin).ok,true);
for(const type of ['NS','MX','CAA'])expect('dns_records_create',{...dns,body:{...dns.body,type}},approved,'rejected');
expect('dns_records_create',{...dns,body:{type:'A'}},approved,'rejected');
const invalid=validatePayloadAgainstPlugin({name:'dns_records_create',arguments:{...dns,path:{zone_id:7}}},plugin);assert.equal(invalid.ok,false);
const project={path:{account_id:'REPLACE_WITH_ACCOUNT_ID',project_name:'REPLACE_WITH_PAGES_PROJECT'}};
for(const body of [{deployment_configs:{}},{name:'other'},{build_config:{web_analytics_token:'test-not-a-secret'}}])expect('pages_edit',{...project,body},approved,'rejected');
for(const field of ['_worker.js','_worker.bundle','functions-filepath-routing-config.json'])expect('pages_deployments_create',{...project,body:{branch:'REPLACE_WITH_PRODUCTION_BRANCH',[field]:'test'}},approved,'rejected');
expect('pages_deployments_create',{...project,body:{}},approved,'rejected');
console.log(`Cloudflare: ${count} policy cases plus schema, attested-surface and deny-config checks passed. No live adapter/provider calls.`);
// Exercise real SDK schema compilation, including DNS's explicit narrowed body.
for (const type of ['A','AAAA','CNAME','TXT']) {
  const args={...dns,body:{...dns.body,type,content:type==='AAAA'?'2001:db8::1':type==='CNAME'?'example.com':type==='TXT'?'test':'192.0.2.1'}};
  for(const name of ['dns_records_create','dns_records_edit','dns_records_update']) {
    const a=structuredClone(args);if(name!=='dns_records_create')a.path.dns_record_id='REPLACE_WITH_DNS_RECORD_ID';
    assert.equal(validatePayloadAgainstPlugin({name,arguments:a},plugin).ok,true,name+' '+type);
    a.body.unreviewed=true;assert.equal(validatePayloadAgainstPlugin({name,arguments:a},plugin).ok,false);
  }
}
for(const [name,args] of [
 ['pages_create',{path:{account_id:'account'},body:{name:'site',production_branch:'main'}}],
 ['pages_edit',{path:{account_id:'account',project_name:'site'},body:{build_config:{build_command:'npm run build',destination_dir:'out'}}}],
 ['pages_deployments_create',{path:{account_id:'account',project_name:'site'},body:{branch:'main'}}],
 ['pages_domains_create',{path:{account_id:'account',project_name:'site'},body:{name:'example.com'}}]
])assert.equal(validatePayloadAgainstPlugin({name,arguments:args},plugin).ok,true,name);
console.log('DNS subtype/unknown-field and representative Pages payload schema cases passed.');
