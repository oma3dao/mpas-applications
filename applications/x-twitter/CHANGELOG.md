# Changelog — x-twitter

## 2026-08-15 — Migrated to the official MCP Tasks extension

- Replaced the proprietary wait tool and result wrappers with `io.modelcontextprotocol/tasks` on MCP 2026-07-28.
- Restored the exact upstream tool definitions and added durable, DID-scoped task reads and cancellation.
- Updated the bridge runtime to `@oma3/mpas@0.1.0-alpha.6` and `@modelcontextprotocol/server@2.0.0`.

## 2026-07-31 — Completed the impact classification

- Reviewed all 24 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 6 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 18 pass-through operations, tagged by
  reason (read 14, routine-job 2, read-public 1, simulated 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Removed private bookmark and poll operations

- Dropped `bookmark_tweet`, `delete_bookmark`, and `vote_on_poll`, taking the
  plugin from 9 operations to 6.
- Bookmarks are private to the account and reversible. `vote_on_poll` is
  mocked upstream and has no real effect today; if it is ever implemented for
  real that is upstream tool drift, which deployments monitor separately.
- The governed set is now exactly the operations with public effect:
  publishing, deletion, and the like/unlike engagement signals.

## 2026-07-29 — Narrowed the governed surface to mutations

- Reduced `plugin.json` from 24 operations to 9. The 15 read-only tools
  (timelines, search, trends, user and follower lookups, tweet detail,
  bookmark listing) are now pass-through: an agent holding X credentials is
  already trusted to read what those credentials can reach, so gating reads
  buys no protection and forces every lookup through an approval round trip.
- Kept every operation that changes account state, graded by whether the
  change is publicly visible and whether it can be undone: publishing is
  high, irreversible removal is critical, public engagement signals are
  medium, and private reversible bookmark edits are low.
- Regraded `favorite_tweet` / `unfavorite_tweet` as medium public signals
  rather than private state, and dropped `bookmark_tweet` / `delete_bookmark`
  from medium to low now that impact is the operator's tuning knob.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 0.1.0

- Captured and packaged the 24-tool upstream surface from
  `rafaljanicki/x-twitter-mcp-server` 0.1.15.
- Reviewed every impact classification. Public publishing is high impact,
  tweet deletion and irreversible deletion of all bookmarks are critical, and
  account-context reads and bounded engagement mutations are medium.
- Added the X API credential requirement and Wivity application/plugin
  identities.
