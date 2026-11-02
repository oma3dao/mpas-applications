#!/usr/bin/env python3
"""Emit the CI application matrix from immediate applications/*/bridge directories."""
import json
import re
from pathlib import Path


def discover(applications: Path) -> list[str]:
    names = []
    for app in sorted(applications.iterdir()):
        bridge = app / "bridge"
        if not bridge.is_dir():
            continue
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", app.name):
            raise ValueError(f"Unsafe application slug: {app.name!r}")
        for filename in ("package.json", "package-lock.json"):
            if not (bridge / filename).is_file():
                raise ValueError(f"Missing {bridge / filename}")
        names.append(app.name)
    if not names:
        raise ValueError("No bridges discovered; refusing to skip protocol coverage")
    return names


if __name__ == "__main__":
    print(json.dumps(discover(Path(__file__).resolve().parent.parent / "applications"),
                     separators=(",", ":")))
