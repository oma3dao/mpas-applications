# Changelog — stripe

## 2026-07-30 — Initial Stripe bridge

- Captured all 9 tools from the official Stripe MCP Server 0.3.3.
- Governed `create_refund`, the generic `stripe_api_write` mutation surface,
  and external MCP feedback submission.
- Left 6 documentation, planning, account inspection, API discovery, and API
  read tools as pass-through.
- Configured Credential Adapter substitution for a restricted Stripe API key.
