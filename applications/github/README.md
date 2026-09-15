# GitHub MPAS application

## Example verifier policy

`plugin.json` classifies operation impact, while the trusted Verifier policy
determines whether an operation is rejected, proposer-only, or needs additional
approval. [verifier-policy.example.json](verifier-policy.example.json) provides
the deployment example for the GitHub bridge:

- routine issue/PR comments, issue writes, branch file changes, PR creation, and
  PR metadata/branch updates are proposer-only;
- `push_files` rejects the exact branch name `main` and permits other branches as
  proposer-only, so the intended path is feature branch to pull request;
- assigning Copilot to an issue is rejected;
- operations without an explicit override, including `merge_pull_request`, retain
  the example's one-approver default requirement.

The exact `main` comparison intentionally does not conflate `Main`, `main-fix`, or
qualified ref spellings with `main`. GitHub rulesets remain the enforcement layer
for other write tools and for protected branches.

## Operator adoption (separate from merging this PR)

1. Replace the synthetic `did:example:replace-*` identities with the deployment's
   existing authorized proposer and independent Maintainer groups. Do not copy
   private keys or credentials into this repository.
2. Review the operation policy entries and merge them into the trusted policy used
   by the Credential Adapter/Verifier. Preserve deployment-specific signer groups,
   stronger requirements, and any additional protected branch rules; do not replace
   a live policy wholesale with this example.
3. Review/reload the deployment through its supported operator flow. Publishing
   this repository does not update a running Verifier or its trusted policy.
4. In a designated test repository, verify `push_files` to `main` is rejected and
   the normal feature-branch → PR → approved merge flow succeeds. Do not probe
   production `main` with a real write.

No live policy, deployment, signer registration, or credential is changed here.

## Tests

```sh
npm ci --prefix applications/github/bridge
node scripts/test-github-verifier-policy.mjs
python3 scripts/validate-applications.py --github
python3 scripts/test_validate_applications.py
```

The policy regression uses the pinned MPAS SDK's actual policy engine. It covers
the proposer-only overrides, exact `main` rejection, non-main branch behavior,
Copilot rejection, and the approval-required default retained for PR merges.
