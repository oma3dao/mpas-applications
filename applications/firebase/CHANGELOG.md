# Changelog — firebase

Record manual review decisions and regenerations here.

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
