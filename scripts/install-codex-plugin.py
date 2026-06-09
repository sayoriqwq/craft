#!/usr/bin/env python3
"""Map this repo into the personal Codex plugin marketplace."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any


MARKETPLACE_NAME = "personal"
PLUGIN_NAME = "mini-waza"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="Mini-Waza repo root.",
    )
    parser.add_argument(
        "--marketplace-root",
        type=Path,
        default=Path.home(),
        help="Root that contains .agents/plugins/marketplace.json and plugins/.",
    )
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "name": MARKETPLACE_NAME,
            "interface": {"displayName": "Personal"},
            "plugins": [],
        }
    with path.open() as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object.")
    return payload


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def ensure_symlink(link: Path, target: Path) -> None:
    link.parent.mkdir(parents=True, exist_ok=True)
    if link.exists() or link.is_symlink():
        if link.is_symlink() and Path(os.readlink(link)).expanduser().resolve() == target:
            return
        raise FileExistsError(f"{link} already exists and does not point to {target}")
    link.symlink_to(target, target_is_directory=True)


def ensure_marketplace(path: Path) -> None:
    payload = load_json(path)
    payload.setdefault("name", MARKETPLACE_NAME)
    payload.setdefault("interface", {"displayName": "Personal"})
    plugins = payload.setdefault("plugins", [])
    if not isinstance(plugins, list):
        raise ValueError(f"{path} field 'plugins' must be an array.")

    entry = {
        "name": PLUGIN_NAME,
        "source": {"source": "local", "path": f"./plugins/{PLUGIN_NAME}"},
        "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
        "category": "Developer Tools",
    }

    for index, item in enumerate(plugins):
        if isinstance(item, dict) and item.get("name") == PLUGIN_NAME:
            plugins[index] = entry
            break
    else:
        plugins.append(entry)

    write_json(path, payload)


def main() -> int:
    args = parse_args()
    root = args.root.expanduser().resolve()
    marketplace_root = args.marketplace_root.expanduser().resolve()
    marketplace_json = marketplace_root / ".agents" / "plugins" / "marketplace.json"
    plugin_link = marketplace_root / "plugins" / PLUGIN_NAME

    ensure_symlink(plugin_link, root)
    ensure_marketplace(marketplace_json)

    print(f"ok: {plugin_link} -> {root}")
    print(f"ok: {marketplace_json}")
    print("next: codex plugin marketplace add ~")
    print("note: local marketplaces are symlink-backed; open a new thread after edits.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
