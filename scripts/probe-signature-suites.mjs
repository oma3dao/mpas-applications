#!/usr/bin/env node
// Probe actual built bridges through an in-process, verifying test transport.
// No upstream operation or external HTTP request is performed.
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const applications = process.argv[2] ? [resolve(process.argv[2])] :
  (await readdir(join(root, "applications"), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => join(root, "applications", entry.name)).sort();
const edFile = join(root, "scripts/fixtures/ed25519-proposer.json");
const edBytes = await readFile(edFile, "utf8");
const edKey = JSON.parse(edBytes);
const scratch = await mkdtemp(join(tmpdir(), "mpas-bridge-suites-"));
const originalFetch = globalThis.fetch;
let total = 0;
try {
  for (const app of applications) {
    const bridgeDir = join(app, "bridge");
    const { GeneratedBridge } = await import(pathToFileURL(join(bridgeDir, "dist/index.js")));
    // Resolve exactly the SDK installed for this bridge, not a script-global dependency.
    const sdk = await import(pathToFileURL(join(bridgeDir, "node_modules/@oma3/mpas/dist/index.js")));
    const candidate = JSON.parse(await readFile(join(bridgeDir, "node_modules/@oma3/mpas/package.json"), "utf8"));
    assert.equal(candidate.version, "0.1.0-alpha.13", "Probe requires the alpha.13 candidate SDK");
    assert.equal(sdk.didJwkToJwk(edKey.did).alg, undefined);
    const p256 = await sdk.generateP256Key();
    const p256File = join(scratch, `${basename(app)}-p256.json`);
    await writeFile(p256File, JSON.stringify(p256), { mode: 0o600 });
    let requests = 0;
    for (const [key, file, httpAlg, jwsAlg] of [
      [edKey, edFile, "ed25519", "EdDSA"],
      [p256, p256File, "ecdsa-p256-sha256", "ES256"],
    ]) {
      assert.equal((await sdk.KeyManager.fromFile(file)).did, key.did);
      assert.equal(sdk.KeyManager.fromJwk(key.privateJwk).did, key.did);
      for (const agentKey of [file, key.privateJwk]) {
        for (const relay of [false, true]) {
          globalThis.fetch = async (input, init) => {
            const url = new URL(input);
            assert.equal(url.origin, relay ? "https://relay.example" : "https://adapter.example");
            const body = Buffer.from(init.body);
            const verified = await sdk.verifyMpasRfc9421({ method: init.method, path: url.pathname, body, headers: init.headers, audiences: [url.origin] });
            assert.equal(verified.ok, true, "HTTP signature must verify");
            assert.equal(verified.did, key.did);
            assert.ok(init.headers["Signature-Input"].includes(`alg="${httpAlg}"`));
            const request = JSON.parse(body.toString("utf8"));
            assert.equal(request.type, relay ? "DeliveryEnvelope" : "ActionRequest");
            const pkg = relay ? request.payload.actionPackage : request.actionPackage;
            assert.equal(pkg.actionEnvelope.proposer.did, key.did);
            const approval = pkg.approvalBundle.approvals[0];
            assert.equal(JSON.parse(Buffer.from(approval.signature.value.split(".")[0], "base64url")).alg, jwsAlg);
            assert.equal(await sdk.verifyApproval(approval, key.publicJwk, key.did), true);
            requests++;
            return new Response(JSON.stringify({
              version: "1", type: "ActionResponse", verifier: { did: key.did },
              actionEnvelopeHash: sdk.computeJsonHash(pkg.actionEnvelope), result: "rejected",
              error: { code: "FIXTURE_REJECTED", message: "Local signature probe; no execution" },
            }), { status: 200, headers: { "content-type": "application/json" } });
          };
          const bridge = new GeneratedBridge({
            plugin: join(app, "plugin.json"), applicationDid: "did:web:signature-probe.example",
            adapterUrl: "https://adapter.example", agentKey,
            ...(relay ? { actionEndpoint: { url: "https://relay.example", verifierDid: key.did } } : {}),
          });
          try { await bridge.handleToolCall(bridge.getToolDefinitions()[0].name, {}); }
          finally { bridge.stop(); }
        }
      }
    }
    assert.equal(requests, 8, "Both suites must sign through file/JWK and direct/relay paths");
    total += requests;
    console.log(`${basename(app)}: Ed25519/P-256 × file/JWK × direct/relay passed (${requests} HTTP + Approval pairs)`);
  }
  assert.equal(await readFile(edFile, "utf8"), edBytes, "Existing Ed25519 fixture must remain unchanged");
  console.log(`PASS ${applications.length} bridges, ${total} authenticated requests and proposal Approvals; existing Ed25519 DID preserved.`);
} finally {
  globalThis.fetch = originalFetch;
  await rm(scratch, { recursive: true, force: true });
}
