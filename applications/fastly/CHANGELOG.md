# Changelog — fastly

## 2026-08-02 — Pinned the upstream launch command

- Pinned to `npx -y @fastly/mcp@2.1.4`, replacing a local `node_modules/.bin`
  path. 2.1.4 matches `serverInfo.version` exactly.
- CI now fails on any author-local absolute path in `harness-config.json`
  or `build-artifacts/metadata.json`. An upstream nobody can launch is a
  classification nobody can reproduce, and therefore cannot check.

## 2026-07-31 — Completed the impact classification

- Reviewed all 3 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 1 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 2 pass-through operations, tagged by
  reason (metadata-only 1, read-public 1), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 0.1.0

- Captured and packaged the three-tool surface from Fastly's official
  `@fastly/mcp` 2.1.4 server.
- Kept `execute` governed and classified it critical because it runs arbitrary
  JavaScript against the authenticated Fastly API, including destructive and
  security-sensitive operations.
- Removed `search` and `inspect` from the governed set. They only query bundled
  API metadata and remain available as pass-through tools.
- Added Wivity application/plugin identities and the Fastly API token
  credential requirement.
