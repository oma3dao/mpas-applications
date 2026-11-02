# Render

Generated MPAS bridge around the [official Render MCP server](https://github.com/render-oss/render-mcp-server), **not** a Render API implementation. See the [shared operating guide](../../README.md#operating-a-generated-bridge) for MPAS setup and credential custody.

## Upstream and schema evidence

Captured 23 tools from official source commit
`2e131d6d8aae723542957c5c0f537c61cbfb4f36` on 2026-11-02.
`bridge/src/tools.json` and `build-artifacts/tools-list.snapshot.json` preserve the complete discovered definitions. Tool names, arguments, descriptions and annotations are unchanged. The generated bridge uses SDK `0.1.0-alpha.15` and negotiates Tasks or conventional MCP compatibility mode.

**Service-plan updates are not available in this snapshot.** There is no
`update_web_service`, `update_static_site`, or plan-update tool in the actual
`tools/list` response. The upstream README mentions update helpers, but
`pkg/service/tools.go` does not register them. A `plan_changed` event filter is
an observation, not a plan mutation. Do not substitute direct API calls or add
invented tools. If upstream adds an update tool, rediscover, review its schema
and policy, regenerate the bridge, and refresh the artifact DID before rollout.

`create_web_service`, `create_cron_job`, `create_postgres`, and
`create_key_value` accept a `plan` argument. Resource creation is governed for
every value, including when `plan` is omitted. See the captured tool schemas
for the enum values and defaults in this snapshot. No plan-update tool is
registered in this snapshot.

Blueprint code exists in the pinned source but is not registered by
`cmd/server.go`, so no Blueprint tools are advertised either. The independently
updated [hosted server](https://render.com/docs/mcp-server) is not the pinned
execution target, and its tool surface is not claimed to match this capture.

## Reproduce the official upstream and generation

Use Go 1.27.3, Git and Node 22+. Build the unmodified official source:

```sh
git clone https://github.com/render-oss/render-mcp-server.git
cd render-mcp-server
git checkout --detach 2e131d6d8aae723542957c5c0f537c61cbfb4f36
go build -trimpath -o render-mcp-server .
```

Install that binary as `render-mcp-server` on the adapter's controlled PATH.
Do not replace it with the latest release, a floating container tag, or a
hosted endpoint without recapturing and reviewing the surface. With no version
linker override it reports `dev`; the source commit, not that string, is the
version pin. Source and dependencies remain upstream-owned; no binaries or
vendor implementation are included here.

Build `bridge-generator` from MPAS commit
`96bc20d8df9bd62e7901ce69c8194c17de18ad4f`. With the built official binary on PATH,
run from the MPAS repository:

```sh
npm ci --prefix bridge-generator
npm run build --prefix bridge-generator
RENDER_API_KEY=mpas-schema-discovery-not-a-real-key RENDER_HOST=127.0.0.1:1 \
  node bridge-generator/dist/index.js generate \
  --app render --out ../mpas-applications/applications \
  --application-did did:web:wivity.com:applications:render-mcp-server \
  -- render-mcp-server
```

Only `initialize` and `tools/list` are needed. The dummy string satisfies
upstream's startup check; the unreachable API host prevents real Render API
access. Do not use either discovery setting for live execution. Preserve the
reviewed identity, credential requirements and classification, normalize the
command to the installed binary, restore the distribution metadata and registry
pointers, and recompute the artifact DID after regeneration. `metadata.json`
records the generator commit and capture conditions.

## Render credentials and targeting

An adapter operator obtains a Render API key from the Render Dashboard's
**Account Settings → API Keys**, following [Render API authentication](https://render.com/docs/api#1-create-an-api-key).
Store it under the adapter credential handle `renderApiKey` and resolve it as
`RENDER_API_KEY`, as in `harness-config.json`. The harness contains a handle,
not a credential. Render API access is determined by the key/account's actual
permissions; `expectedAuthority` is descriptive, not an invented OAuth scope.

Keep the key and any Render CLI login in the adapter trust domain. Do not
register the official server directly in the proposer. The adapter owns the
binary, environment and config path; proposers must not control `RENDER_HOST`
or the upstream executable.

Prefer an explicit, confirmed `workspaceId` on every resource call. It is
optional upstream; absent values use the selected workspace fallback. The
upstream `select_workspace` is deprecated but still changes that fallback.
`list_workspaces` also selects the workspace when exactly one is returned.
Both are governed. `get_selected_workspace` reports only fallback state, not
the last explicit per-request workspace. Serialize fallback changes and
dependent calls; do not share mutable fallback state across unrelated tenants.
Logs' resource-array checks are performed by the provider rather than pinned
to `workspaceId` by the wrapper. Use provider-side access isolation for tenant
boundaries; workspace hints alone are not an authorization boundary.

## Approval policy

`plugin.json` identifies the 10 governed operations. The operator's adapter
policy determines the required independent approvals; plugin impact labels
alone do not enforce approvals. This package does not supply a separate
policy template or adapter deployment configuration.

- **Creation:** review workspace, plan/capacity, region, repository/branch,
  commands, environment, and cron schedule. Approving `autoDeploy: yes` (also
  the default) authorizes ongoing provider automation; later pushes can deploy
  without another Render MCP Action. Use `autoDeploy: no` when each deployment
  must be individually governed.
- **Deploy:** review `serviceId`, `workspaceId` and `clearCache`. An accepted
  deploy is not a healthy/live deployment; inspect deploy status afterwards.
- **Environment changes:** `replace` defaults to false (merge); true removes
  omitted keys. Both modes also trigger a deploy. A deploy failure can occur
  after variables have changed, so inspect state before retrying. Existing
  secret values are not returned by the success handler. Do not put adapter
  credentials or reusable secrets into proposer-visible arguments or logs.
- **Workspace tools:** review fallback re-targeting, including the implicit
  selection performed by `list_workspaces`.
- **SQL:** `query_render_postgres` uses an internally retrieved database
  connection string and starts a READ ONLY transaction. It still accepts
  arbitrary SQL, including function calls; read-only transactions do not
  sandbox external function effects. This executable surface remains governed.
  Inspect SQL and database identity. Provider IP allowlists must permit the
  adapter's connection; do not broadly open database access for this bridge.

The 13 remaining getters/listing tools are pass-through reads, with individual
rationales in `build-artifacts/classification.json`. Postgres/Key Value getters
return configuration objects, not their separate connection-info objects.
Logs are not a credential API, but applications must avoid writing secrets to
them. No custom response redaction or Render implementation is added here.

## Validation and limits

```sh
npm ci --prefix applications/render/bridge
npm run build --prefix applications/render/bridge
python3 scripts/validate-applications.py
python3 scripts/test_validate_applications.py
node scripts/probe-bridge-protocols.mjs applications/render
```

The package is locally validated, not live-deployed. No real API key, account
mutation, paid resource, hosted-server capture or live approval/execution test
was used. Operator configuration and credential binding remain deployment work.

Dependency audit: the generator pins `@modelcontextprotocol/server@2.0.0`.
`npm audit` reports high-severity HTTP-server advisories for that dependency
(including GHSA-jm63-cq47-j5jp, GHSA-46jr-4wx8-v453, GHSA-rvq5-wwqv-78pq and
GHSA-f897-62hf-6gxq). This generated bridge exposes stdio, not those HTTP
handlers. This is not an audit-clean or general safety claim; a shared
generator/SDK dependency update should be reviewed separately before adding
an HTTP entry point. The generator output is intentionally not hand-patched.
