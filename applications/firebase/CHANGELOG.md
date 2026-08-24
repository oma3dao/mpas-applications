# Changelog — firebase

## 2026-08-23 — Added automatic conventional-client compatibility

- Updated the bridge runtime for `@oma3/mpas@0.1.0-alpha.7`. Wire-level
  detection keeps MCP Tasks primary and exposes the temporary wait-tool
  compatibility surface only after a conventional `initialize` handshake.
- Preserved the application command, tool snapshot, plugin policy, DIDs,
  workflow storage, and Credential Adapter boundary.

Record manual review decisions and regenerations here.

## 2026-08-15 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream tool definitions and added durable, DID-scoped task reads and cancellation.
- Updated the bridge runtime to `@oma3/mpas@0.1.0-alpha.6` and `@modelcontextprotocol/server@2.0.0`.

## 2026-08-02 — Pinned the upstream launch command

- Pinned to `npx -y firebase-tools@15.24.0 mcp`, replacing a local
  `node_modules/firebase-tools/lib/bin/firebase.js` path.
- **Version could not be reconciled with `serverInfo.version`.** metadata
  records 0.3.0, which is the version of the MCP server *embedded in*
  firebase-tools, not of firebase-tools itself — `firebase-tools@0.3.0` resolves
  to an unrelated 2015 release. 15.24.0 is corroborated by this changelog and
  was the npm release current at `capturedAt`.
- Added optional upstream discoverability pointers on `registry-entry.json`:
  `upstream.repository` (source) and `upstream.distributionUrl` (versioned
  obtain page). `application.website` is not used.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 19 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 8 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 11 pass-through operations, tagged by
  reason (read 4, metadata-only 4, read-public 3), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 19 operations to 8. The three
  `developerknowledge_*` tools search Google's public product documentation
  and never touch the user's project. The remaining drops
  (`firebase_deploy_status`, `firebase_get_environment`, `firebase_get_project`,
  `firebase_get_sdk_config`, `firebase_get_security_rules`,
  `firebase_list_apps`, `firebase_list_projects`, `firebase_read_resources`)
  read state the signed-in CLI session already reaches.
- Dropped `firebase_get_sdk_config` after confirming the Firebase SDK
  `apiKey` it returns is designed to ship inside client applications. It is a
  project identifier, not a secret, so this is not credential disclosure.
- Raised `firebase_deploy` from high to critical. It deploys whatever
  `firebase.json` specifies, which includes Firestore and Storage **security
  rules** — a single deploy can open a database to anonymous public access.
- Raised `firebase_update_environment` from high to critical for two reasons:
  it switches the active project, which silently re-targets every later
  approved deploy, and it can accept Terms of Service on the account owner's
  behalf.
- Raised `firebase_login` from high to critical. An agent-initiated sign-in
  establishes a Google session sourced from outside the Credential Adapter,
  so every later operation runs under an identity the operator never
  provisioned. That is a control-plane bypass rather than a project change,
  and it is graded alongside `mongodb`'s `connect`, which is critical for the
  same reason: both let a proposer supply its own credential.
- `firebase_logout` stays medium — disruptive, but it ends a session rather
  than establishing one, and it is reversible.
- Recomputed `plugin.artifactDid` in `registry-entry.json`, which was also
  stale against the previous `plugin.json`.

## 0.1.0

- Captured and governed all 19 tools from Firebase CLI 15.24.0.
- Classified project/app creation, Android SHA registration, workspace
  initialization, environment changes, authentication changes, and deployment
  as high impact.
- Classified deployment-status inspection and other read-only operations as
  medium impact.
- Added adapter-side Firebase token substitution; no credential value is
  included in the package.
