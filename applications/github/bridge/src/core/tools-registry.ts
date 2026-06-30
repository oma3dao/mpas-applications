/**
 * GitHub MCP Server tools registry.
 * Contains the full list of tools from the upstream server (v1.5.0)
 * and their impact classifications.
 */

import type { ImpactClassification, ToolDefinition } from "./types.js";

// Load the snapshot at build time. At runtime, the bridge uses this to mirror tools.
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ToolWithClassification extends ToolDefinition {
  classification: ImpactClassification;
}

/**
 * High-impact tool names. All other tools are low-impact.
 */
const HIGH_IMPACT_TOOLS = new Set([
  "add_issue_comment",
  "add_pull_request_review_comment_to_pending_review",
  "assign_copilot_to_issue",
  "create_and_submit_pull_request_review",
  "create_branch",
  "create_issue",
  "create_or_update_file",
  "create_pending_pull_request_review",
  "create_pull_request",
  "create_repository",
  "delete_file",
  "delete_pending_pull_request_review",
  "fork_repository",
  "merge_pull_request",
  "push_files",
  "request_copilot_review",
  "submit_pending_pull_request_review",
  "update_issue",
  "update_pull_request",
  "update_pull_request_branch",
]);

export function classifyTool(toolName: string): ImpactClassification {
  return HIGH_IMPACT_TOOLS.has(toolName) ? "high_impact" : "low_impact";
}

export function isHighImpact(toolName: string): boolean {
  return HIGH_IMPACT_TOOLS.has(toolName);
}

export async function loadToolsSnapshot(): Promise<ToolDefinition[]> {
  const snapshotPath = join(__dirname, "..", "..", "..", "build-artifacts", "tools-list.snapshot.json");
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  return snapshot.tools as ToolDefinition[];
}
