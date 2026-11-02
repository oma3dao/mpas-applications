import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluatePolicy, validatePolicyConfig } from '../applications/render/bridge/node_modules/@oma3/mpas/dist/index.js';

const app = new URL('../applications/render/', import.meta.url);
const json = async p => JSON.parse(await readFile(new URL(p, app), 'utf8'));
const plugin = await json('plugin.json');
const tools = await json('bridge/src/tools.json');
const policy = JSON.parse((await readFile(new URL('policy.example.json', app), 'utf8'))
  .replaceAll('REPLACE_WITH_PROPOSER_DID', 'did:example:proposer')
  .replaceAll('REPLACE_WITH_APPROVER_DID', 'did:example:approver'));
assert.equal(validatePolicyConfig(policy).ok, true);
const approval = signerDid => ({ signerDid, decision: 'approve' });
const status = (name, args, approvals = []) => evaluatePolicy(
  { executionPayload: { name, arguments: args }, actionEnvelope: { proposer: { did: 'did:example:proposer' } } },
  { approvals }, policy).status;
let cases = 0;
function gated(name, args) {
  assert.equal(status(name, args), 'additionalApprovalsRequired', name);
  assert.equal(status(name, args, [approval('did:example:proposer')]), 'additionalApprovalsRequired', `${name}: self-approval`);
  assert.equal(status(name, args, [approval('did:example:outsider')]), 'additionalApprovalsRequired', `${name}: unrelated signer`);
  assert.equal(status(name, args, [approval('did:example:approver')]), 'satisfied', `${name}: independent approval`);
  cases += 4;
}
const expected = ['create_cron_job', 'create_key_value', 'create_postgres', 'create_static_site', 'create_web_service', 'list_workspaces', 'query_render_postgres', 'select_workspace', 'trigger_deploy', 'update_environment_variables'];
assert.deepEqual(Object.keys(plugin.operations).sort(), expected);
assert.deepEqual(Object.keys(policy.policies).sort(), expected);
for (const name of expected) gated(name, {});
for (const name of ['create_cron_job', 'create_key_value', 'create_postgres', 'create_web_service']) {
  const schema = tools.find(t => t.name === name).inputSchema;
  for (const plan of schema.properties.plan.enum) gated(name, { plan, workspaceId: 'tea-example' });
  gated(name, { workspaceId: 'tea-example' }); // omitted/default plan is still governed
}
for (const replace of [undefined, false, true]) gated('update_environment_variables', { serviceId: 'srv-example', envVars: [], ...(replace === undefined ? {} : { replace }) });
for (const clearCache of [undefined, false, true]) gated('trigger_deploy', { serviceId: 'srv-example', ...(clearCache === undefined ? {} : { clearCache }) });
gated('select_workspace', { ownerID: 'tea-other' });
gated('query_render_postgres', { postgresId: 'dpg-example', sql: 'SELECT 1' });
assert.equal(tools.length, 23);
assert.equal(tools.filter(t => !plugin.operations[t.name]).length, 13);
assert.equal(tools.some(t => /update.*(plan|web_service|static_site)/.test(t.name)), false);
const env = tools.find(t => t.name === 'update_environment_variables').inputSchema;
assert.equal(env.properties.replace.default, false);
assert.equal(tools.find(t => t.name === 'create_cron_job').inputSchema.properties.plan.default, 'starter');
for (const t of tools) {
  if (plugin.operations[t.name]) assert.deepEqual(plugin.operations[t.name].executionPayloadSchema.properties.arguments, t.inputSchema, `${t.name}: unchanged schema`);
}
// Verify that an added governed operation inherits independent approval rather than proposerOnly.
gated('future_governed_tool', {});
console.log(`Render policy: ${cases} real-engine evaluations passed; 23 unchanged schemas, 10 governed / 13 pass-through.`);
