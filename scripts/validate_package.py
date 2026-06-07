#!/usr/bin/env python3
"""Post-package integrity check for Mini-Waza ZIP."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    args = parser.parse_args()

    root_skill = args.stage / "SKILL.md"
    if not root_skill.exists():
        print("POST-PACKAGE ERROR: SKILL.md missing", file=sys.stderr)
        return 1

    text = root_skill.read_text()
    if "Mini-Waza Dispatcher" not in text:
        print("POST-PACKAGE ERROR: dispatcher content missing", file=sys.stderr)
        return 1

    skill_sections = re.findall(r"^# SKILL: ([a-z][a-z0-9_-]*)$", text, re.MULTILINE)
    source_skills = sorted(
        p.parent.name for p in (args.stage / "skills").glob("*/SKILL.md")
    )
    if sorted(skill_sections) != source_skills:
        print(
            f"POST-PACKAGE ERROR: inlined sections {sorted(skill_sections)} "
            f"!= source skills {source_skills}",
            file=sys.stderr,
        )
        return 1

    print(f"ok: post-package validation passed for {len(source_skills)} skills")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
