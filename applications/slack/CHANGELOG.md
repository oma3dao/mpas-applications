# Changelog — slack

## 2026-08-28 — Updated MPAS SDK runtime

- Updated the bridge runtime to the exact reviewed release
  `@oma3/mpas@0.1.0-alpha.9` and refreshed the lockfile.
- Preserved bridge source, plugin policy, DIDs, registry artifacts, and the
  Credential Adapter execution boundary.

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

## 0.1.0

- Captured all eight tools from `@modelcontextprotocol/server-slack` 2025.4.25.
- Governed the three externally visible mutations: posting messages, replying
  to threads, and adding reactions. Read-only channel, history, thread, and
  user lookups remain pass-through.
- Rated message publication high impact because it speaks under the
  organization's bot identity and may notify a broad audience; reactions are
  medium impact and reversible.
- Bound the application to Wivity publisher, plugin, and application DIDs and
  to workspace-scoped bot-token and team-ID credential requirements.
