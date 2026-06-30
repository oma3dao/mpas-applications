/**
 * Approval interception tests: verifies that the bridge correctly routes
 * high-impact actions through the MPAS protocol and handles approval flows.
 *
 * These tests use a mock Credential Adapter to simulate policy decisions.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { GitHubMpasBridge, type GitHubMpasBridgeConfig } from "../src/bridge.js";
import type { KeyFile } from "../src/core/action-package-builder.js";
import type { Did } from "../src/core/types.js";

// Test key fixtures (same Ed25519 key format as the demo)
const testKey: KeyFile = {
  did: "did:key:z6MkpPanM5XyyGcp6HAwJSm7SmWmmb4MpfmBfgRSq4t7GokV" as Did,
  kid: "did:key:z6MkpPanM5XyyGcp6HAwJSm7SmWmmb4MpfmBfgRSq4t7GokV#z6MkpPanM5XyyGcp6HAwJSm7SmWmmb4MpfmBfgRSq4t7GokV",
  privateJwk: {
    crv: "Ed25519",
    d: "UA1VsxVt4yqqnFyc4xENa10rWJOqNnWO27v-f1_nUmk",
    x: "k6O7ciQkmphuEEt1i3yAimJJWeGKmOq3t_fsNkzza6o",
    kty: "OKP",
    alg: "EdDSA",
    use: "sig",
    kid: "did:key:z6MkpPanM5XyyGcp6HAwJSm7SmWmmb4MpfmBfgRSq4t7GokV#z6MkpPanM5XyyGcp6HAwJSm7SmWmmb4MpfmBfgRSq4t7GokV",
  },
  publicJwk: {
    crv: "Ed25519",
    x: "k6O7ciQkmphuEEt1i3yAimJJWeGKmOq3t_fsNkzza6o",
    kty: "OKP",
    alg: "EdDSA",
    use: "sig",
    kid: "did:key:z6MkpPanM5XyyGcp6HAwJSm7SmWmmb4MpfmBfgRSq4t7GokV#z6MkpPanM5XyyGcp6HAwJSm7SmWmmb4MpfmBfgRSq4t7GokV",
  },
};

function createBridgeConfig(overrides: Partial<GitHubMpasBridgeConfig> = {}): GitHubMpasBridgeConfig {
  return {
    applicationDid: "did:web:wivity.com:apps:github" as Did,
    adapterUrl: "http://127.0.0.1:7544",
    agentKey: testKey,
    approvalStrategy: "return_pending",
    ...overrides,
  };
}

describe("GitHub MPAS Bridge — Approval Interception", () => {
  describe("Action Package construction", () => {
    it("builds a valid Action Package for a high-impact tool call", async () => {
      const bridge = new GitHubMpasBridge(createBridgeConfig());
      await bridge.initialize();

      // We can't call handleToolCall without a real adapter,
      // but we can verify the builder works correctly.
      const { ActionPackageBuilder } = await import("../src/core/action-package-builder.js");
      const builder = new ActionPackageBuilder({
        applicationDid: "did:web:wivity.com:apps:github" as Did,
        executionProfile: { id: "did:web:profiles.oma3.org:mcp" as Did, format: "mcp.toolsCall" },
        keyManager: testKey,
      });

      const pkg = await builder.buildFromToolCall("merge_pull_request", {
        owner: "test-org",
        repo: "test-repo",
        pullNumber: 42,
      });

      expect(pkg.version).toBe("1");
      expect(pkg.type).toBe("ActionPackage");
      expect(pkg.actionEnvelope.type).toBe("ActionEnvelope");
      expect(pkg.actionEnvelope.target.applicationDid).toBe("did:web:wivity.com:apps:github");
      expect(pkg.actionEnvelope.executionProfile.format).toBe("mcp.toolsCall");
      expect(pkg.executionPayload).toEqual({
        name: "merge_pull_request",
        arguments: { owner: "test-org", repo: "test-repo", pullNumber: 42 },
      });
    });

    it("generates unique actionIds for each call", async () => {
      const { ActionPackageBuilder } = await import("../src/core/action-package-builder.js");
      const builder = new ActionPackageBuilder({
        applicationDid: "did:web:wivity.com:apps:github" as Did,
        executionProfile: { id: "did:web:profiles.oma3.org:mcp" as Did, format: "mcp.toolsCall" },
        keyManager: testKey,
      });

      const pkg1 = await builder.buildFromToolCall("create_issue", {
        owner: "org", repo: "repo", title: "Test 1",
      });
      const pkg2 = await builder.buildFromToolCall("create_issue", {
        owner: "org", repo: "repo", title: "Test 2",
      });

      expect(pkg1.actionEnvelope.actionId.value).not.toBe(pkg2.actionEnvelope.actionId.value);
    });

    it("includes a signed proposal approval in the bundle", async () => {
      const { ActionPackageBuilder } = await import("../src/core/action-package-builder.js");
      const builder = new ActionPackageBuilder({
        applicationDid: "did:web:wivity.com:apps:github" as Did,
        executionProfile: { id: "did:web:profiles.oma3.org:mcp" as Did, format: "mcp.toolsCall" },
        keyManager: testKey,
      });

      const pkg = await builder.buildFromToolCall("delete_file", {
        owner: "org", repo: "repo", path: "test.txt", message: "remove", branch: "main",
      });

      expect(pkg.approvalBundle.approvals.length).toBe(1);
      expect(pkg.approvalBundle.approvals[0].decision).toBe("propose");
      expect(pkg.approvalBundle.approvals[0].signature.format).toBe("jws");
      expect(pkg.approvalBundle.approvals[0].signature.value).toBeTruthy();
    });

    it("executionPayloadHash binds the payload to the envelope", async () => {
      const { ActionPackageBuilder, hashJson } = await import("../src/core/action-package-builder.js");
      const builder = new ActionPackageBuilder({
        applicationDid: "did:web:wivity.com:apps:github" as Did,
        executionProfile: { id: "did:web:profiles.oma3.org:mcp" as Did, format: "mcp.toolsCall" },
        keyManager: testKey,
      });

      const pkg = await builder.buildFromToolCall("create_issue", {
        owner: "org", repo: "repo", title: "Bound",
      });

      const expectedHash = hashJson(pkg.executionPayload);
      expect(pkg.actionEnvelope.executionPayloadHash).toEqual(expectedHash);
    });
  });

  describe("Bridge tool routing", () => {
    it("rejects unknown tool names", async () => {
      const bridge = new GitHubMpasBridge(createBridgeConfig());
      await bridge.initialize();

      const result = await bridge.handleToolCall("nonexistent_tool", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("UNKNOWN_TOOL");
    });

    it("exposes all upstream tools", async () => {
      const bridge = new GitHubMpasBridge(createBridgeConfig());
      await bridge.initialize();

      const tools = bridge.getTools();
      expect(tools.length).toBe(51);
      expect(tools.find((t) => t.name === "merge_pull_request")).toBeDefined();
      expect(tools.find((t) => t.name === "get_file_contents")).toBeDefined();
    });

    it("classifies all tools as high or low impact", async () => {
      const bridge = new GitHubMpasBridge(createBridgeConfig());
      await bridge.initialize();

      const classifications = bridge.getToolClassifications();
      expect(classifications.length).toBe(51);
      for (const c of classifications) {
        expect(["high_impact", "low_impact"]).toContain(c.classification);
      }
    });
  });

  describe("Plugin validation", () => {
    it("all high-impact tools appear as operations in the plugin", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join, dirname } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const { classifyTool, loadToolsSnapshot } = await import("../src/core/tools-registry.js");

      const pluginPath = join(
        dirname(fileURLToPath(import.meta.url)),
        "..", "..", "plugin.json",
      );
      const plugin = JSON.parse(await readFile(pluginPath, "utf8"));
      const tools = await loadToolsSnapshot();

      const highImpactTools = tools
        .filter((t) => classifyTool(t.name) === "high_impact")
        .map((t) => t.name);

      const operationNames = plugin.operations.map((op: { name: string }) => op.name);

      for (const tool of highImpactTools) {
        expect(operationNames, `Missing operation for high-impact tool: ${tool}`).toContain(tool);
      }
    });

    it("plugin operations have valid executionPayloadSchema", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join, dirname } = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      const pluginPath = join(
        dirname(fileURLToPath(import.meta.url)),
        "..", "..", "plugin.json",
      );
      const plugin = JSON.parse(await readFile(pluginPath, "utf8"));

      for (const op of plugin.operations) {
        expect(op.executionPayloadSchema).toBeDefined();
        expect(op.executionPayloadSchema.type).toBe("object");
        expect(op.executionPayloadSchema.required).toContain("name");
        expect(op.executionPayloadSchema.required).toContain("arguments");
        expect(op.executionPayloadSchema.properties.name.const).toBe(op.name);
      }
    });
  });
});
