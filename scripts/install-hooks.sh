#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$ROOT/scripts/bump-version.sh"
chmod +x "$ROOT/.githooks/pre-commit"
git -C "$ROOT" config core.hooksPath .githooks
echo "Git hooks installed (.githooks/pre-commit)."
