# Changelog — github

Record manual review decisions and regenerations here.

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
