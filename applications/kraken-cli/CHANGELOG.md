# Changelog — kraken-cli

Record manual review decisions and regenerations here.

## 2026-08-02 — Normalized impact grading

- Re-graded all 30 governed operations against the README rubric, using
  `github` as the calibration reference. The plugin was 24/30 `critical`
  (80%); it is now 6 `critical`, 12 `high`, 8 `medium`, 4 `low`.
- **`kraken_withdrawal_cancel` was the clearest error.** It was graded
  `critical`, identical to `kraken_withdraw`. Cancelling a withdrawal is
  risk-*reducing* — it is the only operation in this plugin that stops funds
  leaving. Grading the brake with the accelerator inverted the ladder. It is
  now `low`.
- Reserved `critical` for value crossing an account boundary and for the one
  operation that escapes the boundary itself: `kraken_withdraw`,
  `kraken_wallet_transfer`, `kraken_subaccount_transfer`,
  `kraken_futures_transfer`, `kraken_futures_wallet_transfer`, and
  `kraken_export_retrieve`.
- Raised `kraken_export_retrieve` from `high` to `critical`. Its `output_file`
  argument is a write primitive on the filesystem of the machine running the
  Credential Adapter, which the rubric places in `critical` as a bypass of the
  governance boundary itself — the same category as
  `coinbase_advanced_trade.coinbase_set_env`.
- Kept the whole transfer family at `critical`, including the two intra-account
  futures transfers. They are the same action shape as
  `coinbase_advanced_trade.coinbase_transfer`, and the rubric requires the same
  shape to grade the same way across sibling applications.
- Graded order placement, batches, amends, and edits at `high` — spot and
  futures alike. An amend or a cancel-and-replace can raise size, so it is
  graded as placement rather than as a cancel.
- Graded cancels **below** placement. Scoped cancels are `low`
  (`kraken_order_cancel`, `kraken_order_cancel_batch`,
  `kraken_futures_cancel`, `kraken_withdrawal_cancel`); account-wide and armed
  cancels are `medium` (`kraken_order_cancel_all`, `kraken_order_cancel_after`,
  `kraken_futures_cancel_all`, `kraken_futures_cancel_after`). `critical`
  carries a suggested approver of at least one human, and paging a person to
  cancel an order during a market move is both an availability problem and a
  driver of approval fatigue. The dead man's switches stay at `medium` because
  they arm a standing rule that fires later with nobody present.
- Split the earn pair: `kraken_earn_allocate` is `high` (commits funds into a
  lock-up), `kraken_earn_deallocate` is `medium` (restores liquidity).
- Lowered `kraken_subaccount_create` from `high` to `medium`. It creates an
  empty container that holds no funds until a governed transfer puts them
  there. Graded with `coinbase_advanced_trade.coinbase_portfolios_create`, and
  below `github.create_repository`, which is externally visible and carries the
  organisation's name.
- The upstream `[DANGEROUS: requires human confirmation]` prefixes in the tool
  descriptions are Kraken's own text and are preserved verbatim. Per the README,
  an upstream danger label is a hint worth checking, never the classifier —
  it is applied to `kraken_order_cancel` and `kraken_withdraw` alike.
- No membership change. This is grading only — the governed set is untouched.
- Updated `build-artifacts/classification.json` to match and recomputed
  `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-31 — Completed the impact classification

- Reviewed all 106 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 30 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 76 pass-through operations, tagged by
  reason (read 44, read-public 21, simulated 10, metadata-only 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed export report deletion

- Dropped `kraken_export_delete`, taking the plugin from 31 operations to 30.
  It deletes a generated report, moves no funds, and touches no position.
- `kraken_export_retrieve` remains governed because it writes to a
  caller-supplied path on the Credential Adapter host.

## 2026-07-31 — Corrected the governance line from authenticated to mutating

- Reduced `plugin.json` from 75 operations to 31. The previous set governed
  every *private* Kraken endpoint and left only the public ones as
  pass-through. Removing the ten paper-trading tools, the twenty-one remaining
  drops were exactly Kraken's public API surface: `server_time`, `status`,
  `assets`, `pairs`, `ticker`, `ohlc`, the orderbook variants, `trades`,
  `spreads`, `volume`, and the futures market-data endpoints. That reproduced
  the vendor's own public/private split rather than a governance decision.
- Requiring authentication is not a reason to govern. Every tool behind the
  Credential Adapter consumes a credential — that is the precondition for the
  bridge existing. What matters is whether a credential comes *out*. The 44
  operations now pass-through are all reads that consume the API key and
  return none: `kraken_balance`, `kraken_ledgers`, `kraken_open_orders`,
  `kraken_positions`, `kraken_trades_history`, the deposit and withdrawal
  status and address lookups, and the futures history and preference getters.
- Dropped `kraken_futures_history_account_log_csv` despite the word
  "Download": it has no output path argument and simply returns data. Dropped
  `kraken_auth_show`, which masks the secret.
- Kept `kraken_export_retrieve` at high, but for the host-side effects route
  rather than as a read — it takes an `output_file` path and writes to the
  filesystem of the machine running the Credential Adapter. Every other
  dropped operation was checked for output-path, URL, and free-form arguments;
  none has any.
- Regraded within the governed set rather than leaving 30 of 31 at critical.
  Order placement, amendment, cancellation, withdrawals, and every transfer
  between wallets, subaccounts, and earn strategies stay critical. Leverage,
  subaccount status, and subaccount creation are high;
  `kraken_futures_set_pnl_preference` and `kraken_export_report` are medium;
  `kraken_export_delete` is low.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-30

- Generated against the official `krakenfx/kraken-cli` v0.3.2 built-in MCP
  server in guarded mode with all service groups enabled.
- Reviewed all 106 discovered tools. Kept 75 credentialed account reads and
  live mutations governed; classified 30 live financial/account mutations as
  critical and two account export/transfer operations as high impact.
- Removed 21 public market/reference tools and 10 local paper-trading tools
  from the plugin so they route as pass-through.
- Declared CA-held Spot and optional Futures API key/secret requirements.
