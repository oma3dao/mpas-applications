# Changelog — slack

## 2026-10-17 — Updated MPAS SDK runtime to alpha.15

- Updated the bridge runtime to the exact reviewed release
  `@oma3/mpas@0.1.0-alpha.15` and refreshed the lockfile.
- Regenerated the bridge with the alpha.15 bridge generator. The bridge
  implements MPAS proposer-bridge profile version 3: MCP clients that declare
  the `org.oma3/mpas` extension must declare version `"3"`. Clients using the
  `mpas_wait_for_action_result` compatibility surface are unaffected.
- A tool call returns the result directly when the Action finishes within one
  second, and otherwise returns a Task.
- The bridge no longer polls on a timer. It checks the Coordination Service
  and retries failed submissions only when a client checks a Task, at most
  every 10 seconds, so an approved Action executes when the proposer's client
  next checks it. `workflow.pollIntervalMs` is ignored; new optional settings
  are `processingTaskPollIntervalMs`, `coordinationRefreshMinIntervalMs` and
  `shutdownGraceMs`.
- The bridge exits when its MCP client goes away (stdin closes, writing to
  stdout fails, or SIGTERM, SIGINT or SIGHUP), after letting requests already
  sent finish for up to 5 seconds.
- Action requests time out after 45 seconds by default, up from 30.
- `plugin.json` and its `artifactDid` are unchanged.

## 2026-10-03 — Updated MPAS SDK runtime to alpha.14

- Updated the bridge runtime to the exact reviewed release
  `@oma3/mpas@0.1.0-alpha.14` and refreshed the lockfile, including
  `fast-uri` 3.1.8 for GHSA-hrr3-gc8f-f4qj.
- Regenerated the bridge with the alpha.14 bridge generator. The bridge now
  loads its plugin through the SDK validator, requires any configured
  `applicationDid` and `executionProfile` to equal the plugin's, and applies
  the configured submission timeout and claim lease to its Action and
  Coordination clients.
- Added `toolSurface` to `plugin.json`, attesting the complete captured
  `tools/list` surface. The bridge binds every submission to that surface. Credential Adapters reject
  ungoverned tools absent from the attested surface with
  `OPERATION_NOT_ATTESTED`.
- Renamed credential requirement `requiredCapabilities` to
  `expectedAuthority`, as required by the alpha.14 plugin profile. It remains
  review-only metadata and is never transmitted as an OAuth scope.
- Updated `plugin.artifactDid` in `registry-entry.json`. Governed operations,
  DIDs, registry identity, harness configuration, and the Credential Adapter
  execution boundary are unchanged.

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
