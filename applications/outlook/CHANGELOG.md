# Changelog — outlook

## 0.1.0

- Captured and packaged the 62-tool surface from `outlook-graph-mcp` 1.12.0.
- Reviewed every operation and reduced the governed set to 36 state-changing
  tools. The 26 upstream-annotated read-only tools remain available as
  pass-through operations.
- Classified outbound mail and attendee-visible calendar changes as high,
  permanent message and folder deletion as critical, and routine reversible
  mailbox/contact/task/draft changes as medium.
- Classified attachment download as high because it writes decoded bytes to a
  caller-selected path on the credential-adapter host.
- Added Wivity application/plugin identities and delegated Microsoft Graph
  credential requirements.
- Discovery used MCP SDK 1.29.0 because the upstream package's unconstrained
  `mcp>=1.27` dependency currently resolves to incompatible MCP SDK 2.0.
