# Render

Generated MPAS bridge targeting the [official hosted Render MCP server](https://render.com/docs/mcp-server) at `https://mcp.render.com/mcp`, **not** a Render API implementation. See the [shared operating guide](../../README.md#operating-a-generated-bridge) for MPAS setup and credential custody.

## Upstream and schema evidence

The adapter operator captured 23 tools from `https://mcp.render.com/mcp` at
`2026-11-02T22:14:06.531Z`, using bridge-generator `0.2.0` from MPAS commit
`4d4cd8d10d926ee060858dd8ef27eea5542f831d` (clean generator source).
The authenticated capture negotiated MCP `2024-11-05`; Render reported
`render-mcp-server` version `dev`. This is not an implementation version pin.

The operator reported `bridge/src/tools.json` and
`build-artifacts/tools-list.snapshot.json` byte-for-byte identical to the prior
local capture. Those definitions, generated runtime and 10 governed/13
pass-through classifications are retained unchanged. The bridge uses SDK
`0.1.0-alpha.15` and negotiates Tasks or conventional MCP compatibility mode.
The original implementation review used official source commit
`2e131d6d8aae723542957c5c0f537c61cbfb4f36`; matching schemas do not establish
that the hosted implementation runs that commit or has identical internals.

**Service-plan updates are not available in this snapshot.** There is no
`update_web_service`, `update_static_site`, or plan-update tool in the actual
`tools/list` response. A `plan_changed` event filter is
an observation, not a plan mutation. Do not substitute direct API calls or add
invented tools. If upstream adds an update tool, rediscover, review its schema
and policy, regenerate the bridge, and refresh the artifact DID before rollout.

`create_web_service`, `create_cron_job`, `create_postgres`, and
`create_key_value` accept a `plan` argument. Resource creation is governed for
every value, including when `plan` is omitted. See the captured tool schemas
for the enum values and defaults in this snapshot. No plan-update tool is
registered in this snapshot.

No Blueprint tools are advertised in the captured hosted surface either.

## Capture the hosted upstream and regenerate

No Render binary, Go toolchain, or provider container is required on the
adapter account. The adapter launches the pinned `mcp-remote@0.1.38` transport
client against `https://mcp.render.com/mcp`.

Run discovery inside the credential-holding operator environment with
`RENDER_API_KEY` already supplied by its secret store. Never send the key to
an agent or place it in a committed file. From the MPAS repository, build the
bridge generator at the capture revision above (or a newly reviewed revision)
and capture into a separate directory:

```sh
npm ci --prefix bridge-generator
npm run build --prefix bridge-generator
node bridge-generator/dist/index.js generate \
  --app render --out /tmp/render-hosted-discovery \
  --application-did did:web:wivity.com:applications:render-mcp-server \
  -- npx -y mcp-remote@0.1.38 https://mcp.render.com/mcp \
  --header 'Authorization: Bearer ${RENDER_API_KEY}'
```

Keep the header single-quoted: `mcp-remote` expands the variable at runtime,
so the generator records the variable reference, not a literal credential.
Discovery performs `initialize` and `tools/list`, not resource mutations.
Review the resulting tool snapshot and metadata, compare every tool/schema
with the previous capture, then regenerate the application with reviewed
governance membership and refresh its artifact DID. Hosted versions are not
client-pinnable; a local source checkout is not evidence of hosted parity.

## Render credentials and targeting

An adapter operator obtains a Render API key from the Render Dashboard's
**Account Settings → API Keys**, following [Render API authentication](https://render.com/docs/api#1-create-an-api-key).
Store it under the adapter credential handle `renderApiKey` and resolve it as
`RENDER_API_KEY`, as in `harness-config.json`. The harness contains a handle,
not a credential; the transport sends it as a Bearer authorization header.
Render API access is determined by the key/account's actual
permissions; `expectedAuthority` is descriptive, not an invented OAuth scope.

Keep the key and any Render CLI login in the adapter trust domain. Do not
register the official server directly in the proposer. The adapter owns the
transport client, endpoint, authentication header and environment. Proposers
must not control the upstream URL or authentication settings.

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

The side-effect notes below retain the original schema/source review; the
hosted capture validated tool definitions, not live execution behavior.

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
  hosted server's database connection; do not broadly open database access for
  this bridge. Verify the provider's hosted-network requirements before SQL use.

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

Authenticated hosted discovery was performed by Cursor in the adapter account;
its metadata and byte-comparison report were supplied by the operator. Local
build/artifact/protocol tests do not authenticate to Render. No application
tool calls, paid-resource mutations or end-to-end MPAS approval/execution test
were performed for this migration. Operator installation and credential binding
remain deployment work.

The pinned npm package is `mcp-remote@0.1.38`; its bundled client version string
is `0.1.37`. Record the package pin separately from that reported client string.

Dependency audit: the generator pins `@modelcontextprotocol/server@2.0.0`.
`npm audit` reports high-severity HTTP-server advisories for that dependency
(including GHSA-jm63-cq47-j5jp, GHSA-46jr-4wx8-v453, GHSA-rvq5-wwqv-78pq and
GHSA-f897-62hf-6gxq). This generated bridge exposes stdio, not those HTTP
handlers. This is not an audit-clean or general safety claim; a shared
generator/SDK dependency update should be reviewed separately before adding
an HTTP entry point. The generator output is intentionally not hand-patched.
