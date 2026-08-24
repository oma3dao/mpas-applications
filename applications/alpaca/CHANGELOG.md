# Changelog — alpaca

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

- Pinned to `uvx --from alpaca-mcp-server==2.1.1`.
- **Version could not be reconciled with `serverInfo.version`.** metadata records
  3.4.5, which is the FastMCP framework version rather than the server's own —
  `x-twitter` reports the same 3.4.5 from an unrelated server. 2.1.1 is taken
  from two independent records: this changelog's own initial entry, and the
  PyPI release current at `capturedAt` (2.1.1 shipped 2026-06-24; 2.2.0 not
  until 2026-07-31, a day after capture).
- Added optional upstream discoverability pointers on `registry-entry.json`:
  `upstream.repository` (source) and `upstream.distributionUrl` (versioned
  obtain page). `application.website` is not used.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-08-02 — Normalized impact grading

- Re-graded all 12 governed operations against the README rubric, using
  `github` as the calibration reference. The plugin was 10/12 `critical`
  (83%); it is now 0 `critical`, 7 `high`, 4 `medium`, 1 `low`.
- Reserved `critical` for value crossing an account boundary. Alpaca's upstream
  surface exposes no withdrawal, transfer, or journal tool, so nothing here
  reaches that level. The absence is the finding rather than an oversight: a
  policy author can read this plugin as *an agent on this credential cannot
  move money off the venue*.
- Graded order placement, replacement, option exercise, and do-not-exercise at
  `high`. These commit capital or settle a contract — value stays in the
  account, but a fill is not recallable.
- Graded cancels and position closes **below** placement. `cancel_order_by_id`
  is now `low`; `cancel_all_orders`, `close_position`, and
  `close_all_positions` are `medium`. Cancelling is risk-reducing and
  time-sensitive, and `critical` carries a suggested approver of at least one
  human — paging a person to cancel an order during a market move is both an
  availability problem and a driver of approval fatigue. The closes stay above
  the cancels because a market order realises P&L at whatever the book offers,
  where a cancel only withdraws an instruction.
- Lowered `create_locate` from `high` to `medium`: a borrowing commitment
  bounded by the requested quantity.
- `low` here is the README's borderline signal, not a shrug. A cancel stays
  governed so an agent signer can rate-limit churn and check that a cancelled
  protective stop is replaced; what it should not do is block on a human.
- No membership change. This is grading only — the governed set is untouched.
- Updated `build-artifacts/classification.json` to match and recomputed
  `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-31 — Completed the impact classification

- Reviewed all 74 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 12 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 62 pass-through operations, tagged by
  reason (read-public 42, read 15, routine-job 5), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed watchlist operations

- Dropped the five watchlist operations, taking the plugin from 17 to 12.
  A watchlist is private, holds no funds, and is trivially reversible; no
  approver would want to review adding a symbol to one.
- Order placement, cancellation, replacement, position liquidation, option
  exercise, locates, and account configuration remain governed.

## 2026-07-31 — Impact normalization

- No membership change; the governed set was already correct, and the 57
  market-data and account reads were rightly left as pass-through.
- Lowered the five watchlist operations (`create_watchlist`,
  `update_watchlist_by_id`, `delete_watchlist_by_id`,
  `add_asset_to_watchlist_by_id`, `remove_asset_from_watchlist_by_id`) from
  medium to low. They are genuine writes, so they stay governed, but a
  watchlist is private, holds no funds, and is trivially reversible. Grading
  them alongside order placement is what produces approval fatigue.
- Left order placement, cancellation, replacement, position liquidation, and
  option exercise at critical, and `create_locate` and
  `update_account_config` at high.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-30 — Initial Alpaca bridge

- Captured all 74 tools from the official Alpaca MCP Server 2.1.1.
- Governed 17 account-mutating operations covering stock, crypto, and option
  orders; cancellations and replacements; position liquidation; option
  exercise instructions; locate requests; account configuration; and
  watchlist changes.
- Left 57 documentation, market-data, and inspection tools as pass-through.
- Configured Credential Adapter substitution for the Alpaca API key and secret,
  with paper trading enabled by default in the compatibility harness.
