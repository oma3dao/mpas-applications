# Changelog — railway

Record manual review decisions and regenerations here.

## 2026-07-31 — Completed the impact classification

- Reviewed all 47 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 27 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 20 pass-through operations, tagged by
  reason (metadata-only 10, read 7, read-public 3), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 47 operations to 27. The 20 dropped tools are
  status, listing, metrics, log, and documentation reads (`docs_search`,
  `docs_fetch`, `domain_status`, `environment_status`, `get_logs`,
  `get_service_config`, `get_tcp_proxy`, `http_error_rate`, `http_requests`,
  `http_response_time`, `list_deployments`, `list_domains`, `list_projects`,
  `list_services`, `list_tcp_proxies`, `list_workspaces`,
  `private_network_status`, `search_templates`, `service_metrics`, `whoami`).
- Kept `list_variables` at critical — the one read that stays governed. It
  returns environment variables as KEY=VALUE pairs, and those routinely hold
  live credentials for systems outside Railway: database URLs, payment
  provider keys, cloud access keys. Every other Railway read returns data the
  Railway token itself already reaches, so governing it adds nothing. This one
  escalates a Railway-scoped token into credentials for third-party systems
  that MPAS does not govern at all.
- Dropped `get_service_config` by contrast: it reports a variable *count*, not
  variable values.
- Kept `link_environment` and `link_service` at high. Both switch what the CLI
  is pointed at, so a later approved `deploy` or `set_variables` that omits
  explicit IDs can land on a different environment than the approver pictured.
  Graded high rather than critical because the re-targeting only affects calls
  that rely on the linked default.
- Lowered `retry_domain_certificate` to medium: it re-runs TLS issuance for an
  existing domain and creates no new resource.
- Kept the irreversible removals (`remove_bucket`, `remove_service`,
  `remove_volume`, `remove_tcp_proxy`, `delete_domain`) and `set_variables` at
  critical; resource creation, deployment, domain, scaling, and service
  configuration changes at high.
- Recomputed `plugin.artifactDid` in `registry-entry.json`, which was also
  stale against the previous `plugin.json`.

## 0.1.0

- Captured and governed all 47 tools from Railway CLI 5.28.1.
- Finalized reviewed impact classifications for project, environment, service,
  deployment, variable, storage, networking, domain, and observability tools.
- Classified destructive resource removals and environment-variable writes as
  critical; classified infrastructure and deployment mutations as high.
- Preserved `list_variables` in the advertised tool surface but return a safe
  error so environment-variable values never reach the proposer.
- Added credential-adapter substitution for the Railway API token; no
  credential value is included in the package.
