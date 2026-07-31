# Changelog — fastly

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
