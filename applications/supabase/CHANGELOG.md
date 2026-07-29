# Changelog — supabase

Record manual review decisions and regenerations here.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 28 operations to 11. All `get_*` and `list_*`
  tools, plus `generate_typescript_types` and `get_advisors`, are now
  pass-through: they report project, organization, schema, cost, advisory, and
  log state that the configured `SUPABASE_ACCESS_TOKEN` already reaches.
- Dropped `get_publishable_keys`. Publishable and legacy anon keys are
  designed to be embedded in client applications and are governed by row
  level security, so returning them is not privileged credential disclosure.
- Dropped `get_edge_function` and `get_logs` despite their previous high
  grading. Both are reads — function source and log retrieval — and neither
  changes project state.
- Dropped `confirm_cost`. It exists to make an agent pause and confirm
  spending before `create_project`, but the agent can satisfy that
  precondition by calling it itself, so it is not a real control. Under MPAS
  the guarantee comes from `create_project` being governed, where a human
  approver sees the actual project creation.
- Kept all eleven state-changing operations: `execute_sql`, `apply_migration`,
  `deploy_edge_function`, `merge_branch`, `rebase_branch`, `reset_branch`, and
  `delete_branch` at critical; `create_project`, `create_branch`,
  `pause_project`, and `restore_project` at high.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

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
