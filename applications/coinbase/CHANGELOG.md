# Changelog — Coinbase

## 2026-08-23 — Added automatic conventional-client compatibility

- Updated the bridge runtime for `@oma3/mpas@0.1.0-alpha.7`. Wire-level
  detection keeps MCP Tasks primary and exposes the temporary wait-tool
  compatibility surface only after a conventional `initialize` handshake.
- Preserved the application command, tool snapshot, plugin policy, DIDs,
  workflow storage, and Credential Adapter boundary.

## 2026-08-15 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream tool definitions and added durable, DID-scoped task reads and cancellation.
- Updated the bridge runtime to `@oma3/mpas@0.1.0-alpha.6` and `@modelcontextprotocol/server@2.0.0`.

## 2026-08-02 — Pinned the upstream launch command

- Pinned to `npx -y @coinbase/payments-mcp@1.0.5`, replacing
  `node /Users/…/.payments-mcp/bundle.js`.
- **Version could not be reconciled, and this one is unresolved.** Three records
  disagree: metadata says 1.0.0, this changelog says 2.12.1, and npm has never
  published either (0.0.0, 1.0.1, 1.0.3, 1.0.4, 1.0.5). The capture ran a bundle
  installed outside any package manager, so nothing ties the snapshot to a
  published artifact. 1.0.5 removes the local path; the tool surface should be
  re-captured against it before the snapshot is relied on.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-08-02 — Normalized impact grading

- Re-graded all 5 governed operations against the README rubric, using `github`
  as the calibration reference. The plugin was 3/5 `critical` (60%); it is now
  2 `critical`, 2 `high`, 1 `medium`.
- Lowered `trade` from `critical` to `high`. It converts held value at market
  and is not recallable once broadcast, but the value stays in the wallet. That
  puts it with order placement across the segment, and below `send`, which
  moves value out.
- Kept `send` and `make_http_request_with_x402` at `critical`. Both move funds
  to a destination the call chooses, irreversibly once broadcast.
- Left `verify_email_otp` at `high` and `sign_in_with_email` at `medium`
  unchanged.
- No membership change. This is grading only — the governed set is untouched.
- Updated `build-artifacts/classification.json` to match and recomputed
  `plugin.artifactDid` in `registry-entry.json`.

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
