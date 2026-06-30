# MPAS Bridge and Application Builder

## Purpose

This document describes a toolchain for generating MPAS-compatible bridge servers, application plugins, and registry entries from existing MCP servers.

The goal is to scale MPAS adoption by turning existing MCP servers into MPAS-aware drop-in replacements.

---

## Core Idea

For each MCP server, this tool should be able to:

1. Start or connect to the existing upstream MCP server.
2. Call MCP tool discovery.
3. Capture the upstream tool list and tool schemas.
4. Classify tools as low-impact or high-impact.
5. Generate an MPAS Application Plugin for use by the Credential Adapter.
6. Generate an MPAS bridge server that acts as a drop-in replacement for that MCP server.
7. Generate tests proving that the MPAS bridge exposes compatible tools.
8. Generate approval-interception tests for high-impact actions.
9. Generate a Registry Entry for submission to the OMA3 application registry.
10. Write output to `applications/<name>/` for human review.

The bridge is not a universal MPAS server. Each bridge is an application-specific drop-in replacement for an existing MCP server.

Example:

```text
Agent
  -> GitHub MPAS Bridge
  -> Official GitHub MCP Server
  -> github.com APIs
```

From the agent's perspective, the bridge should look like the GitHub MCP server. The difference is that all actions are routed through the MPAS protocol.

---

## Terminology

### Upstream MCP Server

The existing MCP server that already exposes tools for an application.

Examples:

- Official GitHub MCP server
- Slack MCP server
- Jira MCP server
- Linear MCP server
- Kubernetes MCP server

### MPAS Bridge Server

A drop-in replacement MCP server that exposes the same or compatible tools as the upstream MCP server, but routes all actions through the MPAS protocol.

The bridge flow:

1. Agent calls a tool on the bridge.
2. Bridge constructs an Action Package and sends it to the Credential Adapter (localhost).
3. Credential Adapter evaluates policy:
   - If auto-approved: dispatches to the upstream server and returns the result.
   - If approvals needed: returns to the bridge that additional approvals are required.
4. Bridge submits the pending action to the Coordination Service (localhost).
5. Coordination Service solicits approvals from configured approvers.
6. Once sufficient approvals are collected, Coordination Service returns them to the bridge.
7. Bridge constructs a new Action Package with the approvals and resubmits to the Credential Adapter.
8. Credential Adapter verifies the approvals meet policy, then dispatches to the upstream server.
9. Bridge returns the result to the agent.

Generated bridges should follow the same format as the reference implementation in [`oma3/mpas/examples/demo`](https://github.com/oma3dao/mpas/tree/main/examples/demo). That bridge server does everything MPAS requires.

### Application Plugin

A JSON document conforming to the [MPAS Application Plugin Profile](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-profile-application-plugin.md). This is the primary machine-readable artifact that the Credential Adapter loads at startup.

It declares:

- operations (what the application can do)
- payload schemas (JSON Schema for each operation's input)
- credential requirements (what auth the adapter needs to reach the target)
- policy suggestions (advisory hints for the deployer)

The plugin is immutable once published. Its integrity is verified via `artifactDid` (a content-addressable identifier).

All high-impact tool names appear as operations in the plugin, giving operators visibility into which actions are candidates for approval policy. The plugin does not set policy — that is the operator's responsibility via deployment configuration.

### Registry Entry

A JSON file submitted to the [OMA3 application registry](https://github.com/oma3dao/mpas/tree/main/application-registry). Each entry describes one MPAS-compatible implementation — a bridge, native MCP server, or native application — that users can install to get MPAS protection for a particular application.

The entry identifies the application, the upstream being wrapped (for bridges), where to find the plugin, and who publishes it. The registry is a discovery and identity document; runtime configuration belongs in the implementation's own repository.

The schema (v1) is defined in the [application registry README](https://github.com/oma3dao/mpas/blob/main/application-registry/README.md). File naming follows `{application}-{publisher-org}.json`.

### Deployment Policy

The local operator-specific policy that defines approvers, keys, thresholds, protected resources, and policy-engine behavior.

This tool should not assume one mandatory MPAS policy language. Enterprises may use their own policy engines.

---

## Generated Outputs

The tool generates two distinct JSON artifacts per application:

| Artifact            | Purpose                                                            | Target                                    | Schema                                                                                                                                           |
| :------------------ | :----------------------------------------------------------------- | :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| Application Plugin  | Loaded by the Credential Adapter to validate and dispatch actions   | `applications/<name>/plugin.json`         | [MPAS Application Plugin Profile](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-profile-application-plugin.md)               |
| Registry Entry      | Submitted as a PR to the OMA3 application registry                 | `applications/<name>/registry-entry.json` | [OMA3 application registry schema v1](https://github.com/oma3dao/mpas/blob/main/application-registry/README.md)                                  |

These serve different audiences:

- The **plugin** is for operators running MPAS infrastructure. It's the contract between the bridge and the Credential Adapter.
- The **registry entry** is for the ecosystem. It makes the application discoverable and documents available implementations.

---

## Builder Toolchain

The builder generates applications listed in [ROADMAP.md](../../ROADMAP.md). The roadmap is a list of future bridges that will be built. Each completed application gets its own folder in `applications/` at the repository root, alongside `tool/`, in accordance with the [root README](../../README.md).

### 1. MCP Server Intake

The tool should accept an upstream MCP server configuration.

Inputs may include:

```json
{
  "application": "GitHub",
  "upstream": {
    "command": "github-mcp-server",
    "args": ["stdio"],
    "env": {
      "GITHUB_TOOLSETS": "all"
    }
  }
}
```

The tool should also support package-based or remote MCP server configurations later.

---

### 2. Tool Discovery

The builder starts the upstream MCP server and calls MCP discovery.

It should capture:

- tool names
- tool descriptions
- input schemas
- output schemas, if available
- annotations, if available
- server metadata
- upstream version information, where available

Output should be written to a discovery snapshot in the `build-artifacts/` folder of the application output. The snapshot captures what the upstream exposes at a point in time, enabling detection of upstream changes when the MCP server is updated.

---

### 3. Risk Classification

The builder should classify tools into two categories:

```text
low_impact
high_impact
```

When in doubt, classify as high-impact.

High-impact tools are operations that the operator may want to set approval policy for. All high-impact tool names become operations in the generated plugin so that operators can see them and decide whether to require approval under their own policy. The tool does not set or enforce policy — it surfaces the operations that are likely candidates for policy.

The classifier should use:

- tool name
- tool description
- argument schema
- known action verbs
- application type

Examples of high-impact verbs:

- delete
- merge
- deploy
- transfer
- publish
- invite
- remove
- rotate
- revoke
- approve
- modify_permissions
- create_release
- trigger_workflow

The output (`build-artifacts/classification.json`) is a draft mapping each tool to its classification. Human review is required before the plugin is finalized.

---

### 4. Application Plugin Generation

The builder should generate an Application Plugin conforming to the [MPAS Application Plugin Profile](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-profile-application-plugin.md).

Example output path:

```text
applications/github/plugin.json
```

The plugin must include:

- `pluginDid` — unique identity of this plugin
- `pluginVersion` — semver version
- `applicationDid` — the application this plugin describes
- `executionProfile` — how execution payloads are formatted (e.g., `mcp.toolsCall`)
- `credentialRequirements` — what credential the adapter needs
- `operations` — array of operations with name, description, and JSON Schema for the payload

Every tool classified as high-impact must appear as an operation in the plugin. This gives operators visibility into which actions are candidates for approval policy.

The generated plugin should validate against the Application Plugin Profile JSON Schema.

---

### 5. Bridge Scaffold Generation

The builder should generate a server-specific MPAS bridge following the same format as [`oma3/mpas/examples/demo`](https://github.com/oma3dao/mpas/tree/main/examples/demo).

The bridge is TypeScript, matching the reference implementation.

Example output path:

```text
applications/github/bridge/
  README.md
  package.json
  tsconfig.json
  src/
    index.ts
    adapter/
    coordination/
    core/
  tests/
    tools-list.compat.test.ts
    approval-interception.test.ts
```

The generated bridge should:

- start or connect to the upstream MCP server
- mirror upstream tools
- preserve tool names where possible
- preserve input schemas where possible
- route all actions through the Credential Adapter
- produce audit logs (the `examples/demo` has good logging for verifying the protocol is working correctly)

The bridge should pin a specific version of the upstream MCP server to ensure reproducibility. When the upstream server releases a new version, the bridge can be regenerated.

---

### 6. Compatibility Test Harness

The test harness should compare the upstream server and generated bridge.

It should verify:

- same tool names, unless intentionally renamed
- same input schemas, unless intentionally wrapped
- same descriptions, unless intentionally modified
- no accidental tool omissions
- high-impact tools are still visible to the agent
- high-impact tools are routed through the Credential Adapter

For MCP drop-in replacement behavior, tool compatibility is critical.

---

### 7. Approval Test Harness

The approval test harness should simulate MPAS approval flows. The tests in [`oma3/mpas/examples/demo/tests`](https://github.com/oma3dao/mpas/tree/main/examples/demo/tests) are a good reference.

Test cases:

```text
action with auto-approve policy:
  adapter approves immediately, bridge returns result

high-impact action without approval:
  adapter requires approval, bridge waits or returns pending

high-impact action with insufficient approval:
  adapter blocks

high-impact action with valid approval receipt:
  adapter dispatches to upstream, bridge returns result
```

---

### 8. Audit Logging

Generated bridges should log:

- request ID
- application
- tool name
- argument hash
- action classification
- approval requirement
- approval receipt hash, if any
- execution result
- timestamp

The `examples/demo` includes detailed protocol logging that verifies correct behavior end-to-end. Generated bridges should include similar logging.

Logs should avoid storing secrets or sensitive payloads unless explicitly configured.

---

### 9. Registry Entry Generation

After the bridge and plugin are generated and tested, the builder should generate a registry entry conforming to the [OMA3 application registry schema (v1)](https://github.com/oma3dao/mpas/blob/main/application-registry/README.md).

This is one of the last steps because it references the plugin and implementation that were just built.

Example output path:

```text
applications/github/registry-entry.json
```

The generated entry follows the schema defined in the application registry README:

```json
{
  "version":     "1",
  "application": {
    "name":           "GitHub",
    "description":    "MPAS-protected GitHub repository management via the official GitHub MCP server.",
    "applicationDid": "did:web:github.example",
    "website":        "https://github.com"
  },
  "native":   false,
  "protocol": "mcp",
  "upstream": {
    "name":       "Official GitHub MCP Server",
    "repository": "https://github.com/github/github-mcp-server",
    "package":    "ghcr.io/github/github-mcp-server"
  },
  "plugin": {
    "repository": "https://github.com/wivity/mpas-applications/blob/main/applications/github/plugin.json"
  },
  "publisher": {
    "name":       "Wivity",
    "githubOrg":  "wivity",
    "repository": "https://github.com/wivity/mpas-applications"
  },
  "status": "beta"
}
```

For bridges generated by this tool:

- `native` is always `false` (the tool generates bridges, not native integrations)
- `protocol` is always `"mcp"` (the tool wraps MCP servers)
- `status` is always `"beta"` for newly generated entries

The remaining fields (`application`, `upstream`, `plugin`, `publisher`) are populated from the intake configuration and the generated artifacts.

The generated entry targets `oma3/mpas/application-registry/{application}-{publisher-org}.json` and can be submitted as a PR to the OMA3 repo.

---

### 10. Output

The builder writes all generated artifacts to `applications/<name>/` at the repository root (alongside `tool/`).

Each application folder contains:

```text
applications/github/
  plugin.json
  registry-entry.json
  build-artifacts/
    tools-list.snapshot.json
    metadata.json
    classification.json
  bridge/
    README.md
    package.json
    tsconfig.json
    src/
    tests/
  CHANGELOG.md
```

---

## Repository Layout

```text
mpas-applications/
  README.md
  ROADMAP.md
  LICENSE

  docs/
    features/
      v1-bridge-builder/
        plan.md                  (this file)

  tool/
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

  applications/
    github/
      plugin.json
      registry-entry.json
      build-artifacts/
      bridge/
    slack/
      ...
```

The `tool/` directory is the builder. The `applications/` directory is the output. Both live at the repository root. `docs/features/` tracks the evolution of the project across versions.

---

## MVP

The first MVP should target one upstream MCP server.

Recommended target:

```text
Official GitHub MCP server
```

MVP deliverables:

```text
1. Run official GitHub MCP server locally.
2. Capture tools/list snapshot.
3. Classify tools as low-impact or high-impact.
4. Generate GitHub Application Plugin draft.
5. Generate GitHub MPAS bridge scaffold (TypeScript, matching examples/demo).
6. Verify bridge exposes compatible tool list.
7. All actions route through the Credential Adapter.
8. Produce audit logs verifying protocol correctness.
9. Generate GitHub Registry Entry.
10. Write output to applications/github/.
```

Do not attempt full autonomous bridge generation before the builder and test harness work for GitHub.

---

## Long-Term Roadmap

### Phase 1: Manual Builder

Human runs the builder against one MCP server.

### Phase 2: Semi-Automated Bridge Generation

Builder generates most of the bridge, and a developer completes missing parts.

### Phase 3: Risk Classification Assistant

Agent helps classify high-impact actions and required context.

### Phase 4: Compatibility Test Automation

Bridge must pass tool compatibility tests against the upstream MCP server.

### Phase 5: OMA3 Registry Integration

Generated registry entries produce PRs to `oma3/mpas/application-registry/`.

### Phase 6: Conformance and Certification

When OMA3 conformance tests exist, bridge generation includes certification pre-checks.

---

## Open Questions

1. Should bridge scaffolds preserve upstream tool descriptions exactly, or summarize them?
2. How should the bridge handle upstream MCP server version upgrades? (Current approach: pin a version, regenerate when needed.)
3. What level of review is required before merging a generated bridge? (Could be human, agent, or security auditor — up to the developer.)
