# Changelog — planetscale

Record manual review decisions and regenerations here.

## 0.1.0

- Captured all 5 tools from the official open-source PlanetScale MCP server.
- Governed the complete discovered tool surface.
- Classified `execute_write_query` as high impact because it permits INSERT,
  UPDATE, DELETE, and DDL.
- Kept read queries, insights, cluster-size listing, and documentation search at
  medium impact.
- Added adapter-side PlanetScale OAuth token substitution; no credential value
  is included in the package.
- Finalized the reviewed classification artifact so it matches the operative
  plugin policy, including high impact for `execute_write_query`.
