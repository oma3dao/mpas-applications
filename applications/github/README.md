# GitHub MPAS Application

MPAS-protected GitHub repository management via the official [GitHub MCP Server](https://github.com/github/github-mcp-server).

## Overview

This application wraps the upstream GitHub MCP server (v1.5.0, 51 tools) with an MPAS bridge that intercepts high-impact operations for approval before forwarding them upstream. 20 tools are classified as high-impact and routed through the MPAS protocol; 31 low-impact tools pass through directly.

## Files

| File | Purpose |
| --- | --- |
| `registry-entry.json` | OMA3 registry entry (DIDs, upstream ref, status) |
| `plugin.json` | MPAS Application Plugin — operations and policy suggestions |
| `bridge/` | TypeScript bridge server |
| `CHANGELOG.md` | Version history |

## Artifact DID

The `artifactDid` in `registry-entry.json` is a content-addressable identifier derived from `plugin.json`. The MPAS Credential Adapter validates this hash at startup.

**Current value:**

```
did:artifact:bafkreigl7euurvkc2neqcqfaqs7niw27rmp4z3blgbcbm4rojuzlabh2je
```

For how to compute and maintain this value, see the [top-level README](../../README.md#artifact-did) and the [did:artifact Method Spec](https://oma3dao.github.io/omatrust-docs/specification/did-artifact-method-spec.html).

## Status

Beta — see [CHANGELOG.md](CHANGELOG.md) for version history.
