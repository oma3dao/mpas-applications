# Changelog — planetscale

Record manual review decisions and regenerations here.

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
