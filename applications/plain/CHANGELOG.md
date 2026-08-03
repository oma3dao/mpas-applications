# Changelog — plain

## 2026-08-02 — Pinned the upstream launch command

- Pinned to commit `c7e28e80` of `tellahq/plain-mcp`, replacing an absolute path
  into the author's source checkout. The launch line keeps `bun@1.3.14` and now
  refers to `{{upstreamCheckout}}`, resolved by the `fetch` steps in the
  distribution block.
- **Version could not be reconciled with `serverInfo.version`.** metadata says
  2.0.0, but this changelog names 1.2.0 and the repository's `package.json` at
  this commit declares 1.2.0. The package is not on npm and the repository
  carries no tags, so a commit SHA is the only available pin. The commit is the
  captured state: the repository was last pushed 2026-07-13, before `capturedAt`.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 82 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 40 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 42 pass-through operations, tagged by
  reason (routine-job 19, metadata-only 18, read 5), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed routine support-desk operations

- Dropped the nineteen operations previously graded `low`, taking the plugin
  from 59 operations to 40: thread assignment, priority, status, snoozing,
  labels, titles, timeline events, custom fields, internal notes, snippets,
  and label types.
- These are the day-to-day actions the agent is deployed to perform. Because
  `defaultRequirement` applies to every governed operation, keeping them
  listed meant a human approval for assigning a ticket or adding a label
  unless the operator wrote a `proposerOnly` entry for each one by name.
- Customer-facing and destructive operations are unaffected: outbound
  messaging, help-center publishing, webhooks, and record deletion all remain
  governed.

## 2026-07-30 — Revalidated and promoted to tested

- Regenerated against the pinned `tellahq/plain-mcp` 1.2.0 source and confirmed
  the upstream server still exposes the same 82-tool surface with no schema drift.
- Confirmed the manually reviewed 59-operation governed set and plugin artifact
  DID remain unchanged.
- Rebuilt the generated bridge and reran the bridge-generator test suite.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 82 operations to 59. The 23 dropped tools are all
  `get_*` / `list_*` reads plus `search_customers` and `download_attachment`.
  These return customer records, threads, and attachments — genuinely
  sensitive material — but a Plain API key is issued precisely so the agent
  can work that queue, and reading it is not disclosing it.
- Kept `create_webhook` and `update_webhook` at critical. Both take an
  arbitrary destination `url`, so either one establishes a standing channel
  that streams customer support data to any endpoint of the caller's
  choosing. This is quiet, persistent, and worse in aggregate than most of
  the delete operations. `delete_webhook` is high — it breaks an integration
  rather than creating one.
- Kept the three outbound customer-messaging tools (`send_email`, `send_chat`,
  `reply_to_thread`) at high. These reach a real person under the company's
  name and cannot be recalled; they are the operations most likely to warrant
  a human approver in a support deployment.
- Kept `generate_help_center_article` at high after confirming it writes.
  Its `help_center_id` argument is "the help center ID to create the article
  in", so it publishes AI-generated text derived from a private support
  thread to a public help center — a plausible path for customer details to
  reach a public website.
- Kept `create_autoresponder` at high: it installs automation that messages
  customers without a human in the loop on each send.
- Regraded deletion rather than treating every delete as critical. Deleting a
  customer, company, tenant, thread, or an entire help center destroys records
  with no undo and stays critical. Deleting a recreatable article, article
  group, tier, knowledge source, or autoresponder is high, and deleting a
  single internal note or snippet is medium.
- Regraded routine support-desk work to low: thread assignment, priority,
  status, snoozing, labels, titles, timeline events, custom fields, internal
  notes, and snippets. These are the reversible day-to-day actions an agent
  is deployed to perform. They remain in the plugin so an operator can gate
  them, but they are graded so that a sensible policy does not have to.
- Lowered `link_thread_to_linear` to medium — it creates a tracking link with
  a small blast radius.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 0.1.0

- Captured and packaged the 82-tool upstream surface from `tellahq/plain-mcp`
  1.2.0.
- Reviewed every impact classification. Customer communications, automations,
  webhooks, public help-center changes, and external issue linking are high
  impact; permanent deletions are critical.
- Added the Plain API credential requirement and Wivity application/plugin
  identities.
