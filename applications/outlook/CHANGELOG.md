# Changelog — outlook

## 2026-07-31 — Completed the impact classification

- Reviewed all 62 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 15 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 47 pass-through operations, tagged by
  reason (read 18, routine-job 16, metadata-only 8, precursor 5), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Aligned the governed surface with `plain`

- Reduced `plugin.json` from 36 operations to 15. The previous set governed
  the mailbox assistant's routine desk work — `mark_read`, `flag_message`,
  `categorize_message`, `move_message`, `copy_message`,
  `reclassify_message`, `batch_triage`, folder creation and renaming, the four
  Microsoft To Do task operations, and the three contact operations. That is
  the job the agent was deployed to do, and gating it trains reviewers to
  approve without reading.
- This brings `outlook` into line with `plain`, which has the same job shape
  and dropped the equivalent support-desk operations. The governed surface is
  now the edges of the job: customer-facing, destructive, automation, and
  host-side.
- Dropped the five draft operations (`create_draft`, `update_draft`,
  `attach_to_draft`, `remove_draft_attachment`, `delete_draft`). A draft
  reaches nobody; `outlook_send_draft` is the governed chokepoint that
  releases it. This mirrors `github.add_comment_to_pending_review`, which is
  pass-through because `pull_request_review_write` publishes it.
- Kept, and why:
  - **Outbound** — `send_message`, `send_with_attachments`, `send_draft`,
    `reply`, `forward`, and the three calendar event operations, which notify
    and cancel on attendees. `forward` also stays governed because it can
    relay an entire confidential thread to an arbitrary recipient.
  - **Destructive** — `delete_message` (supports permanent hard delete) and
    `delete_folder` (removes a folder and its contents).
  - **Automation** — `set_inbox_override` creates a sticky per-sender routing
    rule that keeps acting with no human present, and can quietly divert
    security notifications.
  - **Host-side** — `download_attachment` writes decoded bytes to a
    caller-supplied `save_path` on the Credential Adapter host.
  - **Re-targeting** — `switch_account` changes the identity later approved
    sends go out from.
- Graded `rsvp` and `delete_inbox_override` as `low`, the borderline marker:
  both are governed, but an RSVP carries only accept/decline/tentative and is
  changeable, and deleting an override restores default inbox behaviour.
  Operators who do not want approvals on them should set `proposerOnly`.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 2026-07-31 — Impact normalization

- No membership change; the governed set was already correct. Raised
  `outlook_switch_account` from medium to high.
- Switching the active account re-targets every later call, so an approved
  `outlook_send_message` can be sent from an identity other than the one the
  approver had in mind. For a mail application the sending identity is the
  substance of the action, which puts this alongside
  `railway.link_environment` rather than alongside folder renames.
- Confirmed `outlook_download_attachment` is correctly governed for the right
  reason: it is a read of message content, but it writes decoded bytes to a
  caller-supplied `save_path` on the Credential Adapter host.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 0.1.0

- Captured and packaged the 62-tool surface from `outlook-graph-mcp` 1.12.0.
- Reviewed every operation and reduced the governed set to 36 state-changing
  tools. The 26 upstream-annotated read-only tools remain available as
  pass-through operations.
- Classified outbound mail and attendee-visible calendar changes as high,
  permanent message and folder deletion as critical, and routine reversible
  mailbox/contact/task/draft changes as medium.
- Classified attachment download as high because it writes decoded bytes to a
  caller-selected path on the credential-adapter host.
- Added Wivity application/plugin identities and delegated Microsoft Graph
  credential requirements.
- Discovery used MCP SDK 1.29.0 because the upstream package's unconstrained
  `mcp>=1.27` dependency currently resolves to incompatible MCP SDK 2.0.
