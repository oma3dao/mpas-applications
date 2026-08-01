# Changelog — kraken-cli

Record manual review decisions and regenerations here.

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
