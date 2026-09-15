import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluatePolicy, validatePolicyConfig } from '../applications/github/bridge/node_modules/@oma3/mpas/dist/index.js';

// Use the installed policy engine, not a second implementation of matching.
// Inputs model already-verified approvals; cryptographic verification is upstream.
const policy = JSON.parse(await readFile(new URL('../applications/github/verifier-policy.example.json', import.meta.url)));
const plugin = JSON.parse(await readFile(new URL('../applications/github/plugin.json', import.meta.url)));
assert.equal(validatePolicyConfig(policy).ok, true);
const proposer = policy.signerGroups.proposers[0];
const maintainer = policy.signerGroups.approvers[0];
function result(name, args, approvals = []) {
  return evaluatePolicy({ executionPayload: { name, arguments: args }, actionEnvelope: { proposer: { did: proposer } } }, { approvals }, policy).status;
}
let cases = 0;
function expect(name, args, approvals, status) {
  assert.equal(result(name, args, approvals), status, `${name} ${JSON.stringify(args)}`); cases++;
}

for (const tool of ['add_issue_comment', 'add_reply_to_pull_request_comment', 'create_or_update_file', 'delete_file', 'create_pull_request', 'issue_write', 'update_pull_request', 'update_pull_request_branch']) {
  expect(tool, {}, [], 'satisfied');
}
assert.ok(['high', 'critical'].includes(plugin.operations.push_files.impact));
assert.equal(plugin.operations.push_files.executionPayloadSchema.properties.arguments.properties.branch.const, undefined);
expect('push_files', { branch: 'main' }, [], 'rejected');
expect('push_files', { branch: 'main' }, [{ signerDid: maintainer, decision: 'approve' }], 'rejected');
for (const branch of ['feature/fix', 'main-fix', 'Main', 'refs/heads/main', 'heads/main']) {
  expect('push_files', { branch }, [], 'satisfied');
}
expect('assign_copilot_to_issue', {}, [], 'rejected');
// Operations without an override retain the conservative default requirement.
expect('merge_pull_request', { pullNumber: 1 }, [], 'additionalApprovalsRequired');
expect('merge_pull_request', { pullNumber: 1 }, [{ signerDid: maintainer, decision: 'approve' }], 'satisfied');
console.log(`GitHub verifier policy: ${cases} evaluation cases passed.`);
