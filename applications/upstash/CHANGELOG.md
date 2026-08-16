# Changelog — upstash

Record manual review decisions and regenerations here.

## 2026-08-15 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream tool definitions and added durable, DID-scoped task reads and cancellation.
- Updated the bridge runtime to `@oma3/mpas@0.1.0-alpha.6` and `@modelcontextprotocol/server@2.0.0`.

## 2026-08-02 — Pinned the upstream launch command

- Pinned to `npx -y @upstash/mcp-server@0.2.4`, replacing a local `node_modules`
  path in the harness and a `/tmp/upstash-discovery.YEKdgV/index.js` scratch
  path in metadata — the latter also carried literal `YOUR_EMAIL` and
  `YOUR_API_KEY` placeholders.
- **Version could not be reconciled with `serverInfo.version`.** metadata
  records 0.1.0, the server's internal version; this changelog states the
  capture governed all 33 tools from `@upstash/mcp-server` 0.2.4. As with
  `postgres`, 0.1.0 is also a real published version, so pinning to
  `serverInfo.version` would have resolved to the wrong software.
- Added optional upstream discoverability pointers on `registry-entry.json`:
  `upstream.repository` (source) and `upstream.distributionUrl` (versioned
  obtain page). `application.website` is not used.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 33 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 16 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 17 pass-through operations, tagged by
  reason (read 9, metadata-only 5, routine-job 3), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed box run listing

- Dropped `box_runs`, taking the plugin from 17 operations to 16. Its `list`
  and `get` actions are reads and only `cancel` mutates; a cancelled run can
  be started again.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 33 operations to 17. The dropped tools are log,
  listing, and statistics reads across Redis, QStash, Workflow, and Box
  (`box_logs`, `qstash_dlq_*`, `qstash_logs_*`, `qstash_schedules_list`,
  `redis_database_get_details`, `redis_database_get_statistics`,
  `redis_database_list_backups`, `redis_database_list_databases`,
  `workflow_dlq_get`, `workflow_dlq_list`, `workflow_logs_*`), plus
  `util_dates_to_timestamps` and `util_timestamps_to_date`, which are pure
  local date conversions that touch no account at all.
- Kept `qstash_get_user_token` at critical even though `bridge/src/index.ts`
  already refuses it. That block protects only this proposer implementation;
  `plugin.json` is consumed by the Credential Adapter, and removing the
  operation would route it as pass-through for any other proposer and return
  a live `QSTASH_TOKEN`.
- Kept `box_preview` at high because it mints public URLs for services running
  inside a box, with `basic_auth` / `bearer_token` as opt-in flags. This is
  the publish-to-the-internet case governance exists for; it is high rather
  than critical because a preview can be deleted.
- Kept `box_runs` at low. Its `list` and `get` actions are reads; only
  `cancel` mutates, and a cancelled run can simply be started again, so the
  action is recoverable and does not warrant routine approval.
- Kept `redis_database_set_daily_backup` at high — disabling backups is a
  quiet, deferred loss of recoverability rather than a visible failure.
- Recomputed `plugin.artifactDid` in `registry-entry.json`, which was also
  stale against the previous `plugin.json`.

## 0.1.0

- Captured and governed all 33 tools from `@upstash/mcp-server` 0.2.4.
- Finalized reviewed impact classifications across Redis, QStash, Workflow,
  and Upstash Box operations.
- Classified arbitrary Redis commands, database deletion/password rotation,
  backup restore/delete, Box shell/agent/lifecycle, and snapshot restore/delete
  as critical.
- Preserved `qstash_get_user_token` in the advertised tool surface but return a
  safe error so reusable QStash credentials never reach the proposer.
- Added credential-adapter substitution for the Upstash account email and API
  key; no credential value is included in the package.
