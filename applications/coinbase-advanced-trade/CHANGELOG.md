# Changelog — Coinbase Advanced Trade

## 2026-08-02 — Normalized impact grading

- Re-graded all 9 governed operations against the README rubric, using `github`
  as the calibration reference. The plugin was 7/9 `critical` (78%); it is now
  2 `critical`, 3 `high`, 3 `medium`, 1 `low`.
- Reserved `critical` for `coinbase_transfer`, which relocates funds out of the
  portfolio an approver had in view, and `coinbase_set_env`, which re-targets
  every later call and is a bypass of the governance boundary itself.
- Graded `coinbase_orders_create`, `coinbase_orders_edit`, and
  `coinbase_convert_execute` at `high`. An edit can raise size, so it is graded
  as placement rather than as a cancel.
- Graded `coinbase_orders_cancel` at `low` and
  `coinbase_orders_close_position` at `medium` — both **below** placement.
  Cancelling is risk-reducing and time-sensitive, and `critical` carries a
  suggested approver of at least one human; paging a person to cancel an order
  during a market move is both an availability problem and a driver of approval
  fatigue. The close stays above the cancel because a market order realises P&L
  at whatever the book offers, where a cancel only withdraws an instruction.
- Lowered the portfolio pair from `high` to `medium`.
  `coinbase_portfolios_create` makes an empty container; the API requires a
  portfolio to be empty before `coinbase_portfolios_delete` will remove it, so
  what is destroyed is a container and not value.
- `low` here is the README's borderline signal, not a shrug.
  `coinbase_orders_cancel` stays governed so an agent signer can rate-limit and
  check that a cancelled protective stop is replaced; what it should not do is
  block on a human.
- No membership change. This is grading only — the governed set is untouched.
- Updated `build-artifacts/classification.json` to match and recomputed
  `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-31 — Completed the impact classification

- Reviewed all 29 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 9 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 20 pass-through operations, tagged by
  reason (read 7, read-public 7, metadata-only 3, precursor 2, routine-job 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed portfolio rename

- Dropped `coinbase_portfolios_edit`, taking the plugin from 10 operations to
  9. Its description states it is a metadata-only rename that does not affect
  balances or positions.

## 2026-07-31 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 29 operations to 10. The initial bridge governed
  the entire upstream surface; nineteen of those are reads and are now
  pass-through: the six `coinbase_products_*` market-data endpoints,
  `coinbase_orders_get` / `_list` / `_fills`, `coinbase_portfolios_get` /
  `_list`, `coinbase_balance`, `coinbase_fees`, `coinbase_convert_get`,
  `coinbase_env`, `coinbase_help`, and `coinbase_template`.
- Dropped `coinbase_orders_preview` even though it is a POST. Its own
  description says it estimates fees, fill price, and slippage "without
  executing" — the HTTP verb is not the classifier.
- Dropped `coinbase_convert_quote` for the same reason as Supabase's
  `confirm_cost`: a non-binding quote is a precondition an agent can satisfy
  itself, so it is not a control. The guarantee is that
  `coinbase_convert_execute` is governed at critical.
- Kept `coinbase_set_env` at critical. Switching the active environment
  re-targets every later call, so an approved order intended for sandbox can
  execute against real funds. This is the re-targeting route in the README.
- Raised `coinbase_orders_cancel` from high to critical for consistency with
  `alpaca` and `kraken-cli`. Cancelling is not a harmless undo — removing a
  resting stop-loss leaves a position unprotected.
- Lowered `coinbase_portfolios_edit` from high to low; its description states
  it is a metadata-only rename that does not affect balances. Lowered
  `coinbase_portfolios_delete` to high, since the API requires the portfolio
  to be empty first, so no funds are at risk.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 0.1.0 — 2026-07-29

- Captured the 29-tool surface from Coinbase CLI MCP 0.0.4.
- Kept all tools governed so deployments can validate exact schemas and apply policy to account and market-data access.
- Classified live order creation, editing, position closing, currency conversion execution, portfolio transfers, and execution-environment changes as critical.
- Classified order cancellation and portfolio creation or renaming as high impact.
- Classified portfolio deletion as critical and retained read-only, preview, template, and help operations as medium.
- Added Wivity application, plugin, publisher, and CDP API-key credential metadata.
