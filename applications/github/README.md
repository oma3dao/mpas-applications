# GitHub MPAS application

## Main-branch write approval

`plugin.json` already declares `push_files`, `create_or_update_file`, `delete_file`,
and `merge_pull_request` as high-impact operations. That declaration makes the
operation available for governance; **impact is not an approval requirement**.
The trusted Verifier policy determines which additional Approvals are required.

The incident on 2026-09-14 demonstrated that a `push_files` call with `branch:
"main"` could return a native success without additional Maintainer approval.
A plugin-only schema change cannot supply the missing policy rule. In particular,
adding `const: "main"` to the branch schema would reject feature-branch payloads,
not impose a Maintainer threshold on main.

[verifier-policy.example.json](verifier-policy.example.json) supplies explicit
one-independent-approver rules for:

- `push_files`, `create_or_update_file`, and `delete_file` when
  `/arguments/branch` is `main`, `refs/heads/main`, or `heads/main`;
- every `merge_pull_request` invocation, since its payload does not carry the
  target branch and it must not be inferred from a PR number.

The example uses a conservative approval-required default for other operations
and non-main branches. Its explicit main rules also work with an existing
`proposerOnly` default; the tests cover both. Exact branch comparison intentionally
does not conflate `Main` or `main-fix` with `main`. Other default/protected branches
must be added by the operator if desired. These rules do not query GitHub branch
protection and are not a replacement for it.

## Operator adoption (separate from merging this PR)

1. Replace the synthetic `did:example:replace-*` identities with the deployment's
   existing authorized proposer and independent Maintainer groups. Do not copy
   private keys or credentials into this repository.
2. **Merge** the new operation policy entries into the trusted policy used by the
   Credential Adapter/Verifier. Preserve existing entries, rejects, stronger
   thresholds, signer groups and default requirements; do not replace a live
   policy wholesale with this example. Matching positive rules compose with AND;
   any matching reject wins.
3. Review/reload the deployment through its supported operator flow. Publishing
   this repository does not update a running Verifier or its trusted policy.
4. If adopting the updated plugin description/version, update its trusted
   artifact pin too; `registry-entry.json` contains the new canonical artifact DID.
5. In a designated test repository, verify main writes return
   `additionalApprovalsRequired` without changing GitHub, then succeed only with
   a distinct eligible Signer's approve decision. Test the normal feature-branch
   → PR → merge flow separately. Do not probe production main with a real write.

No live policy, deployment, signer registration or credential is changed here.
The plugin schemas remain tool-input compatible; their branch descriptions point
to the policy example rather than pretending to enforce a threshold.

## Tests

```sh
npm ci --prefix applications/github/bridge
node scripts/test-github-verifier-policy.mjs
python3 scripts/validate-applications.py --github
python3 scripts/test_validate_applications.py
```

The policy regression uses the pinned MPAS SDK's actual policy engine and
already-verified synthetic approvals. It covers the missing-main-approval case,
ref spellings, self-approval, unauthorized Signers, wrong decisions, successful
Maintainer approval, default behavior, and preservation of stricter rules.
