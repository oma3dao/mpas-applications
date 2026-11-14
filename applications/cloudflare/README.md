# Cloudflare DNS and Pages (no Code Mode)

Restricted MPAS bridge for the **official hosted Cloudflare MCP server** at
`https://mcp.cloudflare.com/mcp?codemode=false`. No replacement Cloudflare API
server is implemented. The adapter launches pinned `mcp-remote@0.1.38` against
that URL. The proposer uses only this MPAS bridge.

## Surface and provenance

The operator supplied an authenticated hosted capture at
`2026-11-14T17:11:01.217Z`, reporting `cloudflare-api` `0.1.0`, MCP `2024-11-05`
and generator `0.2.0`. It contains 3,042 tools and **no `execute`**. Complete
`tools.json` and snapshot definitions were compared, and the snapshot hash was
verified before selection. The full source hash and count are retained in
`tool-selection.json` and metadata; the operator retains the full capture.

This application selects **26 tools**, explicitly named and individually reviewed
in `tool-selection.json`: single-record DNS CRUD/list, zone/account metadata,
Pages projects, deployments, source connections and custom domains. No bulk DNS
batch/import/export/scan, token creation/rotation, arbitrary code executor,
unrelated Cloudflare API or generic API-request tool is exposed.

The committed `build-artifacts/tools-list.snapshot.json` is explicitly the
**selected** surface, not the entire hosted capture. Selected MCP Tool objects
are preserved, including schemas and extension fields. The plugin and bridge
attest/bind the selected hash. This is an intentional subset deviation.
Cloudflare still offers its full inventory to the adapter; startup full-surface
drift diagnostics can therefore show additional tools. Do not blindly suppress
drift: compare each selected definition against a fresh full capture. The
upstream is hosted and independently updated; `serverInfo.version` does not pin
its implementation. Source semantics were reviewed at official Cloudflare commit
`7eb0b5258c4265503b3fce8842b96adc5422fa69` (not a hosted version guarantee).

Local generation uses rebuilt MPAS bridge-generator at
`c7ffdd9a635dc66539fc74252a9641255029f7a6`, SDK `0.1.0-alpha.15`, with the
operator snapshot injected into `runGenerate`; it is offline replay, not a
second authenticated capture. That revision was requested in the operator's
capture handoff; metadata's generatorCommit identifies local generation.

## Enforcement: bridge AND adapter

Every selected operation, including reads, remains in `plugin.operations`.
The bridge rejects excluded tools in both Tasks and compatibility modes.
The publisher-attested selected name set also lets the adapter reject unknown
ungoverned tools; `adapter-config.example.json` additionally sets
`passThrough: "deny"` and explicitly rejects policy-only `execute` calls.
Do not add policy-only allowances for omitted tools. Operator configuration is
trusted: a different operator policy can change these protections.

The example is a **template, not an installed configuration**. It provides:

- One independent approver for every selected call; no automatic read exemption.
- Explicit account and zone IDs (no upstream single-account fallback).
- Explicit project/domain targeting; exact DNS name and existing record ID.
- DNS writes limited to A, AAAA, CNAME and TXT.
- Rejection of Pages deployment configuration/environment changes and analytics
  token submission; deployment creation rejects Worker/function file fields.
- An explicit production branch for project/deployment creation.

Replace all `REPLACE_WITH_*` values, use distinct proposer/approver DIDs, and
populate `signerKeys` under operator control. Configure additional narrowly
reviewed scopes where needed rather than removing scope guards. The example
allows one record name/ID and project; a newly created record requires a later
operator update before scoped edit/delete. It does not claim to constrain every
nested build/source parameter or prove a Git deployment is static content.
Independent approval still reviews all arguments and repository content.

Importantly, *plugin membership and impact labels do not enforce approval counts*.
The independent-approval and scope rules live in the operator-owned policy.
We ship this example because restricted routing and target policies are an
explicit requirement, not as a redundant uniform threshold template.

### DNS schema restriction

Cloudflare composes DNS record schemas using `allOf` shared-field branches.
The SDK's default per-object `additionalProperties: false` rejects sibling
fields in those branches. Rather than disable fail-closed validation, this
plugin deliberately narrows create/edit/update bodies to required `name`,
`type`, `content`, plus optional `ttl`, `proxied`, `comment`, `tags`.
Only A/AAAA/CNAME/TXT are accepted. Unknown body fields and other record types
are rejected by the plugin. The exposed upstream schemas remain unchanged;
this additional restriction is recorded in harness deviations and tested.
PATCH still retains omitted optional fields; PUT must not be assumed to do so.

## Credentials and operational limits

Only the Credential Adapter holds `cloudflareApiToken`, resolved as
`CLOUDFLARE_API_TOKEN`. The transport header contains a literal environment
reference, never the credential. Scope provider permissions to intended zones
and accounts; do not grant token-management or unrelated resource permissions.
No credential enters the proposer configuration or these artifacts.

Pages project/deployment getters can return environment/configuration metadata;
this is why they remain governed. Do not store secrets as plaintext environment
values or request credential-bearing results. Reads are not a response-redaction
boundary. Build/source settings and deployments can run code even without a
Code Mode executor. Inspect repository, branch, commands, deployment contents
and resulting URLs. A `commit_hash` field is metadata, not proof that Git HEAD
is pinned to that commit. Domain attachment can change public routing.

DNS deletes identify a record by ID, not name/value: read and verify that ID
before approval. Concurrent changes require renewed review as appropriate.
Errors/timeouts are not proof that a write did not happen; verify target state
before retrying. Do not replay uncertain deployments automatically.

The captured Pages deployment tool supports a Git branch or Direct Upload
manifest, but this subset does **not** supply a complete static-asset upload
pipeline or short-lived upload credentials. Git repository authorization must
already exist in Cloudflare. No Netlify-style upload continuation is assumed.
OxRunner hosting, account/domain provisioning and DNS migration are separate
operational work; none occurred during implementation.

## Reproduction and validation

Capture initialize + every tools/list page in the CA operator account using the
same endpoint (including `?codemode=false`) and pinned transport. No tools/call
is needed for discovery. Preserve complete metadata and snapshot, not a manually
summarized inventory; keep authentication material private. Build the generator
at the revision above before replaying:

```sh
node applications/cloudflare/scripts/generate.mjs \
  /path/to/mpas/bridge-generator /path/to/capture /tmp/new-generated-apps
```

The capture directory contains `metadata.json` and `tools-list.snapshot.json`.
The script verifies the full source hash, count and mode; unexpected drift fails
until reviewed. Compare generated artifacts to the committed ones. The reviewed
adapter policy, README, selection and test scripts are separately maintained;
a plugin change also requires refreshing the example's artifact DID.

```sh
cd applications/cloudflare/bridge
npm ci
npm run build
cd ../../..
npm ci --prefix applications/cloudflare/bridge
npm run --prefix applications/cloudflare/bridge build
python3 scripts/validate-applications.py
python3 scripts/test_validate_applications.py
python3 scripts/test_discover_bridges.py
node applications/cloudflare/scripts/test-policy.mjs
node scripts/probe-bridge-protocols.mjs applications/cloudflare applications/cloudflare/tool-selection.json
```

Checks exercise the installed SDK schema/policy engine, explicit-scope failures,
missing/proposer/unrelated/independent approvals and unknown-tool rejection in
both bridge modes. They do not constitute live adapter dispatch or hosted
Cloudflare end-to-end approval tests. Standard CI auto-discovers this bridge;
a Cloudflare-specific step checks the restrictive policy and negative surface.

The pinned dependency tree reports two high-severity npm advisories. This bridge
uses stdio; that is not an audit-clean claim. Shared generator/SDK dependency
updates should be reviewed separately rather than silently patching generated
runtime dependencies for this application.
