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
including credential-minting APIs. Approval cannot override schema or policy
rejection. Impact labels alone do not establish approval counts.

The credential-side transport has a different job: **sanitize upstream results
before they leave the CA**. It forwards MCP requests and discovers live selected
tools, but has **no argument-level authorization checks**. Input overrides require
plugin/configuration changes, not hidden transport edits. Selected-name routing
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
`commit_message`, `commit_dirty`). Both plugin schemas and explicit policy reject
rules disable these captured direct-upload fields, regardless of approval:

- `_worker.js`, `_worker.bundle`, `manifest`
- `_headers`, `_redirects`, `_routes.json`
- `functions-filepath-routing-config.json`
- accompanying upload metadata `pages_build_output_dir`, `wrangler_config_hash`

The first six file fields are forwarded as multipart parts by the reviewed
request builder; the manifest references uploaded asset hashes. The metadata
fields accompany the upload configuration. No other selected tool provides a
file/multipart upload entry point. Project/source configuration and Git deployments
remain governed writes, not direct file uploads.

Operators must maintain an **external code-review process**, such as reviewed
GitHub changes, for deployed code and repository build scripts. Git deployment
alone is **not evidence of review**. Branch deployment uses HEAD; `commit_hash`
is associated metadata, not proof that execution is pinned to a reviewed commit.
Source/repository changes, retries and existing builds also depend on that review
process and operator-controlled secret isolation.

### Environment variables and build configuration

The plugin allows `plain_text` environment values, including creation, updates
and deletion via a `null` map entry, in both preview and production configuration.
Reads expose values only when explicitly classified `plain_text`. MPAS follows
Cloudflare's classification; it does not identify secrets mislabeled as plaintext.

The plugin rejects `secret_text` writes by default. Cloudflare's native Pages API
requires the caller to supply the actual value: an agent submitting a secret
therefore already knows it. There is no secret generation, vault-reference
resolution or custom secret-installation API here. Those need a separate MPAS
architectural decision.

**Pinned policy-engine limitation:** its conditions use exact JSON Pointers and
cannot quantify over arbitrary environment-variable names. Consequently the
secret-type prohibition is enforced by the plugin bound by the deployment's
artifact DID, not by a fictitious wildcard policy rule. The blanket `env_vars`
policy ban has been removed. Independent arbitrary-key rejection in the policy
engine remains unresolved and needs an SDK policy capability; exact rules for a
few variable names would not cover this requirement.

Build-command and analytics-token writes remain rejected by **both** plugin and
policy. Approval of a shell command cannot prove that scripts/dependencies will
not export server secrets. Configure builds through a trusted process. The
transport does not repeat these input bans. Omitting build-log tools does not
prevent network exfiltration from a builder.

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

### Deliberate overrides

Defaults are intentionally not transport authorization rules. To enable an
otherwise restricted input, the operator must:

1. Review its risks and establish a suitable review/protection process. Direct
   upload content is not automatically covered by GitHub review. Review the exact
   uploaded code/assets or enforce another appropriate protection mechanism.
2. Edit `scripts/request-restrictions.mjs` (the reproducible plugin restriction
   source) and regenerate offline. For direct uploads, remove the applicable
   `false` field schemas so captured schemas remain; for `secret_text`, expand
   the environment-entry union to include the native `{type:"secret_text",value}`
   shape while retaining a single unambiguous `null` deletion alternative.
   Build-command overrides likewise restore the captured field schema.
3. Modify the deployment configuration: remove the corresponding direct-upload
   or build-command rejection rules and provide suitable signer requirements.
   A secret-text override requires updating the pinned plugin artifact reference;
   any additional operator-authored exact-name secret rejection rules must also
   be deliberately changed. No wildcard secret policy support is claimed.
4. Recompute the plugin artifact DID, refresh `registry-entry.json` and
   `adapter-config.example.json`, and install the reviewed plugin/configuration
   together through the operator's deployment process. Generation refreshes the
   example reference while preserving its policy choices. Verify publisher trust
   and configuration references match the new artifact.
5. Run the tests with the intended defaults/overrides. No transport input-check
   edits are required. Response filtering remains active even when secret writes
   are enabled; it cannot erase the submitting agent's prior knowledge of a value.

The example remains a **template, not an installed configuration**. The adapter's
current token is the broad read token used for discovery, not a production-scoped
credential. Operators provision production account/zone permissions separately;
never grant credential-minting permissions or put token values in the proposer,
configuration examples or command arguments. No live installation is part of
this change. Uncertain write outcomes require state verification before retrying.

## Reproduction and validation

Preserve the recorded capture; this revision requires no fresh discovery. From
an MPAS checkout with the generator built at the recorded revision:

```sh
node applications/cloudflare/scripts/generate.mjs \
  /path/to/mpas/bridge-generator /path/to/capture /tmp/new-generated-apps
```

The capture directory contains original `metadata.json` and
`tools-list.snapshot.json`. Source hash/count/mode must match the recorded capture;
selected Tool objects remain unchanged. The generator applies the versioned
request restrictions, refreshes artifact DIDs and copies the reviewed policy
with its updated plugin reference. Response/transport code and documentation are
maintained separately. Do not enable restrictions only in a manually edited plugin
that the next replay would overwrite.

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
node applications/cloudflare/scripts/test-responses.mjs
node applications/cloudflare/scripts/test-transport.mjs
node scripts/probe-bridge-protocols.mjs applications/cloudflare applications/cloudflare/tool-selection.json
```

Tests use local fixtures and a fake upstream, never live Cloudflare mutations.
They cover path formats/traversal, all DNS types, upload denial versus Git inputs,
secret/plaintext/null handling, sanitization channels, truncation, selected-only
warning diagnostics, and plugin/policy overrides passing through unchanged
transport code. They are not live CA/provider verification. The unchanged pinned
dependency tree has two high-severity npm advisories; this is not an audit-clean
claim. Dependency upgrades remain a separate shared-generator/SDK change.
