# Changelog — Vercel

## 2026-08-23 — Added automatic conventional-client compatibility

- Updated the bridge runtime for `@oma3/mpas@0.1.0-alpha.7`. Wire-level
  detection keeps MCP Tasks primary and exposes the temporary wait-tool
  compatibility surface only after a conventional `initialize` handshake.
- Preserved the application command, tool snapshot, plugin policy, DIDs,
  workflow storage, and Credential Adapter boundary.

## 2026-08-15 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream tool definitions and added durable, DID-scoped task reads and cancellation.
- Updated the bridge runtime to `@oma3/mpas@0.1.0-alpha.6` and `@modelcontextprotocol/server@2.0.0`.

## 2026-08-02 — Pinned the upstream launch command

- `harness-config.json` already pinned `mcp-remote@0.1.37` against the hosted
  endpoint. `metadata.json` recorded `mcp-remote@latest`, which floats and
  disagreed with the harness; both now read 0.1.37.
- `serverInfo.version` 0.1.0 is Vercel's own and is not client-pinnable. The
  pin that matters here is the `mcp-remote` client.
- Added `upstream.distributionUrl` on `registry-entry.json` (hosted
  endpoint). No public source repository is recorded. `application.website`
  is not used.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 33 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 8 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 25 pass-through operations, tagged by
  reason (read 13, metadata-only 6, routine-job 4, precursor 1, read-public 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed the Vercel Toolbar comment operations

- Dropped all four toolbar operations (`add_toolbar_reaction`,
  `change_toolbar_thread_resolve_status`, `edit_toolbar_message`,
  `reply_to_toolbar_thread`), taking the plugin from 12 operations to 8.
- They are writes, but they are team-internal comments on preview
  deployments: no public exposure, no spend, no customer contact, and
  trivially reversible. Governing them meant an approval prompt for adding an
  emoji reaction, which is how reviewers learn to approve without reading.
- The governed set is now only the operations that spend money, publish, or
  change who can reach a deployment.

## 2026-07-31 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 33 operations to 12. The initial bridge governed
  the full surface "conservatively"; twenty-one of those are reads and are now
  pass-through, including every `get_*` and `list_*` tool,
  `search_vercel_documentation`, and `web_fetch_vercel_url`.
- Dropped `get_purchase_quote`, which states in its own description that it
  "NEVER charges" and is the read-only step that mints the idempotency key.
  The four `buy_*` tools it feeds remain governed at critical.
- Raised `get_access_to_vercel_url` from high to critical. It mints a
  `_vercel_share` link that bypasses authentication on a protected deployment.
  That is a transferable capability the caller keeps after the call — the
  credential-disclosure route — not a read of deployment metadata.
- Kept `update_project_deployment_protection` at critical: it can remove
  password protection, Vercel Authentication, and Trusted IP restrictions from
  a project, exposing previously private deployments.
- Regraded the four Vercel Toolbar comment operations, which had all been
  high. `add_toolbar_reaction` (an emoji) and
  `change_toolbar_thread_resolve_status` are now low; `edit_toolbar_message`
  and `reply_to_toolbar_thread` are medium. They are team-internal comment
  actions, and grading an emoji reaction alongside a domain purchase is what
  trains reviewers to approve without reading.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-30 — Initial official hosted Vercel MCP bridge

- Captured all 33 tools from the official hosted Vercel MCP server.
- Configured Credential Adapter substitution for a Vercel MCP OAuth access token.
- Governed the full tool surface conservatively, including deployments, deployment
  protection changes, temporary protected-deployment access links, purchases,
  design imports, and toolbar communication.
- Classified purchases and deployment-protection changes as critical; deployments,
  temporary access grants, design imports, and external toolbar mutations as high.
