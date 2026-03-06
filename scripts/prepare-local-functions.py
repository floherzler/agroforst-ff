#!/usr/bin/env python3

import json
import shutil
import sys
from pathlib import Path


def copy_function_tree(source: Path, target: Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target, ignore=shutil.ignore_patterns("node_modules", ".env"))


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: prepare-local-functions.py <repo-root> <workspace> <manifest>", file=sys.stderr)
        return 1

    repo_root = Path(sys.argv[1]).resolve()
    workspace = Path(sys.argv[2]).resolve()
    manifest_path = Path(sys.argv[3]).resolve()
    config_path = workspace / "appwrite.config.json"

    manifest = json.loads(manifest_path.read_text())
    config = json.loads(config_path.read_text())

    function_map = manifest.get("functions", {})
    for function in config.get("functions", []):
        function_name = function.get("name")
        if function_name not in function_map:
            continue

        entry = function_map[function_name]
        source_dir = repo_root / entry["source"]
        target_rel = Path(function["path"])
        target_dir = workspace / target_rel

        copy_function_tree(source_dir, target_dir)

        function["runtime"] = entry["runtime"]
        function["entrypoint"] = entry["entrypoint"]
        function["commands"] = entry["commands"]

    config_path.write_text(json.dumps(config, indent=4) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
