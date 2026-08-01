# Changelog — mongodb

Record manual review decisions and regenerations here.

## 2026-07-31 — Completed the impact classification

- Reviewed all 29 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 13 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 16 pass-through operations, tagged by
  reason (read 7, metadata-only 7, read-public 2), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 29 operations to 13. Query and inspection tools
  (`find`, `aggregate`, `aggregate-db`, `count`, `explain`, `export`,
  `collection-schema`, `collection-indexes`, `collection-storage-size`,
  `db-stats`, `list-collections`, `list-databases`,
  `atlas-local-list-deployments`, `mongodb-logs`) are pass-through: the
  configured connection string already grants that access, so gating reads
  adds latency without adding control.
- Dropped `search-knowledge` and `list-knowledge-sources`, which query
  MongoDB's public Assistant knowledge base and touch no customer data.
- Dropped `explain` after confirming its `method` argument is constrained to
  query methods; MongoDB's explain does not apply writes.
- Kept `connect` at critical. It accepts an arbitrary `connectionString`,
  which both re-targets every subsequent operation and lets a proposer supply
  its own credential — defeating the adapter's credential injection and
  invalidating the target an approver believes they are authorizing.
  `atlas-local-connect-deployment` is kept at high for the same re-targeting
  reason with a smaller blast radius.
- Raised `update-many` from high to critical to match `delete-many`: both
  mutate every document matching a filter, with no undo.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-28 — Initial MongoDB bridge

- Captured all 29 tools from `mongodb-mcp-server` 1.14.0 without changing tool
  names or input schemas.
- Kept all 29 tools governed. Database, collection, index, log, and Atlas Local
  operations require target-bound authorization; the two Assistant
  knowledge-base reads remain medium-impact governed operations.
- Classified target-changing connection, drops, and bulk deletion as critical;
  arbitrary data retrieval/export, bulk writes, schema/index changes, logs, and
  deployment lifecycle operations as high.
- Configured `MDB_MCP_CONNECTION_STRING` for credential-adapter substitution;
  no production connection or reusable credential is checked in.
