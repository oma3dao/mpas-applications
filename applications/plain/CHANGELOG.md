# Changelog — plain

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
