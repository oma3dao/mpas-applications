#!/usr/bin/env node
// Development-only npm links. Tracked registry dependencies remain unchanged.
import { execFileSync } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sdk = await realpath(resolve(root, process.argv[2] ?? "../mpas/sdk/protocol"));
const candidate = JSON.parse(await readFile(join(sdk, "package.json"), "utf8"));
if (candidate.name !== "@oma3/mpas") throw new Error("Expected the local @oma3/mpas SDK.");
await lstat(join(sdk, "dist/index.js")); // Build the SDK before linking consumers.
let linked = 0;
for (const app of (await readdir(join(root, "applications"), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!app.isDirectory()) continue;
  const bridge = join(root, "applications", app.name, "bridge");
  let manifest;
  try { manifest = await readFile(join(bridge, "package.json"), "utf8"); }
  catch (error) { if (error.code === "ENOENT") continue; throw error; }
  if (!JSON.parse(manifest).dependencies?.["@oma3/mpas"]) continue;
  const lock = await readFile(join(bridge, "package-lock.json"), "utf8");
  const dependency = `file:${relative(bridge, sdk)}`;
  execFileSync("npm", ["install", "--no-save", "--package-lock=false", "--no-audit", "--no-fund", dependency], { cwd: bridge, stdio: "pipe" });
  if (await readFile(join(bridge, "package.json"), "utf8") !== manifest ||
      await readFile(join(bridge, "package-lock.json"), "utf8") !== lock) {
    throw new Error(`${app.name}: npm changed a tracked dependency file.`);
  }
  const installed = join(bridge, "node_modules/@oma3/mpas");
  if (!(await lstat(installed)).isSymbolicLink() || await realpath(installed) !== sdk) {
    throw new Error(`${app.name}: expected npm's symlink to the candidate SDK.`);
  }
  console.log(`${app.name}: ${dependency} -> @oma3/mpas@${candidate.version}`);
  linked++;
}
if (!linked) throw new Error("No @oma3/mpas bridge consumers found.");
console.log(`Linked ${linked} bridges; manifests and lockfiles unchanged.`);
