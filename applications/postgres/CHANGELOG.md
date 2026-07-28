# Changelog — postgres

Record manual review decisions and regenerations here.

## 2026-07-28 — Initial PostgreSQL bridge

- Captured the single `query` tool from `@modelcontextprotocol/server-postgres`
  0.6.2 (server version 0.1.0) without changing its name or input schema.
- Kept `query` governed and raised its impact to `high`. The reference server
  uses a read-only transaction, but arbitrary SQL can still expose unrestricted
  production data.
- Bound the plugin to Wivity publisher, plugin, and application DIDs and
  documented the least-privileged PostgreSQL connection credential.
