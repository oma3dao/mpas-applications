# Changelog — alpaca

## 2026-07-30 — Initial Alpaca bridge

- Captured all 74 tools from the official Alpaca MCP Server 2.1.1.
- Governed 17 account-mutating operations covering stock, crypto, and option
  orders; cancellations and replacements; position liquidation; option
  exercise instructions; locate requests; account configuration; and
  watchlist changes.
- Left 57 documentation, market-data, and inspection tools as pass-through.
- Configured Credential Adapter substitution for the Alpaca API key and secret,
  with paper trading enabled by default in the compatibility harness.
