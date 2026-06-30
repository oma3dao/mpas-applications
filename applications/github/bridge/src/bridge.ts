/**
 * GitHubMpasBridge — the core bridge that mirrors upstream GitHub MCP tools
 * and routes all calls through the MPAS protocol.
 */

import { readFile } from "node:fs/promises";
import { AdapterClient } from "./adapter/client.js";
import { CoordinationClient } from "./coordination/client.js";
import { ActionPackageBuilder, type KeyFile } from "./core/action-package-builder.js";
import { classifyTool, loadToolsSnapshot } from "./core/tools-registry.js";
import type { ActionPackage, ActionResponse, Did, ToolDefinition } from "./core/types.js";

export interface GitHubMpasBridgeConfig {
  /** Path to the MPAS Application Plugin JSON */
  pluginPath?: string;
  /** Pre-loaded plugin object (alternative to pluginPath) */
  plugin?: Record<string, unknown>;
  /** Application DID from the plugin */
  applicationDid: Did;
  /** URL of the Credential Adapter */
  adapterUrl: string;
  /** Path to the proposer/agent key file */
  agentKeyPath?: string;
  /** Pre-loaded key file (alternative to agentKeyPath) */
  agentKey?: KeyFile;
  /** URL of the Coordination Service */
  coordinationUrl?: string;
  /** Strategy when approvals are needed: "wait" (poll), "return_pending", or "fail" */
  approvalStrategy?: "wait" | "return_pending" | "fail";
  /** Timeout for waiting on approvals (ms) */
  approvalTimeoutMs?: number;
  /** Default resource scope for action envelopes */
  defaultResource?: string;
}

export interface ToolCallResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
}

export class GitHubMpasBridge {
  private readonly config: GitHubMpasBridgeConfig;
  private adapterClient: AdapterClient;
  private coordinationClient: CoordinationClient | undefined;
  private builder: ActionPackageBuilder | undefined;
  private tools: ToolDefinition[] | undefined;

  constructor(config: GitHubMpasBridgeConfig) {
    this.config = config;
    this.adapterClient = new AdapterClient({ url: config.adapterUrl });
    if (config.coordinationUrl) {
      this.coordinationClient = new CoordinationClient({ url: config.coordinationUrl });
    }
  }

  /** Initialize the bridge — loads keys and tool definitions. */
  async initialize(): Promise<void> {
    if (this.config.agentKey) {
      this.builder = new ActionPackageBuilder({
        applicationDid: this.config.applicationDid,
        executionProfile: { id: "did:web:profiles.oma3.org:mcp" as Did, format: "mcp.toolsCall" },
        keyManager: this.config.agentKey,
        defaultResource: this.config.defaultResource,
      });
    } else if (this.config.agentKeyPath) {
      this.builder = await ActionPackageBuilder.fromKeyFile(
        this.config.agentKeyPath,
        this.config.applicationDid,
        { id: "did:web:profiles.oma3.org:mcp" as Did, format: "mcp.toolsCall" },
      );
    }

    this.tools = await loadToolsSnapshot();
  }

  /** Return the list of tools this bridge exposes (mirrors upstream). */
  getTools(): ToolDefinition[] {
    return this.tools ?? [];
  }

  /** List tool names with their classifications. */
  getToolClassifications(): Array<{ name: string; classification: string }> {
    return (this.tools ?? []).map((t) => ({
      name: t.name,
      classification: classifyTool(t.name),
    }));
  }

  /**
   * Handle a tool call from the agent.
   * Constructs an Action Package, submits to the Credential Adapter,
   * and handles the approval flow if needed.
   */
  async handleToolCall(toolName: string, args: object): Promise<ToolCallResult> {
    if (!this.builder) {
      return this.errorResult("BRIDGE_NOT_INITIALIZED", "Bridge not initialized. Call initialize() first.");
    }

    const tool = (this.tools ?? []).find((t) => t.name === toolName);
    if (!tool) {
      return this.errorResult("UNKNOWN_TOOL", `Tool "${toolName}" is not registered in this bridge.`);
    }

    // Log the action
    const classification = classifyTool(toolName);
    this.log("tool_call", { toolName, classification, args: Object.keys(args) });

    // Build the Action Package
    const actionPackage = await this.builder.buildFromToolCall(toolName, args, this.config.defaultResource);
    this.log("action_package_built", {
      toolName,
      actionId: actionPackage.actionEnvelope.actionId.value,
    });

    // Submit to the Credential Adapter
    let response = await this.adapterClient.submit(actionPackage);
    this.log("adapter_response", {
      toolName,
      actionId: actionPackage.actionEnvelope.actionId.value,
      result: response.result,
    });

    // Handle "additionalApprovalsRequired"
    if (response.result === "additionalApprovalsRequired") {
      response = await this.handleApprovalFlow(actionPackage, response);
    }

    // Convert adapter response to MCP tool result
    return this.toToolCallResult(response, toolName);
  }

  private async handleApprovalFlow(
    actionPackage: ActionPackage,
    initialResponse: ActionResponse,
  ): Promise<ActionResponse> {
    const strategy = this.config.approvalStrategy ?? "return_pending";

    if (strategy === "fail") {
      return initialResponse;
    }

    if (strategy === "return_pending") {
      return initialResponse;
    }

    // strategy === "wait" — submit to Coordination Service and poll
    if (!this.coordinationClient) {
      return initialResponse;
    }

    const actionId = actionPackage.actionEnvelope.actionId.value;
    this.log("coordination_submit", { actionId });

    await this.coordinationClient.submitAction(
      actionPackage,
      initialResponse.authorizationRequirements,
    );

    // Poll until the action is ready for resubmission or times out
    const timeoutMs = this.config.approvalTimeoutMs ?? 60_000;
    const deadline = Date.now() + timeoutMs;
    const pollIntervalMs = 500;

    while (Date.now() < deadline) {
      await sleep(pollIntervalMs);

      const pollResponse = await this.coordinationClient.poll(
        actionPackage.actionEnvelope.proposer.did,
      );

      // Check if our action has been updated (approvals collected)
      const update = pollResponse.actionUpdates.find(
        (u) => u.actionRef.actionId.value === actionId,
      );

      if (update && update.state === "readyForResubmission" && update.updatedApprovalBundle) {
        this.log("approvals_collected", { actionId });

        // Resubmit with the completed approval bundle
        const resubmitPackage: ActionPackage = {
          ...actionPackage,
          approvalBundle: update.updatedApprovalBundle as ActionPackage["approvalBundle"],
        };

        const resubmitResponse = await this.adapterClient.submit(resubmitPackage);
        this.log("resubmit_response", { actionId, result: resubmitResponse.result });
        return resubmitResponse;
      }
    }

    // Timed out waiting for approvals
    this.log("approval_timeout", { actionId, timeoutMs });
    return initialResponse;
  }

  private toToolCallResult(response: ActionResponse, toolName: string): ToolCallResult {
    if (response.result === "executed") {
      return {
        content: [{
          type: "text",
          text: JSON.stringify(response.executionResult ?? { status: "executed" }, null, 2),
        }],
      };
    }

    if (response.result === "additionalApprovalsRequired") {
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "pending_approval",
            message: `Tool "${toolName}" requires additional approvals before execution.`,
            authorizationRequirements: response.authorizationRequirements,
          }, null, 2),
        }],
      };
    }

    // rejected, failed, expired, etc.
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: response.result,
          error: response.error,
        }, null, 2),
        }],
    };
  }

  private errorResult(code: string, message: string): ToolCallResult {
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify({ error: { code, message } }) }],
    };
  }

  private log(event: string, details: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      service: "github-mpas-bridge",
      event,
      ...details,
    };
    // Audit log to stderr (structured JSON line)
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
