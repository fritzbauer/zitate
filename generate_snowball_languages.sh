#!/usr/bin/env bash
# Usage: ./generate_snowball_languages.sh /path/to/snowball/algorithms
# Writes technical/snowball_languages.json inside the workspace.

if [ -z "$1" ]; then
  echo "Usage: $0 /path/to/algorithms"
  exit 1
fi
DIR="$1"
OUT_DIR="$(dirname "$0")"
OUT_FILE="$OUT_DIR/technical/snowball_languages.json"

if [ ! -d "$DIR" ]; then
  echo "Directory not found: $DIR"
  exit 2
fi

# Use Python to safely enumerate filenames and write JSON
python3 - <<PY
import sys, json, pathlib
p = pathlib.Path("$DIR")
names = [f.name.rsplit('.',1)[0] for f in p.iterdir() if f.is_file()]
names = sorted(names)
open("$OUT_FILE","w",encoding="utf-8").write(json.dumps(names, ensure_ascii=False, indent=2))
print('Wrote', "$OUT_FILE")
PY

echo "Done. You can now open import.html; it will try to load technical/snowball_languages.json to populate the Available list."