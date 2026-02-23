#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_PATH="${REPO_DIR}/cache-manifest.json"

python3 - <<'PY' "$MANIFEST_PATH" "$REPO_DIR"
import hashlib
import json
from pathlib import Path
import sys

manifest_path = Path(sys.argv[1])
repo_dir = Path(sys.argv[2])

manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
files = manifest.get("files", [])

normalized_entries = []
for item in files:
    if isinstance(item, str):
        normalized_entries.append({"path": item, "hash": ""})
    elif isinstance(item, dict) and isinstance(item.get("path"), str):
        normalized_entries.append({"path": item["path"], "hash": str(item.get("hash", ""))})

if not any(entry["path"] == "cache-manifest.json" for entry in normalized_entries):
    normalized_entries.append({"path": "cache-manifest.json", "hash": ""})

for entry in normalized_entries:
    rel_path = entry["path"]
    if rel_path == "cache-manifest.json":
        entry["hash"] = ""
        continue
    fs_path = repo_dir / ("index.html" if rel_path == "./" else rel_path)
    digest = hashlib.sha256(fs_path.read_bytes()).hexdigest()
    entry["hash"] = digest

manifest["files"] = normalized_entries
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY

echo "Updated ${MANIFEST_PATH}"
