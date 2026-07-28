# Changelog — neon

Record manual review decisions and regenerations here.

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
