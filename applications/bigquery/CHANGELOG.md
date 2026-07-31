# Changelog — bigquery

## 0.1.0

- Captured and packaged the nine-tool BigQuery prebuilt surface from Google's
  MCP Toolbox for Databases 1.8.0.
- Kept four operations governed: arbitrary SQL execution is critical;
  contribution analysis, forecasting, and conversational data insights are
  high because they process caller-selected data and invoke billable services.
- Removed five read-only dataset, table, and catalog discovery operations from
  the governed set. They remain available as pass-through tools.
- Used client-OAuth mode only for credential-free schema discovery; the
  deployment harness is configured for credential-adapter-managed Google
  Application Default Credentials and an explicit BigQuery project.
- Added Wivity application/plugin identities and scoped Google Cloud credential
  requirements.
