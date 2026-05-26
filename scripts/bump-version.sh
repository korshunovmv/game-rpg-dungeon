#!/bin/sh
set -eu

ROOT="$(git rev-parse --show-toplevel)"
VERSION_FILE="$ROOT/VERSION"
JS_VERSION="$ROOT/js/version.js"

if [ ! -f "$VERSION_FILE" ]; then
  printf '0.1.0\n' > "$VERSION_FILE"
fi

current="$(tr -d '[:space:]' < "$VERSION_FILE" | sed 's/^v//')"
major="$(printf '%s' "$current" | cut -d. -f1)"
minor="$(printf '%s' "$current" | cut -d. -f2)"
patch="$(printf '%s' "$current" | cut -d. -f3)"

major="${major:-0}"
minor="${minor:-1}"
patch="${patch:-0}"

new_patch=$((patch + 1))
new_version="${major}.${minor}.${new_patch}"

printf '%s\n' "$new_version" > "$VERSION_FILE"
printf "export const VERSION = '%s';\n" "$new_version" > "$JS_VERSION"

git add "$VERSION_FILE" "$JS_VERSION"

echo "Version bumped: ${current} -> ${new_version}"
