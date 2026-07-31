# Changelog — Coinbase

## 2026-07-30 — Revalidated Coinbase Agentic Wallet implementation

- Rebuilt the generated TypeScript bridge from a clean dependency install and
  confirmed all 13 discovered Coinbase Payments MCP 2.12.1 tools are packaged.
- Verified the captured tool snapshot exactly matches the bridge tool surface
  and every governed operation exists upstream.
- Reconfirmed the governed surface: x402 payments, token sends, and trades are
  critical; OTP verification is high; and email sign-in initiation is medium.
  Marketplace discovery, wallet reads, session status, and wallet UI display
  remain pass-through.
- Recomputed the plugin content identifier and confirmed it matches
  `registry-entry.json`.

## 0.1.0 — 2026-07-27

- Captured the 13-tool surface from Coinbase Payments MCP 2.12.1.
- Kept paid x402 requests, token sends, token trades, and authentication changes governed.
- Classified x402 payments, sends, and trades as critical because they move funds.
- Classified OTP verification as high and email sign-in initiation as medium.
- Reviewed marketplace discovery, wallet reads, session status, and wallet UI display as pass-through operations.
- Added Wivity application, plugin, publisher, and credential metadata.
