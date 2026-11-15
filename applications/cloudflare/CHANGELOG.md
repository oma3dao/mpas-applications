# Changelog — Cloudflare

## Design hardening — 2026-11-15

- Validate all selected path parameters in plugin schemas.
- Reject direct uploads in plugin and policy; preserve Git deployment inputs.
- Permit explicit plaintext environment variables and null deletion; deny secret
  writes in the plugin. Document the exact-pointer policy engine's arbitrary-key
  rejection limitation rather than inventing wildcard policy semantics.
- Move input restrictions out of transport; retain credential-side output filtering.
- Preserve safe truncation warnings and compare live selected tool contracts.
- Document external code-review assumptions, deliberate overrides and limitations.
- Preserve the original hosted capture and signer-group decisions.

## 0.1.0 — 2026-11-14

- Select 26 unchanged tool definitions from the operator's 3,042-tool official
  hosted `codemode=false` capture; verify full source and selected surface hashes.
- Govern all 21 captured DNS types at critical impact, including NS; normalize
  composed plugin schemas while preserving the original exposed tool schemas.
- Open account/zone-scoped reads; omit default hostname, record-ID and project pins.
- Trust Muse/Grok proposer signatures for writes; other proposers need independent
  approval. Deny pass-through and reject generic execute and omitted token tools.
- Add credential-side Pages result projection and server-secret/build-command
  rejection, plus offline policy/schema and mock stdio integration regressions.
- Test policy boundaries, composed-schema handling and omitted-tool rejection
  in Tasks and compatibility modes. No provider resource changes or installation.
