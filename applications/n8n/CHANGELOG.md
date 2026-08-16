# Changelog — n8n

## 2026-08-15 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream tool definitions and added durable, DID-scoped task reads and cancellation.
- Updated the bridge runtime to `@oma3/mpas@0.1.0-alpha.6` and `@modelcontextprotocol/server@2.0.0`.

## 2026-08-02 — Pinned the upstream launch command

- `harness-config.json` already pinned `mcp-remote@0.1.38` against the hosted
  endpoint and needed no change. `metadata.json` recorded
  `node /tmp/n8n-schema-server.mjs` — a scratch file from the discovery run that
  described nothing reproducible — and now mirrors the harness command.
- `serverInfo.version` 2.32.6 is the hosted n8n instance's version and is not
  client-pinnable. The pin that matters here is the `mcp-remote` client.
- Added optional upstream discoverability pointers on `registry-entry.json`:
  `upstream.repository` (source) and `upstream.distributionUrl` (versioned
  obtain page). `application.website` is not used.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 34 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 13 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 21 pass-through operations, tagged by
  reason (read 8, metadata-only 7, read-public 2, routine-job 2, validation-only 2), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed trivial data-table and fixture operations

- Dropped `rename_data_table` and `prepare_test_pin_data`, taking the plugin
  from 15 to 13. A rename is reversible and affects no data; pin data is a
  test fixture.
- `delete_data_table_column` remains critical, and the workflow lifecycle
  operations are unchanged.

## 2026-07-31 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 34 operations to 15. The initial bridge governed
  the full surface "conservatively"; nineteen of those are reads and are now
  pass-through — every `search_*`, `get_*`, and `list_*` tool, plus
  `validate_workflow` and `validate_node_config`, which only lint SDK code,
  and `explore_node_resources`, which resolves dropdown values.
- Dropped `list_credentials` after confirming its description: "Never returns
  credential secret data." It returns credential IDs, names, and types, so it
  fails the capability test — the caller gains nothing usable outside the
  bridge.
- Raised `publish_workflow` from medium to high. Publishing activates a
  workflow for production: it then fires on its triggers, unattended, using
  stored credentials against live third-party systems. This is the deploy step
  for this application, and it had been graded below `rename_data_table`.
- Lowered `archive_workflow` from critical to high — archiving is reversible
  in n8n, unlike `delete_data_table_column`, which its own description says
  permanently removes the column and all its data.
- Kept `test_workflow` at critical. It bypasses external services through pin
  data, but trigger, credential, and HTTP Request nodes without pin data still
  reach real systems.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-30 — Initial n8n instance bridge

- Captured all 34 tools from the official hosted n8n instance MCP server.
- Configured Credential Adapter substitution for the instance bearer token.
- Governed the full tool surface conservatively, including workflow execution,
  publication, mutation, restoration, and data-table mutation operations.

Record manual review decisions and regenerations here.
