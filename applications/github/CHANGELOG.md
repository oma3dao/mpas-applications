# Changelog

## 0.1.0 (2026-06-30)

Initial release — manual GitHub MPAS bridge.

### Added

- Tool discovery snapshot from upstream `github/github-mcp-server` v1.5.0 (51 tools)
- Risk classification: 20 high-impact, 31 low-impact tools
- MPAS Application Plugin (`plugin.json`) with all high-impact tools as operations
- OMA3 registry entry (`registry-entry.json`)
- TypeScript bridge server following the `oma3/mpas/examples/demo` architecture
  - Adapter client (Credential Adapter on localhost)
  - Coordination client (Coordination Service for approval flows)
  - Action Package builder with Ed25519 signing
  - Full tool routing through MPAS protocol
- Compatibility tests verifying tool list parity with upstream
- Approval interception tests verifying Action Package construction

### Upstream

- Pinned to `ghcr.io/github/github-mcp-server:v1.5.0`
- 51 tools across all toolsets (repos, issues, pull_requests, code_security, notifications, users, copilot, secret_protection, git)
