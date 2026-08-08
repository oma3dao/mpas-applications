# Changelog — slack

## 0.1.0

- Captured all eight tools from `@modelcontextprotocol/server-slack` 2025.4.25.
- Governed the three externally visible mutations: posting messages, replying
  to threads, and adding reactions. Read-only channel, history, thread, and
  user lookups remain pass-through.
- Rated message publication high impact because it speaks under the
  organization's bot identity and may notify a broad audience; reactions are
  medium impact and reversible.
- Bound the application to Wivity publisher, plugin, and application DIDs and
  to workspace-scoped bot-token and team-ID credential requirements.
