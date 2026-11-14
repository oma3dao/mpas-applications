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

The example remains a **template, not an installed configuration**. The current
adapter token is the broad **read token used for discovery**, not a production
zone-scoped credential. No policy, credential or Cloudflare resource is changed
by publishing these files. The operator must provision production account/zone
permissions separately and keep token-management authority unavailable.

### Reads, writes and scope

- Pin `account_id` and `zone_id`; require explicit scope. Names, record IDs,
  project names and domains remain open within that boundary. Record IDs are
  resource handles, not secrets or hostnames. A created record can immediately
  be edited without reconfiguring an ID allowlist.
- Reads use the verified proposer signature only, with no independent approval.
- Muse and Grok have separate DIDs in `trustedWriters` and `proposers`; their own
  verified proposer signature suffices for writes. Other proposers require one
  independent approver. Replace placeholders and populate signer keys on the CA;
  keep the independent approver group disjoint from all proposer identities.
- Token-minting tools (`accounts_tokens_*`, `user_tokens_*`, `builds_tokens_*`,
  upload tokens and any other tools outside the selected surface) remain
  rejected, even with approval. Do not add policy-only allowances for them.
- Optional tighter hostname form: merge `optional-hostnames.policy-fragment.json`
  into the named write policies to allow `www.example.com` and `api.example.com`
  only. **This is not the default and does not restrict reads.** ID-only deletes
  cannot prove the current hostname from their payload. Strict hostname isolation
  also needs a trusted record-ID/name lookup at execution, not an ID string
  interpreted as a hostname. The fragment rejects PATCH without an allowed name.

Policy rejection overrides approvals, including trusted-writer signatures.
Impact labels alone do not establish approval counts.

### All captured DNS types

All 21 captured types are supported: A, AAAA, CAA, CERT, CNAME, DNSKEY, DS, HTTPS,
LOC, MX, NAPTR, NS, OPENPGPKEY, PTR, SMIMEA, SRV, SSHFP, SVCB, TLSA, TXT and URI.
NS delegation is **critical**, inside the pinned zone, with its target visible
in the payload. All DNS writes are conservatively critical, including PATCH
without `type`. There is no four-type allowlist.

The plugin flattens captured object `allOf` intersections for SDK fail-closed
validation, retains all captured subtype fields, prunes unused definitions and
compacts schema annotations to fit SDK resource limits. Unknown fields remain
rejected. The hosted Tool definitions and selected snapshot are unchanged.

### Credential-side Pages filtering

The example launches `adapter/transport.mjs` on the **Credential Adapter host**.
It launches pinned `mcp-remote@0.1.38` against the same hosted endpoint, filters
results before they leave the CA, and reads unchanged Tool definitions from
`bridge/src/tools.json`. Install the application directory on that host.
This is a filtering transport, not a replacement Cloudflare API server.
A filter in the proposer bridge would not be a sufficient boundary.

All Pages responses (reads, writes, lists and nested deployments) use a positive
projection of ordinary identity/status/timestamp/URL fields. Configuration maps,
`secret_text`, plaintext environment values, `deployment_configs.env_vars`, and
`web_analytics_token` are never forwarded. Unknown output fields, raw errors,
resource blocks, `structuredContent`, `_meta`, annotations, logs and notifications
are withheld. Unexpected or malformed Pages responses yield a constant error;
there is no raw-response fallback. Normal DNS results remain intact. Additional
Pages fields require a reviewed projection change; the result body is deliberately
reduced without rewriting hosted schemas.

### Server secrets and build commands

Policy and the execution guard reject environment-value and analytics-token
writes. The guard recursively checks nested fields independently of approval.
`build_command` changes are rejected even with approval or a trusted-writer
signature. A command-name allowlist such as `npm run build` cannot prove that
repository scripts or dependencies will not export build secrets. The Pages
create/edit tools remain available for other fields; configure build commands
through a trusted server-side process.

Existing builds, source changes, retries and deployments can execute code already
configured in Cloudflare. Operators must isolate secrets from untrusted build
code or use a separate trusted build pipeline. This bridge does not sandbox
Cloudflare builders or guarantee arbitrary repository content is safe. Absence
of the build-log tool does not prevent network exfiltration by build scripts.

Only the CA receives `CLOUDFLARE_API_TOKEN`. The transport passes a literal env
reference, never the token value, in its command arguments. The wrapper suppresses
upstream stderr. No credentials belong in the proposer, examples or artifacts.
Timeouts do not prove writes failed: verify state before retrying uncertain writes.
The subset does not provide upload credentials or a complete asset-upload pipeline.

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
node applications/cloudflare/scripts/test-transport.mjs
node scripts/probe-bridge-protocols.mjs applications/cloudflare applications/cloudflare/tool-selection.json
```

Checks exercise the SDK policy/schema engine, all DNS types, scope boundaries,
trusted writers and independent approvals, secret-bearing writes, result projection,
and the stdio guard against a **fake local upstream**. They do not constitute live
CA or Cloudflare tests. CI runs policy/transport checks and both protocol probes.
No new discovery or Cloudflare application calls were performed for this revision.

The pinned dependency tree reports two high-severity npm advisories. This bridge
uses stdio; that is not an audit-clean claim. Shared generator/SDK dependency
updates should be reviewed separately rather than silently patching generated
runtime dependencies for this application.
