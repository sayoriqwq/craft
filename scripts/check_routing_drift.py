#!/usr/bin/env python3
"""Verify dispatcher and resolver references match current skill files."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKILL_REF_RE = re.compile(r"skills/([a-z][a-z0-9_-]*)/SKILL\.md")


def refs(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return set(SKILL_REF_RE.findall(path.read_text()))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    root = args.root.resolve()

    expected = {p.parent.name for p in (root / "skills").glob("*/SKILL.md")}
    dispatcher = refs(root / "scripts" / "dispatcher.md")
    resolver = refs(root / "skills" / "RESOLVER.md")

    drift = False
    for label, actual in (("scripts/dispatcher.md", dispatcher), ("skills/RESOLVER.md", resolver)):
        missing = expected - actual
        stale = actual - expected
        if missing:
            print(f"ROUTING DRIFT: {label} missing {sorted(missing)}", file=sys.stderr)
            drift = True
        if stale:
            print(f"ROUTING DRIFT: {label} has stale refs {sorted(stale)}", file=sys.stderr)
            drift = True

    if drift:
        return 1
    print(f"ok: routing consistent across {len(expected)} skills")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
