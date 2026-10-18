# Changelog — fastly

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

## 2026-08-02 — Pinned the upstream launch command

- Pinned to `npx -y @fastly/mcp@2.1.4`, replacing a local `node_modules/.bin`
  path. 2.1.4 matches `serverInfo.version` exactly.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 3 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 1 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 2 pass-through operations, tagged by
  reason (metadata-only 1, read-public 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 0.1.0

- Captured and packaged the three-tool surface from Fastly's official
  `@fastly/mcp` 2.1.4 server.
- Kept `execute` governed and classified it critical because it runs arbitrary
  JavaScript against the authenticated Fastly API, including destructive and
  security-sensitive operations.
- Removed `search` and `inspect` from the governed set. They only query bundled
  API metadata and remain available as pass-through tools.
- Added Wivity application/plugin identities and the Fastly API token
  credential requirement.
