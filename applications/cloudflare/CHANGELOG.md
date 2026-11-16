# Changelog — Cloudflare

## Unreleased — restricted v1 release

- Restore provider-valid uploads, secret-text entries, build commands and analytics
  tokens to plugin schemas; retain path validity and composition normalization.
- Move default prohibitions exclusively into deployment configuration. Config-only
  overrides do not change the plugin artifact or transport.
- Unconditionally deny Pages creation/editing (including all environment writes)
  through released configuration syntax; keep Git deployments and plaintext reads.
- Defer collection-inspection policy, SDK/CLI updates and plugin v2. Keep alpha.15
  and all dependency versions unchanged; pin/check v1 generation.
- Refresh the artifact DID for this schema correction, not for future policy edits.
- Preserve response filtering, plaintext support, truncation notices and warning-only
  selected-tool drift diagnostics; add configuration-only override regressions.
- Earlier entries below describe superseded historical restrictions, not current
  authorization behavior.


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
