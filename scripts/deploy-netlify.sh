#!/bin/bash
# 日课 · 直传 Netlify（不经过 GitHub）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ 缺少 $ENV_FILE"
  echo "请复制 .env.example 为 .env 并填入 Netlify Token 和 Site ID"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${NETLIFY_AUTH_TOKEN:-}" || -z "${NETLIFY_SITE_ID:-}" ]]; then
  echo "❌ .env 里需要 NETLIFY_AUTH_TOKEN 和 NETLIFY_SITE_ID"
  exit 1
fi

ZIP="/tmp/rike-deploy-$$.zip"
cd "$ROOT"

echo "📦 打包网站..."
zip -r "$ZIP" . \
  -x "*.git*" \
  -x ".env" \
  -x ".env.*" \
  -x "*.zip" \
  -x ".DS_Store" \
  -x "scripts/deploy-netlify.sh" \
  > /dev/null

echo "🚀 上传到 Netlify..."
RESPONSE=$(curl -sS -w "\n%{http_code}" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -F "file=@$ZIP" \
  "https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploy")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

rm -f "$ZIP"

if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" ]]; then
  echo "❌ 部署失败 (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

URL=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ssl_url') or d.get('url') or 'https://fulan-daily-plan.netlify.app/')" 2>/dev/null || echo "https://fulan-daily-plan.netlify.app/")

echo "✅ 部署成功！"
echo "🌐 $URL"
echo "📱 手机刷新页面即可看到更新"