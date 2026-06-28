#!/bin/bash
# 日课 · push 到 GitHub，由 GitHub Pages 自动发布
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MSG="${1:-update plans $(date +%Y-%m-%d)}"

python3 scripts/generate_calendar.py

git add -A
if git diff --staged --quiet; then
  echo "没有变更，跳过提交"
  exit 0
fi

git commit -m "$MSG"
git push origin main

echo "✅ 已推送到 GitHub"
echo "🌐 约 1–2 分钟后：https://fulanwd.github.io/daily-plan/"