# Changelog — alpaca

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
