# mpas-applications

> [!WARNING]
> **Experimental alpha.** These MPAS integrations are not production-ready or
> independently audited. Breaking changes are expected. The presence of an
> application in this repository means that its plugin and bridge artifacts
> have been contributed; it does not mean that the integration is suitable for
> production use or has been independently validated.

MPAS application plugins, bridges, and supporting artifacts contributed by
their publishers.

The protocol specifications, SDK, reference Credential Adapter, and
development-time bridge generator live in
[`oma3dao/mpas`](https://github.com/oma3dao/mpas). This repository contains
the generated and reviewed application-specific artifacts.

These applications use the MCP execution profile because agents talk to MCP
servers. MPAS the protocol is broader: it is not limited to MCP, and a
Proposer or Signer can be any entity that holds a private key — a human,
agent, device, service, or organization.

## Applications

See [ROADMAP.md](ROADMAP.md) for the current list of completed, in-progress,
and planned applications.

## Structure

```
mpas-applications/
  README.md
  ROADMAP.md
  LICENSE

  applications/                  # Contributed application artifacts
    <application>/
      plugin.json
      registry-entry.json
      harness-config.json
      build-artifacts/
        tools-list.snapshot.json
        metadata.json
        classification.json
      bridge/
        package.json
        src/
        tsconfig.json
```

## How Applications Are Created

The development-time
[MPAS bridge generator](https://github.com/oma3dao/mpas/tree/main/bridge-generator):

1. Connects to an upstream MCP server and discovers its tools.
2. Captures the discovered tool surface for review.
3. Generates an MPAS Application Plugin, registry entry, harness
   configuration, and bridge server.
4. Writes static artifacts that can be reviewed and contributed under
   `applications/<name>/`.

Application publishers review and maintain their contributed artifacts. An
application can also be built manually if it conforms to the MPAS profiles.

## How the Bridge Works

For any existing MCP server, the generated bridge preserves the upstream tool names and input schemas. Agents call the same tools with the same arguments, but high-impact actions are intercepted for MPAS approval before being forwarded upstream.

```
Agent
  → Generated MPAS Bridge (tool-input compatible)
  → Credential Adapter (Verifier)
  → Original MCP Server
  → Application API
```

A bridge is **tool-input compatible, not a transparent drop-in**. Multi-party approval is asynchronous, so an approval-gated call cannot return the upstream result on the original request. Per the [MPAS MCP Proposer Bridge Client Interface Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-mcp-proposer-bridge-client.md), a bridge differs from its upstream server by:

- appending a standard MPAS notice to tool descriptions;
- adding the reserved `mpas_wait_for_action_result` tool;
- returning `MpasBridgeDeferredResult` instead of a native result when approvals are required, and
- requiring the client to retrieve the eventual result through the wait tool.

Native results are relayed verbatim whenever one exists. Agent integrations must understand the profile even when they already understand the upstream server.

## What Belongs in `plugin.json`

`plugin.json` defines an application's **governed surface**, and it is the most
consequential file in a contributed application. It does not control what an
agent can call — the bridge advertises the full upstream tool surface either
way. It controls what the Credential Adapter routes through approval.

An operation listed in `operations` is validated against its
`executionPayloadSchema`, evaluated against deployment policy, and gated by
whatever approval requirement the operator configured. An operation that is
absent is routed as **pass-through**: it executes on the Proposer's verified
signature alone, with no schema validation and no policy evaluation. See the
[MCP Execution Profile §5](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-mcp.md)
and the
[JSON Verifier Policy Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-policy-json.md).

Removing an operation therefore does not disable it. It exempts it.

### Where the exemptions are explained

Because `plugin.json` lists only what is governed, it cannot tell you *why*
anything else was left out — an operator reading it cannot distinguish a
deliberate exemption from an oversight. That record lives in
`build-artifacts/classification.json`, which carries an entry for **every**
upstream operation, governed or not, with an impact assessment and a written
rationale. Pass-through entries name the reason in a leading tag:

| Tag | Meaning |
| --- | --- |
| `read` | Returns data the credential already reaches |
| `read-public` | Public or vendor data with no account context |
| `metadata-only` | Inventory, schema, or configuration listing |
| `routine-job` | The agent's own desk work: internal, reversible, non-destructive |
| `precursor` | A preparation step whose release point is governed |
| `validation-only` | Lints or validates; no state change |
| `simulated` | Paper trading or a mocked upstream with no real effect |

An operator deciding whether to *govern more* in deployment config should
start there — filtering for `routine-job` finds the operations most likely to
be worth revisiting for a stricter deployment.

Two cautions. The file is **advisory**: `artifactDid` covers `plugin.json`
only, so classification carries no integrity guarantee and must never be
treated as the authority on what is governed — `plugin.json` is. And it can
drift from the plugin. That is not intended, but it is possible, so read it as
guidance rather than as a control.

### The rule

**Govern operations that change state. Leave reads as pass-through.**

A credential is issued to an agent so it can do a job, and reading is part of
that job. If an operator gives an agent access to data, they have accepted
that the agent can see that data — gating reads adds an approval round trip to
every lookup without adding control. What warrants an independent signer is
the agent *acting*: publishing, spending, deploying, deleting, messaging a
customer, or changing configuration.

**Over-governing is a failure, not a safe default.** A plugin that governs
everything produces an approval prompt for every lookup, reviewers learn to
approve reflexively, and the approvals that actually matter stop being read.
A surface where everything is governed and a surface where nothing is
reviewed converge on the same outcome. If a plugin governs most of its
upstream tools, that is a signal to re-examine it, not evidence of rigour.

An operator who disagrees can always override the plugin in the Credential
Adapter’s deployment config JSON (the file in the adapter `config/` folder —
not `harness-config.json` in this repository). That config can:

- **govern more** — name additional tools under policy so they enter the
  governed set even when the plugin left them as pass-through; or
- **require proposer only** — mark a function/tool `proposerOnly` so it
  executes on the Proposer’s verified signature alone, with no additional
  Approver.

They still cannot turn a plugin-declared operation into ungoverned
pass-through merely by omitting approval rules; once it is in the governed
set (plugin or config), it stays under policy evaluation.

### Don't govern the job itself

Not every state change deserves an approver. An agent is deployed to do a job,
and the routine mechanics of that job are as much what the credential is for
as reading is. Where an operation is **internal, reversible, and
non-destructive**, and it is the work the agent exists to perform, leave it as
pass-through even though it writes. Gating the job buys nothing either way: a
human signer stops reading and starts rubber-stamping, which costs you the
approvals that *do* matter, and an agent signer adds a round trip while
holding no information the Proposer lacked.

Govern the edges of the job instead:

- **Customer-facing** — anything that reaches a person outside the
  organization and cannot be recalled.
- **Destructive** — irrecoverable loss of a record, thread, or container.
- **Automation** — standing rules, schedules, and autoresponders: anything
  that will act again later with no human present.
- **Egress** — webhooks and other standing channels that stream data outward.

Two applications with the same job shape, which therefore land in the same
place:

- **`plain`** is a support desk. Thread assignment, priority, status,
  snoozing, labels, titles, timeline events, internal notes, and snippets are
  the job, and are pass-through. Outbound customer messaging, help-center
  publishing, webhook targets, and record deletion are governed.
- **`outlook`** is a mailbox assistant. Read state, flags, categories, folder
  organization, drafts, tasks, and contacts are the job, and are pass-through.
  Sending, replying, forwarding, calendar invitations that notify attendees,
  hard deletion, and inbox rules are governed.

Note the drafting pattern in both. `outlook_create_draft` and
`outlook_update_draft` are pass-through because `outlook_send_draft` is the
governed chokepoint — the same reason `github.add_comment_to_pending_review`
is pass-through while `pull_request_review_write` is governed. **Govern the
moment of release, not the preparation.**

### When a read must be governed

The rule has exactly one exception, and it turns on **capability, not
sensitivity**. Before governing any read, apply this test:

> After this call returns, can the caller do something **without going through
> the bridge** that it could not do before?

| Operation | What the caller gains | Verdict |
| --- | --- | --- |
| `kraken_balance` | A number it did not previously know | Pass-through |
| `supabase.get_publishable_keys` | Keys designed to ship in client apps; row level security still applies | Pass-through |
| `firebase_get_sdk_config` | A project identifier, not a secret | Pass-through |
| `railway.list_variables` | Live database and payment-provider credentials for third-party systems MPAS does not govern | **Govern** |
| `neon.get_connection_string` | A working URI for the branch's read-write compute | **Govern** |
| `upstash.qstash_get_user_token` | A reusable `QSTASH_TOKEN` | **Govern** |
| `kubernetes.resources_get` with `kind: Secret` | Cluster credentials — `kind` is a free-form string, so `Secret` is a valid value | **Govern** |

If the answer is no, the operation is pass-through no matter how private the
data feels. An ungoverned tool that hands out the keys makes governing
everything else theatre — but that is the *whole* of the exception.

### Four ways an operation escapes governance

Credential disclosure is the read exception above. The other three are state
changes that the ordinary rule already catches. They are listed together so
that "bypass" is not mistaken for a read-only concern.

| Route | Mechanism | A read? | Examples |
| --- | --- | :---: | --- |
| **Disclosure** | Returns a reusable secret or capability | Yes | `railway.list_variables`, `neon.get_connection_string`, `upstash.qstash_get_user_token`, `vercel.get_access_to_vercel_url` |
| **Injection** | Lets the proposer supply its own credential, defeating the adapter's credential binding | No | `mongodb.connect` (arbitrary `connectionString`), `firebase_login` |
| **Re-targeting** | Changes which target or identity later calls act on, so an approver may authorize against something other than what they pictured | No | `coinbase_set_env` (sandbox → production), `outlook_switch_account`, `railway.link_environment`, `firebase_update_environment` |
| **Host-side effects** | Writes to the Credential Adapter's own filesystem via a caller-chosen path | Either | `kraken_export_retrieve` (`output_file`), `outlook_download_attachment` (`save_path`) |

Host-side effects are not a credential concern, but they escape the "this is
just an API call" model: a caller-chosen path is a write primitive on the
machine running the adapter.

### Reasons that are not reasons

Each of the following has produced an over-governed plugin in this
repository. None is sufficient on its own.

**"It requires authentication."** Every tool behind a Credential Adapter uses
a credential — that is the precondition for the bridge existing at all. As a
discriminator it selects the entire surface. What matters is the *direction*
of credential flow: a credential going **into** a call is ubiquitous and means
nothing; a credential coming **out** is the signal.

> How this goes wrong: a bridge governs every private endpoint of its upstream
> API and leaves exactly the public market-data endpoints as pass-through.
> That reproduces the vendor's own public/private API split; it is not a
> governance decision. It governs `balance`, `ledgers`, `open_orders`, and
> `trades_history` — ordinary reads that consume a credential and return none.

**"It returns sensitive data."** The operator accepted that when they issued
the credential. A plugin that governs the tools reading real rows while
exempting the ones reading schema has drawn a data-sensitivity line, not a
governance line: both are reads, and neither confers new capability.

**"It costs money."** Metered consumption is not a state change. Distinguish a
*purchase* — `vercel.buy_credits`, `coinbase.trade`, `create_project` — from a
query that happens to be billed per byte scanned. Runaway spend on reads is
better controlled by provider-side quotas than by an approval on every lookup.

**"The upstream server labels it dangerous."** A useful hint worth checking,
never a substitute for reading the schema. The absence of such a label means
nothing either.

### Watch for verbs that lie

Classify on what an operation *does* — not on its name, and not on its HTTP
verb. Read the input schema before deciding. All four directions occur:

- **Reads that write.** `neon.explain_sql_statement` sounds diagnostic, but
  takes arbitrary SQL plus an `analyze` flag, and `EXPLAIN ANALYZE` executes
  what it is given. Governed. MongoDB's `explain` does not execute writes and
  is pass-through — same word, opposite answer.
- **Writes that don't.** `coinbase_advanced_trade.orders_preview` is a POST
  whose own description says it estimates fees "without executing", and
  `vercel.get_purchase_quote` states it "NEVER charges". Pass-through.
- **Generators that publish.** `plain.generate_help_center_article` sounds
  like generation, but its `help_center_id` argument names the help center to
  *create the article in* — it publishes to a public site. Governed.
- **Guardrails that guard nothing.** `supabase.confirm_cost` looks like a
  spending control, but an agent can call it to satisfy its own precondition.
  Pass-through; the real guarantee is that `create_project` is governed.

Treat a free-form `kind`, `type`, `path`, `url`, `sql`, or `output_file`
argument as a red flag on any tool, including one named `get_*` or `list_*`.
Classify it by what its arguments permit at their extremes, not by the
examples in its description.

### Grading impact

`impact` is informational and never sets an approver count — approval
requirements live in the operator's policy
([Application Plugin Profile §12](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-application-plugin.md)).
Its job is to let a policy author sort a large surface quickly, so grade
consistently across applications:

| Level | Meaning | Suggested approver |
| --- | --- | --- |
| `critical` | Irreversible destruction, movement of funds, or a bypass of the governance boundary itself. | At least one human, at least for the unbounded case |
| `high` | Significant change to production, configuration, or published content; recoverable with effort. | Operator's call; lean human where the effect is externally visible |
| `medium` | Routine mutation with a bounded blast radius. | Operator's call |
| `low` | Borderline. Governed, but the publisher expects many operators will relax it. | An independent agent signer is usually enough |

### Approvers are not necessarily people

As noted above, a Signer is any entity holding a private key — including
another agent. This matters when weighing whether an operation is worth
governing: the question is not "would a person want to review this" but
**"would an independent signer add anything here?"**

Severity is only half of that. The other half is what kind of check actually
helps:

- **Checkable constraints** — an amount ceiling, a recipient allowlist, a rate
  limit, a target environment, whether a filter is bounded. An agent signer is
  *better* than a person at these: it applies the rule identically every time,
  can hold state across calls, and does not tire. A human asked to eyeball
  whether a number is under a threshold will start waving them through.
- **Judgment, context, and accountability** — should we email this customer at
  all, is this refund legitimate, do we really want to delete this. These need
  a person, and for anything with legal or organizational weight the human
  signature is the point.

The two combine well through policy match conditions: an agent signer clears
the routine case and a human is required past a threshold. That is how an
operator expresses "trades under $10,000 need no human" without leaving trades
ungoverned — and it only works if the operation is in the plugin, since a
pass-through operation can never carry a policy entry.

One caveat worth stating plainly: **the independence has to be real.** An
agent signer that runs the same model, on the same prompt, exposed to the same
injected content as the Proposer adds a signature without adding a second
opinion. Independence comes from a distinct key, a distinct trust domain, and
ideally distinct inputs — not from the count of signatures.

**`low` means borderline, not trivial.** It is a deliberate signal to whoever
authors policy: this operation is inside the governed set, but reasonable
deployments may not want a *human* on it. Use it when an operation genuinely
sits on the line — outbound but minimal in content, or reversible in a way its
siblings are not.

The signal matters because `low` still costs something. `defaultRequirement`
applies to *every* governed operation, and production deployments are advised
to default to at least one non-proposer approval — so a `low` operation still
blocks on a signature until the operator either points it at an agent signer
or marks it `proposerOnly`. `low` is what tells them which entries are worth
writing.

So do not use `low` as somewhere to park an operation you could not justify
governing. If no independent signer — human or agent — would add anything,
leave it as pass-through instead. That does not take the choice away from the
operator: deployment config can *govern more*, adding tools to the governed
set that the plugin left as pass-through. The plugin states the publisher's
judgment; it should not hedge by listing everything and grading the
difference.

**Pass-through is not untracked.** The Proposer builds an Action Package for
every tool call; routing is a Verifier decision made afterwards. A
pass-through operation still carries an `actionId`, the Proposer's signature,
a hash-bound Execution Payload, structure validation, a dispatch-ledger entry
that permits at most one dispatch, and an Execution Receipt. It executes on a
*verified* signature after proposer gating — it is un-approved, not
unauthenticated. Leaving an operation out of the plugin costs you review, not
auditability.

What pass-through does give up is fail-closed validation against
`executionPayloadSchema`. That control exists to stop a semantically
meaningful extra argument — an undocumented `force`, or a parameter upstream
added after the plugin was published — from riding inside a signed payload and
silently changing the meaning of what a signer approved. Since a pass-through
operation has no signer, that harm does not arise, and malformed arguments are
rejected by the target anyway and recorded as a `failed` receipt.

Schema validation is a preventive control; the signed payload and receipt are
detective ones. Leaving an operation as pass-through trades away the former
and keeps the latter. For an operation that is private, reversible, and
non-financial, that is the right trade.

Grade against the other applications in this repository, not only within your
own. Posting a public message should not be `high` in one plugin and `medium`
in another, and cancelling an order should not be `critical` in one and `high`
in its sibling. If most of your operations land on the same level —
particularly if most are `medium` — you have probably defaulted rather than
graded.

### Before you submit

- [ ] Every entry in `operations` changes state, or is a read that fails the
      capability test above.
- [ ] You read the **input schema** of every operation, both the ones you kept
      and the ones you dropped — not just its description.
- [ ] Nothing was kept merely because it needs a credential, returns private
      data, or costs money.
- [ ] Free-form `kind` / `type` / `path` / `url` / `sql` arguments were
      checked for what they permit at their extremes.
- [ ] Impact grades are spread across levels and comparable to the other
      applications here.
- [ ] Any `low` grade marks a genuine borderline call you want flagged to
      policy authors — not an operation you could not justify governing.
- [ ] The agent's routine job mechanics are pass-through; what is governed is
      the customer-facing, destructive, automation, and egress edges.
- [ ] `plugin.artifactDid` in `registry-entry.json` was recomputed
      (see [Artifact DID](#artifact-did)).
- [ ] `CHANGELOG.md` records what was left as pass-through and why.

## Artifact DID

Each application's `registry-entry.json` includes an `artifactDid` — a content-addressable identifier derived from the canonical JSON of its `plugin.json`. The MPAS Credential Adapter validates this hash at startup and rejects a mismatch. That check proves **content integrity only**: the bytes loaded match the identifier in deployment configuration.

Integrity is not the whole trust story. After the hash check, the adapter also fetches the attestations and related evidence bound to that `artifactDid` (responsibility claims, cybersecurity assessments, linked identifiers, and other recognized evidence) so the operator can decide whether to trust the plugin. A matching hash does not by itself prove publisher legitimacy or that a trusted party reviewed the artifact.

See the full method specification: [did:artifact Method Spec](https://oma3dao.github.io/omatrust-docs/specification/did-artifact-method-spec.html)

### How to compute

**Via the OMATrust UI (recommended):**

1. Go to https://test.app.omatrust.org/publish/security-assessment
2. Upload the application's `plugin.json`
3. Copy the computed `did:artifact:` value (no need to submit the form)
4. Add it to `registry-entry.json` under `plugin.artifactDid`

**Using `@oma3/omatrust` (Node.js):**

```ts
import { artifactDidFromJson } from "@oma3/omatrust/identity";
import { readFileSync } from "fs";

const plugin = readFileSync("applications/github/plugin.json", "utf-8");
const did = await artifactDidFromJson(plugin);
console.log(did);
// did:artifact:bafkreic3bb3zcnsxqtdmf4xzm77qluxv6extrf263nuasoojuhoxpb23re
```

**Algorithm (manual implementation):**

1. Canonicalize the plugin JSON per [RFC 8785](https://datatracker.ietf.org/doc/html/rfc8785) (JSON Canonicalization Scheme)
2. SHA-256 hash the resulting bytes
3. Create a CIDv1 with raw codec (`0x55`) and the SHA-256 multihash
4. Encode as base32lower
5. Prefix with `did:artifact:`

### When does it change?

Any modification to `plugin.json` — adding/removing operations, changing schemas, updating metadata — produces a different canonical form and therefore a different hash. When you update `plugin.json`, you **must** recompute and update the `artifactDid` in both `registry-entry.json` and any deployment configs that reference it.

### Deployment config usage

When writing the Credential Adapter deployment config JSON (the file in the
adapter `config/` folder), include the `artifactDid` in the `plugin` section:

```json
{
  "plugin": {
    "pluginDid": "did:web:wivity.com:plugins:github-mcp-server",
    "artifactDid": "did:artifact:bafkreic3bb3zcnsxqtdmf4xzm77qluxv6extrf263nuasoojuhoxpb23re"
  }
}
```

## Specifications

Applications conform to the MPAS protocol:

- [MPAS Core Specification](https://github.com/oma3dao/mpas/blob/main/specs/mpas-specification.md)
- [Application Plugin Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-application-plugin.md)
- [MCP Execution Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-mcp.md)
- [MCP Proposer Bridge Client Interface Profile](https://github.com/oma3dao/mpas/blob/main/specs/mpas-profile-mcp-proposer-bridge-client.md)

## Related Repositories

| Repository | Description |
| --- | --- |
| [oma3dao/mpas](https://github.com/oma3dao/mpas) | MPAS specifications, SDK, bridge generator, reference implementation, and conformance model |

## License and participation

Software and other contributions to this repository are licensed under the
[Apache License 2.0](LICENSE).

By submitting material for inclusion in this repository, contributors agree
that it may be distributed under the Apache License 2.0.

Final OMA3 Specifications are separately governed by
[OMA3's Intellectual Property Rights Policy](https://www.oma3.org/intellectual-property-rights-policy)
and applicable OMA3 review and approval processes.
