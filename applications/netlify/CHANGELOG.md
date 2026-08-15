# Changelog — netlify

## 2026-08-14 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait interface with
  `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Preserved the exact discovered Netlify tool surface and added transparent
  `org.oma3/mpas` task metadata, DID-scoped task reads, cooperative
  cancellation, and background retry behavior.
- Updated the bridge source for `@oma3/mpas@0.1.0-alpha.5` and
  `@modelcontextprotocol/server@2.0.0`. Until alpha.5 is published, the bridge
  links the sibling `mpas/sdk/protocol` package through the repositories'
  shared parent directory. Build that SDK before building this bridge. Replace
  the file dependency and refresh the lockfile after publication.

## 2026-08-09 — Initial official hosted Netlify MCP bridge

- Captured all 9 tools from `https://netlify-mcp.netlify.app/mcp` through
  OAuth using the reproducibly pinned `mcp-remote@0.1.38` client.
- Configured Credential Adapter substitution for a Netlify MCP OAuth access
  token; no token or local OAuth cache is included in this package.
- Narrowed governance to the three write aggregators. Public coding guidance
  and account-scoped user, team, deploy, project, and extension reads remain
  pass-through.
- Classified site deployment and extension/database changes as high impact.
  Classified the project updater as critical because its combined surface can
  change visitor access controls, write or delete secret environment
  variables, delete form submissions, and create projects.

Record manual review decisions and regenerations here.
