/**
 * Compatibility test: verifies that the bridge exposes the same tools
 * as the upstream GitHub MCP server (v1.5.0).
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyTool, loadToolsSnapshot } from "../src/core/tools-registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildArtifactsDir = join(__dirname, "..", "..", "build-artifacts");

describe("GitHub MCP Bridge — Tool Compatibility", () => {
  it("loads all 51 tools from the upstream snapshot", async () => {
    const tools = await loadToolsSnapshot();
    expect(tools.length).toBe(51);
  });

  it("every tool has a name, description, and inputSchema", async () => {
    const tools = await loadToolsSnapshot();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("tool names match the upstream snapshot exactly", async () => {
    const snapshot = JSON.parse(
      await readFile(join(buildArtifactsDir, "tools-list.snapshot.json"), "utf8"),
    );
    const tools = await loadToolsSnapshot();
    const bridgeNames = tools.map((t) => t.name).sort();
    const snapshotNames = snapshot.tools.map((t: { name: string }) => t.name).sort();
    expect(bridgeNames).toEqual(snapshotNames);
  });

  it("no accidental tool omissions from the snapshot", async () => {
    const snapshot = JSON.parse(
      await readFile(join(buildArtifactsDir, "tools-list.snapshot.json"), "utf8"),
    );
    const tools = await loadToolsSnapshot();
    const bridgeNameSet = new Set(tools.map((t) => t.name));
    const missing = snapshot.tools
      .map((t: { name: string }) => t.name)
      .filter((name: string) => !bridgeNameSet.has(name));
    expect(missing).toEqual([]);
  });

  it("classifies high-impact tools correctly", () => {
    const highImpactTools = [
      "merge_pull_request",
      "delete_file",
      "create_repository",
      "push_files",
      "fork_repository",
      "create_or_update_file",
      "update_issue",
      "update_pull_request",
    ];
    for (const tool of highImpactTools) {
      expect(classifyTool(tool)).toBe("high_impact");
    }
  });

  it("classifies low-impact tools correctly", () => {
    const lowImpactTools = [
      "get_file_contents",
      "get_issue",
      "get_pull_request",
      "list_issues",
      "list_pull_requests",
      "search_code",
      "search_repositories",
      "get_me",
    ];
    for (const tool of lowImpactTools) {
      expect(classifyTool(tool)).toBe("low_impact");
    }
  });

  it("high-impact tools are visible to the agent (not hidden)", async () => {
    const tools = await loadToolsSnapshot();
    const highImpactNames = tools
      .filter((t) => classifyTool(t.name) === "high_impact")
      .map((t) => t.name);

    // All high-impact tools must still be in the exposed tool list
    expect(highImpactNames.length).toBeGreaterThan(0);
    expect(highImpactNames).toContain("merge_pull_request");
    expect(highImpactNames).toContain("delete_file");
    expect(highImpactNames).toContain("push_files");
  });

  it("classification summary matches build-artifacts", async () => {
    const classification = JSON.parse(
      await readFile(join(buildArtifactsDir, "classification.json"), "utf8"),
    );
    const tools = await loadToolsSnapshot();

    let highCount = 0;
    let lowCount = 0;
    for (const tool of tools) {
      const c = classifyTool(tool.name);
      if (c === "high_impact") highCount++;
      else lowCount++;
    }

    expect(highCount).toBe(classification.summary.high_impact);
    expect(lowCount).toBe(classification.summary.low_impact);
  });
});
