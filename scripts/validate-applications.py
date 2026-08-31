#!/usr/bin/env python3
"""Validate the contributed application artifacts.

Checks every directory under applications/ for the invariants that keep a
plugin loadable and its supporting artifacts honest. Standard library only.

Errors (exit 1):
  - plugin.json structure per the MPAS Application Plugin Profile
  - operation keys match their executionPayloadSchema name.const
  - every governed operation exists in the upstream tool snapshot
  - registry-entry.json plugin.artifactDid matches the canonical hash of
    plugin.json (the Credential Adapter rejects a mismatch at startup)
  - registry-entry.json optional upstream pointers are upstream.repository 
    and upstream.distributionUrl (URI if set)
  - classification.json covers exactly the upstream surface
  - no classification entry is still an unreviewed 'name-heuristic' draft
  - pass-through classification entries carry a recognised reason tag
  - no author-local absolute path in harness-config.json or metadata.json
    (LOCAL_PATH_EXEMPT holds the not-yet-migrated applications)
  - npx launch package specs in harness-config.json / metadata.json carry an
    exact version (not bare names or @latest)
  - generated bridges pass their existing lazy KeyManager to independent
    Action Relay and Coordination Service clients, use the adaptive protocol
    selector, retain the direct-topology Adapter compatibility path behind
    ActionEndpointClient, construct routed Delivery Envelopes, and depend on
    the reviewed @oma3/mpas release
  - credential-returning tools have deterministic reject entries in their
    checked-in Credential Adapter configuration examples
  - harness metadata describes distinct Tasks and conventional compatibility
    surfaces rather than a union exposed to one client

Warnings (exit 0):
  - classification impact disagrees with plugin impact. Drift is not intended
    but is possible; classification is advisory and plugin.json is the
    authority, so this never fails the build.

Usage: validate-applications.py [--github]
  --github  emit GitHub Actions workflow annotations as well as plain output
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APPS = ROOT / "applications"

IMPACTS = {"low", "medium", "high", "critical"}
REASON_TAGS = {
    "read",
    "read-public",
    "metadata-only",
    "routine-job",
    "precursor",
    "validation-only",
    "simulated",
}

DEFAULT_MPAS_SDK_VERSION = "0.1.0-alpha.10"
MPAS_SDK_VERSION_OVERRIDES = {}
REQUIRED_CA_REJECTS = {
    "railway": "list_variables",
    "upstash": "qstash_get_user_token",
}
# Absolute paths that only exist on the machine that ran discovery. Matched
# anywhere in a string, since these appear inside argv arrays.
LOCAL_PATH_RE = re.compile(
    r"(?:^|[\s\"'=:])(?:"
    r"/(?:Users|home|root|tmp|private|opt/homebrew|usr/local/Cellar)/"
    r"|/var/(?:folders|tmp)/"
    r"|[A-Za-z]:[\\/]{1,2}(?:Users|Program Files)"
    r")"
)

# Applications still carrying an author-local upstream path. Shrink this list;
# never add to it. An entry that has become clean is itself an error, so the
# list cannot outlive the problem it documents.
LOCAL_PATH_EXEMPT = {
    "outlook": "excluded from the de-localization workstream by the requester",
    "x-twitter": "excluded from the de-localization workstream by the requester",
}

# Optional discoverability pointers on registry-entry.json upstream. Omit when
# unknown (source may be private; not every distribution has a public page).
URI_RE = re.compile(r"^https?://", re.IGNORECASE)

# npm package specs accepted by npx: name or @scope/name, optional @version.
NPM_PACKAGE_RE = re.compile(
    r"^(?:(@[A-Za-z0-9._-]+/[A-Za-z0-9._-]+)|([A-Za-z0-9._-]+))(?:@(.+))?$"
)
# Exact npm version only (semver core + optional prerelease/build). Dist-tags
# (latest, beta, …), ranges (^/~/>/||/x), and wildcards are rejected.
EXACT_NPM_VERSION_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)"
    r"(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?"
    r"(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
)

PLUGIN_REQUIRED = [
    "version",
    "type",
    "pluginDid",
    "pluginVersion",
    "publisherDid",
    "applicationDid",
    "executionProfile",
    "operations",
]


# --- did:artifact -----------------------------------------------------------

def _canonical(obj) -> str:
    """RFC 8785 (JCS). Property names sort by UTF-16 code unit."""
    if obj is True or obj is False or obj is None:
        return json.dumps(obj)
    if isinstance(obj, dict):
        items = sorted(obj.items(), key=lambda kv: kv[0].encode("utf-16-be"))
        body = ",".join(
            json.dumps(k, ensure_ascii=False) + ":" + _canonical(v) for k, v in items
        )
        return "{" + body + "}"
    if isinstance(obj, list):
        return "[" + ",".join(_canonical(v) for v in obj) + "]"
    if isinstance(obj, int):
        return str(obj)
    if isinstance(obj, float):
        if obj.is_integer() and abs(obj) < 1e21:
            return str(int(obj))
        return repr(obj)
    return json.dumps(obj, ensure_ascii=False)


def artifact_did(plugin_text: str) -> str:
    digest = hashlib.sha256(_canonical(json.loads(plugin_text)).encode("utf-8")).digest()
    cid = bytes([0x01, 0x55, 0x12, 0x20]) + digest
    return "did:artifact:b" + base64.b32encode(cid).decode("ascii").lower().rstrip("=")


# --- reporting --------------------------------------------------------------

class Report:
    def __init__(self, github: bool) -> None:
        self.github = github
        self.errors = 0
        self.warnings = 0

    def error(self, file: str, msg: str) -> None:
        self.errors += 1
        print(f"  ERROR   {msg}")
        if self.github:
            print(f"::error file={file}::{msg}")

    def warn(self, file: str, msg: str) -> None:
        self.warnings += 1
        print(f"  warning {msg}")
        if self.github:
            print(f"::warning file={file}::{msg}")


def load(path: Path, rel: str, report: Report):
    if not path.exists():
        report.error(rel, f"{rel} is missing")
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        report.error(rel, f"{rel} is not valid JSON: {exc}")
        return None


# --- checks -----------------------------------------------------------------

def _local_paths(node, trail: str = ""):
    """Yield (json-path, offending string) for every author-local path found."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield from _local_paths(v, f"{trail}.{k}" if trail else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from _local_paths(v, f"{trail}[{i}]")
    elif isinstance(node, str) and LOCAL_PATH_RE.search(node):
        yield trail, node


def check_local_paths(app_dir: Path, report: Report) -> None:
    """No harness-config.json or metadata.json may name a path on the author's box."""
    app = app_dir.name
    found = []
    for rel in ("harness-config.json", "build-artifacts/metadata.json"):
        path = app_dir / rel
        if not path.exists():
            continue
        try:
            doc = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue  # reported elsewhere
        for trail, value in _local_paths(doc):
            found.append((f"applications/{app}/{rel}", trail, value))

    if app in LOCAL_PATH_EXEMPT:
        if found:
            print(f"  known-local (exempt: {LOCAL_PATH_EXEMPT[app]})")
        else:
            report.error(
                f"applications/{app}/harness-config.json",
                f"{app} is listed in LOCAL_PATH_EXEMPT but has no author-local path "
                "left — remove it from the list so the exemption cannot outlive the "
                "problem it documents",
            )
        return

    for file, trail, value in found:
        report.error(
            file,
            f"{trail} contains an author-local absolute path: {value!r}. "
            "Upstream commands must be resolvable on any machine — pin an npm "
            "version, a PyPI version, an image digest, or a release URL with a "
            "checksum. Nobody can reproduce a classification they cannot run.",
        )


def _npx_package_specs(command, args):
    """Yield npm package specs that npx would resolve from a command argv."""
    tokens = []
    if command == "npx":
        tokens = list(args or [])
    elif isinstance(command, list) and command and command[0] == "npx":
        tokens = list(command[1:])
    else:
        return

    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if not isinstance(tok, str):
            i += 1
            continue
        if tok in ("-y", "--yes"):
            i += 1
            continue
        if tok in ("-p", "--package"):
            if i + 1 < len(tokens) and isinstance(tokens[i + 1], str):
                yield tokens[i + 1]
                i += 2
                continue
            i += 1
            continue
        if tok.startswith("-"):
            i += 1
            continue
        # First positional after flags is the package (or package@version).
        yield tok
        return


def _floating_npm_reason(spec: str):
    """Return an error reason if spec is missing or not an exact npm version."""
    if not isinstance(spec, str) or not spec or spec.startswith("{{"):
        return None
    # Paths / URLs are not package specs (scoped @org/pkg still starts with @).
    if "://" in spec:
        return None
    if "/" in spec and not spec.startswith("@"):
        return None
    match = NPM_PACKAGE_RE.match(spec)
    if not match:
        return None
    version = match.group(3)
    if version is None:
        return f"{spec!r} has no version — use {spec}@<exact-version>"
    if not EXACT_NPM_VERSION_RE.match(version):
        return (
            f"{spec!r} is not pinned to an exact version "
            f"(got {version!r}; use a semver like 1.2.3, not a dist-tag or range)"
        )
    return None


def check_floating_npm_specs(app_dir: Path, report: Report) -> None:
    """npx package arguments in harness/metadata must be exact version pins."""
    app = app_dir.name
    if app in LOCAL_PATH_EXEMPT:
        return

    checks = []
    harness_path = app_dir / "harness-config.json"
    if harness_path.exists():
        try:
            harness = json.loads(harness_path.read_text())
        except json.JSONDecodeError:
            harness = None
        if isinstance(harness, dict):
            upstream = harness.get("upstream") or {}
            for spec in _npx_package_specs(upstream.get("command"), upstream.get("args")):
                checks.append(
                    (f"applications/{app}/harness-config.json", "upstream.args", spec)
                )

    metadata_path = app_dir / "build-artifacts" / "metadata.json"
    if metadata_path.exists():
        try:
            metadata = json.loads(metadata_path.read_text())
        except json.JSONDecodeError:
            metadata = None
        if isinstance(metadata, dict):
            cmd = metadata.get("upstreamCommand")
            if isinstance(cmd, list) and cmd:
                for spec in _npx_package_specs(cmd[0], cmd[1:]):
                    checks.append(
                        (
                            f"applications/{app}/build-artifacts/metadata.json",
                            "upstreamCommand",
                            spec,
                        )
                    )

    for file, trail, spec in checks:
        reason = _floating_npm_reason(spec)
        if reason:
            report.error(
                file,
                f"{trail} npm package {reason}. Floating npx resolutions make "
                "the captured tool surface unreproducible.",
            )


def check_registry_upstream(registry: dict, registry_rel: str, report: Report) -> None:
    """No application.website; optional upstream URIs must look like URIs when set."""
    application = registry.get("application")
    if isinstance(application, dict) and "website" in application:
        report.error(
            registry_rel,
            "application.website is no longer used — put a source URL in "
            "upstream.repository and/or a versioned obtain URL in "
            "upstream.distributionUrl (omit either when unknown)",
        )

    upstream = registry.get("upstream")
    if not isinstance(upstream, dict):
        return
    for field in ("repository", "distributionUrl"):
        if field not in upstream:
            continue
        value = upstream[field]
        if not isinstance(value, str) or not URI_RE.match(value):
            report.error(
                registry_rel,
                f"upstream.{field} must be an http(s) URI when set, got {value!r}",
            )


def check_app(app_dir: Path, report: Report) -> None:
    app = app_dir.name
    print(f"{app}")

    check_local_paths(app_dir, report)
    check_floating_npm_specs(app_dir, report)
    check_bridge_auth(app_dir, report)
    check_credential_return_deny(app_dir, report)

    plugin_path = app_dir / "plugin.json"
    plugin_rel = f"applications/{app}/plugin.json"
    snapshot_path = app_dir / "build-artifacts" / "tools-list.snapshot.json"
    snapshot_rel = f"applications/{app}/build-artifacts/tools-list.snapshot.json"
    classification_path = app_dir / "build-artifacts" / "classification.json"
    classification_rel = f"applications/{app}/build-artifacts/classification.json"
    registry_path = app_dir / "registry-entry.json"
    registry_rel = f"applications/{app}/registry-entry.json"

    plugin = load(plugin_path, plugin_rel, report)
    snapshot_raw = load(snapshot_path, snapshot_rel, report)
    if plugin is None or snapshot_raw is None:
        return

    tools = snapshot_raw if isinstance(snapshot_raw, list) else snapshot_raw.get("tools", [])
    upstream = {t["name"] for t in tools}

    # plugin structure
    for field in PLUGIN_REQUIRED:
        if field not in plugin:
            report.error(plugin_rel, f"plugin.json missing required field '{field}'")
    if plugin.get("version") != "1":
        report.error(plugin_rel, "plugin.json version must be \"1\"")
    if plugin.get("type") != "MpasApplicationPlugin":
        report.error(plugin_rel, "plugin.json type must be \"MpasApplicationPlugin\"")

    operations = plugin.get("operations")
    if not isinstance(operations, dict) or not operations:
        report.error(plugin_rel, "plugin.json operations must be a non-empty object")
        operations = {}

    for name, op in operations.items():
        if not isinstance(op, dict):
            report.error(plugin_rel, f"{name}: operation must be an object")
            continue
        extra = set(op) - {"description", "impact", "executionPayloadSchema"}
        if extra:
            report.error(plugin_rel, f"{name}: unexpected field(s) {sorted(extra)}")
        if op.get("impact") not in IMPACTS:
            report.error(plugin_rel, f"{name}: impact {op.get('impact')!r} not in {sorted(IMPACTS)}")
        schema = op.get("executionPayloadSchema")
        if not isinstance(schema, dict):
            report.error(plugin_rel, f"{name}: missing executionPayloadSchema")
            continue
        const = schema.get("properties", {}).get("name", {}).get("const")
        if const != name:
            report.error(
                plugin_rel,
                f"{name}: executionPayloadSchema name.const is {const!r}, must equal the operation key",
            )
        if name not in upstream:
            report.error(plugin_rel, f"{name}: governed but absent from the upstream tool snapshot")

    # artifactDid + optional upstream pointers
    registry = load(registry_path, registry_rel, report)
    if registry is not None:
        recorded = registry.get("plugin", {}).get("artifactDid")
        computed = artifact_did(plugin_path.read_text())
        if recorded != computed:
            report.error(
                registry_rel,
                f"plugin.artifactDid is stale: recorded {recorded}, computed {computed}. "
                "The Credential Adapter rejects a mismatch at startup.",
            )
        check_registry_upstream(registry, registry_rel, report)

    # classification
    classification = load(classification_path, classification_rel, report)
    if classification is None:
        return
    if classification.get("type") != "ImpactClassificationDraft":
        report.error(classification_rel, "classification.json type must be \"ImpactClassificationDraft\"")
    entries = classification.get("operations")
    if not isinstance(entries, dict):
        report.error(classification_rel, "classification.json operations must be an object")
        return

    missing = sorted(upstream - set(entries))
    extra = sorted(set(entries) - upstream)
    if missing:
        report.error(classification_rel, f"classification.json is missing entries for {missing}")
    if extra:
        report.error(classification_rel, f"classification.json has entries not in the snapshot: {extra}")

    if classification.get("draft") is True:
        report.warn(
            classification_rel,
            "classification.json is flagged draft:true — the generator added unreviewed entries",
        )

    for name in sorted(set(entries) & upstream):
        entry = entries[name]
        rationale = entry.get("rationale", "")
        impact = entry.get("impact")
        if impact not in IMPACTS:
            report.error(classification_rel, f"{name}: impact {impact!r} not in {sorted(IMPACTS)}")
        if not rationale or rationale == "name-heuristic":
            report.error(
                classification_rel,
                f"{name}: rationale is still the generator's unreviewed 'name-heuristic' draft",
            )
            continue
        if name in operations:
            plugin_impact = operations[name].get("impact")
            if plugin_impact != impact:
                report.warn(
                    classification_rel,
                    f"{name}: classification impact '{impact}' disagrees with plugin '{plugin_impact}'",
                )
        elif rationale.startswith("Pass-through ("):
            tag = rationale[len("Pass-through (") :].split(")", 1)[0]
            if tag not in REASON_TAGS:
                report.error(
                    classification_rel,
                    f"{name}: unknown pass-through reason tag '{tag}'; expected one of {sorted(REASON_TAGS)}",
                )
        else:
            report.error(
                classification_rel,
                f"{name}: pass-through entry must begin with a 'Pass-through (<reason>)' tag",
            )


def check_bridge_auth(app_dir: Path, report: Report) -> None:
    """Every bridge must preserve separate signed relay and coordination clients."""
    app = app_dir.name
    index_path = app_dir / "bridge" / "src" / "index.ts"
    package_path = app_dir / "bridge" / "package.json"
    index_rel = f"applications/{app}/bridge/src/index.ts"
    package_rel = f"applications/{app}/bridge/package.json"

    if not index_path.exists():
        report.error(index_rel, f"{index_rel} is missing")
    else:
        source = index_path.read_text()
        required_fragments = {
            "new CoordinationServiceClient({ url: config.coordinationUrl, signer: keyManagerPromise })":
                "CoordinationServiceClient must use the bridge's keyManagerPromise signer",
            "coordinationService,":
                "ProposerBridge must receive coordination through its explicit coordinationService port",
            ": new ActionEndpointClient({ url: config.adapterUrl })":
                "direct topology must submit bare Action requests through ActionEndpointClient at adapter.url",
            "new ActionRelayClient({ url: config.url, signer: keyManagerPromise })":
                "relay topology must use the dedicated signed ActionRelayClient",
            "client.submitAction(buildDeliveryEnvelope({":
                "relay topology must submit routed envelopes through ActionRelayClient",
            "buildDeliveryEnvelope({":
                "relay topology must construct DeliveryEnvelope<ActionRequest>",
            "new Set([config.verifierDid, ...(config.additionalRecipients ?? [])])":
                "relay recipients must include the designated Verifier and deduplicate optional additions",
            "if (!adapterUrl && !actionEndpointUrl)":
                "bridge config must require either actionEndpoint.url or adapter.url",
            "if (actionEndpointUrl && !verifierDid)":
                "relay config must require actionEndpoint.verifierDid",
            "actionEndpoint,":
                "ProposerBridge must use the WorkflowActionEndpoint execution boundary",
            "new ActionPackageBuilder(":
                "application calls must still construct signed MPAS Action Packages",
            "MpasProtocolServer":
                "bridge must use automatic MCP protocol selection",
            'log("info", "mcp_protocol_mode_selected"':
                "bridge must log sanitized protocol mode selection",
        }
        for fragment, message in required_fragments.items():
            if fragment not in source:
                report.error(index_rel, message)
        for forbidden in ("StdioClientTransport", "{{credential:", "new AdapterClient("):
            if forbidden in source:
                report.error(index_rel, f"proposer bridge source must not contain direct upstream/credential path {forbidden!r}")

    package = load(package_path, package_rel, report)
    if package is None:
        return
    version = package.get("dependencies", {}).get("@oma3/mpas")
    expected_version = expected_mpas_sdk_version(app)
    if version != expected_version:
        report.error(package_rel, f"@oma3/mpas must be {expected_version}, got {version!r}")

    harness_path = app_dir / "harness-config.json"
    harness_rel = f"applications/{app}/harness-config.json"
    harness = load(harness_path, harness_rel, report)
    if harness is not None:
        deviations = harness.get("intentionalDeviations")
        for message in protocol_mode_errors(deviations):
            report.error(harness_rel, message)


def credential_return_deny_errors(config, tool_name: str) -> list[str]:
    """Return errors when a CA deployment example does not reject a tool."""
    if not isinstance(config, dict):
        return ["adapter configuration must be an object"]
    entries = config.get("policy", {}).get("policies", {}).get(tool_name)
    if not isinstance(entries, list) or not entries:
        return [f"policy.policies.{tool_name} must contain a reject entry"]
    for entry in entries:
        if (
            isinstance(entry, dict)
            and entry.get("reject") is True
            and entry.get("match") == {}
            and "requirements" not in entry
        ):
            return []
    return [
        f"policy.policies.{tool_name} must include reject: true with match: {{}} and no requirements"
    ]


def check_credential_return_deny(app_dir: Path, report: Report) -> None:
    app = app_dir.name
    tool_name = REQUIRED_CA_REJECTS.get(app)
    if tool_name is None:
        return
    config_path = app_dir / "adapter-config.example.json"
    config_rel = f"applications/{app}/adapter-config.example.json"
    config = load(config_path, config_rel, report)
    if config is None:
        return
    for message in credential_return_deny_errors(config, tool_name):
        report.error(config_rel, message)


def protocol_mode_errors(deviations) -> list[str]:
    """Return errors for a merged or incomplete adaptive harness surface."""
    if not isinstance(deviations, dict):
        return ["intentionalDeviations must be an object"]
    errors = []
    modes = deviations.get("protocolModes")
    if not isinstance(modes, dict):
        return ["intentionalDeviations.protocolModes must describe Tasks and compatibility separately"]
    tasks = modes.get("tasks")
    compatibility = modes.get("compatibility")
    if not isinstance(tasks, dict) or not isinstance(compatibility, dict):
        return ["protocolModes must contain tasks and compatibility objects"]

    task_extensions = {"io.modelcontextprotocol/tasks", "org.oma3/mpas"}
    if tasks.get("handshake") != "server/discover":
        errors.append("Tasks mode handshake must be server/discover")
    if tasks.get("addedTools") != []:
        errors.append("Tasks mode must not add tools")
    if set(tasks.get("extensionCapabilities") or []) != task_extensions:
        errors.append("Tasks mode must advertise the Tasks and MPAS extensions")
    if compatibility.get("handshake") != "initialize":
        errors.append("compatibility mode handshake must be initialize")
    if compatibility.get("addedTools") != ["mpas_wait_for_action_result"]:
        errors.append("compatibility mode must add exactly one MPAS wait tool")
    if compatibility.get("extensionCapabilities") != []:
        errors.append("compatibility mode must not advertise Tasks extensions")
    if "application-tools" not in (compatibility.get("modifiedDescriptions") or []):
        errors.append("compatibility mode must record application description notices")
    if compatibility.get("outputSchemaUnions") != ["application-tools-with-output-schema"]:
        errors.append("compatibility mode must record conditional output-schema unions")
    if deviations.get("addedTools") != [] or set(deviations.get("extensionCapabilities") or []) != task_extensions:
        errors.append("top-level deviations must continue to describe the primary Tasks surface")
    return errors


def expected_mpas_sdk_version(app: str) -> str:
    """Return the reviewed SDK version for a bridge migration cohort."""
    return MPAS_SDK_VERSION_OVERRIDES.get(app, DEFAULT_MPAS_SDK_VERSION)


def main() -> int:
    github = "--github" in sys.argv[1:]
    report = Report(github)

    if not APPS.is_dir():
        print(f"no applications directory at {APPS}", file=sys.stderr)
        return 1

    app_dirs = sorted(d for d in APPS.iterdir() if d.is_dir())
    for app_dir in app_dirs:
        check_app(app_dir, report)

    print()
    print(f"{len(app_dirs)} applications checked: {report.errors} error(s), {report.warnings} warning(s)")
    return 1 if report.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
