# Changelog — mongodb

Record manual review decisions and regenerations here.

## 2026-07-28 — Initial MongoDB bridge

- Captured all 29 tools from `mongodb-mcp-server` 1.14.0 without changing tool
  names or input schemas.
- Kept all 29 tools governed. Database, collection, index, log, and Atlas Local
  operations require target-bound authorization; the two Assistant
  knowledge-base reads remain medium-impact governed operations.
- Classified target-changing connection, drops, and bulk deletion as critical;
  arbitrary data retrieval/export, bulk writes, schema/index changes, logs, and
  deployment lifecycle operations as high.
- Configured `MDB_MCP_CONNECTION_STRING` for credential-adapter substitution;
  no production connection or reusable credential is checked in.
