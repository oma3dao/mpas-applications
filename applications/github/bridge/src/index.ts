/**
 * GitHub MPAS Bridge Server
 *
 * A drop-in replacement MCP server for the official GitHub MCP server.
 * All tool calls are routed through the MPAS Credential Adapter on localhost.
 *
 * Flow:
 * 1. Agent calls a tool on this bridge.
 * 2. Bridge constructs an Action Package and sends it to the Credential Adapter.
 * 3. Credential Adapter evaluates policy:
 *    - If auto-approved: dispatches to the upstream GitHub MCP server, returns result.
 *    - If approvals needed: returns "additionalApprovalsRequired".
 * 4. If approvals needed, bridge submits to the Coordination Service and waits.
 * 5. Once approvals are collected, bridge resubmits with the completed approval bundle.
 * 6. Bridge returns the result to the agent.
 *
 * Upstream: ghcr.io/github/github-mcp-server:v1.5.0
 */

export { GitHubMpasBridge, type GitHubMpasBridgeConfig } from "./bridge.js";
export { AdapterClient } from "./adapter/client.js";
export { CoordinationClient } from "./coordination/client.js";
export { ActionPackageBuilder, type KeyFile } from "./core/action-package-builder.js";
export { classifyTool, isHighImpact, loadToolsSnapshot } from "./core/tools-registry.js";
export type { ToolDefinition, ActionPackage, ActionResponse, Did } from "./core/types.js";
