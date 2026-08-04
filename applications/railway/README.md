# Railway

This application wraps Railway's local CLI MCP server with MPAS. For the
generic bridge architecture, credential custody rules, and setup sequence,
see [Operating a Generated Bridge](../../README.md#operating-a-generated-bridge).

## Railway credential

The current harness expects a Railway **project token** through
`RAILWAY_TOKEN`. Create it from the token page in the intended Railway
project's settings and scope it to the intended environment. Railway's
[Public API documentation](https://docs.railway.com/integrations/api#creating-a-token)
explains the differences between account, workspace, project, and OAuth
tokens.

Store the token in the Credential Adapter under the handle
`railwayApiToken`. The adapter substitutes that handle into `RAILWAY_TOKEN`
when it launches the upstream MCP server. Do not put the token in this
repository or in the Proposer bridge configuration.

Project tokens are environment-scoped. Operations requiring account- or
workspace-level authority may fail with this harness even though the tool is
present in the captured Railway surface. Do not place a broader token in
`RAILWAY_TOKEN`; use a separately reviewed deployment configuration if
broader Railway administration is genuinely required.

## Upstream MCP server

The reviewed upstream is pinned to:

```text
npx -y @railway/cli@5.28.1 mcp
```

Railway documents the local MCP command and current client integrations in
[`railway mcp`](https://docs.railway.com/cli/mcp). In an MPAS deployment,
register this application's generated `bridge/dist/index.js` with the
Proposer's MCP client. Do not run `railway mcp install` for that Proposer,
because it would register a direct Railway path outside MPAS.

## Targeting Railway resources

Railway tools often accept `project_id`, `environment_id`, and `service_id`.
Provide the applicable identifiers explicitly when the target matters rather
than relying on the CLI's linked defaults. Railway documents copying resource
IDs from the project command palette in its
[Public API guide](https://docs.railway.com/integrations/api).

For example, provision PostgreSQL in a selected project and environment with:

```json
{
  "template_code": "postgres",
  "project_id": "<project-id>",
  "environment_id": "<environment-id>"
}
```

Railway's [PostgreSQL guide](https://docs.railway.com/databases/postgresql)
describes provisioning, connection variables, external TCP access, and
backup considerations. The corresponding CLI template operation is described
by [`railway deploy`](https://docs.railway.com/cli/deploy).

## Railway-specific security behavior

- `list_variables` remains governed because Railway variables commonly
  contain reusable credentials for other systems. The generated bridge
  intentionally refuses to return those values to the Proposer.
- `link_environment` and `link_service` are governed because they change the
  defaults used by later calls that omit explicit target identifiers.
- The complete governed/pass-through decision record is in
  [`build-artifacts/classification.json`](build-artifacts/classification.json).
- The reviewed tool surface and token requirements correspond to Railway CLI
  5.28.1. Regenerate and review the application before changing that pin.

Railway's own [MCP security guidance](https://docs.railway.com/ai/mcp-server#security-considerations)
also applies to the upstream server. MPAS adds signed Actions and Verifier
policy; it does not expand the authority of the Railway token.
