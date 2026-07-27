# mpas-applications

MPAS application plugins, bridges, and the builder tool that generates them.

This repository contains both the toolchain for generating MPAS-compatible bridges from existing MCP servers and the generated application artifacts themselves.

## Structure

```
mpas-applications/
  README.md
  ROADMAP.md
  LICENSE

  tool/                          # The bridge builder toolchain
    package.json
    src/
      discovery/
      classification/
      plugin-generator/
      registry-entry-generator/
      bridge-generator/
      test-harness/
    templates/
      bridge-typescript/
      plugin/
      test-suite/

  docs/                          # Project history and feature plans
    features/
      v1-bridge-builder/
        plan.md                  # v1 product plan and architecture

  applications/                  # Generated and contributed applications
    github/
      plugin.json
      descriptor.md
      discovery/
        tools-list.snapshot.json
        metadata.json
      bridge/
        package.json
        src/
        tests/
      classification.json
    slack/
      ...
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full list of planned, in-progress, and completed applications. To request a new application or volunteer to build one, open a PR updating the roadmap.

## How Applications Are Created

The `tool/` directory contains the bridge builder, which:

1. Connects to an upstream MCP server and discovers its tools.
2. Classifies tools by risk level (read, low-write, high-impact, admin).
3. Generates an MPAS Application Plugin and bridge server.
4. Generates compatibility and approval tests.
5. Writes the output to `applications/<name>/` for human review.

You can also build an application manually following the same folder structure.

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
// did:artifact:bafkreigl7euurvkc2neqcqfaqs7niw27rmp4z3blgbcbm4rojuzlabh2je
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
    "pluginDid": "did:web:wivity.com:plugins:github",
    "artifactDid": "did:artifact:bafkreigl7euurvkc2neqcqfaqs7niw27rmp4z3blgbcbm4rojuzlabh2je"
  }
}
```

## Specifications

Applications conform to the MPAS protocol:

- [mpas-specification.md](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-specification.md) — Core protocol
- [mpas-profile-application-plugin.md](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-profile-application-plugin.md) — Application Plugin Profile
- [mpas-profile-mcp.md](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-profile-mcp.md) — MCP Profile

## Related Repositories

| Repository | Description |
| --- | --- |
| [oma3dao/mpas-docs](https://github.com/oma3dao/mpas-docs) | MPAS specification documents |
| [oma3dao/mpas-sdk](https://github.com/oma3dao/mpas-sdk) | SDK packages including the MCP Bridge |
| [wivity/mpas-tools](https://github.com/wivity/mpas-tools) | Other MPAS tooling |

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
