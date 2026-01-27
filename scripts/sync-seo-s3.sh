#!/usr/bin/env bash
set -euo pipefail

BUCKET=${S3_BUCKET:-tradematch-storage}
PREFIX=${S3_PREFIX:-"SEO pages"}
REGION=${AWS_REGION:-ap-southeast-2}

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PREFERRED_DIR="$ROOT_DIR/frontend/seo-generator/generated-pages"
FALLBACK_DIR="$ROOT_DIR/seo-pages/public"

if [[ -n "${SEO_LOCAL_DIR:-}" ]]; then
  LOCAL_DIR="$SEO_LOCAL_DIR"
elif [[ -d "$PREFERRED_DIR" ]]; then
  LOCAL_DIR="$PREFERRED_DIR"
else
  LOCAL_DIR="$FALLBACK_DIR"
fi

if [[ ! -d "$LOCAL_DIR" ]]; then
  echo "Local SEO pages directory not found: $LOCAL_DIR" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI not found. Install AWS CLI and ensure 'aws' is in PATH." >&2
  exit 1
fi

TARGET="s3://$BUCKET/$PREFIX/"

echo "Syncing SEO pages..."
echo "Local: $LOCAL_DIR"
echo "Target: $TARGET"

aws s3 sync "$LOCAL_DIR" "$TARGET" --delete --region "$REGION" --cache-control "public, max-age=86400" --metadata-directive REPLACE

if [[ $? -ne 0 ]]; then
  echo "AWS CLI sync failed. Configure AWS credentials and retry." >&2
  exit 1
fi

echo "✅ SEO pages synced to S3."
