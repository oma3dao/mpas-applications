#!/usr/bin/env python3
"""Fixture tests for automatic CI discovery; standard library only."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    "discover_bridges", Path(__file__).with_name("discover-bridges.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.apps = Path(self.scratch.name)

    def bridge(self, name):
        path = self.apps / name / "bridge"
        path.mkdir(parents=True)
        for filename in ("package.json", "package-lock.json"):
            (path / filename).write_text("{}")
        return path

    def test_new_bridge_automatically_joins_sorted_matrix(self):
        self.bridge("z-existing")
        self.assertEqual(module.discover(self.apps), ["z-existing"])
        self.bridge("a-new")
        (self.apps / "docs-only").mkdir()
        self.assertEqual(module.discover(self.apps), ["a-new", "z-existing"])

    def test_missing_manifest_or_lockfile_fails_instead_of_omitting_bridge(self):
        path = self.bridge("incomplete")
        for filename in ("package.json", "package-lock.json"):
            with self.subTest(filename=filename):
                (path / filename).unlink()
                with self.assertRaisesRegex(ValueError, "Missing"):
                    module.discover(self.apps)
                (path / filename).write_text("{}")

    def test_unsafe_slug_fails(self):
        self.bridge("bad;name")
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            module.discover(self.apps)

    def test_empty_matrix_fails(self):
        with self.assertRaisesRegex(ValueError, "No bridges"):
            module.discover(self.apps)


if __name__ == "__main__":
    unittest.main()
