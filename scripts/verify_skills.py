#!/usr/bin/env python3
"""Validate Mini-Waza framework and future user-defined skills."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from skill_frontmatter import fail, parse_frontmatter, parse_when_to_use_keywords  # noqa: E402

SKILL_REF_RE = re.compile(r"skills/([a-z][a-z0-9_-]*)/SKILL\.md")
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
URL_PREFIXES = ("http://", "https://", "mailto:", "ftp://", "tel:", "data:")


def skill_files(root: Path) -> list[Path]:
    return sorted((root / "skills").glob("*/SKILL.md"))


def check_skill_files(root: Path) -> dict[str, str]:
    descriptions: dict[str, str] = {}
    for path in skill_files(root):
        fields = parse_frontmatter(path)
        name = fields["name"]
        if name != path.parent.name:
            fail(f"NAME MISMATCH: {path} name={name!r} dir={path.parent.name!r}")
        description = fields["description"].strip()
        if len(description) < 40:
            fail(f"DESCRIPTION TOO SHORT: {path}")
        lowered = description.lower()
        if "use when" not in lowered or "not for" not in lowered:
            fail(f"DESCRIPTION MUST INCLUDE Use when AND Not for: {path}")
        if not fields["when_to_use"]:
            fail(f"MISSING when_to_use: {path}")
        if not fields["dispatch_intent"]:
            fail(f"MISSING dispatch_intent: {path}")
        descriptions[name] = description
        parse_when_to_use_keywords(fields["when_to_use"])
        print(f"ok: {path.as_posix()}")
    print(f"ok: discovered {len(descriptions)} user-defined skills")
    return descriptions


def check_marketplace(root: Path, version: str, skills: set[str], descriptions: dict[str, str]) -> None:
    path = root / ".claude-plugin" / "marketplace.json"
    data = json.loads(path.read_text())
    if data.get("name") != "mini-waza":
        fail("INVALID MARKETPLACE: name must be mini-waza")
    plugins = data.get("plugins")
    if not isinstance(plugins, list):
        fail("INVALID MARKETPLACE: plugins must be a list")

    seen: set[str] = set()
    per_skill: set[str] = set()
    for entry in plugins:
        name = entry.get("name")
        source = entry.get("source")
        if not name or name in seen:
            fail(f"INVALID MARKETPLACE ENTRY: {entry!r}")
        seen.add(name)
        if entry.get("version") != version:
            fail(f"VERSION DRIFT: marketplace {name} != VERSION {version}")
        if name == "mini-waza":
            if source != "./":
                fail("INVALID MARKETPLACE: bundle source must be ./")
            continue
        if not name.startswith("mini-waza-"):
            fail(f"INVALID MARKETPLACE PLUGIN NAME: {name}")
        skill = name.removeprefix("mini-waza-")
        if source != f"./skills/{skill}":
            fail(f"WRONG SOURCE: {name}")
        if skill not in descriptions:
            fail(f"MISSING SKILL DIRECTORY: {skill}")
        per_skill.add(skill)

    missing = skills - per_skill
    if missing:
        fail(f"NOT IN MARKETPLACE: {sorted(missing)}")
    print(f"ok: marketplace covers {len(skills)} skills")


def check_routing(root: Path, skills: set[str]) -> None:
    refs = set()
    for path in (root / "scripts" / "dispatcher.md", root / "skills" / "RESOLVER.md"):
        refs |= set(SKILL_REF_RE.findall(path.read_text()))
    stale = refs - skills
    if stale:
        fail(f"STALE SKILL REFERENCES: {sorted(stale)}")
    print(f"ok: routing references are valid for {len(skills)} skills")


def check_rules(root: Path) -> None:
    required = [
        root / "rules" / "anti-patterns.md",
        root / "rules" / "chinese.md",
        root / "rules" / "durable-context.md",
        root / "rules" / "english.md",
        root / "rules" / "routing.md",
    ]
    for path in required:
        if not path.exists():
            fail(f"MISSING RULE FILE: {path.relative_to(root)}")
    print("ok: rule files present")


def check_markdown_links(root: Path) -> None:
    for path in sorted(root.glob("**/*.md")):
        if ".git" in path.parts:
            continue
        text = path.read_text()
        for target in LINK_RE.findall(text):
            if target.startswith(URL_PREFIXES) or target.startswith("#"):
                continue
            clean = target.split("#", 1)[0]
            if not clean:
                continue
            if not (path.parent / clean).exists():
                fail(f"BROKEN MARKDOWN LINK: {path.relative_to(root)} -> {target}")
    print("ok: markdown links")


def check_no_root_skill(root: Path) -> None:
    if (root / "SKILL.md").exists():
        fail("SOURCE ROOT SKILL.md IS NOT ALLOWED")
    print("ok: no source-root SKILL.md")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    root = args.root.resolve()

    version = (root / "VERSION").read_text().strip()
    if not version:
        fail("EMPTY VERSION")

    descriptions = check_skill_files(root)
    skills = set(descriptions)
    check_marketplace(root, version, skills, descriptions)
    check_routing(root, skills)
    check_rules(root)
    check_markdown_links(root)
    check_no_root_skill(root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
