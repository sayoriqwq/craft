#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-"$ROOT/dist/mini-waza.zip"}"
case "$OUT" in
  /*) ;;
  *) OUT="$ROOT/$OUT" ;;
esac

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"

cd "$ROOT"

RAW_MANIFEST="$(mktemp)"
MANIFEST="$(mktemp)"
FILTERED_MANIFEST="$(mktemp)"
STAGE="$(mktemp -d)"
VALIDATE_DIR="$(mktemp -d)"
trap 'rm -f "$RAW_MANIFEST" "$MANIFEST" "$FILTERED_MANIFEST"; rm -rf "$STAGE" "$VALIDATE_DIR"' EXIT

git ls-files --cached --others --exclude-standard > "$RAW_MANIFEST"
while IFS= read -r path; do
  [ -e "$path" ] && printf '%s\n' "$path"
done < "$RAW_MANIFEST" > "$MANIFEST"
python3 "$ROOT/scripts/packaging_filter.py" "$ROOT/packaging.allowlist" \
  < "$MANIFEST" > "$FILTERED_MANIFEST"

mkdir -p "$STAGE"
if [ -s "$FILTERED_MANIFEST" ]; then
  tar -cf - -T "$FILTERED_MANIFEST" | (cd "$STAGE" && tar -xf -)
fi

if [ ! -f "$ROOT/scripts/dispatcher.md" ]; then
  echo "ERROR: scripts/dispatcher.md missing; run make regenerate" >&2
  exit 1
fi
cp "$ROOT/scripts/dispatcher.md" "$STAGE/SKILL.md"

find skills -mindepth 2 -maxdepth 2 -name SKILL.md | sort | while IFS= read -r path; do
  skill="$(basename "$(dirname "$path")")"
  {
    printf '\n---\n\n# SKILL: %s\n\n' "$skill"
    awk 'BEGIN{skip=0} /^---$/{if(NR==1){skip=1;next} if(skip){skip=0;next}} !skip' "$path"
  } >> "$STAGE/SKILL.md"
done

(cd "$STAGE" && find . -type f | sed 's#^\./##' | sort | zip -q "$OUT" -@)

rm -rf "$VALIDATE_DIR"
mkdir -p "$VALIDATE_DIR"
unzip -q "$OUT" -d "$VALIDATE_DIR"
python3 "$ROOT/scripts/validate_package.py" "$VALIDATE_DIR"

SIZE="$(wc -c < "$OUT" | tr -d ' ')"
echo "OK: wrote $OUT (${SIZE} bytes)"
