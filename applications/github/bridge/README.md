# GitHub MPAS Bridge

A drop-in replacement MCP server for the [official GitHub MCP server](https://github.com/github/github-mcp-server) that routes all actions through the [MPAS protocol](https://github.com/oma3dao/mpas).

## How it works

```
Agent
  → GitHub MPAS Bridge (this server)
  → MPAS Credential Adapter (localhost:7544)
  → Official GitHub MCP Server (ghcr.io/github/github-mcp-server:v1.5.0)
  → github.com APIs
```

From the agent's perspective, this bridge looks identical to the GitHub MCP server. The difference is that all 51 tool calls are routed through MPAS:

- **Low-impact tools** (reads, searches, lists): routed through the adapter, typically auto-approved by policy.
- **High-impact tools** (merges, deletes, creates, pushes): routed through the adapter, which may require additional approvals based on operator policy.

## Upstream Version

Pinned to `ghcr.io/github/github-mcp-server:v1.5.0` (51 tools across all toolsets).

## Prerequisites

1. The MPAS Credential Adapter daemon running on localhost (from `oma3/mpas/examples/demo`)
2. The MPAS Coordination Service running on localhost (for approval workflows)
3. A deployment configuration for this application loaded into the adapter
4. An agent key file for signing action proposals
5. Node.js ≥ 22

## Setup

```bash
npm install
npm run build
```

## Usage

```typescript
import { GitHubMpasBridge } from "@wivity/mpas-github-bridge";

const bridge = new GitHubMpasBridge({
  applicationDid: "did:web:wivity.com:apps:github",
  adapterUrl: "http://127.0.0.1:7544",
  agentKeyPath: "/path/to/agent-key.json",
  coordinationUrl: "http://127.0.0.1:7545",
  approvalStrategy: "wait",
  approvalTimeoutMs: 60_000,
});

await bridge.initialize();

// Tool calls behave exactly like the upstream MCP server
const result = await bridge.handleToolCall("create_issue", {
  owner: "my-org",
  repo: "my-repo",
  title: "New issue via MPAS",
});
```

## Tool Classification

| Classification | Count | Examples |
|:---------------|:------|:--------|
| high_impact | 20 | merge_pull_request, delete_file, push_files, create_repository |
| low_impact | 31 | get_file_contents, list_issues, search_code, get_me |

All 20 high-impact tools are declared as operations in `plugin.json`, giving operators visibility into which actions are candidates for approval policy.

## Testing

```bash
npm test
```

Tests verify:
- Tool list compatibility with the upstream snapshot
- Correct impact classification
- Action Package construction and signing
- Plugin operation coverage
- Approval interception routing

## Architecture

```
src/
  index.ts              — Exports
  bridge.ts             — Main bridge (tool routing, approval flow)
  adapter/
    client.ts           — Credential Adapter HTTP client
  coordination/
    client.ts           — Coordination Service HTTP client
  core/
    types.ts            — MPAS protocol types
    action-package-builder.ts — Builds and signs Action Packages
    tools-registry.ts   — Tool definitions and classifications
```

## Related Files

- `../plugin.json` — MPAS Application Plugin (loaded by the Credential Adapter)
- `../registry-entry.json` — OMA3 application registry entry
- `../build-artifacts/` — Tool discovery snapshot and classification
