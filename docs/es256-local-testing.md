# ES256 local SDK validation and cutover

Validated 2026-09-09 on branch `feat/es256` against an unpublished sibling
`@oma3/mpas@0.1.0-alpha.13` via npm `file:` links. Registry cutover ran
2026-09-12 after `@oma3/mpas@0.1.0-alpha.13` was published. `latest` remains
`0.1.0-alpha.12`.

## Current install

Bridges depend on the exact published package:

```sh
npm install --save-exact @oma3/mpas@0.1.0-alpha.13
```

`scripts/validate-applications.py` `DEFAULT_MPAS_SDK_VERSION` is
`0.1.0-alpha.13`. After a clean `npm ci` in each bridge,
`node_modules/@oma3/mpas` must resolve from the registry, not a local
`file:` path or symlink into `mpas/sdk/protocol`.

`scripts/link-local-sdk.mjs` is only for an unpublished sibling candidate. Do
not rerun it against this published cutover.

## Reproduce registry validation

```sh
cd mpas-applications
for bridge in applications/*/bridge; do
  npm ci --prefix "$bridge" --no-audit --no-fund
  npm run --prefix "$bridge" build
done
node scripts/probe-signature-suites.mjs
for app in applications/*; do
  node scripts/probe-bridge-protocols.mjs "$app"
done
python3 scripts/validate-applications.py
python3 scripts/test_validate_applications.py
```

Confirm every installed SDK is a registry package:

```sh
for installed in applications/*/bridge/node_modules/@oma3/mpas; do
  python3 -c "import json,os,sys; p=sys.argv[1]; print(json.load(open(p+'/package.json'))['version'], os.path.realpath(p))" "$installed"
done
```

## Earlier local-link results (2026-09-09)

- **24/24 builds passed**, including GitHub and every other linked bridge.
- **192 HTTP signature + proposal Approval pairs passed** through the actual
  built bridges: 24 applications × Ed25519/P-256 × file/JWK import × direct/relay.
  Each request verifies through that bridge's installed SDK. The probe checks
  both header algorithms, expected DID, and signed Approval payload bindings.
- Both Tasks and conventional MCP protocol probes passed for **24/24 bridges**.
- Artifact validation: **24 applications, 0 errors, 0 warnings**. Validator
  regression tests: **11 passed**. Diff whitespace checks passed.
- Every bridge now passes its existing lazy `KeyManager` to the direct
  `ActionEndpointClient`, matching the SDK generator change. Previously only
  relay and Coordination clients received it. The validator now enforces signed
  direct submission and tests that removing the signer fails validation.
- The signature probe uses a verifying in-process HTTP transport that returns
  a terminal fixture response. It does not execute upstream operations or use
  external application credentials. The existing Ed25519 fixture is preserved
  with its original DID and no JWK `alg`; P-256 keys are generated explicitly
  into temporary files and removed afterward. See [fixture provenance](../scripts/fixtures/README.md).

For the coordination server's real loopback HTTP workflow/adversarial results,
see its [validation note](../../mpas-coordination-server/docs/es256-local-testing.md).

Both suites remain verifiable; signers choose their suite. Missing JWK `alg`
is normal, while absent HTTP `alg` claims Ed25519 without altering signature-base
bytes. No existing DID is reminted and no hardware signer provider is added.
