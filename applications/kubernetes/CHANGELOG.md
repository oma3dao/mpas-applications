# Changelog — kubernetes

## 0.1.0

- Captured and packaged the 20-tool surface from
  containers/kubernetes-mcp-server 0.0.65.
- Governed six critical operations that create, update, scale, or delete
  resources, create or delete pods, or execute commands inside workloads.
- Removed 14 read-only observation and retrieval operations from the governed
  set. They remain available as pass-through tools.
- Added Wivity application/plugin identities and a least-privileged,
  credential-adapter-managed Kubernetes RBAC requirement.
- Used a non-routable discovery-only kubeconfig to enumerate schemas without
  contacting a live cluster; runtime configuration requires an explicit
  credential-adapter-managed `KUBECONFIG`.
