# Changelog — railway

Record manual review decisions and regenerations here.

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
