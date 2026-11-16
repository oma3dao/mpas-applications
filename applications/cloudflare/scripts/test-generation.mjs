import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {assertV1Plugin} from './v1-release.mjs';
import {validatePolicyConfig} from '../bridge/node_modules/@oma3/mpas/dist/index.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const generator=process.argv[2];
assert(generator,'Usage: node test-generation.mjs <built-pinned-mpas/bridge-generator>');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'cloudflare-v1-replay-'));
try {
 const result=spawnSync(process.execPath,[path.join(root,'scripts/generate.mjs'),generator,path.join(root,'build-artifacts'),tmp,'--selected-snapshot'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const output=path.join(tmp,'cloudflare');
 for(const file of ['plugin.json','adapter-config.example.json','registry-entry.json','harness-config.json','build-artifacts/metadata.json','build-artifacts/classification.json','build-artifacts/tools-list.snapshot.json','bridge/src/tools.json','bridge/src/index.ts','bridge/src/sqlite-workflow-store.ts','bridge/package.json']){
  assert.equal(await fs.readFile(path.join(output,file),'utf8'),await fs.readFile(path.join(root,file),'utf8'),'Regeneration mismatch: '+file);
 }
 const plugin=JSON.parse(await fs.readFile(path.join(output,'plugin.json')));
 assertV1Plugin(plugin);
 assert.throws(()=>assertV1Plugin({...plugin,version:'2'}),/schema v1/);
 const display=structuredClone(plugin);Object.values(display.operations)[0].display={intent:'future',fields:[]};
 assert.throws(()=>assertV1Plugin(display),/metadata is deferred/);
 const config=JSON.parse(await fs.readFile(path.join(output,'adapter-config.example.json')));
 assert.equal(validatePolicyConfig(config.policy).ok,true);
 for(const name of ['pages_create','pages_edit'])assert(config.policy.policies[name].some(r=>r.reject&&!r.match));
 const registry=JSON.parse(await fs.readFile(path.join(output,'registry-entry.json')));
 assert.equal(config.plugin.artifactDid,registry.plugin.artifactDid);
 const wrong=spawnSync(process.execPath,[path.join(root,'scripts/generate.mjs'),path.join(root,'bridge'),path.join(root,'build-artifacts'),path.join(tmp,'wrong'),'--selected-snapshot'],{encoding:'utf8'});
 assert.notEqual(wrong.status,0);assert(wrong.stderr.includes('requires the recorded generator revision'));
 console.log('Restricted v1: 11 artifacts reproduced; released policy validation; v2/display and wrong-generator guards passed.');
}finally{await fs.rm(tmp,{recursive:true,force:true});}
