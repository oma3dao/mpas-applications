# mpas-applications

> [!WARNING]
> **Experimental alpha.** These MPAS integrations are not production-ready or
> independently audited. Breaking changes are expected. The presence of an
> application in this repository means that its plugin and bridge artifacts
> have been contributed; it does not mean that the integration is suitable for
> production use or has been independently validated.

MPAS application plugins, bridges, and supporting artifacts contributed by
their publishers.

The protocol specifications, SDK, reference Credential Adapter, and
development-time bridge generator live in
[`oma3dao/mpas`](https://github.com/oma3dao/mpas). This repository contains
the generated and reviewed application-specific artifacts.

These applications use the MCP execution profile because agents talk to MCP
servers. MPAS the protocol is broader: it is not limited to MCP, and a
Proposer or Signer can be any entity that holds a private key — a human,
agent, device, service, or organization.

## Applications

See [ROADMAP.md](ROADMAP.md) for the current list of completed, in-progress,
and planned applications.

## Structure

```
mpas-applications/
  README.md
  ROADMAP.md
  LICENSE

  applications/                  # Contributed application artifacts
    <application>/
      plugin.json
      registry-entry.json
      harness-config.json
      build-artifacts/
        tools-list.snapshot.json
        metadata.json
        classification.json
      bridge/
        package.json
        src/
        tsconfig.json
```

## How Applications Are Created

The development-time
[MPAS bridge generator](https://github.com/oma3dao/mpas/tree/main/bridge-generator):

1. Connects to an upstream MCP server and discovers its tools.
2. Captures the discovered tool surface for review.
3. Generates an MPAS Application Plugin, registry entry, harness
   configuration, and bridge server.
4. Writes static artifacts that can be reviewed and contributed under
   `applications/<name>/`.

Application publishers review and maintain their contributed artifacts. An
application can also be built manually if it conforms to the MPAS profiles.

## How the Bridge Works

For any existing MCP server, the generated bridge preserves the upstream tool names and input schemas. Agents call the same tools with the same arguments, but high-impact actions are intercepted for MPAS approval before being forwarded upstream.

```
Agent
  → Generated MPAS Bridge (tool-input compatible)
  → Credential Adapter (Verifier)
  → Original MCP Server
  → Application API
```

A bridge is **tool-input compatible, not a transparent drop-in**. Multi-party approval is asynchronous, so an approval-gated call cannot return the upstream result on the original request. Per the [MPAS MCP Proposer Bridge Client Interface Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-mcp-proposer-bridge-client.md), a bridge differs from its upstream server by:

- appending a standard MPAS notice to tool descriptions;
- adding the reserved `mpas_wait_for_action_result` tool;
- returning `MpasBridgeDeferredResult` instead of a native result when approvals are required, and
- requiring the client to retrieve the eventual result through the wait tool.

Native results are relayed verbatim whenever one exists. Agent integrations must understand the profile even when they already understand the upstream server.

## What Belongs in `plugin.json`

`plugin.json` defines an application's **governed surface**, and it is the most
consequential file in a contributed application. It does not control what an
agent can call — the bridge advertises the full upstream tool surface either
way. It controls what the Credential Adapter routes through approval.

An operation listed in `operations` is validated against its
`executionPayloadSchema`, evaluated against deployment policy, and gated by
whatever approval requirement the operator configured. An operation that is
absent is routed as **pass-through**: it executes on the Proposer's verified
signature alone, with no schema validation and no policy evaluation. See the
[MCP Execution Profile §5](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-mcp.md)
and the
[JSON Verifier Policy Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-policy-json.md).

Removing an operation therefore does not disable it. It exempts it.

### The rule

**Govern operations that change state. Leave reads as pass-through.**

A credential is issued to an agent so it can do a job, and reading is part of
that job. If an operator gives an agent access to data, they have accepted
that the agent can see that data — gating reads adds an approval round trip to
every lookup without adding control. What warrants a human approver is the
agent *acting*: publishing, spending, deploying, deleting, messaging a
customer, or changing configuration.

An operator who disagrees can always override the plugin in the Credential
Adapter’s deployment config JSON (the file in the adapter `config/` folder —
not `harness-config.json` in this repository). That config can:

- **govern more** — name additional tools under policy so they enter the
  governed set even when the plugin left them as pass-through; or
- **require proposer only** — mark a function/tool `proposerOnly` so it
  executes on the Proposer’s verified signature alone, with no additional
  Approver.

They still cannot turn a plugin-declared operation into ungoverned
pass-through merely by omitting approval rules; once it is in the governed
set (plugin or config), it stays under policy evaluation.

### Govern a read only if it crosses a trust boundary

There is one exception, and it is narrow. Govern a read if it returns
**durable credentials usable outside the governed channel** — because an
ungoverned tool that hands out the keys makes governing everything else
theatre. Examples in this repository:

| Operation | Why it stays governed |
| --- | --- |
| `railway.list_variables` | Returns environment variables as KEY=VALUE, which routinely hold live credentials for third-party systems MPAS does not govern at all. |
| `neon.get_connection_string` | Returns a working URI for the branch's read-write compute — direct database access that bypasses the bridge entirely. |
| `upstash.qstash_get_user_token` | Returns a reusable `QSTASH_TOKEN`. |

The test is escalation, not sensitivity. Values designed to be published fail
it and stay pass-through — `firebase_get_sdk_config` and
`supabase.get_publishable_keys` both return keys meant to ship inside client
applications.

Two related patterns are state changes rather than reads, and are graded
accordingly:

- **Credential injection.** An operation that lets a proposer supply its own
  credential defeats the adapter's credential binding — `mongodb.connect`
  (arbitrary `connectionString`), `firebase_login`.
- **Re-targeting.** An operation that changes what later calls act upon means
  an approver may authorize an action against a different target than they
  pictured — `firebase_update_environment`, `railway.link_environment`.

### Watch for verbs that lie

Classify on what an operation *does*, not what it is named. Both directions
occur:

- `neon.explain_sql_statement` reads like a diagnostic, but takes arbitrary
  SQL plus an `analyze` flag, and `EXPLAIN ANALYZE` executes what it is given.
  Governed. MongoDB's `explain` does not, and is pass-through.
- `plain.generate_help_center_article` sounds like generation, but writes the
  result into a public help center. Governed.
- `supabase.confirm_cost` sounds like a control, but an agent can call it
  itself to satisfy its own precondition. Pass-through; the real guarantee is
  that `create_project` is governed.

### Grading impact

`impact` is informational and never sets an approver count — approval
requirements live in the operator's policy
([Application Plugin Profile §12](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-application-plugin.md)).
Its job is to let a policy author sort a large surface quickly, so grade
consistently across applications:

| Level | Meaning |
| --- | --- |
| `critical` | Irreversible destruction, movement of funds, or a bypass of the governance boundary itself. |
| `high` | Significant change to production, configuration, or published content; recoverable with effort. |
| `medium` | Routine mutation with a bounded blast radius. |
| `low` | Trivial, private, and reversible. |

Low-impact writes still belong in the plugin. Listing them lets an operator
gate them if they want to; grading them low means a sensible policy does not
have to.

## Artifact DID

Each application's `registry-entry.json` includes an `artifactDid` — a content-addressable identifier derived from the canonical JSON of its `plugin.json`. The MPAS Credential Adapter validates this hash at startup and rejects a mismatch. That check proves **content integrity only**: the bytes loaded match the identifier in deployment configuration.

Integrity is not the whole trust story. After the hash check, the adapter also fetches the attestations and related evidence bound to that `artifactDid` (responsibility claims, cybersecurity assessments, linked identifiers, and other recognized evidence) so the operator can decide whether to trust the plugin. A matching hash does not by itself prove publisher legitimacy or that a trusted party reviewed the artifact.

See the full method specification: [did:artifact Method Spec](https://oma3dao.github.io/omatrust-docs/specification/did-artifact-method-spec.html)

### How to compute

**Via the OMATrust UI (recommended):**

1. Go to https://test.app.omatrust.org/publish/security-assessment
2. Upload the application's `plugin.json`
3. Copy the computed `did:artifact:` value (no need to submit the form)
4. Add it to `registry-entry.json` under `plugin.artifactDid`

**Using `@oma3/omatrust` (Node.js):**

```ts
import { artifactDidFromJson } from "@oma3/omatrust/identity";
import { readFileSync } from "fs";

const plugin = readFileSync("applications/github/plugin.json", "utf-8");
const did = await artifactDidFromJson(plugin);
console.log(did);
// did:artifact:bafkreic3bb3zcnsxqtdmf4xzm77qluxv6extrf263nuasoojuhoxpb23re
```

**Algorithm (manual implementation):**

1. Canonicalize the plugin JSON per [RFC 8785](https://datatracker.ietf.org/doc/html/rfc8785) (JSON Canonicalization Scheme)
2. SHA-256 hash the resulting bytes
3. Create a CIDv1 with raw codec (`0x55`) and the SHA-256 multihash
4. Encode as base32lower
5. Prefix with `did:artifact:`

### When does it change?

Any modification to `plugin.json` — adding/removing operations, changing schemas, updating metadata — produces a different canonical form and therefore a different hash. When you update `plugin.json`, you **must** recompute and update the `artifactDid` in both `registry-entry.json` and any deployment configs that reference it.

### Deployment config usage

When writing the Credential Adapter deployment config JSON (the file in the
adapter `config/` folder), include the `artifactDid` in the `plugin` section:

```json
{
  "plugin": {
    "pluginDid": "did:web:wivity.com:plugins:github-mcp-server",
    "artifactDid": "did:artifact:bafkreic3bb3zcnsxqtdmf4xzm77qluxv6extrf263nuasoojuhoxpb23re"
  }
}
```

## Specifications

Applications conform to the MPAS protocol:

- [MPAS Core Specification](https://github.com/oma3dao/mpas/blob/main/specs/mpas-specification.md)
- [Application Plugin Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-application-plugin.md)
- [MCP Execution Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-mcp.md)
- [MCP Proposer Bridge Client Interface Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-mcp-proposer-bridge-client.md)

## Related Repositories

| Repository | Description |
| --- | --- |
| [oma3dao/mpas](https://github.com/oma3dao/mpas) | MPAS specifications, SDK, bridge generator, reference implementation, and conformance model |

## License and participation

Software and other contributions to this repository are licensed under the
[Apache License 2.0](LICENSE).

By submitting material for inclusion in this repository, contributors agree
that it may be distributed under the Apache License 2.0.

Final OMA3 Specifications are separately governed by
[OMA3's Intellectual Property Rights Policy](https://www.oma3.org/intellectual-property-rights-policy)
and applicable OMA3 review and approval processes.
