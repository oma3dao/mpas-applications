# Changelog — supabase

Record manual review decisions and regenerations here.

## 2026-07-28 — Initial Supabase bridge

- Captured all 29 tools from `@supabase/mcp-server-supabase` 0.9.0 without
  changing tool names or input schemas.
- Kept 28 project, organization, database, branch, Edge Function, billing, and
  operational metadata tools governed. Public `search_docs` is pass-through.
- Classified destructive SQL, migrations, and destructive branch operations as
  critical; resource lifecycle, deployment, logs, and source retrieval as high;
  scoped metadata reads as medium; and cost confirmation as low.
- Replaced the non-secret discovery placeholder with credential-adapter
  substitution for `SUPABASE_ACCESS_TOKEN`.
