# GitHub MPAS application

## GitHub credential

The Credential Adapter holds one GitHub personal access token per deployment
config and uses it for every Action that deployment dispatches. The Proposer
never chooses or sees the token. GitHub offers two token types:

- **Fine-grained token**: covers repositories in one GitHub account or
  organization. Grant Administration, Contents, Workflows, Issues, and Pull
  requests write; Metadata read is added automatically. Use it when the
  deployment works in a single account or organization. It has the smallest
  blast radius.
- **Classic token**: covers every repository your account can access. Grant
  the `repo` and `workflow` scopes, plus `read:org` for `get_teams` and
  `get_team_members`. Use it when one deployment works across several
  organizations. A compromised adapter host exposes more.

GitHub's documentation explains the two types and how to create each one:

- [Personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Creating a fine-grained token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
- [Creating a classic token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic)

The credential requirement in [`plugin.json`](plugin.json) describes the
fine-grained token; a classic token is an equally valid choice for the
multi-organization case.

## Example deployment config

`plugin.json` classifies operation impact, while the trusted Verifier policy
determines whether an operation is rejected, proposer-only, or needs additional
approval. [adapter-config.example.json](adapter-config.example.json) is the
Credential Adapter deployment config template for the GitHub bridge. It runs
the pinned upstream image with the token bound as `githubPersonalAccessToken`,
and its policy works as follows:

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

1. Replace the `REPLACE_WITH_*` placeholder DIDs with the deployment's existing
   authorized proposer and independent Maintainer groups, and set the absolute
   plugin path. Do not copy private keys or credentials into this repository.
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
