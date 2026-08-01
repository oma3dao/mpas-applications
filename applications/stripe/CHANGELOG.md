# Changelog — stripe

## 2026-07-31 — Completed the impact classification

- Reviewed all 9 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 2 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 7 pass-through operations, tagged by
  reason (metadata-only 3, read-public 2, routine-job 1, read 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed MCP feedback submission

- Dropped `send_stripe_mcp_feedback`, taking the plugin from 3 operations to
  2. It submits free-text feedback about Stripe's MCP tooling to Stripe. It
  touches no account object, moves no money, and reaches no customer.
- `create_refund` and `stripe_api_write` remain governed at critical, which is
  the entire money-moving surface.

## 2026-07-31 — Impact normalization

- No membership change. Lowered `send_stripe_mcp_feedback` from medium to low:
  it submits a free-text comment about Stripe's MCP tooling to Stripe, touches
  no account object, and moves no money.
- Confirmed the governed set is correct. `stripe_api_read` stays pass-through
  despite being authenticated — it returns account data the API key already
  reaches and yields no reusable credential.
- Noted for policy authors: `stripe_api_write` is a single catch-all covering
  every POST/PATCH/PUT/DELETE, but its payload schema exposes
  `/arguments/stripe_api_operation_id` and `/arguments/parameters`, so policy
  can still distinguish a refund from a payout and match on amounts.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-30 — Initial Stripe bridge

- Captured all 9 tools from the official Stripe MCP Server 0.3.3.
- Governed `create_refund`, the generic `stripe_api_write` mutation surface,
  and external MCP feedback submission.
- Left 6 documentation, planning, account inspection, API discovery, and API
  read tools as pass-through.
- Configured Credential Adapter substitution for a restricted Stripe API key.
