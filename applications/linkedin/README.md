# LinkedIn via Wivity Link

An MPAS bridge for Wivity Link's hosted LinkedIn endpoint,
`https://link.wivity.com/mcp/linkedin`. Wivity Link translates MCP calls to
LinkedIn's API and holds the LinkedIn provider tokens. The Credential Adapter
holds a separate Wivity Link OAuth session. The proposer holds neither token.

## Status and scope

Generated **offline from an operator-supplied authenticated discovery capture**,
not from invented schemas or a fresh discovery on the proposer account.
The complete snapshot and `bridge/src/tools.json` agree by tool name, and the
canonical tool-surface hash verifies:
`kg78aWG9b83k9w4H6yyinTenD8SSAZ1Sc_GNDiP-lmo`.

- `linkedin_get_account`: connected account identity, scopes, expiry and available tools.
- `linkedin_create_post`: exact text (1–3000 characters), explicit `PUBLIC` or
  `CONNECTIONS` visibility, and required `expectedAccountId` (1–256 characters).

Comments, reactions, organization-page publishing and other members' post reads
are not included. Account lookup is attested pass-through, not a governed operation; it returns
metadata, not credential values. Proposer eligibility and signature verification
still apply, and unattested tools remain blocked under the default configuration.
Posting requires one independent
maintainer from `approvers`; keep that group disjoint from proposers. The high
impact label is advisory classification, **not approval enforcement**. Enrollment
proves possession of an enrolled adapter key, not approval of each post.

The operator did not supply capture metadata. Capture time, original generator
revision, transport version, server version and negotiated protocol remain unknown.
`build-artifacts/metadata.json` distinguishes these gaps from local generation.
The plugin's `2024-11-05` execution profile is the existing repository baseline,
not a claim about the remote handshake. The proposed pinned `mcp-remote@0.1.38`
harness command was not used locally to contact the endpoint. Normal adapter
execution uses native `mcp.http`, not that transport command.

## Connect a credential adapter

Run these steps in the **credential-adapter account**, never the proposer account.
Use the CLI's [adapter guide](https://github.com/oma3dao/mpas/blob/main/cli/guides/credential-adapter.md)
and [setup guide](https://github.com/oma3dao/mpas/blob/main/cli/guides/setup-shell.md)
for the installed version. Some linked instructions may require a newer release;
check `mpas --version` and command help rather than assuming unmerged docs are live.

1. **Identify the existing adapter.** Run `mpas config` and record its public DID.
   Do not create or rotate a key for this integration. The adapter's signing key
   must match the DID enrolled below; it is separate from proposer and maintainer keys.
2. **Enroll it in SignerSet.** An owner/admin selects the intended organization in
   the SignerSet portal and enrolls the credential adapter's public `did:jwk`,
   a recognizable label, and redirect URI `http://127.0.0.1/oauth/callback`.
   Use the adapter enrollment control, not ordinary signer enrollment. Obtain the
   published OAuth Client ID Metadata Document URL returned for that adapter.
   If enrollment is not available in the deployed portal, stop here and have its
   operator complete enrollment; do not substitute dynamic registration or a made-up URL.
3. **Check the public document.** Its `client_id` equals its URL, it declares
   `token_endpoint_auth_method: private_key_jwt`, and its inline `jwks` contains
   the enrolled adapter's public key. Its redirect URI must use `127.0.0.1` and
   `/oauth/callback`, not `localhost` or a different path. The CLI chooses the
   loopback port. SignerSet must publish this document under the prefix trusted
   by Wivity Link. See the [enrollment contract](https://github.com/signerset/mpas-coordination-server/blob/main/docs/features/entitlement/spec.md).
4. **Install the deployment config.** Copy `adapter-config.example.json` into the
   adapter's config directory as `linkedin-adapter-config.json`. Replace the plugin
   path, proposer/approver DIDs, and
   `executionTarget.auth.client.clientIdMetadataDocument` with the actual enrolled
   adapter document URL. Keep the checked-in plugin artifact hash unchanged unless
   you change the plugin and recompute it. Configure signer keys for those DIDs;
   non-`did:jwk` identities additionally need their public JWKs. Load/restart the
   adapter using the CLI guide. Do not copy this example over unrelated configs.
5. **Sign in.** Use an owner/admin in the same organization that enrolled the
   adapter. In the operator browser, complete Sign in with SignerSet, Wivity Link
   consent and LinkedIn consent. A different organization's adapter is refused.

```sh
mpas oauth login --application-did did:web:wivity.com:applications:linkedin-mcp-server --adapter-key ~/.mpas/keys/signing-key.json
mpas oauth status --application-did did:web:wivity.com:applications:linkedin-mcp-server
```

Use the actual existing key path if different. CLI versions through
`0.1.0-alpha.4` default OAuth signing to `~/.mpas/keys/adapter.json`, so the explicit
flag is needed for installer-created `signing-key.json`. It also avoids depending
on a promised future default. For a terminal in another user session, add
`--no-browser` and open its short-lived URL privately in your browser; see the
CLI guide for remote-host callback forwarding. Never paste login URLs or tokens
into group chat.

The example deliberately uses `credentialBindings[].provider: "file"`: the
inspected CLI loader requires it even with managed OAuth. The OAuth session is
resolved by `executionTarget.auth`; do not provision a raw LinkedIn token file or
change the binding to `"oauth"` based on older prose.

The configured Wivity Link scope is `offline_access`. Source inspection shows it
in authorization-server metadata, while protected-resource metadata omits scopes.
Do not copy Netlify's `read`/`write` or raw LinkedIn scopes into this config.
Wivity Link separately requests LinkedIn's `openid`, `profile`, `w_member_social`.
Live scope discovery and login must still be verified by the adapter operator.

## Proposer setup and review

Build `bridge/` with `npm ci` then `npm run build`, and use the
[proposer guide](https://github.com/oma3dao/mpas/blob/main/cli/guides/proposer.md)
and generated `bridge/README.md` to configure the bridge for your existing
adapter/relay, coordination service and proposer key. Use durable workflow storage.
Do not register Wivity Link directly in the proposer harness or give it OAuth tokens.

First call `linkedin_get_account` through MPAS. Confirm the member's display name
and copy the returned `accountId` into the post's `expectedAccountId`. Review the
exact text, visibility and account ID before independent approval. All three
arguments are bound into the Action and forwarded unchanged. Changing any of them
requires a new Action. Wivity Link is responsible for rejecting account mismatch;
this local schema cannot establish which member is connected.

The account display name is contextual output, not an extra post argument. This
application does not implement name lookup in the maintainer UI or guarantee that
UI displays it alongside the ID. Verify that separately. If posting returns an
unknown outcome, inspect the member's LinkedIn page before considering another
Action: repeating the call can publish twice.

## Disconnect

In the adapter account:

```sh
mpas oauth logout --application-did did:web:wivity.com:applications:linkedin-mcp-server --adapter-key ~/.mpas/keys/signing-key.json
```

Confirm revocation succeeded; deleting a local cache alone does not establish
server revocation. This disconnects the client's Wivity Link grant. It does not
undo posts or necessarily remove LinkedIn's authorization of Wivity Link; remove
that separately in LinkedIn if desired. Removing adapter enrollment in SignerSet
also blocks future access after service caches expire, and affects other services
using that enrollment. Do not remove a shared enrollment just to disconnect LinkedIn.

## Reproduction and remaining verification

Local generator: `mpas` revision `c7ffdd9a635dc66539fc74252a9641255029f7a6`,
`bridge-generator` version `0.2.0`, rebuilt from source. Offline generation used its
injectable discovery hook with the uploaded complete Tool definitions. No LinkedIn
application tool was called. Source review used Wivity Link's provider and OAuth
implementation in the local PR5 checkout; this is not proof of the deployed revision.

```sh
python3 scripts/validate-applications.py
npm ci --prefix applications/linkedin/bridge
npm run --prefix applications/linkedin/bridge build
node scripts/probe-bridge-protocols.mjs applications/linkedin
node applications/linkedin/scripts/test-ci.mjs
```

The application-specific hook is picked up automatically by repository CI.
These checks cover artifact integrity, payload constraints, independent-approval
policy, attested-read membership and proposer eligibility, and both bridge protocol modes, not authenticated hosted execution.

Application/plugin DIDs follow existing Wivity repository conventions. Their live
DID resolution and registration have not been verified. `registry-entry.json` is a
reviewed local draft, not proof of central registry publication. No LinkedIn entry
was found in the inspected local `mpas/application-registry`; a separate registry
addition is needed for registry-based CLI installation unless one has since landed.
No files in that repository are changed by this integration.

Before declaring operational readiness, obtain the missing capture metadata,
confirm the deployed tool surface and profile, enroll/load the adapter, verify OAuth
login/refresh/logout, account mismatch rejection, approval review display and one
explicitly authorized post. None of these live acceptance checks was performed here.

### Local validation record

- Artifact validator: 27 applications, zero errors/warnings.
- Clean bridge-local install/build and exact repository CI install/build: passed;
  lockfile remained byte-identical, with portable package-relative entries.
- Tasks probe: two application tools; conventional probe: those two plus the
  compatibility wait tool. No upstream calls made.
- Released SDK payload and independent-approval tests: passed.
- CLI deployment loader at PR129 revision
  `10a37911cc198f8f9b0e5daa4827a8700951cbd5`: passed with generated fixture public
  identities and a stubbed plugin trust-confirmation callback. This is an offline
  config/schema/integrity test, not operator trust acceptance or deployed CLI proof.
- npm audit reports two high-severity package entries: pinned
  `@modelcontextprotocol/server@2.0.0` and its dependent `@oma3/mpas`. The reports
  concern MCP HTTP server behavior; this generated bridge uses stdio, but no
  general non-exploitability claim is made. Pins remain consistent with the
  generator/repository; dependency remediation requires a separately reviewed upgrade.
- Hosted CI, live authentication, token refresh/revocation and LinkedIn execution
  were not run. No commit, push or PR was made.
