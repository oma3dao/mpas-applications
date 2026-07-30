# Changelog — kraken-cli

Record manual review decisions and regenerations here.

## 2026-07-30

- Generated against the official `krakenfx/kraken-cli` v0.3.2 built-in MCP
  server in guarded mode with all service groups enabled.
- Reviewed all 106 discovered tools. Kept 75 credentialed account reads and
  live mutations governed; classified 30 live financial/account mutations as
  critical and two account export/transfer operations as high impact.
- Removed 21 public market/reference tools and 10 local paper-trading tools
  from the plugin so they route as pass-through.
- Declared CA-held Spot and optional Futures API key/secret requirements.
