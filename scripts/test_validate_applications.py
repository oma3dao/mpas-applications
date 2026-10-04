#!/usr/bin/env python3
"""Regression tests for validate-applications.py helpers.

Standard library only. Run: python3 scripts/test_validate_applications.py
"""
from __future__ import annotations

import importlib.util
import contextlib
import io
import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "validate_applications", ROOT / "validate-applications.py"
)
validate = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(validate)


class ExactNpmVersionTests(unittest.TestCase):
    def test_accepts_exact_semver(self):
        for spec in (
            "tsx@4.23.1",
            "mcp-remote@0.1.38",
            "@scope/pkg@1.0.0",
            "firebase-tools@15.24.0",
            "pkg@1.2.3-beta.1",
            "pkg@1.2.3+build.5",
            "pkg@1.2.3-rc.1+meta.2",
        ):
            with self.subTest(spec=spec):
                self.assertIsNone(validate._floating_npm_reason(spec))

    def test_rejects_bare_package(self):
        self.assertIsNotNone(validate._floating_npm_reason("tsx"))
        self.assertIsNotNone(validate._floating_npm_reason("@scope/pkg"))

    def test_rejects_dist_tags(self):
        for spec in ("tsx@latest", "tsx@beta", "tsx@dev", "tsx@next", "tsx@canary"):
            with self.subTest(spec=spec):
                self.assertIsNotNone(validate._floating_npm_reason(spec))

    def test_rejects_ranges_and_wildcards(self):
        for spec in (
            "tsx@^4.23.1",
            "tsx@~4.23.1",
            "tsx@>=4.23.1",
            "tsx@1.x",
            "tsx@*",
            "tsx@1 || 2",
            "tsx@1.2.3 - 2.0.0",
        ):
            with self.subTest(spec=spec):
                self.assertIsNotNone(validate._floating_npm_reason(spec))

    def test_npx_extracts_package_spec(self):
        self.assertEqual(
            list(validate._npx_package_specs("npx", ["-y", "tsx@4.23.1", "file.ts"])),
            ["tsx@4.23.1"],
        )
        self.assertEqual(
            list(validate._npx_package_specs("npx", ["-y", "tsx", "file.ts"])),
            ["tsx"],
        )


class MpasSdkVersionTests(unittest.TestCase):
    def test_compatibility_bridges_require_default_sdk_version(self):
        """These bridges carry no per-app override, so they track the default.

        Asserts against DEFAULT_MPAS_SDK_VERSION rather than a literal so the
        reviewed-release gate lives in one place (validate-applications.py).
        """
        for app in ("github", "netlify", "railway", "stripe"):
            with self.subTest(app=app):
                self.assertEqual(
                    validate.expected_mpas_sdk_version(app),
                    validate.DEFAULT_MPAS_SDK_VERSION,
                )


class DirectSigningTests(unittest.TestCase):
    def test_rejects_a_bridge_that_drops_its_direct_http_signer(self):
        original = ROOT.parent / "applications" / "github"
        with tempfile.TemporaryDirectory() as scratch:
            app = Path(scratch) / "github"
            (app / "bridge" / "src").mkdir(parents=True)
            for relative in ("bridge/src/index.ts", "bridge/package.json", "harness-config.json"):
                shutil.copyfile(original / relative, app / relative)
            report = validate.Report(github=False)
            validate.check_bridge_auth(app, report)
            self.assertEqual(report.errors, 0)
            source = app / "bridge" / "src" / "index.ts"
            original_source = source.read_text()
            unsigned_source = re.sub(
                r"(new ActionEndpointClient\(\{\s*url: config\.adapterUrl,)\s*signer: keyManagerPromise,",
                r"\1",
                original_source,
            )
            self.assertNotEqual(unsigned_source, original_source)
            source.write_text(unsigned_source)
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                validate.check_bridge_auth(app, report)
            self.assertEqual(report.errors, 1)
            self.assertIn("direct topology must sign", output.getvalue())


class CredentialReturnDenyTests(unittest.TestCase):
    def test_accepts_unconditional_reject(self):
        config = {
            "policy": {
                "policies": {
                    "secret_tool": [
                        {"reject": True, "match": {}, "description": "blocked"}
                    ]
                }
            }
        }
        self.assertEqual(validate.credential_return_deny_errors(config, "secret_tool"), [])

    def test_rejects_missing_or_approvable_policy(self):
        for config in (
            {"policy": {"policies": {}}},
            {
                "policy": {
                    "policies": {
                        "secret_tool": [
                            {
                                "requirements": {
                                    "type": "proposerOnly",
                                    "decision": "approve",
                                }
                            }
                        ]
                    }
                }
            },
            {
                "policy": {
                    "policies": {
                        "secret_tool": [
                            {"reject": True, "match": {"conditions": []}}
                        ]
                    }
                }
            },
        ):
            with self.subTest(config=config):
                self.assertTrue(
                    validate.credential_return_deny_errors(config, "secret_tool")
                )


class ProtocolModeTests(unittest.TestCase):
    def test_accepts_distinct_adaptive_surfaces(self):
        deviations = {
            "addedTools": [],
            "extensionCapabilities": ["io.modelcontextprotocol/tasks", "org.oma3/mpas"],
            "protocolModes": {
                "tasks": {
                    "handshake": "server/discover",
                    "addedTools": [],
                    "extensionCapabilities": ["io.modelcontextprotocol/tasks", "org.oma3/mpas"],
                },
                "compatibility": {
                    "handshake": "initialize",
                    "addedTools": ["mpas_wait_for_action_result"],
                    "modifiedDescriptions": ["application-tools"],
                    "outputSchemaUnions": ["application-tools-with-output-schema"],
                    "extensionCapabilities": [],
                },
            },
        }
        self.assertEqual(validate.protocol_mode_errors(deviations), [])

    def test_rejects_a_merged_surface(self):
        deviations = {
            "addedTools": ["mpas_wait_for_action_result"],
            "extensionCapabilities": ["io.modelcontextprotocol/tasks", "org.oma3/mpas"],
        }
        self.assertTrue(validate.protocol_mode_errors(deviations))


class AdapterExampleArtifactDidTests(unittest.TestCase):
    def test_rejects_an_adapter_example_pinned_to_stale_plugin_bytes(self):
        original = ROOT.parent / "applications" / "railway"
        with tempfile.TemporaryDirectory() as scratch:
            app = Path(scratch) / "railway"
            shutil.copytree(original, app, ignore=shutil.ignore_patterns("node_modules", "dist"))
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                report = validate.Report(github=False)
                validate.check_app(app, report)
            self.assertEqual(report.errors, 0, output.getvalue())
            example = app / "adapter-config.example.json"
            config = json.loads(example.read_text())
            config["plugin"]["artifactDid"] = "did:artifact:bafkreistale"
            example.write_text(json.dumps(config))
            with contextlib.redirect_stdout(output):
                report = validate.Report(github=False)
                validate.check_app(app, report)
            self.assertEqual(report.errors, 1)
            self.assertIn("adapter-config.example.json", output.getvalue())


class UpstreamBindingTests(unittest.TestCase):
    APP = ROOT.parent / "applications" / "github"

    def load(self):
        plugin = json.loads((self.APP / "plugin.json").read_text())
        snapshot = json.loads((self.APP / "build-artifacts" / "tools-list.snapshot.json").read_text())
        source = (self.APP / "bridge" / "src" / "index.ts").read_text()
        command = json.loads((self.APP / "build-artifacts" / "metadata.json").read_text())["upstreamCommand"]
        return plugin, snapshot, source, command

    def test_checked_in_binding_is_consistent(self):
        self.assertEqual(validate.upstream_binding_errors(*self.load()), [])

    def test_rejects_bridge_binding_for_a_different_surface(self):
        plugin, snapshot, source, command = self.load()
        value = plugin["toolSurface"]["hash"]["value"]
        stale = source.replace(value, "A" * 43)
        errors = validate.upstream_binding_errors(plugin, snapshot, stale, command)
        self.assertIn("bridge upstreamBinding.toolSurface must equal plugin.json toolSurface.hash", errors)

    def test_rejects_binding_without_the_image_digest_pin(self):
        plugin, snapshot, source, command = self.load()
        unpinned = re.sub(r',"upstreamDigest":"sha256:[0-9a-f]{64}"', "", source)
        self.assertNotEqual(unpinned, source)
        errors = validate.upstream_binding_errors(plugin, snapshot, unpinned, command)
        self.assertTrue(any("upstreamDigest" in error for error in errors))

    def test_rejects_unbound_bridge_for_a_surface_aware_plugin(self):
        plugin, snapshot, source, command = self.load()
        unbound = validate.UPSTREAM_BINDING_RE.sub("", source)
        errors = validate.upstream_binding_errors(plugin, snapshot, unbound, command)
        self.assertIn("bridge must bind every submission to plugin.json toolSurface (upstreamBinding)", errors)

    def test_rejects_bound_bridge_for_a_legacy_plugin(self):
        plugin, snapshot, source, command = self.load()
        del plugin["toolSurface"]
        errors = validate.upstream_binding_errors(plugin, snapshot, source, command)
        self.assertEqual(len(errors), 1)
        self.assertIn("no toolSurface", errors[0])

    def test_rejects_tool_names_that_omit_ungoverned_tools(self):
        plugin, snapshot, source, command = self.load()
        plugin["toolSurface"]["toolNames"] = sorted(plugin["operations"])
        errors = validate.upstream_binding_errors(plugin, snapshot, source, command)
        self.assertIn("plugin.json toolSurface.toolNames must list exactly the snapshot tools", errors)


if __name__ == "__main__":
    raise SystemExit(unittest.main())
