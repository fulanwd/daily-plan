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

bash "$(dirname "$0")/deploy-ghpages.sh" "$MSG" || echo "⚠️ gh-pages 同步失败，请检查 GitHub Pages 是否选 main 分支"

echo "✅ 已推送到 GitHub"
echo "🌐 约 1–2 分钟后：https://fulanwd.github.io/daily-plan/"
echo "💡 页脚会显示「数据版本」；若不是今天日期，去 GitHub → Settings → Pages → 改选 gh-pages 分支"