# Changelog — Coinbase

## 2026-07-31 — Completed the impact classification

- Reviewed all 13 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 5 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 8 pass-through operations, tagged by
  reason (read-public 3, read 2, metadata-only 1, routine-job 1, precursor 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

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
