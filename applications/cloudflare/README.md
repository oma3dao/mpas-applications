# Cloudflare DNS and Pages (no Code Mode)

Restricted MPAS bridge for the official hosted Cloudflare MCP server at
`https://mcp.cloudflare.com/mcp?codemode=false`, using `mcp-remote@0.1.38`.
No replacement Cloudflare API or secret-provisioning API is implemented.
For the shared security model and setup, see the [repository README](../../README.md#operating-a-generated-bridge).

## Governed and attested surfaces

Plugin schema version **1** and released `@oma3/mpas@0.1.0-alpha.15` are unchanged.
The selected surface contains **24 tools: 10 pass-through reads and 14 governed writes**.

The following reads are in `toolSurface.toolNames`, but not `operations` or the
example policy: `accounts_get`, `zones_get`, `dns_records_get`, `dns_records_list`,
`pages_get`, `pages_list`, `pages_deployments_get`, `pages_deployments_list`,
`pages_domains_get`, `pages_domains_list`.
They execute on an eligible proposer's verified signature without operation-schema
validation or policy evaluation. Their resource boundary is the upstream token's
scope, not the write-only account/zone policy below. Pages results still pass
through credential-side response filtering before leaving the host.

The 14 governed tools are the four DNS writes; Pages project delete; deployment
create/delete/retry/rollback; domain create/delete/validation-retry; and source
connect/disconnect. These change state and require policy evaluation. DNS writes,
including NS delegation and PATCH without a type, remain critical. All 21 captured
DNS types are representable; schemas normalize object intersections without a
four-type allowlist.

`pages_create` and `pages_edit` are excluded from **both** operations and attested
tool names, and omitted from this bridge's advertised subset. The official hosted
server may still advertise them. With no operator policy entry for them, direct
submissions to the CA are rejected as `OPERATION_NOT_ATTESTED`. Project creation,
settings and all environment writes must use another operator-controlled workflow.
Their supported reintroduction is deferred to the coordinated SDK/CLI and plugin-v2
upgrade described below; this is not a configuration-only enablement.
Token-minting tools and `execute` are also unattested; `execute` is absent from the
recorded native upstream surface and has no example-policy entry.

## Deployment-policy exceptions

The example config omits `passThrough: "deny"`, which would block the intended
reads. `signerGroups.proposers` gates eligible callers before routing, including
pass-through. `defaultRequirement` requires one member of `approvers` for every
governed call that matches no exception. The example uses only the standard
`all`, `proposers`, and `approvers` groups, with placeholder DIDs. It does not copy
per-operation proposer/approver requirements or grant identity-specific exemptions.

The only per-operation entries reject parameter-dependent cases:

- DNS writes outside the two approved zone IDs. Replace
  `REPLACE_WITH_ZONE_ID_1` and `REPLACE_WITH_ZONE_ID_2` with the real
  IDs for the operator’s zones; **domain names are not zone IDs**.
- Pages writes outside `REPLACE_WITH_ACCOUNT_ID`; replace it with the operator-approved account ID.
- Deployment creation containing any direct-upload argument: `_worker.js`,
  `_worker.bundle`, `manifest`, `_headers`, `_redirects`, `_routes.json`,
  `functions-filepath-routing-config.json`, `pages_build_output_dir`, or
  `wrangler_config_hash`.

Keep deployment-specific account and zone IDs only in the installed configuration
(for example, `~/.mpas/config/cloudflare-dns-pages-adapter-config.json`), not in
this published template.

An in-scope Git deployment matches no rejection and falls through to the default
approver requirement. Approvals cannot override a matching rejection. Optional
hostname restrictions are shown in `optional-hostnames.policy-fragment.json`;
merge them with existing rules, not instead of them. ID-only writes require a
trusted lookup for any hostname-based restriction; record IDs are not hostnames.

The plugin validates legitimate path formats on **governed writes only**:
nonempty URL-safe account/zone/record IDs (up to 32 characters), UUID deployment
IDs, project-name grammar and DNS domain labels. Empty/dot segments, separators
and encoded traversal are rejected. In particular, `dns_record_id: ".."` cannot
normalize a record DELETE into a zone-level DELETE. New valid IDs remain usable
without modifying an allowlist. Pass-through reads intentionally do not get these
operation-schema checks; provider credential scope must be correct.

Repository code, source-connection changes and build scripts require an external
operator-controlled review process. Git deployment alone is not proof of review;
branch deployment uses HEAD, and `commit_hash` metadata does not pin execution.
Plaintext environment reads remain available. Values explicitly classified as
secret and analytics tokens are withheld; MPAS does not detect secrets an operator
misclassifies as plaintext.

## Surface and provenance

The operator capture at `2026-11-14T17:11:01.217Z` contained 3,042 tools, no
`execute`, server `cloudflare-api` `0.1.0`, and MCP `2024-11-05`. Original source
hash/count remain in `tool-selection.json` and metadata. This revision selects
24 unchanged hosted Tool definitions from that same capture, not a new discovery.
The committed snapshot is the selected subset. Plugin, bridge binding and registry
hashes are regenerated together. The operator retains the full original capture.

Offline generation uses clean MPAS revision
`c7ffdd9a635dc66539fc74252a9641255029f7a6`. Source semantics were reviewed at
Cloudflare commit `7eb0b5258c4265503b3fce8842b96adc5422fa69`; neither that reference
nor the pinned connection client controls Cloudflare's hosted implementation.

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

### Deliberate changes and deployment

Direct uploads are denied by the example's field-presence rules, not by narrowed
schemas or transport argument checks. An operator may consciously replace those
rules with suitable approval requirements, provided another process reviews the
exact uploaded content. GitHub review does not automatically cover direct uploads.
Policy-only changes do not change the plugin artifact DID.

### Why Pages create/edit need the later upgrade

`pages_create` and `pages_edit` can write environment maps with arbitrary variable
names in both preview and production. The released policy engine cannot express
“reject if any entry is `secret_text`” while allowing plaintext and `null` deletion
entries. Exact-name rules would miss other variable names. Response filtering
cannot solve this input-authorization problem: the native secret-write API requires
the caller to supply, and therefore know, the actual secret value.

Supported reintroduction is planned with a coordinated release, not by adding a
policy entry or changing an approval threshold on the current runtime:

1. Release an SDK with generic collection-inspection policy support, then a CLI/CA
   that uses it, so configuration can enforce the secret-write prohibition across
   arbitrary names. Keep these restrictions out of provider input schemas and
   transport argument checks.
2. In the same planned rollout, adopt plugin schema v2 review/presentation metadata
   and upgrade affected plugin consumers and reviewer clients. This is a separate
   compatibility requirement; v2 metadata alone does not add the policy capability.
3. Review and regenerate the expanded attested surface, governed schemas, bridge
   and filter routing; add the finer deployment rules and update artifact DIDs,
   registry entries and installed references before enabling the tools.

Minimum release versions are **pending**; neither deferred capability is provided
by this restricted v1 release. Until that migration is available, keep project
creation/settings/environment writes in another operator-controlled workflow.
Do not add a policy entry to enable these excluded tools: explicit operator policy
can extend governance beyond plugin membership, but cannot supply the missing
collection inspection. Removing them from `operations` while keeping them attested
would exempt them rather than disable them. No custom secret-provisioning API is
introduced or planned by this change.

This revision changes plugin membership and the attested surface, so it changes
the artifact DID. The operator must install the reviewed plugin/bridge/transport
set and update the installed configuration's artifact reference before activation.
The checked-in config is only a template. This work does not inspect or change
installed credentials or configurations. Verify token scope on the credential
host; do not assume the earlier discovery token is suitable for production.

Central registry and deployment references must match published artifacts. Retain a compatible
artifact/configuration set for rollback; an invalid config can prevent the whole
CA daemon from starting.

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
attestation exclusions, default write approvals, pass-through read membership, plaintext reads, sanitization channels, truncation, selected-only
warning diagnostics, and configuration-only overrides passing through unchanged
transport code. They are not live CA/provider verification. The unchanged pinned
dependency tree has two high-severity npm advisories; this is not an audit-clean
claim. Dependency upgrades remain a separate shared-generator/SDK change.

Provider contract references: [DNS record identifiers](https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/delete/)
and [Pages deployment arguments](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/).
These are contract references, not a claim of fresh hosted discovery.

CI discovers this bridge automatically and runs its extra offline policy, response,
transport and restricted-surface checks through `scripts/test-ci.mjs`. Run the same
hook locally with `node applications/cloudflare/scripts/test-ci.mjs` from the
repository root. Full generator replay remains a separate pinned-checkout check.
