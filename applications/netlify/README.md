# Netlify

This application wraps the official hosted Netlify MCP server with MPAS. For the
generic bridge architecture, credential custody rules, and setup sequence,
see [Operating a Generated Bridge](../../README.md#operating-a-generated-bridge).

## Netlify credential

The Netlify MCP server is a hosted endpoint that authenticates via OAuth. The
Credential Adapter manages the OAuth session directly — you do not obtain or
store a token manually. After loading your deployment config, authenticate as
the operator using the MPAS CLI:

```sh
mpas oauth login --application-did did:web:wivity.com:applications:netlify-mcp-server
```

Use `--no-browser` for headless environments:

```sh
mpas oauth login --application-did did:web:wivity.com:applications:netlify-mcp-server --no-browser
```

Only an operator should run `mpas oauth login`. Agents, proposer bridges, and
automatic retries must never open the authorization URL or initiate consent.
The adapter injects the managed credential into the `Authorization: Bearer`
header when it connects to `https://netlify-mcp.netlify.app/mcp` through
`mcp-remote`. The token is never exposed to the Proposer.

To check session state or revoke:

```sh
mpas oauth status --application-did did:web:wivity.com:applications:netlify-mcp-server
mpas oauth logout --application-did did:web:wivity.com:applications:netlify-mcp-server
```

For full OAuth operator guidance see the
[Credential Adapter operator guide](https://github.com/oma3dao/mpas/blob/main/examples/demo/guides/credential-adapter.md).

Copy [`adapter-config.example.json`](adapter-config.example.json) into the
Credential Adapter operator's configuration directory, then replace its Signer
DIDs and absolute plugin path. The checked-in file is only a template; the
resulting deployment config is operator-owned and should not be committed. For
`did:jwk` Signers, the DID contains the public verification key, so no
separate public key is needed in `signerKeys`.

## `deploy-site` continuation

`deploy-site` prepares a deployment but does not upload the site. After MPAS
executes the approved Action, the Task result contains a JSON-wrapped command:

```sh
npx -y @netlify/mcp@1.15.1 --site-id <id> --proxy-path "https://netlify-mcp.netlify.app/proxy/<jwe>"
```

The JWE in `--proxy-path` is the continuation secret. Proposers must run the
returned command; they must not send the continuation URL to `/mcp` or replace
it with the operator's OAuth token. Do not log, commit, or share the JWE.

Parse each JSON string layer in the Task result before extracting the URL. A
naive expression such as `[^"]+` can retain the backslash from an escaped
quote (`\"`), producing a 474-character JWE instead of the expected
approximately 473-character value. With the decoded URL in `proxy_path`, an
operator can distinguish the common failures using an existing deploy ID:

```sh
curl -sS -D - "$proxy_path/api/v1/deploys/<existing-deploy-id>"
```

A `200` JSON response confirms that the JWE is intact. A `401` means the JWE
was mangled during extraction. A `403` response with a `text/plain` body of
`Forbidden` means the HTTP method or path is not on the JWE allow-list.

Run the returned `npx` command from a normal Git checkout, where `.git` is a
directory. `@netlify/mcp` ignores `.git/**`, but it does not ignore the `.git`
pointer file used by a Git worktree; that file embeds a local gitdir path in
the archive and causes the Netlify build to fail. As a temporary workaround,
move the worktree's `.git` pointer outside the checkout immediately before
running the command and restore it afterward, including on failure. The
durable fix belongs upstream in `netlify/netlify-mcp`.

Pin continuation execution to `@netlify/mcp@1.15.1`. Configure the OAuth
execution target with `read` and `write` scopes only. The Credential Adapter
adds `offline_access` during operator login when Netlify advertises it; adding
it to or removing it from the deployment config neither grants deploy rights
nor requires a new login.

## Upstream MCP server

The reviewed upstream is a hosted endpoint accessed through a pinned client:

```text
npx -y mcp-remote@0.1.38 https://netlify-mcp.netlify.app/mcp \
  --header "Authorization: Bearer {{credential:netlifyMcpOAuthAccessToken}}"
```

The `serverInfo.version` field reports `0.0.0` from the Netlify server and is
not the client version — the reproducible pin is `mcp-remote@0.1.38`. In an
MPAS deployment, register this application's generated `bridge/dist/index.js`
with the Proposer's MCP client. Do not also register the upstream hosted
endpoint directly in that MCP client, because it would create a path outside
MPAS that bypasses the Credential Adapter entirely.

## Tool surface overview

The Netlify MCP server exposes nine tools. Six are reads and are routed as
pass-through. Three are write aggregators and are governed:

| Tool | Impact | Notes |
| :--- | :---: | :--- |
| `get-netlify-coding-context` | — | Pass-through (read-public) |
| `netlify-deploy-services-reader` | — | Pass-through (read) |
| `netlify-extension-services-reader` | — | Pass-through (read-public) |
| `netlify-project-services-reader` | — | Pass-through (read) |
| `netlify-team-services-reader` | — | Pass-through (read) |
| `netlify-user-services-reader` | — | Pass-through (read) |
| `netlify-deploy-services-updater` | high | Single sub-operation: `deploy-site` |
| `netlify-extension-services-updater` | high | Two sub-operations with different risk profiles |
| `netlify-project-services-updater` | critical | Six sub-operations; see below |

The complete per-operation rationale is in
[`build-artifacts/classification.json`](build-artifacts/classification.json).

## Netlify-specific security behavior

### Hosted endpoint bypass risk

The Netlify MCP server is a hosted endpoint, not a locally spawned process.
An agent that can reach `https://netlify-mcp.netlify.app/mcp` with a valid
credential can call it without going through the bridge. The OAuth session is
managed by the Credential Adapter via `mpas oauth login` and the token is
never surfaced to the Proposer. However, ensure the Proposer's environment has
no independent path to Netlify — not through a browser session with an active
Netlify login, a separately configured MCP client entry for the hosted
endpoint, environment variables, or a `.env` file containing a Netlify token.

### `netlify-project-services-updater` — six sub-operations, one tool name

This tool multiplexes six operations through a single MCP tool name via
`selectSchema.operation`. The operations range from routine to critical and
should not be treated uniformly. Operators **must** match on
`selectSchema.operation` (and in some cases on nested parameter values) to
apply appropriate approval requirements. The sub-operations are:

| Sub-operation | Risk | Recommended approver |
| :--- | :--- | :--- |
| `update-visitor-access-controls` | High — security configuration; team-wide when `appliesTo == all-projects` | Human |
| `manage-form-submissions` with `action == delete-submission` | High — irreversible data deletion | Human |
| `manage-env-vars` with `upsertEnvVar == true` or `deleteEnvVar == true` | High — credential or irreversible write | Human (see notes below) |
| `update-project-name` | Medium — externally visible, affects URLs and integrations | At least one non-proposer |
| `update-forms` | Medium — bounded and reversible toggle | Agent signer is sufficient |
| `create-new-project` | Medium — resource creation with billing implications | Agent signer is sufficient |
| `manage-form-submissions` with `action == get-submissions` | Low — effectively read-only | `proposerOnly` or agent signer |
| `manage-env-vars` with `getAllEnvVars == true` only | Low — effectively read-only | `proposerOnly` or agent signer |

**`manage-env-vars` flag combinations.** The schema permits `getAllEnvVars`,
`upsertEnvVar`, and `deleteEnvVar` to appear in the same call. Write the
match conditions defensively: `upsertEnvVar == true` fires independently of
whether `getAllEnvVars` is also set. If both `upsertEnvVar` and `deleteEnvVar`
are true in the same call, both matching policy entries fire and their
requirements stack (logical AND). Treat any call with `deleteEnvVar == true`
as irreversible regardless of other flags. Additionally, when
`envVarIsSecret == true` or `newVarContext` includes `production`, the write
touches a live credential or production configuration and warrants human
approval.

**`netlify-extension-services-updater` — removal vs. install.** The
`change-extension-installation` sub-operation has a `shouldBeInstalled`
boolean. Removal (`shouldBeInstalled == false`) may disable functionality
across all sites on the team and warrants human approval. Installation can
be relaxed to an agent signer. The `initialize-database` sub-operation
provides no scope signal to the approver; treat it as requiring human
approval unconditionally.

## Policy example — differentiating sub-operations

The `adapter-config.example.json` in this folder contains a complete
`MpasApplicationPolicy` with per-sub-operation match conditions for
`netlify-project-services-updater`. The policy entries below cover the three
paths that require elevated approval. Everything else falls through to
`defaultRequirement`, which in the example requires one non-proposer approval
from the `approvers` signer group — replace that group with a human or agent
signer DID as appropriate for the deployment.

```json
"policies": {
  "netlify-project-services-updater": [
    {
      "description": "update-visitor-access-controls is a security-configuration change; team-wide when appliesTo == all-projects. Requires human approval.",
      "match": {
        "conditions": [
          {
            "source": "executionPayload",
            "path": "/arguments/selectSchema/operation",
            "op": "eq",
            "value": "update-visitor-access-controls"
          }
        ]
      },
      "requirements": {
        "type": "threshold",
        "threshold": 1,
        "eligibleSignerGroup": "humanApprovers",
        "decision": "approve"
      }
    },
    {
      "description": "manage-form-submissions with action == delete-submission is irreversible data deletion. Requires human approval.",
      "match": {
        "conditions": [
          {
            "source": "executionPayload",
            "path": "/arguments/selectSchema/operation",
            "op": "eq",
            "value": "manage-form-submissions"
          },
          {
            "source": "executionPayload",
            "path": "/arguments/selectSchema/params/action",
            "op": "eq",
            "value": "delete-submission"
          }
        ]
      },
      "requirements": {
        "type": "threshold",
        "threshold": 1,
        "eligibleSignerGroup": "humanApprovers",
        "decision": "approve"
      }
    },
    {
      "description": "manage-env-vars with upsertEnvVar == true writes or overwrites an environment variable. Requires human approval.",
      "match": {
        "conditions": [
          {
            "source": "executionPayload",
            "path": "/arguments/selectSchema/operation",
            "op": "eq",
            "value": "manage-env-vars"
          },
          {
            "source": "executionPayload",
            "path": "/arguments/selectSchema/params/upsertEnvVar",
            "op": "eq",
            "value": true
          }
        ]
      },
      "requirements": {
        "type": "threshold",
        "threshold": 1,
        "eligibleSignerGroup": "humanApprovers",
        "decision": "approve"
      }
    },
    {
      "description": "manage-env-vars with deleteEnvVar == true is irreversible. Requires human approval regardless of other flags.",
      "match": {
        "conditions": [
          {
            "source": "executionPayload",
            "path": "/arguments/selectSchema/operation",
            "op": "eq",
            "value": "manage-env-vars"
          },
          {
            "source": "executionPayload",
            "path": "/arguments/selectSchema/params/deleteEnvVar",
            "op": "eq",
            "value": true
          }
        ]
      },
      "requirements": {
        "type": "threshold",
        "threshold": 1,
        "eligibleSignerGroup": "humanApprovers",
        "decision": "approve"
      }
    }
  ]
}
```

The remaining sub-operations (`update-forms`, `update-project-name`,
`create-new-project`, and the read-mode paths of `manage-form-submissions` and
`manage-env-vars`) carry no matching entry and are governed by
`defaultRequirement`. If you want to relax the read-mode paths to
`proposerOnly`, add explicit entries for them:

```json
{
  "description": "manage-form-submissions get-submissions is effectively read-only.",
  "match": {
    "conditions": [
      {
        "source": "executionPayload",
        "path": "/arguments/selectSchema/operation",
        "op": "eq",
        "value": "manage-form-submissions"
      },
      {
        "source": "executionPayload",
        "path": "/arguments/selectSchema/params/action",
        "op": "eq",
        "value": "get-submissions"
      }
    ]
  },
  "requirements": {
    "type": "proposerOnly"
  }
},
{
  "description": "manage-env-vars getAllEnvVars-only is effectively read-only when no write flags are set. Defensive: match only when neither upsertEnvVar nor deleteEnvVar is present.",
  "match": {
    "conditions": [
      {
        "source": "executionPayload",
        "path": "/arguments/selectSchema/operation",
        "op": "eq",
        "value": "manage-env-vars"
      },
      {
        "source": "executionPayload",
        "path": "/arguments/selectSchema/params/getAllEnvVars",
        "op": "eq",
        "value": true
      },
      {
        "source": "executionPayload",
        "path": "/arguments/selectSchema/params/upsertEnvVar",
        "op": "notExists"
      },
      {
        "source": "executionPayload",
        "path": "/arguments/selectSchema/params/deleteEnvVar",
        "op": "notExists"
      }
    ]
  },
  "requirements": {
    "type": "proposerOnly"
  }
}
```

Note that `notExists` guards are conservative: if the upstream schema ever
sends `upsertEnvVar: false` explicitly instead of omitting the field, this
entry would not match, and the call would fall through to `defaultRequirement`.
That is the safe failure direction.
