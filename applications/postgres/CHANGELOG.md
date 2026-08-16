# Changelog — postgres

Record manual review decisions and regenerations here.

## 2026-08-15 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream tool definitions and added durable, DID-scoped task reads and cancellation.
- Updated the bridge runtime to `@oma3/mpas@0.1.0-alpha.6` and `@modelcontextprotocol/server@2.0.0`.

## 2026-08-02 — Pinned the upstream launch command

- Pinned to `npx -y @modelcontextprotocol/server-postgres@0.6.2`, replacing a
  local `node_modules` path. The literal `postgresql://localhost/mydb` argument,
  a leftover from the author's machine, is now
  `{{credential:postgresConnectionString}}`.
- **Version could not be reconciled with `serverInfo.version`.** metadata
  records 0.1.0, the server's internal version; this changelog is explicit that
  the capture used package 0.6.2. Worth stating plainly: `0.1.0` is also a real
  published version of this package, so pinning to `serverInfo.version` would
  have resolved silently to the wrong software.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Rewrote the single entry in `build-artifacts/classification.json` to record
  why `query` is governed despite being read-only. This application has no
  pass-through operations — the upstream server exposes exactly one tool — so
  the classification and the plugin describe the same surface here.
- Aligned the entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-29 — Reviewed; `query` remains governed

- Reviewed against the repository-wide rule (reads are pass-through, state
  changes are governed) and deliberately kept `query` governed. No change to
  `plugin.json`, so `plugin.artifactDid` is unchanged.
- `query` is read-only — the reference server wraps it in
  `BEGIN TRANSACTION READ ONLY` and rolls back — so a literal reading of the
  rule would drop it. It is retained because it is the *only* tool this
  server exposes: an empty governed surface would make MPAS pointless for
  this application, and there would be no reason for an operator to place a
  bridge in front of it at all. The Application Plugin Profile also requires
  `operations` to have at least one member.
- Left the impact at high. Arbitrary SQL across an entire database is a far
  broader read than the scoped metadata getters that are pass-through
  elsewhere in this repository, and here it is the whole governed surface.
- Operators who do not want approvals on reads should express that as
  `proposerOnly` in policy, which still gives them schema validation and an
  execution receipt for every query.

## 2026-07-28 — Initial PostgreSQL bridge

- Captured the single `query` tool from `@modelcontextprotocol/server-postgres`
  0.6.2 (server version 0.1.0) without changing its name or input schema.
- Kept `query` governed and raised its impact to `high`. The reference server
  uses a read-only transaction, but arbitrary SQL can still expose unrestricted
  production data.
- Bound the plugin to Wivity publisher, plugin, and application DIDs and
  documented the least-privileged PostgreSQL connection credential.
