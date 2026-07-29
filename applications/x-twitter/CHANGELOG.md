# Changelog — x-twitter

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
