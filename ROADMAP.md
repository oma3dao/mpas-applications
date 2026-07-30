# MPAS Applications Roadmap

A list of future bridges that will be built. Each completed application gets its own folder in `applications/`.

To request a new application or volunteer to build one, open a PR updating this file.

## Status Key

| Status | Meaning |
| :----- | :------ |
| 🟢 In Production | Deployed and available for production use |
| ✅ Tested | Bridge implementation is complete and validated, but production availability is not claimed |
| 🚧 In Development | Actively being built |
| 📋 Planned | Prioritized, not yet started |
| 💡 Requested | Requested, not yet prioritized |

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

## Development

Developer infrastructure is the largest segment. Database provider control planes and direct
database data planes are separate MPAS surfaces and should be bridged independently.

| Application | Upstream | Upstream Source | Status | Notes |
| :---------- | :------- | :-------------- | :----- | :---- |
| GitHub | Official GitHub MCP Server | [github/github-mcp-server](https://github.com/github/github-mcp-server) | 🟢 In Production | Protect merges, branch deletion, releases, and other repository mutations |
| PostgreSQL | Reference PostgreSQL MCP Server | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres) | ✅ Tested | Generic data-plane bridge. Protect SQL, DDL, migrations, and destructive writes |
| Supabase | Official Supabase MCP Server | [supabase/mcp](https://github.com/supabase/mcp) | ✅ Tested | Protect SQL, migrations, branches, auth, storage, and project operations |
| Neon | Official Neon MCP Server | [neondatabase/mcp-server-neon](https://github.com/neondatabase/mcp-server-neon) | ✅ Tested | Protect SQL, migrations, project and branch deletion, resets, and credential changes |
| MongoDB | Official MongoDB MCP Server | [mongodb-js/mongodb-mcp-server](https://github.com/mongodb-js/mongodb-mcp-server) | ✅ Tested | Protect drops, deletes, index changes, and Atlas cluster operations |
| PlanetScale | Official PlanetScale MCP Server | [planetscale/mcp-server](https://github.com/planetscale/mcp-server) | ✅ Tested | Protect writes, DDL, and database branch operations |
| Firebase / Firestore | Official Firebase MCP Server | [firebase/firebase-tools](https://github.com/firebase/firebase-tools) | ✅ Tested | Protect database writes plus project, rules, auth, and service operations |
| Upstash | Official Upstash MCP Server | [upstash/mcp-server](https://github.com/upstash/mcp-server) | ✅ Tested | Protect flush/delete, database lifecycle, and credential operations |
| Railway | Official Railway MCP Server | [railwayapp/cli](https://github.com/railwayapp/cli) | ✅ Tested | Protect projects, services, deployments, variables, volumes, and backups |
| Fastly | Official Fastly MCP Server | [fastly/mcp](https://github.com/fastly/mcp) | 💡 Requested | Protect service configuration, deployments, purges, and security changes |
| Vercel | Vercel MCP Server | TBD | 💡 Requested | Protect projects, deployments, domains, environment variables, and team settings |
| AWS | AWS MCP Servers | [awslabs/mcp](https://github.com/awslabs/mcp) | 📋 Planned | Multiple servers covering cloud infrastructure and developer workflows |
| Kubernetes | Kubernetes MCP Server | [stormforge-llc/mcp-k8s-go](https://github.com/stormforge-llc/mcp-k8s-go) | 📋 Planned | Protect cluster administration, resource deletion, and scaling |
| Terraform | Terraform MCP Server | [hashicorp/terraform-mcp-server](https://github.com/hashicorp/terraform-mcp-server) | 📋 Planned | Infrastructure changes have a large blast radius |
| GitLab | GitLab MCP Server | [gitlab-org/editor-extensions/gitlab-mcp-server](https://gitlab.com/gitlab-org/editor-extensions/gitlab-mcp-server) | 📋 Planned | Protect source control and CI/CD mutations |
| Linear | Linear MCP Server | [jerhadf/linear-mcp-server](https://github.com/jerhadf/linear-mcp-server) | 📋 Planned | Protect issue, project, and workspace mutations |
| Jira / Confluence | Atlassian MCP Server | [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server) | 📋 Planned | Remote endpoint only; protect project and knowledge-base mutations |
| Asana | Asana MCP Server | TBD | 📋 Planned | Protect project and task mutations |
| CircleCI | CircleCI MCP Server | TBD | 📋 Planned | Protect CI/CD pipeline control |
| Bitbucket | Bitbucket MCP Server | TBD | 📋 Planned | Protect source control and pipeline mutations |

## Communications

This segment covers marketing, customer communications, collaboration, and publishing.

| Application | Upstream | Upstream Source | Status | Notes |
| :---------- | :------- | :-------------- | :----- | :---- |
| Plain | Plain.com MCP Server | [tellahq/plain-mcp](https://github.com/tellahq/plain-mcp) | 🚧 In Development | Protect customer communications, records, help centers, automations, and webhooks |
| X / Twitter | X (Twitter) MCP Server | [rafaljanicki/x-twitter-mcp-server](https://github.com/rafaljanicki/x-twitter-mcp-server) | 🚧 In Development | Protect public publishing, deletion, engagement, and account-context reads |
| Slack | Slack MCP Server | [modelcontextprotocol/servers/slack](https://github.com/modelcontextprotocol/servers/tree/main/src/slack) | 📋 Planned | Protect messages, invitations, and workspace mutations |
| HubSpot | HubSpot MCP Server | TBD | 💡 Requested | Protect CRM, marketing, sales, and customer communication workflows |
| Klaviyo | Klaviyo MCP Server | TBD | 💡 Requested | Protect campaigns, flows, audiences, and customer messaging |
| beehiiv | beehiiv MCP Server | TBD | 💡 Requested | Protect newsletter publishing, automations, audiences, and subscriptions |
| Gmail | Gmail MCP Server | TBD | 💡 Requested | Protect sending, deleting, labeling, and account-level email operations |
| Outlook | Outlook MCP Server | TBD | 💡 Requested | Protect email, calendar, contact, and mailbox operations |
| Discord | Discord MCP Server | TBD | 📋 Planned | Protect community messages, roles, channels, and moderation |
| Microsoft Teams | Teams MCP Server | TBD | 📋 Planned | Protect enterprise messaging and collaboration actions |
| LinkedIn | LinkedIn MCP Server | TBD | 📋 Planned | Protect professional publishing and engagement |
| YouTube | YouTube MCP Server | TBD | 📋 Planned | Protect content publishing and channel management |

## Trading

This segment covers exchanges, brokerage, payments, and other financial transaction surfaces.

| Application | Upstream | Upstream Source | Status | Notes |
| :---------- | :------- | :-------------- | :----- | :---- |
| Coinbase Agentic Wallet | Coinbase Payments MCP | [coinbase/payments-mcp](https://github.com/coinbase/payments-mcp) | ✅ Tested | Protect wallet authentication, token sends, payments, transfers, and trades |
| Coinbase Advanced Trade | Coinbase CLI MCP Server | [Coinbase CLI](https://docs.cdp.coinbase.com/coinbase-cli/skill.md) | 🚧 In Development | Protect portfolios, accounts, orders, trades, conversions, and transfers |
| Kraken | Kraken MCP Server | [oilst/kraken-mcp](https://github.com/oilst/kraken-mcp) | 💡 Requested | Protect orders, cancellations, withdrawals, and other account mutations |
| Robinhood Crypto | Robinhood Crypto MCP Server | [rohitsingh-iitd/robinhood-mcp-server](https://github.com/rohitsingh-iitd/robinhood-mcp-server) | 💡 Requested | Protect brokerage and crypto orders, transfers, and account mutations |
| Alpaca | Official Alpaca MCP Server | [alpacahq/alpaca-mcp-server](https://github.com/alpacahq/alpaca-mcp-server) | ✅ Tested | Protect stock, crypto, and option orders; cancellations; liquidation; option exercise; and account mutations |
| Stripe | Stripe Agent Toolkit | [stripe/agent-toolkit](https://github.com/stripe/agent-toolkit) | 📋 Planned | Protect payments, refunds, transfers, subscriptions, and account mutations |

---

## Not In Scope

The following MCP servers are heavily used but don't wrap a third-party API. They represent local execution and are a different architecture question for MPAS:

- **Filesystem** — local file read/write (built into most agents)
- **Shell/Terminal** — local command execution
- **Playwright/Browser** — local browser automation
- **Context7** — read-only documentation fetching

## Database Bridge Security Requirements

Database and database-platform bridges must:

- Bind approvals to the exact MCP server, tool name, canonical arguments, target project,
  environment, database, branch, and schema.
- Treat arbitrary SQL, DDL, migrations, bulk writes, deletes, drops, truncates, restores,
  branch resets, project/service deletion, backup deletion, and credential rotation as
  high-impact actions.
- Preserve the upstream MCP tool interface where one exists. Provider-specific extensions
  must use separate, explicitly versioned tools.
- Never return database passwords, resolved connection URLs, API tokens, or other reusable
  credentials to the proposer. Secret substitution happens only inside the credential adapter.
- Ensure the proposer cannot bypass MPAS through shell environment variables, `.env` files,
  provider CLIs, database clients, browser sessions, tunnels, or unrestricted outbound network
  access.
- Record enough pre-execution state and post-execution evidence to identify the exact target
  and result without logging secret values or unrestricted production data.

---

## Contributing

To add an application to the roadmap:

1. Open a PR adding a row to the appropriate segment (or propose a new segment).
2. Include the application name, upstream MCP server repo/URL, and why it matters.
3. Set the status to 💡 Requested.

To build an application:

1. Use the builder in [`tool/`](tool/) to generate the plugin, bridge, and tests.
2. Output lands in `applications/<name>/`.
3. Open a PR for review.
4. Update the status in this file as the bridge moves through 🚧 In Development,
   ✅ Tested, and 🟢 In Production.
