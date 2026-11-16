# Cloudflare DNS and Pages (no Code Mode)

Restricted MPAS bridge for the **official hosted Cloudflare MCP server** at
`https://mcp.cloudflare.com/mcp?codemode=false`. No replacement Cloudflare API
server is implemented. The adapter launches pinned `mcp-remote@0.1.38` against
that URL. The proposer uses only this MPAS bridge.

## Restricted v1 scope

This release uses plugin schema **version 1**, no `display` metadata, and the
unchanged released `@oma3/mpas@0.1.0-alpha.15` dependency. No SDK/CLI implementation
change, collection-inspection extension or custom secret-provisioning API is needed.

The example policy unconditionally rejects **`pages_create` and `pages_edit` for
all proposers, regardless of approvals**. Both remain governed and visible; they
are not pass-through. Project creation, project settings and all environment-variable
writes (including plaintext updates and null deletions) must use another
operator-controlled workflow outside this bridge. Plaintext environment reads,
DNS operations and Git deployments remain available under existing scope/approval
rules. Direct uploads remain denied by field-presence policy rules.

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
Source semantics were reviewed at official Cloudflare commit
`7eb0b5258c4265503b3fce8842b96adc5422fa69` (not a hosted version guarantee).

Local generation uses rebuilt MPAS bridge-generator at
`c7ffdd9a635dc66539fc74252a9641255029f7a6`, SDK `0.1.0-alpha.15`, with the
operator snapshot injected into `runGenerate`; it is offline replay, not a
second authenticated capture. That revision was requested in the operator's
capture handoff; metadata's generatorCommit identifies local generation.

## Enforcement responsibilities

The proposer bridge preserves all 26 reviewed hosted Tool definitions. The
Credential Adapter validates each request against the **plugin schema**, then
applies the **deployment policy** and signer requirements before dispatch.
`passThrough: "deny"` and the attested selected surface reject unselected tools,
including credential-minting APIs. Schema validation checks the provider input contract, not deployment authorization.
The plugin supplies publisher analysis, risk classifications and the default governed
surface. The deployment configuration is the final authorization authority.
A well-formed forbidden input passes validation and receives a policy rejection;
additional approvals cannot override a matching rejection. Impact labels alone do not establish approval counts.

The credential-side transport has a different job: **sanitize upstream results
before they leave the CA**. It forwards MCP requests and discovers live selected
tools, but has **no argument-level authorization checks**. Authorization overrides require configuration changes only, not plugin or transport edits. Selected-name routing
still excludes unknown operations so they cannot evade the selected response
handling. Do not install this transport as an ungoverned MCP connection.

### Account/zone scope and path validation

The example requires explicit pinned `account_id` and `zone_id`. It does not pin
hostnames, record IDs or projects. New resource IDs returned by create operations
can immediately be used without changing an allowlist. Reads require only the
verified proposer signature. The existing trusted-writer group retains its
proposer-only write authorization; other proposers need an independent approval.
Signer membership has not changed in this revision.

All selected path arguments have plugin constraints:

- Account, zone and DNS record IDs: nonempty URL-safe identifier tokens, at most
  32 characters (the source contract's limit), not an enumerated ID list.
  Unreserved characters such as embedded dots and tildes are not excluded merely
  because they are absent from example IDs; standalone dot segments remain invalid.
- Deployment IDs: explicit UUID pattern and length, not reliance on an optional
  JSON Schema `format` validator.
- Project names: the source's lowercase letter/digit followed by lowercase
  letters, digits or hyphens grammar.
- Domain names: bounded ASCII/Punycode DNS labels, with an optional trailing dot.

Empty values, `.` and `..`, path separators, percent-encoded traversal, query/
fragment delimiters and whitespace are rejected. This matters because the
reviewed upstream request builder URL-encodes path arguments and constructs a
URL: standalone dot segments still normalize. In particular, a record DELETE
with `dns_record_id: ".."` must not authorize a different resource's DELETE.
These restrictions are **in the plugin**, not in the transport.

An optional tighter hostname form is provided in
`optional-hostnames.policy-fragment.json`; merge it only if wanted. It is not
the default and does not restrict reads. Strict hostname isolation for ID-only
writes also needs a trusted record-ID/name lookup; record IDs are not hostnames.

### DNS types and schema composition

All 21 captured DNS types remain supported, including NS, MX and CAA. All DNS
writes are conservatively critical, including PATCH without `type`, so NS
delegation cannot escape critical classification by omitting its discriminator.

The plugin flattens captured object `allOf` intersections for SDK fail-closed
validation, preserves subtype fields, removes unused definitions and compacts
schema annotations to fit SDK resource limits. Hosted Tool schemas are unchanged;
unknown request properties remain rejected.

### Git deployment default; direct uploads disabled

`pages_deployments_create` retains Git deployment inputs (`branch`, `commit_hash`,
`commit_message`, `commit_dirty`). Explicit deployment-policy rejection rules disable these captured direct-upload fields, regardless of approval:

- `_worker.js`, `_worker.bundle`, `manifest`
- `_headers`, `_redirects`, `_routes.json`
- `functions-filepath-routing-config.json`
- accompanying upload metadata `pages_build_output_dir`, `wrangler_config_hash`

The first six file fields are forwarded as multipart parts by the reviewed
request builder; the manifest references uploaded asset hashes. The metadata
fields accompany the upload configuration. No other selected tool provides a
file/multipart upload entry point. Source-connection operations and Git deployments remain governed writes, not
direct file uploads. Project creation/editing remains governed but denied.

Operators must maintain an **external code-review process**, such as reviewed
GitHub changes, for deployed code and repository build scripts. Git deployment
alone is **not evidence of review**. Branch deployment uses HEAD; `commit_hash`
is associated metadata, not proof that execution is pinned to a reviewed commit.
Source/repository changes, retries and existing builds also depend on that review
process and operator-controlled secret isolation.

### Environment variables and build configuration

Provider-valid `plain_text`, `secret_text` and `null` deletion entries remain
structurally valid in preview and production. Build-command and analytics-token
inputs also retain their provider schemas. These well-formed calls receive
**policy rejection**, not malformed-input errors: the blanket `pages_create` and
`pages_edit` denials apply regardless of which fields are present or who approves.

Reads return explicitly classified plaintext values; secret values remain filtered.
MPAS does not detect secrets an operator incorrectly stores as plaintext. The native
secret-write API requires the caller to supply the actual value, so an agent
submitting it already knows it. No vault resolution or custom provisioning is added.

Do not remove the blanket denials as a way to enable only plaintext writes: the
released policy engine cannot selectively inspect `secret_text` classifications
under arbitrary variable names. Exact-name rules would leave other names uncovered.
Approval of build commands also cannot prove scripts will not export server secrets;
operator-controlled review and secret isolation remain necessary.

### Deferred coordinated migration

A later coordinated SDK/CLI release and plugin-v2 review/presentation migration is
planned to replace blanket Pages denials with finer configuration rules. It must
supply **both** arbitrary-entry policy inspection and compatible v2 plugin consumers;
support for one does not imply support for the other. Minimum future versions remain
pending assignment. Neither feature is available or required in this v1 release.

Before future activation, upgrade affected Verifiers, execution-side plugin consumers
(including bridges where applicable) and reviewers; generate/review migrated artifacts,
recompute artifact DIDs and align deployment/application-local/central registry
references with published content, preferably at immutable locations. Compatible v1
deployments need not migrate together, and upstream Cloudflare MCP needs no MPAS SDK
upgrade. Cloudflare still needs a central registry entry at release time; plugin v2
does not itself change the registry schema.

The current CA validates configurations before startup: one unsupported policy or
plugin can prevent the entire daemon from starting, including other applications.
Operation-level isolation is not implemented. Upgrade compatible consumers or restore
a previous compatible artifact/configuration set; never delete safety rules, strip
review metadata or relabel v2 as v1 to make startup succeed. Future rollout must test
v1 compatibility, visible rejection of unsupported inputs, restriction enforcement,
matching artifact hashes and rollback. The restricted configuration here uses only
released policy syntax and does not depend on that future rollout.

### Credential-side Pages response filtering

Install the application directory on the CA host and set its execution target
to `adapter/transport.mjs`, as in `adapter-config.example.json`. It launches
`mcp-remote@0.1.38` at the official hosted `?codemode=false` endpoint. It is a
filtering transport, not a custom Cloudflare API server. Proposer-side filtering
would be too late: raw secrets would already have left the credential boundary.

Every Pages read/write/list/nested result uses a positive projection of reviewed
identity, status, timestamp, URL and environment fields. Explicit `plain_text`
values are returned; `secret_text` entries retain at most their name/type, never
their value. Unclassified/malformed environment entries are withheld. Analytics
tokens and other unreviewed configuration fields remain withheld. No raw fallback
exists. Error text, `_meta`, `structuredContent`, annotations, resource blocks,
notifications and upstream stderr cannot bypass the projection. Unexpected
response shapes produce projected safe data or a constant sanitized error.
Normal successful DNS results remain intact.

The formatter's `--- TRUNCATED ---` markers are detected across the whole parsed
response, including fields withheld by projection. A fixed additional text block
warns that the result is partial and suggests a narrower query or another page.
Object omission details and marker-associated content are never copied. Array
markers are removed rather than replaced with misleading `null` records; truncated
allowed strings use a fixed placeholder. Short recognizable marker prefixes also
trigger the warning. This detects available markers, not truncation that a server
fails to signal (or cuts so short that no recognizable marker remains).

### Live contract drift: warn, do not block

On `tools/list`, the transport follows live upstream pagination and returns the
**live selected Tool definitions**, not a local snapshot masquerading as discovery.
It compares complete selected definitions against the reviewed local snapshot.
Unrelated additions are ignored. Changed, missing or duplicate selected tools
produce sanitized operator warnings on stderr, using only reviewed names and
reason codes. The adapter can also compare the returned live definitions itself.
Incomplete discovery produces a warning and available live definitions, never
fabricated fallback definitions. A warning does not gate `tools/call`; ordinary
plugin validation, authorization and policy rejection remain in force.

- `mcp-remote@0.1.38` pins the **connection client**, not Cloudflare's hosted server.
- Definition comparison detects declared contract changes, not silent behavioral
  changes behind unchanged schemas.
- The operator does **not** control the hosted implementation. Review warnings
  and update snapshots/restrictions deliberately; do not assume matching schemas
  prove behavioral equivalence.

### Authorization changes and production preparation

The deployment configuration is the authority; changing an authorization decision
must not require schema, artifact DID or transport edits. Rejection takes precedence
over approvals. Keep the blanket Pages denials for this restricted release: removing
them also enables secret writes, because the current engine cannot distinguish
arbitrary-name secret entries. Finer rules are deferred to the coordinated migration.

Direct uploads are not automatically covered by GitHub review. Any deliberate future
policy change enabling them needs a review/protection process for the exact uploaded
content and appropriate approval requirements. External review of repository code
and build scripts remains the operator's responsibility even for Git deployments.
The transport continues response filtering and does not impose hidden input bans.

Relative to the earlier schema-restricted release, this revision changes the plugin artifact DID because it corrects previously
restricted schemas (and normalizes equivalent provider shapes). Future policy-only
changes do **not** change that artifact. Generation refreshes the example artifact
reference without replacing its reviewed policy choices.

The example remains a **template, not an installed configuration**. The adapter's
current token is the broad read token used for discovery, not a production-scoped
credential. Operators provision production account/zone permissions separately;
never grant credential-minting permissions or put token values in the proposer,
configuration examples or command arguments. No live installation is part of
this change. Uncertain write outcomes require state verification before retrying.

## Reproduction and validation

Preserve the recorded capture; this revision requires no fresh discovery. From
a clean isolated MPAS checkout at `c7ffdd9a635dc66539fc74252a9641255029f7a6`,
build `bridge-generator` with `npm ci` and `npm run build` in that directory.
The replay verifies the revision, rejects tracked generator edits, checks emitted
plugin version 1/no display and requires the unchanged dependency manifest. Do not
use the ongoing v2 generator or relabel its output. Then run:

```sh
node applications/cloudflare/scripts/generate.mjs \
  /path/to/mpas/bridge-generator /path/to/capture /tmp/new-generated-apps
```

The capture directory contains original `metadata.json` and
`tools-list.snapshot.json`. Source hash/count/mode must match the recorded capture;
selected Tool objects remain unchanged. The generator applies the versioned
provider-schema normalization, refreshes artifact DIDs and copies the reviewed policy
with its updated plugin reference. Response/transport code and documentation are
maintained separately. Keep authorization decisions in deployment configuration, not manually edited schemas.
If only the committed selected capture is available, pass its `build-artifacts`
directory and append `--selected-snapshot`. This verifies all selected definitions
and the recorded original source hash/count; it does not re-verify or invent the
unavailable full 3,042-tool inventory.

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
node applications/cloudflare/scripts/test-generation.mjs /path/to/pinned-mpas/bridge-generator
node applications/cloudflare/scripts/test-responses.mjs
node applications/cloudflare/scripts/test-transport.mjs
node scripts/probe-bridge-protocols.mjs applications/cloudflare applications/cloudflare/tool-selection.json
```

Tests use local fixtures and a fake upstream, never live Cloudflare mutations.
They cover path formats/traversal, all DNS types, upload denial versus Git inputs,
schema-valid secret/plaintext/null writes being denied, plaintext reads, sanitization channels, truncation, selected-only
warning diagnostics, and configuration-only overrides passing through unchanged
transport code. They are not live CA/provider verification. The unchanged pinned
dependency tree has two high-severity npm advisories; this is not an audit-clean
claim. Dependency upgrades remain a separate shared-generator/SDK change.

Provider contract references: [DNS record identifiers](https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/delete/)
and [Pages deployment arguments](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/).
These are contract references, not a claim of fresh hosted discovery.
