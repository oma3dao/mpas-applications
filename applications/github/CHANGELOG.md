# Changelog — github

Record manual review decisions and regenerations here.

## 2026-08-14 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with
  `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream GitHub tool definitions; no MPAS descriptions,
  output-schema unions, or added tools remain.
- Added transparent `org.oma3/mpas` task metadata, DID-scoped task reads,
  durable cancellation, and background retry behavior.
- Updated the bridge source for `@oma3/mpas@0.1.0-alpha.5` and
  `@modelcontextprotocol/server@2.0.0`. Until alpha.5 is published, the bridge
  links the sibling `mpas/sdk/protocol` package through the repositories'
  shared parent directory. Build that SDK before building this bridge. Replace
  the file dependency and refresh the lockfile after publication.

## 2026-08-02 — Pinned the upstream launch command

- Pinned to `ghcr.io/github/github-mcp-server@sha256:2b0c48b0…`, the digest the
  v1.6.0 tag resolves to, matching `serverInfo.version`.
- The image reference was previously untagged, so it floated to `:latest`. The
  reference application should not float, official upstream or not.
- The digest is an OCI image index covering linux/amd64 and linux/arm64, so
  pinning it stays platform-neutral.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 44 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 15 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 29 pass-through operations, tagged by
  reason (read 16, metadata-only 9, routine-job 2, precursor 1, read-public 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed pending-review comment drafting

- Dropped `add_comment_to_pending_review`, taking the plugin from 16 to 15.
  A pending review comment is not visible to anyone until the review is
  submitted, and `pull_request_review_write` is the governed chokepoint that
  publishes it.

## 2026-07-29 — Normalized impact grading

- No membership change. The governed surface was already narrowed to the 16
  mutating tools during the initial review, and it matches the rule now
  applied across every application in this repository: reads are pass-through,
  state changes are governed.
- Regraded six operations so that a given impact level means the same thing
  here as in the other bridges:
  - `add_issue_comment` and `add_reply_to_pull_request_comment` low → medium.
    Both publish under the account's identity to a repository that is often
    public. `add_comment_to_pending_review` stays low because a pending review
    comment is not visible until the review is submitted.
  - `assign_copilot_to_issue` and `request_copilot_review` high → medium. Both
    invoke an automated reviewer and consume quota; neither changes repository
    contents directly.
  - `fork_repository` high → medium. A fork copies a repository the caller can
    already read into their own namespace and leaves the source untouched.
- Left `delete_file` at critical, and `create_or_update_file`, `push_files`,
  `create_repository`, and `merge_pull_request` at high.
- Recomputed `plugin.artifactDid` in `registry-entry.json`. Note that this
  supersedes the value quoted as an example in the repository README.

## 2026-07-27 — Regenerated for the asynchronous client profile

Regenerated `bridge/src/` against `@oma3/mpas@0.1.0-alpha.2`, which implements
the MPAS MCP Proposer Bridge Client Interface Profile v0.1.

- Approval-gated calls no longer block. The bridge returns
  `MpasBridgeDeferredResult` as soon as the Action is durably recorded; the
  workflow advances on a background loop; results are retrieved through the
  reserved `mpas_wait_for_action_result` tool.
- Added `bridge/src/sqlite-workflow-store.ts` (generated): durable workflow
  store. Configure `workflow.dbPath` in the deployment config — without it the
  bridge uses an in-memory store and active Actions do not survive a restart.
- Deployment configs may drop `approvalStrategy` / `approvalTimeoutMs`. They
  are accepted and ignored, with a warning.
- `harness-config.json` now records the profile-defined deviations: the MPAS
  notice on every description, the added result tool, and output-schema
  unions. Upstream tool names and input schemas remain exact.

Regenerated from the checked-in discovery snapshot
(`build-artifacts/tools-list.snapshot.json`, github-mcp-server v1.6.0, 44
tools); the upstream surface is unchanged by this regeneration.
