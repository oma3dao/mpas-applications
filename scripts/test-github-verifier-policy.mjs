import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluatePolicy, validatePolicyConfig } from '../applications/github/bridge/node_modules/@oma3/mpas/dist/index.js';

// Use the installed alpha.13 policy engine, not a second implementation of matching.
// Inputs model already-verified approvals; cryptographic verification is upstream.
const policy = JSON.parse(await readFile(new URL('../applications/github/verifier-policy.example.json', import.meta.url)));
const plugin = JSON.parse(await readFile(new URL('../applications/github/plugin.json', import.meta.url)));
assert.equal(validatePolicyConfig(policy).ok, true);
const proposer = policy.signerGroups.proposers[0];
const maintainer = policy.signerGroups.approvers[0];
function result(name, args, approvals = [], config = policy) {
  return evaluatePolicy({ executionPayload: { name, arguments: args }, actionEnvelope: { proposer: { did: proposer } } }, { approvals }, config).status;
}
let cases = 0;
function expect(name, args, approvals, status, config = policy) {
  assert.equal(result(name, args, approvals, config), status, `${name} ${JSON.stringify(args)}`); cases++;
}
// A permissive deployment default must not override the explicit main rules.
const permissive = { ...policy, defaultRequirement: { type: 'proposerOnly' } };
for (const tool of ['push_files', 'create_or_update_file', 'delete_file']) {
  assert.ok(['high', 'critical'].includes(plugin.operations[tool].impact));
  assert.equal(plugin.operations[tool].executionPayloadSchema.properties.arguments.properties.branch.const, undefined);
  for (const branch of ['main', 'refs/heads/main', 'heads/main']) {
    const args = { owner: 'example', repo: 'test', branch };
    expect(tool, args, [], 'additionalApprovalsRequired', permissive);
    expect(tool, args, [{ signerDid: proposer, decision: 'approve' }], 'additionalApprovalsRequired', permissive);
    expect(tool, args, [{ signerDid: 'did:example:outsider', decision: 'approve' }], 'additionalApprovalsRequired', permissive);
    expect(tool, args, [{ signerDid: maintainer, decision: 'reject' }], 'additionalApprovalsRequired', permissive);
    expect(tool, args, [{ signerDid: maintainer, decision: 'approve' }], 'satisfied', permissive);
  }
  for (const branch of ['feature/fix', 'main-fix', 'Main']) {
    expect(tool, { branch }, [], 'satisfied', permissive);
    expect(tool, { branch }, [], 'additionalApprovalsRequired');
  }
  // Supplied example retains a conservative fallback for missing/invalid refs.
  for (const args of [{}, { branch: null }, { branch: '' }]) {
    expect(tool, args, [], 'additionalApprovalsRequired');
  }
}
expect('merge_pull_request', { pullNumber: 1 }, [], 'additionalApprovalsRequired', permissive);
expect('merge_pull_request', { pullNumber: 1 }, [{ signerDid: maintainer, decision: 'approve' }], 'satisfied', permissive);
// Existing stricter matching requirements must survive operator rule merging.
const stricter = structuredClone(permissive);
stricter.policies.push_files.push({ requirements: { type: 'threshold', threshold: 2, eligibleSigners: [maintainer, 'did:example:second-maintainer'], decision: 'approve' } });
expect('push_files', { branch: 'main' }, [{ signerDid: maintainer, decision: 'approve' }], 'additionalApprovalsRequired', stricter);
console.log(`GitHub verifier policy: ${cases} evaluation cases passed.`);
