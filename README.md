# mpas-applications

> [!WARNING]
> **Experimental alpha.** These MPAS integrations are not production-ready or
> independently audited. Breaking changes are expected. GitHub is the only
> application currently implemented; other integrations are planned.

MPAS application plugins, bridges, and supporting artifacts contributed by
their publishers.

The protocol specifications, SDK, reference Credential Adapter, and
development-time bridge generator live in
[`oma3dao/mpas`](https://github.com/oma3dao/mpas). This repository contains
the generated and reviewed application-specific artifacts.

## Structure

```
mpas-applications/
  README.md
  ROADMAP.md
  LICENSE

  applications/                  # Contributed application artifacts
    github/
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

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full list of planned, in-progress, and completed applications. To request a new application or volunteer to build one, open a PR updating the roadmap.

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

## Artifact DID

Each application's `registry-entry.json` includes an `artifactDid` — a content-addressable identifier derived from the canonical JSON of its `plugin.json`. The MPAS Credential Adapter validates this hash at startup and rejects a mismatch.

See the full method specification: [did:artifact Method Spec](https://oma3dao.github.io/omatrust-docs/specification/did-artifact-method-spec.html)

### How to compute

**Via the OMA Trust UI (recommended):**

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
// did:artifact:bafkreihxqwuv2u7qkznavq3ca6747u23ofpxvj7x7zs6repf3z6vykk3zq
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

When writing a deployment config for the Credential Adapter, include the `artifactDid` in the `plugin` section:

```json
{
  "plugin": {
    "pluginDid": "did:web:wivity.com:plugins:github-mcp-server",
    "artifactDid": "did:artifact:bafkreihxqwuv2u7qkznavq3ca6747u23ofpxvj7x7zs6repf3z6vykk3zq"
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
