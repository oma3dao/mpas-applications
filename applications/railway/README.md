# Railway

This application wraps Railway's local CLI MCP server with MPAS. For the
generic bridge architecture, credential custody rules, and setup sequence,
see [Operating a Generated Bridge](../../README.md#operating-a-generated-bridge).

## Railway credential

The operator default is an **account/workspace API token** supplied through
`RAILWAY_API_TOKEN`. Prefer a workspace-scoped API token when the deployment
only needs that workspace. Create it from Railway's account settings token
page, selecting the intended workspace. An account token without a workspace
selection has broader authority across the account's resources. See Railway's
[API token guide](https://docs.railway.com/integrations/api#creating-a-token)
and [CLI authentication documentation](https://docs.railway.com/cli/login#environment-variables).

Store the token only in the Credential Adapter file store under the handle
`railwayApiToken`. The adapter substitutes that handle into
`RAILWAY_API_TOKEN` when launching the pinned upstream MCP server. Keep
`RAILWAY_TOKEN` unset in the CA's launch environment: it selects project-token
authentication, not account/workspace authentication. Do not put a token in
this repository, a harness capture, or the Proposer bridge configuration.
Neither `railway login` nor `railway link` is required for this setup.

Copy [`adapter-config.example.json`](adapter-config.example.json) into the
Credential Adapter operator's configuration directory, then replace its
Signer DIDs and absolute plugin path. The checked-in file is only a template;
the resulting deployment config is operator-owned and should not be committed.
For `did:jwk` Signers, the DID contains the public verification key, so no
separate public key is needed in `signerKeys`.

An account/workspace token is a deployment trust choice: it can access more
than one project or environment and may permit operations such as project
creation and reading environment-variable values. MPAS governs tool calls but
does not narrow the underlying token. Retain the `list_variables` rejection
in the example policy and review the intended workspace/project access.
Project tokens through `RAILWAY_TOKEN` remain a Railway option for deliberately
narrow deployments, but they are **not** this application's default; never
put an account/workspace token in that variable.

## Upstream MCP server

Both the regenerated discovery harness and the recommended CA execution target
are pinned to:

```text
npx -y @railway/cli@5.63.1 mcp local
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
  contain reusable credentials for other systems. The generated bridge remains
  generic; the checked-in Credential Adapter policy example rejects this tool
  before upstream execution, so its values cannot reach the Proposer.
- `link_environment` and `link_service` are governed because they change the
  defaults used by later calls that omit explicit target identifiers.
- The complete governed/pass-through decision record is in
  [`build-artifacts/classification.json`](build-artifacts/classification.json).
- The reviewed tool surface and token requirements correspond to Railway CLI
  5.63.1 (`mcp local`). Regenerate and review the application before changing that pin.

Railway's own [MCP security guidance](https://docs.railway.com/ai/mcp-server#security-considerations)
also applies to the upstream server. MPAS adds signed Actions and Verifier
policy; it does not expand the authority of the Railway token.

## Denying credential-returning tools

[`adapter-config.example.json`](adapter-config.example.json) contains a
deterministic reject policy for `list_variables`:

```json
"policies": {
  "list_variables": [
    {
      "reject": true,
      "description": "Returning Railway environment-variable values can disclose reusable credentials and is disabled for proposer deployments.",
      "match": {}
    }
  ]
}
```

This is deliberately stronger than an approval requirement. Marking the tool
`critical` requires authorization but would still permit an approved result to
return `KEY=VALUE` pairs. A deterministic rejection prevents execution and
therefore prevents reusable credentials from crossing the Credential Adapter
boundary. The checked-in file is an operator template; the deployed Credential
Adapter configuration must retain this reject entry.

## Upgrade from the 5.28.1 capture

Plugin version **0.1.1** was regenerated from credential-free `initialize` and
`tools/list` on `@railway/cli@5.63.1 mcp local`. All 47 tool names and their
input schemas are unchanged; `list_variables` now describes sealed-variable
handling. That description change updates the full tool-surface hash. Reviewed
governed/pass-through membership and impacts remain unchanged.

The new plugin artifact is:

```text
did:artifact:bafkreieeqiyqg7hokno6tw3ay3bxsoaegq4lbguiayfvfpaitvvnborgea
```

The CA operator should install the reviewed plugin and update only its plugin
version/artifact reference and execution target to match
[`adapter-config.example.json`](adapter-config.example.json). Keep the existing
`railwayApiToken` file, operator policy, and signer DIDs. Update the Proposer's
plugin and generated bridge together so their surface bindings agree; the
Proposer still receives no Railway credentials. An operator already using
`5.63.1 mcp local` with `RAILWAY_API_TOKEN` should keep that working token wiring.

After rollout, verify `list_services`, `list_deployments`, and
`environment_status` through the MPAS bridge using explicit accessible project,
environment, and service IDs as applicable. Discovery alone is not an
authentication test: `tools/list` can succeed without a token while resource
calls fail. This capture did not execute any Railway resource operation.
Credential-filtered missing names are not evidence of an image change and
are not a reason to switch to project tokens; genuine surface changes still
need review and regeneration, not a token-type workaround.
