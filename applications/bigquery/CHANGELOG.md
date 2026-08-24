# Changelog — bigquery

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

- Pinned to the multi-arch container
  `us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox@sha256:bbfdd4f2…`
  (tag 1.8.0), replacing a local `bin/toolbox` build.
- The 1.8.0 component of `serverInfo.version` matches. The rest of that string
  (`+binary.darwin.arm64.44d1a05+prebuilt.bigquery`) described a single-platform
  local binary and is superseded by the digest, which covers linux/amd64 and
  linux/arm64.
- Google publishes no GitHub release assets for this tool, so the container is
  the resolvable channel.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 9 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 1 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 8 pass-through operations, tagged by
  reason (metadata-only 5, read 3), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 4 operations to 1. `ask_data_insights`,
  `forecast`, and `analyze_contribution` are now pass-through. All three were
  graded high, but their input schemas take only source tables, columns, and a
  question — none accepts a destination, and none writes back to BigQuery.
  They are analysis reads over data the service account already reaches.
- `execute_sql` remains the sole governed operation at critical: it is the
  only tool here that can run DDL or DML.
- These three were most likely kept because BigQuery bills per byte scanned.
  Metered query cost is not a state change, and an approval on every analysis
  call is a poor cost control — BigQuery's own custom quotas and maximum
  bytes-billed settings do that job directly and without a round trip.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 0.1.0

- Captured and packaged the nine-tool BigQuery prebuilt surface from Google's
  MCP Toolbox for Databases 1.8.0.
- Kept four operations governed: arbitrary SQL execution is critical;
  contribution analysis, forecasting, and conversational data insights are
  high because they process caller-selected data and invoke billable services.
- Removed five read-only dataset, table, and catalog discovery operations from
  the governed set. They remain available as pass-through tools.
- Used client-OAuth mode only for credential-free schema discovery; the
  deployment harness is configured for credential-adapter-managed Google
  Application Default Credentials and an explicit BigQuery project.
- Added Wivity application/plugin identities and scoped Google Cloud credential
  requirements.
