#!/bin/bash
# 把 main 分支内容同步到 gh-pages 分支，强制 GitHub Pages 更新
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MSG="${1:-deploy $(date +%Y-%m-%d-%H%M)}"
ORIGIN="$(git remote get-url origin)"
TMP="$(mktemp -d)"

trap 'rm -rf "$TMP"' EXIT

git archive HEAD | tar -x -C "$TMP"
cd "$TMP"
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name="fulan" -c user.email="fulan@users.noreply.github.com" commit -q -m "$MSG"
git remote add origin "$ORIGIN"
git push -f origin gh-pages

echo "✅ gh-pages 分支已更新"