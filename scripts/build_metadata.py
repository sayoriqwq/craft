#!/usr/bin/env python3
"""Generate Mini-Waza framework metadata.

The repository is allowed to have zero skills. Skill metadata is generated only
from actual `skills/*/SKILL.md` files, so the framework can stay empty until the
user defines customized skills.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from skill_frontmatter import parse_frontmatter  # noqa: E402


ROUTING_TABLE_START = "<!-- routing-table:start -->"
ROUTING_TABLE_END = "<!-- routing-table:end -->"


def read_version(root: Path) -> str:
    version = (root / "VERSION").read_text().strip()
    if not version:
        raise SystemExit("ERROR: VERSION is empty")
    return version


def collect_skill_metadata(root: Path) -> list[dict[str, str]]:
    skills: list[dict[str, str]] = []
    for path in sorted((root / "skills").glob("*/SKILL.md")):
        fields = parse_frontmatter(path)
        if fields["name"] != path.parent.name:
            raise SystemExit(
                f"ERROR: {path} frontmatter name={fields['name']!r} "
                f"!= directory {path.parent.name!r}"
            )
        skills.append(fields)
    return skills


def build_marketplace(version: str, skills: list[dict[str, str]]) -> dict:
    plugins: list[dict] = [
        {
            "name": "mini-waza",
            "description": "Installs the Mini-Waza dispatcher. No user-defined skills are bundled yet.",
            "version": version,
            "category": "development",
            "source": "./",
            "homepage": "",
        }
    ]
    for skill in sorted(skills, key=lambda item: item["name"]):
        plugins.append(
            {
                "name": f"mini-waza-{skill['name']}",
                "description": skill["description"],
                "version": version,
                "category": "development",
                "source": f"./skills/{skill['name']}",
                "homepage": "",
                "skills": ["./"],
                "strict": False,
            }
        )
    return {
        "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
        "name": "mini-waza",
        "description": "Customized Waza framework skeleton with no predefined skills.",
        "owner": {"name": "sayori", "email": ""},
        "plugins": plugins,
    }


def build_package_json(version: str) -> str:
    return json.dumps(
        {
            "name": "mini-waza",
            "version": version,
            "description": "Customized Waza framework skeleton with no predefined skills.",
            "private": True,
            "license": "MIT",
            "files": [
                "LICENSE",
                "README.md",
                "rules",
                "scripts",
                "skills",
                "!**/__pycache__/**",
                "!**/*.pyc",
            ],
            "pi": {"skills": ["./skills"]},
        },
        indent=2,
        ensure_ascii=False,
    ) + "\n"


def render_marketplace(marketplace: dict) -> str:
    return json.dumps(marketplace, indent=2, ensure_ascii=False) + "\n"


def render_dispatcher(template: str, skills: list[dict[str, str]]) -> str:
    rows = ["| Intent | Skill | File |", "|--------|-------|------|"]
    for skill in sorted(skills, key=lambda item: item["name"]):
        intent = skill.get("dispatch_intent") or skill["name"]
        rows.append(f"| {intent} | {skill['name']} | `skills/{skill['name']}/SKILL.md` |")
    table = "\n".join(rows)
    block = f"{ROUTING_TABLE_START}\n{table}\n{ROUTING_TABLE_END}"
    if ROUTING_TABLE_START not in template or ROUTING_TABLE_END not in template:
        raise SystemExit("ERROR: dispatcher template is missing routing-table markers")
    pattern = re.compile(
        re.escape(ROUTING_TABLE_START) + r".*?" + re.escape(ROUTING_TABLE_END),
        re.DOTALL,
    )
    return pattern.sub(block, template)


def diff(label: str, expected: str, actual: str) -> str:
    return "".join(
        difflib.unified_diff(
            actual.splitlines(keepends=True),
            expected.splitlines(keepends=True),
            fromfile=f"committed:{label}",
            tofile=f"generated:{label}",
        )
    )


def compare_or_write(path: Path, rendered: str, root: Path, check: bool) -> bool:
    actual = path.read_text() if path.exists() else ""
    if check:
        if actual == rendered:
            print(f"ok: {path.relative_to(root)} matches generator")
            return False
        print(
            f"DRIFT: {path.relative_to(root)} is out of sync; run make regenerate.",
            file=sys.stderr,
        )
        sys.stderr.write(diff(path.relative_to(root).as_posix(), rendered, actual))
        return True

    path.parent.mkdir(parents=True, exist_ok=True)
    if actual != rendered:
        path.write_text(rendered)
        print(f"wrote: {path.relative_to(root)}")
    else:
        print(f"ok: {path.relative_to(root)} already matches")
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    root = args.root.resolve()
    version = read_version(root)
    skills = collect_skill_metadata(root)

    rendered = {
        root / ".claude-plugin" / "marketplace.json": render_marketplace(build_marketplace(version, skills)),
        root / "package.json": build_package_json(version),
        root / "scripts" / "dispatcher.md": render_dispatcher(
            (root / "scripts" / "dispatcher-template.md").read_text(),
            skills,
        ),
    }

    drift = False
    for path, content in rendered.items():
        drift = compare_or_write(path, content, root, args.check) or drift
    return 1 if drift else 0


if __name__ == "__main__":
    raise SystemExit(main())
