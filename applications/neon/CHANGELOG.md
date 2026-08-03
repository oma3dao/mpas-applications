# Changelog — neon

Record manual review decisions and regenerations here.

## 2026-08-02 — Pinned the upstream launch command

- Pinned to `npx -y @neondatabase/mcp-server-neon@0.6.5`, replacing a local
  `neon-env-stdio.mjs` wrapper in the harness and `/tmp/neon-static-discovery.mjs`
  in metadata — the two files did not even agree with each other. 0.6.5 matches
  `serverInfo.version`.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 23 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 14 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 9 pass-through operations, tagged by
  reason (metadata-only 8, read 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 23 operations to 14. The nine dropped tools
  (`describe_branch`, `describe_project`, `describe_table_schema`,
  `get_database_tables`, `list_branch_computes`, `list_organizations`,
  `list_projects`, `list_shared_projects`, `list_slow_queries`) only read
  metadata or statistics the `NEON_API_KEY` already reaches.
- Kept `explain_sql_statement` governed despite its diagnostic framing. It
  takes an arbitrary `sql` string plus an `analyze` flag, and
  `EXPLAIN ANALYZE` executes the statement it is given — including DML and
  DDL. Treating it as a read would leave an unguarded write path.
- Kept `get_connection_string` at critical for the same reason in a different
  form: it returns a usable PostgreSQL URI for the branch's read-write
  compute. That is credential issuance, not a read. Leaving it pass-through
  would let an agent obtain direct database access and perform every governed
  SQL operation outside the bridge entirely.
- Kept `prepare_query_tuning` and `prepare_database_migration` governed: both
  create real branches and execute generated DDL, even though the work lands
  on a temporary branch first.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-28 — Initial Neon bridge

- Captured all 23 tools from `@neondatabase/mcp-server-neon` 0.6.5 without
  changing tool names or input schemas.
- Used the package's exported server factory for static discovery because the
  official CLI performs a live account lookup before starting MCP.
- Kept all tools governed. Classified arbitrary SQL, destructive lifecycle and
  reset operations, main-branch migration/tuning completion, and reusable
  connection-string retrieval as critical.
- Configured the harness to inject `NEON_API_KEY` only inside the credential
  adapter through an environment-to-CLI launcher; no credential value is
  checked in.
