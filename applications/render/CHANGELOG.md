# Changelog

## 0.1.0 — 2026-11-02

- Generated with the MPAS repository's bridge generator (commit `96bc20d8df9bd62e7901ce69c8194c17de18ad4f`), wrapping unmodified official Render MCP source at `2e131d6d8aae723542957c5c0f537c61cbfb4f36`.
- Captured 23 real tools through initialize/tools/list with dummy startup authentication and an unreachable API host; no real credentials or application calls.
- Govern 10 operations: five resource creation tools, trigger_deploy, update_environment_variables, select_workspace, list_workspaces (implicit selection), and query_render_postgres (unrestricted SQL/function execution despite a read-only transaction).
- Leave 13 getters/listing tools pass-through: get_deploy, get_key_value, get_metrics, get_postgres, get_selected_workspace, get_service, list_deploys, list_events, list_key_value, list_log_label_values, list_logs, list_postgres_instances, list_services. Individual schema/source-review rationales are recorded in classification.json.
- Document absent plan-update/Blueprint tools, creation plan defaults, destructive replace mode, deploy side effects, implicit workspace state and auto-deploy scope. Preserve every upstream tool definition verbatim.
- Provide CI build/protocol coverage through automatic bridge discovery. No live adapter configuration or credentials changed.
