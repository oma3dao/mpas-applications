#!/usr/bin/env python3
"""Regression tests for validate-applications.py helpers.

Standard library only. Run: python3 scripts/test_validate_applications.py
"""
from __future__ import annotations

import importlib.util
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
    def test_tasks_bridges_require_alpha_6(self):
        for app in ("github", "netlify"):
            with self.subTest(app=app):
                self.assertEqual(validate.expected_mpas_sdk_version(app), "0.1.0-alpha.6")

    def test_unmigrated_bridges_keep_existing_version(self):
        self.assertEqual(validate.expected_mpas_sdk_version("railway"), "^0.1.0-alpha.4")


if __name__ == "__main__":
    raise SystemExit(unittest.main())
