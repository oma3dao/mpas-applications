# Upstash

This application wraps the official Upstash MCP server with MPAS. For the
generic bridge architecture, Credential Adapter custody rules, and setup
sequence, see
[Operating a Generated Bridge](../../README.md#operating-a-generated-bridge).

## Upstash credentials

The upstream server uses an Upstash account email and API key. Store them in
the Credential Adapter under the `upstashEmail` and `upstashApiKey` handles.
The adapter injects them only when launching the pinned upstream server; do not
put either value in this repository or in the Proposer bridge configuration.

Copy [`adapter-config.example.json`](adapter-config.example.json) into the
Credential Adapter operator's configuration directory, then replace its Signer
DIDs and absolute plugin path. The checked-in file is only a template; the
operator-owned deployment configuration should not be committed.

## Denying credential-returning tools

`qstash_get_user_token` is a read operation, but its result contains a reusable
QStash token. Returning that token to a Proposer would transfer authority that
could be used outside the governed bridge. The tool therefore remains
classified `critical`, and the Credential Adapter policy example rejects it
unconditionally before upstream execution:

```json
"policies": {
  "qstash_get_user_token": [
    {
      "reject": true,
      "description": "Returning a reusable QStash token would let a proposer bypass MPAS and is disabled for proposer deployments.",
      "match": {}
    }
  ]
}
```

This is stronger than requiring approval: no Approval can override a matching
reject entry. The generated bridge remains generic, while the trusted,
operator-owned Credential Adapter policy defines the deployment-specific deny.
The deployed configuration must retain this entry.

## Upstream MCP server

The reviewed upstream is pinned to:

```text
npx -y @upstash/mcp-server@0.2.4 --email <adapter-injected> --api-key <adapter-injected>
```

In an MPAS deployment, register this application's generated
`bridge/dist/index.js` with the Proposer's MCP client. Do not register or run the
upstream server directly for that Proposer, because doing so would create a path
outside MPAS and the Credential Adapter.
