# Changelog — netlify

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

## 2026-08-24 — Documented `deploy-site` continuation handling

- Documented the pinned `@netlify/mcp@1.15.1` continuation command, safe JWE
  extraction and diagnostics, and the Git worktree archive limitation.
- Added proposer failure-mode guidance for recognizing the authorized upload
  continuation, consuming scoped capabilities before expiry, and avoiding
  unnecessary bridge rebuilds or disclosure of continuation secrets.
- Corrected the example deployment target to use managed HTTP OAuth with
  explicit `read` and `write` scopes; the Credential Adapter adds advertised
  refresh scope during operator login.

## 2026-08-23 — Added automatic conventional-client compatibility

- Updated the bridge runtime for `@oma3/mpas@0.1.0-alpha.7` wire-level
  detection. `server/discover` keeps the primary MCP Tasks surface;
  conventional `initialize` selects the temporary deferred-result and
  `mpas_wait_for_action_result` surface for that connection.
- Preserved the Netlify command, tool snapshot, plugin, policy, application
  DID, workflow storage, and Credential Adapter OAuth placeholder. The
  proposer bridge still has no Netlify token or direct upstream path.

## 2026-08-14 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait interface with
  `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Preserved the exact discovered Netlify tool surface and added transparent
  `org.oma3/mpas` task metadata, DID-scoped task reads, cooperative
  cancellation, and background retry behavior.
- Updated the bridge source for `@oma3/mpas@0.1.0-alpha.5` and
  `@modelcontextprotocol/server@2.0.0`. Until alpha.5 is published, the bridge
  links the sibling `mpas/sdk/protocol` package through the repositories'
  shared parent directory. Build that SDK before building this bridge. Replace
  the file dependency and refresh the lockfile after publication.

## 2026-08-09 — Initial official hosted Netlify MCP bridge

- Captured all 9 tools from `https://netlify-mcp.netlify.app/mcp` through
  OAuth using the reproducibly pinned `mcp-remote@0.1.38` client.
- Configured Credential Adapter substitution for a Netlify MCP OAuth access
  token; no token or local OAuth cache is included in this package.
- Narrowed governance to the three write aggregators. Public coding guidance
  and account-scoped user, team, deploy, project, and extension reads remain
  pass-through.
- Classified site deployment and extension/database changes as high impact.
  Classified the project updater as critical because its combined surface can
  change visitor access controls, write or delete secret environment
  variables, delete form submissions, and create projects.

Record manual review decisions and regenerations here.
