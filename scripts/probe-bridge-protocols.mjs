#!/usr/bin/env node

import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const WAIT_TOOL = "mpas_wait_for_action_result";

async function main() {
  const appDirArgument = process.argv[2];

  if (!appDirArgument) {
    throw new Error("Usage: node scripts/probe-bridge-protocols.mjs applications/<name>");
  }

  const appDir = resolve(appDirArgument);
  const bridgePath = join(appDir, "bridge", "dist", "index.js");
  const tempDir = await mkdtemp(join(tmpdir(), `mpas-${basename(appDir)}-protocol-probe-`));

  try {
    const keyPath = join(tempDir, "proposer.json");
    const configPath = join(tempDir, "bridge-config.json");
    const { privateKey } = generateKeyPairSync("ed25519");
    await writeFile(keyPath, `${JSON.stringify(privateKey.export({ format: "jwk" }))}\n`, { mode: 0o600 });
    await writeFile(
      configPath,
      `${JSON.stringify({
        mode: "proposer",
        plugin: join(appDir, "plugin.json"),
        adapter: { url: "http://127.0.0.1:1" },
        agent: { keyFile: keyPath },
        workflow: {},
      })}\n`,
    );

    const tasks = new JsonRpcStdioClient(bridgePath, configPath);
    const compatibility = new JsonRpcStdioClient(bridgePath, configPath);
    try {
      const discovery = await tasks.request("server/discover");
      assert(discovery.supportedVersions?.includes("2026-07-28"), "Tasks discovery did not advertise MCP 2026-07-28");
      assert(discovery.capabilities?.extensions?.["io.modelcontextprotocol/tasks"], "Tasks extension is missing");
      assert(discovery.capabilities?.extensions?.["org.oma3/mpas"], "MPAS profile extension is missing");

      const tasksTools = toolNames(await tasks.request("tools/list"));
      assert(!tasksTools.includes(WAIT_TOOL), "Tasks surface unexpectedly contains the compatibility wait tool");

      const initialized = await compatibility.request("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "mpas-compatibility-probe", version: "1.0.0" },
      });
      assert(initialized.protocolVersion === "2024-11-05", "Compatibility initialization negotiated an unexpected version");
      compatibility.notify("notifications/initialized");

      const compatibilityTools = toolNames(await compatibility.request("tools/list"));
      assert(compatibilityTools.filter((name) => name === WAIT_TOOL).length === 1, "Compatibility surface must contain exactly one wait tool");
      assert(
        JSON.stringify(compatibilityTools.filter((name) => name !== WAIT_TOOL)) === JSON.stringify(tasksTools),
        "Application tool names differ between protocol surfaces",
      );

      process.stdout.write(
        `${JSON.stringify({
          application: basename(appDir),
          tasks: { protocolVersion: "2026-07-28", toolCount: tasksTools.length, waitTool: false },
          compatibility: { protocolVersion: initialized.protocolVersion, toolCount: compatibilityTools.length, waitTool: true },
        })}\n`,
      );
    } finally {
      await Promise.all([tasks.close(), compatibility.close()]);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function toolNames(result) {
  assert(Array.isArray(result.tools), "tools/list did not return a tools array");
  return result.tools.map((tool) => tool.name);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class JsonRpcStdioClient {
  #child;
  #nextId = 1;
  #pending = new Map();
  #buffer = "";

  constructor(bridgePath, configPath) {
    this.#child = spawn(process.execPath, [bridgePath, "--config", configPath], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    this.#child.stdout.setEncoding("utf8");
    this.#child.stdout.on("data", (chunk) => this.#onData(chunk));
    this.#child.on("exit", (code, signal) => {
      const error = new Error(`Bridge exited before the probe completed (code=${code}, signal=${signal})`);
      for (const pending of this.#pending.values()) pending.reject(error);
      this.#pending.clear();
    });
  }

  request(method, params) {
    const id = this.#nextId++;
    const message = { jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) };
    this.#child.stdin.write(`${JSON.stringify(message)}\n`);
    return new Promise((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        rejectPromise(new Error(`Timed out waiting for ${method}`));
      }, 10_000);
      this.#pending.set(id, {
        resolve(value) {
          clearTimeout(timeout);
          resolvePromise(value);
        },
        reject(error) {
          clearTimeout(timeout);
          rejectPromise(error);
        },
      });
    });
  }

  notify(method, params) {
    this.#child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, ...(params === undefined ? {} : { params }) })}\n`);
  }

  async close() {
    if (this.#child.exitCode !== null) return;
    this.#child.kill("SIGTERM");
    await new Promise((resolvePromise) => this.#child.once("exit", resolvePromise));
  }

  #onData(chunk) {
    this.#buffer += chunk;
    while (true) {
      const newline = this.#buffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.#buffer.slice(0, newline).trim();
      this.#buffer = this.#buffer.slice(newline + 1);
      if (!line) continue;
      const response = JSON.parse(line);
      if (response.id === undefined) continue;
      const pending = this.#pending.get(response.id);
      if (!pending) continue;
      this.#pending.delete(response.id);
      if (response.error) pending.reject(Object.assign(new Error(response.error.message), response.error));
      else pending.resolve(response.result);
    }
  }
}

await main();
