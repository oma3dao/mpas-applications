# Changelog — Cloudflare

## 0.1.0 — 2026-11-14

- Select 26 unchanged tool definitions from the operator's 3,042-tool official
  hosted `codemode=false` capture; verify full source and selected surface hashes.
- Govern all selected operations; add scoped, independent-approval operator
  example with pass-through denied and generic execute explicitly rejected.
- Restrict plugin DNS write schemas to explicit A/AAAA/CNAME/TXT fields; preserve
  original exposed schemas and document the intentional stricter validation.
- Test policy boundaries, composed-schema handling and omitted-tool rejection
  in Tasks and compatibility modes. No provider resource changes or installation.
