# Changelog — planetscale

Record manual review decisions and regenerations here.

## 2026-08-15 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream tool definitions and added durable, DID-scoped task reads and cancellation.
- Updated the bridge runtime to `@oma3/mpas@0.1.0-alpha.6` and `@modelcontextprotocol/server@2.0.0`.

## 2026-08-03 — Pin the tsx launch runtime

- Launch still used bare `tsx` via `npx`, which floats. Pinned to
  `tsx@4.23.1` (latest npm release at `capturedAt`; the pinned commit's
  `package.json` declares `tsx ^4.21.0`) and recorded the runtime under
  `upstream.distribution.runtime`. CI requires an exact semver on npm
  launch specs (not a dist-tag or range blacklist).

## 2026-08-02 — Pinned the upstream launch command

- Pinned to commit `56a05b65` of `planetscale/mcp-server`, replacing a
  cwd-relative `npx tsx ./src/server.ts` that resolved against wherever the
  command happened to run.
- **Version could not be reconciled with `serverInfo.version`.** metadata
  records 0.0.0, an unset placeholder that identifies no build. The package is
  not on npm and the repository carries no tags. The commit is the repository
  HEAD at `capturedAt`; unlike `plain`, the repository has been pushed to since,
  so this pin is inferred from the capture timestamp rather than confirmed.
- Added optional upstream discoverability pointers on `registry-entry.json`:
  `upstream.repository` (source) and `upstream.distributionUrl` (versioned
  obtain page). `application.website` is not used.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 5 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 1 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 4 pass-through operations, tagged by
  reason (metadata-only 2, read 1, read-public 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-30 — Revalidated implementation artifacts

- Rebuilt the generated TypeScript bridge from a clean dependency install and
  confirmed all 5 discovered upstream tools are packaged.
- Corrected the reviewed classification artifact for `execute_write_query`
  from high to critical so it matches the operative plugin policy and the
  documented review decision. Arbitrary DDL can irreversibly destroy
  production schema or data in a single call.
- Confirmed the governed surface remains limited to the sole mutating tool;
  the 4 read-only tools remain pass-through.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 5 operations to 1. `execute_read_query`,
  `get_insights`, `list_cluster_sizes`, and `search_documentation` are now
  pass-through. The first is read-only by database-role enforcement upstream,
  the middle two return account metadata the token already reaches, and
  `search_documentation` queries a public knowledge base with no account
  context at all.
- Raised `execute_write_query` from high to critical: it accepts arbitrary
  INSERT/UPDATE/DELETE **and DDL**, so a single call can drop a table. It is
  now the entire governed surface for this application.
- Recomputed `plugin.artifactDid` in `registry-entry.json`, which was also
  stale against the previous `plugin.json`.

## 0.1.0

- Captured all 5 tools from the official open-source PlanetScale MCP server.
- Governed the complete discovered tool surface.
- Classified `execute_write_query` as high impact because it permits INSERT,
  UPDATE, DELETE, and DDL.
- Kept read queries, insights, cluster-size listing, and documentation search at
  medium impact.
- Added adapter-side PlanetScale OAuth token substitution; no credential value
  is included in the package.
- Finalized the reviewed classification artifact so it matches the operative
  plugin policy, including high impact for `execute_write_query`.
