# Changelog — upstash

Record manual review decisions and regenerations here.

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
