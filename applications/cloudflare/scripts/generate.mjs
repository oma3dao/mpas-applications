// Offline replay of an operator's complete hosted capture. No provider calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {normalizeDnsSchema} from './dns-schema.mjs';
import {normalizeRequests} from './request-restrictions.mjs';
import {assertV1Plugin} from './v1-release.mjs';
const [generatorDir, captureDir, outputDir, replayMode] = process.argv.slice(2);
if (!generatorDir || !captureDir || !outputDir) throw new Error('Usage: node generate.mjs <built-mpas/bridge-generator> <capture-dir containing metadata.json and tools-list.snapshot.json> <new-applications-output-dir>');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const selection=await read(path.join(root,'tool-selection.json'));
// Build the recorded clean v1 generator; do not relabel v2 or strip display.
const generatorCommit='c7ffdd9a635dc66539fc74252a9641255029f7a6';
const generatorRoot=path.resolve(generatorDir,'..');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:generatorRoot,encoding:'utf8'}).trim(),generatorCommit,'Restricted v1 release requires the recorded generator revision');
execFileSync('git',['diff','--exit-code','HEAD','--','bridge-generator'],{cwd:generatorRoot});
const {runGenerate,computeArtifactDid}=await import(pathToFileURL(path.resolve(generatorDir,'dist/generate.js')));
const {buildToolsListSnapshot}=await import(pathToFileURL(path.resolve(generatorDir,'dist/artifacts.js')));
const snapshot=await read(path.join(captureDir,'tools-list.snapshot.json'));
const metadata=await read(path.join(captureDir,'metadata.json'));
assert.deepEqual(buildToolsListSnapshot(snapshot.tools).toolSurface,snapshot.toolSurface,'Capture hash mismatch');
if(replayMode==='--selected-snapshot') {
 assert.deepEqual(metadata.sourceToolSurface,selection.sourceToolSurface,'Unreviewed capture provenance');
 assert.equal(metadata.sourceToolCount,selection.sourceToolCount);
 assert.deepEqual(snapshot.tools.map(t=>t.name).sort(),Object.keys(selection.tools).sort());
 const reviewed=await read(path.join(root,'build-artifacts/tools-list.snapshot.json'));
 assert.deepEqual(snapshot,reviewed,'Selected replay must match committed reviewed definitions');
} else {
 assert.equal(replayMode,undefined,'Unknown replay mode');
 assert.deepEqual(snapshot.toolSurface,selection.sourceToolSurface,'Unreviewed source surface: review drift before updating selection');
 assert.equal(snapshot.tools.length,selection.sourceToolCount);
}
assert(metadata.upstreamCommand.includes(selection.endpoint),'Wrong endpoint/mode');
assert(!snapshot.tools.some(t=>t.name==='execute'),'Code Mode tool in native capture');
const names=Object.keys(selection.tools).sort();
const tools=names.map(n=>{const matches=snapshot.tools.filter(t=>t.name===n);assert.equal(matches.length,1,n);return matches[0];});
const [command,...args]=metadata.upstreamCommand;
const upstream={command,args,serverName:metadata.serverInfo.name,serverVersion:metadata.serverInfo.version,protocolVersion:metadata.protocolVersion,tools};
await runGenerate({appName:'cloudflare',outDir:outputDir,upstreamCommand:command,upstreamArgs:args,applicationDid:'did:web:wivity.com:applications:cloudflare-mcp-server',capturedAt:metadata.capturedAt,discover:async()=>upstream});
const out=path.resolve(outputDir,'cloudflare');
const get=p=>read(path.join(out,p));
const put=(p,v)=>fs.writeFile(path.join(out,p),JSON.stringify(v,null,2)+'\n');
const plugin=await get('plugin.json');
assertV1Plugin(plugin);
assert.deepEqual(await get('bridge/package.json'),await read(path.join(root,'bridge/package.json')),'Generated dependency manifest must remain unchanged');
plugin.pluginDid='did:web:wivity.com:plugins:cloudflare-mcp-server';plugin.publisherDid='did:web:wivity.com';
plugin.credentialRequirements=[{type:'cloudflareApiToken',expectedAuthority:['Cloudflare API access restricted to intended DNS zones and Pages accounts'],description:'Bearer token held only by the Credential Adapter and resolved as CLOUDFLARE_API_TOKEN. Authority is descriptive, not an OAuth scope.'}];
const classification=await get('build-artifacts/classification.json');classification.draft=false;
for(const name of names){const [impact,...reason]=selection.tools[name].split('|');plugin.operations[name].impact=impact;classification.operations[name]={impact,rationale:'Governed: '+reason.join('|')};}
// Preserve every captured DNS subtype; merge only the reviewed object intersections.
for (const name of ['dns_records_create','dns_records_edit','dns_records_update']) {
  const op=plugin.operations[name];
  op.executionPayloadSchema.properties.arguments=normalizeDnsSchema(op.executionPayloadSchema.properties.arguments);
}
normalizeRequests(plugin);
// Prune unreachable definitions after normalization; do not narrow valid inputs.
for(const op of Object.values(plugin.operations)) {
 const args=op.executionPayloadSchema.properties.arguments;
 const used=new Set();
 function refs(v){
  if(!v||typeof v!=='object')return;
  if(v.$ref){const key=v.$ref.split('/$defs/')[1];if(key&&!used.has(key)){used.add(key);refs(args.$defs?.[key]);}}
  for(const [k,x] of Object.entries(v))if(k!=='$defs')refs(x);
 }
 refs(args);
 if(args.$defs)args.$defs=Object.fromEntries(Object.entries(args.$defs).filter(([k])=>used.has(k)));
}

// Annotation-only compaction keeps the expanded DNS validation within SDK
// resource limits. Full descriptions/examples remain in unchanged Tool schemas.
function compact(v) {
 if(Array.isArray(v))return v.map(compact);
 if(!v||typeof v!=='object')return v;
 return Object.fromEntries(Object.entries(v).filter(([k])=>!['description','examples','example','default','title'].includes(k)).map(([k,x])=>[k,['properties','$defs','patternProperties'].includes(k)?Object.fromEntries(Object.entries(x).map(([name,schema])=>[name,compact(schema)])):compact(x)]));
}
for(const op of Object.values(plugin.operations))op.executionPayloadSchema=compact(op.executionPayloadSchema);
// Six identical upload unions share one definition (no shape restriction).
const uploadArgs=plugin.operations.pages_deployments_create.executionPayloadSchema.properties.arguments;
const uploadProps=uploadArgs.properties.body.properties;
const uploadSchema=uploadProps['_worker.js'];
const uploadNames=Object.keys(uploadProps).filter(k=>JSON.stringify(uploadProps[k])===JSON.stringify(uploadSchema));
assert.equal(uploadNames.length,6,'Unreviewed upload union drift');
uploadArgs.$defs={...uploadArgs.$defs,pages_upload_file:uploadSchema};
for(const name of uploadNames)uploadProps[name]={$ref:'#/properties/arguments/$defs/pages_upload_file'};

await put('plugin.json',plugin);await put('build-artifacts/classification.json',classification);
const h=await get('harness-config.json');h.upstream.env={CLOUDFLARE_API_TOKEN:'{{credential:cloudflareApiToken}}'};h.upstream.distribution={type:'remote',endpoint:selection.endpoint,client:{type:'npm',package:'mcp-remote',version:'0.1.38'},versionMatchesServerInfo:false,reconciliation:'Hosted implementation updates independently. This application intentionally exposes a reviewed subset; metadata records original and selected surface hashes.'};h.intentionalDeviations.selectedToolNames=names;h.intentionalDeviations.pluginSchemaRestrictions=['DNS object allOf intersections are flattened for SDK fail-closed validation; every captured subtype and field remains available. Plugin validates resource path formats and normalizes environment-variable unions; provider-valid upload, secret, build and analytics inputs remain valid. Deployment policy alone controls their authorization. Transport sanitizes responses only; plaintext environment variables are supported.'];h.intentionalDeviations.note+=' This is a selected subset, not the complete hosted inventory. Selected upstream Tool objects are unchanged; omitted operations are not pass-through.';await put('harness-config.json',h);
const m=await get('build-artifacts/metadata.json');m.generatorCommit='c7ffdd9a635dc66539fc74252a9641255029f7a6';m.sourceToolSurface=selection.sourceToolSurface;m.sourceToolCount=selection.sourceToolCount;m.selectedToolCount=tools.length;m.discoveryNotes='Operator-supplied authenticated hosted capture. Offline generator replay uses the explicit tool-selection.json subset, preserving full selected Tool objects. The committed snapshot is the selected surface, not the full hosted list. Generator revision follows the operator capture handoff; no fresh live discovery or tools/call was performed locally.';await put('build-artifacts/metadata.json',m);
const r=await get('registry-entry.json');r.application={name:'Cloudflare DNS and Pages MCP MPAS Bridge',description:'Restricted v1 DNS and Pages bridge; project create/edit and direct uploads are denied by the example policy.',applicationDid:plugin.applicationDid};r.publisher={name:'Wivity',githubOrg:'wivity',publisherDid:plugin.publisherDid};r.plugin={repository:'https://github.com/oma3dao/mpas-applications/blob/main/applications/cloudflare/plugin.json',pluginDid:plugin.pluginDid,artifactDid:await computeArtifactDid(plugin)};r.upstream.repository='https://github.com/cloudflare/mcp';r.upstream.distributionUrl=selection.endpoint;r.status='beta';await put('registry-entry.json',r);
const config=await read(path.join(root,'adapter-config.example.json'));config.plugin.artifactDid=r.plugin.artifactDid;await put('adapter-config.example.json',config);
console.log(`Verified ${snapshot.tools.length} ${replayMode ? "committed selected" : "source"} tools; selected ${tools.length} unchanged definitions. All selected tools governed.`);
