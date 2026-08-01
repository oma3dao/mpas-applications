# Changelog — kubernetes

## 2026-07-31 — Completed the impact classification

- Reviewed all 19 entries in `build-artifacts/classification.json`,
  covering the full upstream surface rather than only the 8 governed
  operations. `plugin.json` lists what is governed; it cannot record why
  anything else was left out, so that reasoning now lives here.
- Wrote a rationale for each of the 11 pass-through operations, tagged by
  reason (read 6, metadata-only 5), so an operator
  deciding whether to govern more in deployment config can see what was
  deliberately exempted and on what grounds.
- Aligned every governed entry's impact with `plugin.json`.
- The file remains advisory. `artifactDid` covers `plugin.json` only, so
  classification carries no integrity guarantee and is not the authority on
  what is governed.

## 2026-07-31 — Governed Secret-bearing resource reads

- Added `resources_get` and `resources_list` to the governed set at critical,
  taking the plugin from 6 operations to 8. Both accept a free-form `kind`
  string — the schema does not constrain it to the examples in the
  description — so `kind: Secret` is a valid call. Left as pass-through they
  return Kubernetes Secrets in full: database passwords, cloud provider
  credentials, and TLS private keys. `resources_list` returns every Secret in
  a namespace in a single call.
- This is the credential-disclosure exception in the repository README, not a
  reversal of the reads-are-pass-through rule. The other thirteen read tools
  (`pods_list`, `pods_log`, `events_list`, `nodes_top`, and the rest) stay
  pass-through because none of them yields a credential.
- Both are graded critical because impact is graded on what the arguments
  permit at their extremes. Most calls will be innocuous — reading a
  ConfigMap or a Deployment — so operators SHOULD narrow this in policy with
  a condition on `/arguments/kind`, requiring approval for `Secret` and
  `proposerOnly` otherwise. Plugin membership is what makes that policy
  expressible at all; a pass-through operation can never carry a policy entry.
- Lowered `pods_delete` and `resources_scale` from critical to high. A deleted
  pod is normally recreated by its controller, and scaling is reversible;
  neither is in the same class as `resources_delete`, which can remove a
  namespace or a PersistentVolumeClaim.
- Recomputed `plugin.artifactDid` in `registry-entry.json`.

## 0.1.0

- Captured and reviewed the 20-tool upstream surface from
  containers/kubernetes-mcp-server 0.0.65.
- Disabled `configuration_view` from the bridge's advertised surface because
  its native result can expose kubeconfig authentication material. The
  credential adapter must never return tokens, client certificates, private
  keys, auth-info, or kubeconfig contents to the proposer.
- Governed six critical operations that create, update, scale, or delete
  resources, create or delete pods, or execute commands inside workloads.
- Removed 13 safe read-only observation and retrieval operations from the
  governed set. They remain available as pass-through tools.
- Added Wivity application/plugin identities and a least-privileged,
  credential-adapter-managed Kubernetes RBAC requirement.
- Used a non-routable discovery-only kubeconfig to enumerate schemas without
  contacting a live cluster; runtime configuration requires an explicit
  credential-adapter-managed `KUBECONFIG`.
