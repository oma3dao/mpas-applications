# MPAS Applications Roadmap

A list of future bridges that will be built. Each completed application gets its own folder in `applications/`.

To request a new application or volunteer to build one, open a PR updating this file.

## Status Key

| Status       | Meaning                                  |
| :----------- | :--------------------------------------- |
| ✅ Done      | Plugin and bridge merged                 |
| 🚧 In Progress | Actively being built                  |
| 📋 Planned   | Prioritized, not yet started             |
| 💡 Requested | Community-requested, not yet prioritized |

## Prioritization Criteria

Applications are prioritized by the combination of:

- **Blast radius** — how dangerous is an uncontrolled agent action?
- **Agent adoption** — how many agents are actually using this MCP server today?
- **Buildability** — is the upstream open source and runnable locally?

## Upstream Source Priority

When listing upstream sources, use the best available option for building a bridge:

1. **Open-source repo** — full source access, can run locally, inspect internals
2. **Published package** (npm, Docker image, binary) — can run and call discovery, but no source
3. **Remote endpoint only** — can connect and discover tools, but can't run locally or inspect

---

## Tier 1 — MVP and Highest Priority

| Application    | Upstream                       | Upstream Source                                                                 | Status     | Notes                                                                                       |
| :------------- | :----------------------------- | :------------------------------------------------------------------------------ | :--------- | :------------------------------------------------------------------------------------------ |
| GitHub         | Official GitHub MCP Server     | [github/github-mcp-server](https://github.com/github/github-mcp-server)        | 📋 Planned | MVP target. Most-installed MCP server. Go, open source. High-impact: merge, delete, deploy  |
| Slack          | Slack MCP Server               | [modelcontextprotocol/servers/slack](https://github.com/modelcontextprotocol/servers/tree/main/src/slack) | 📋 Planned | Heavily used by agents. High-impact: post messages, invite users. TypeScript, open source   |
| Kubernetes     | Kubernetes MCP Server          | [stormforge-llc/mcp-k8s-go](https://github.com/stormforge-llc/mcp-k8s-go)     | 📋 Planned | 1,188+ downloads. Extreme blast radius: cluster admin, resource deletion, scaling           |

## Tier 2 — High Impact Infrastructure and Finance

| Application         | Upstream                  | Upstream Source                                                                                         | Status     | Notes                                                                               |
| :------------------ | :------------------------ | :------------------------------------------------------------------------------------------------------ | :--------- | :---------------------------------------------------------------------------------- |
| Terraform           | Terraform MCP Server      | [hashicorp/terraform-mcp-server](https://github.com/hashicorp/terraform-mcp-server)                    | 📋 Planned | 1,062+ downloads. Infra-as-code changes have massive blast radius                   |
| Linear              | Linear MCP Server         | [jerhadf/linear-mcp-server](https://github.com/jerhadf/linear-mcp-server)                              | 📋 Planned | Popular with AI agents/startups. TypeScript, open source. Run via npx               |
| PostgreSQL/Supabase | PostgreSQL MCP Server     | [modelcontextprotocol/servers/postgres](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres) | 📋 Planned | High agent adoption. High-impact: DROP, schema changes, data deletion               |
| Stripe              | Stripe Agent Toolkit      | [stripe/agent-toolkit](https://github.com/stripe/agent-toolkit)                                        | 📋 Planned | Financial transactions. TypeScript, open source                                     |

## Tier 3 — Enterprise Tools

| Application        | Upstream                  | Upstream Source                                                                                                     | Status     | Notes                                                         |
| :----------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------ | :--------- | :------------------------------------------------------------ |
| Jira / Confluence  | Atlassian MCP Server      | [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)                                 | 📋 Planned | Remote endpoint only. OAuth required. Lower MCP adoption than expected |
| GitLab             | GitLab MCP Server         | [gitlab-org/editor-extensions/gitlab-mcp-server](https://gitlab.com/gitlab-org/editor-extensions/gitlab-mcp-server) | 📋 Planned | TypeScript, open source                                       |
| AWS                | AWS MCP Servers           | [awslabs/mcp](https://github.com/awslabs/mcp)                                                                      | 📋 Planned | Python, open source. Multiple servers (CDK, docs, etc.)       |

## Tier 4 — Broader Ecosystem

| Application       | Upstream              | Upstream Source | Status     | Notes                            |
| :---------------- | :-------------------- | :-------------- | :--------- | :------------------------------- |
| Discord           | Discord MCP Server    | TBD             | 📋 Planned | Community management actions     |
| Asana             | Asana MCP Server      | TBD             | 📋 Planned | Project management               |
| CircleCI          | CircleCI MCP Server   | TBD             | 📋 Planned | CI/CD pipeline control           |
| Bitbucket         | Bitbucket MCP Server  | TBD             | 📋 Planned | Source control                   |
| Microsoft Teams   | Teams MCP Server      | TBD             | 📋 Planned | Enterprise messaging             |
| Coinbase          | Coinbase MCP Server   | TBD             | 📋 Planned | Financial/crypto actions         |

## Tier 5 — Social and Publishing

| Application  | Upstream             | Upstream Source | Status     | Notes                  |
| :----------- | :------------------- | :-------------- | :--------- | :--------------------- |
| X/Twitter    | X MCP Server         | TBD             | 📋 Planned | Social publishing      |
| LinkedIn     | LinkedIn MCP Server  | TBD             | 📋 Planned | Professional publishing |
| YouTube      | YouTube MCP Server   | TBD             | 📋 Planned | Content publishing     |

---

## Not In Scope

The following MCP servers are heavily used but don't wrap a third-party API. They represent local execution and are a different architecture question for MPAS:

- **Filesystem** — local file read/write (built into most agents)
- **Shell/Terminal** — local command execution
- **Playwright/Browser** — local browser automation
- **Context7** — read-only documentation fetching

---

## Contributing

To add an application to the roadmap:

1. Open a PR adding a row to the appropriate tier (or create a new tier).
2. Include the application name, upstream MCP server repo/URL, and why it matters.
3. Set the status to 💡 Requested.

To build an application:

1. Use the builder in [`tool/`](tool/) to generate the plugin, bridge, and tests.
2. Output lands in `applications/<name>/`.
3. Open a PR for review.
4. Update the status in this file to 🚧 In Progress or ✅ Done.
