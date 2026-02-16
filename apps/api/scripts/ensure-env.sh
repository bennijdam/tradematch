#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$API_DIR/.env"
BACKUP_DIR="${HOME}/.tradematch-secrets"
BACKUP_FILE="$BACKUP_DIR/api.env.backup"

if [[ -f "$ENV_FILE" ]]; then
  mkdir -p "$BACKUP_DIR"
  if [[ ! -f "$BACKUP_FILE" ]]; then
    cp "$ENV_FILE" "$BACKUP_FILE"
    chmod 600 "$BACKUP_FILE" || true
  fi
  exit 0
fi

if [[ -f "$BACKUP_FILE" ]]; then
  cp "$BACKUP_FILE" "$ENV_FILE"
  chmod 600 "$ENV_FILE" || true
  echo "Restored missing .env from backup at $BACKUP_FILE"
  exit 0
fi

echo "ERROR: Missing $ENV_FILE and no backup found at $BACKUP_FILE" >&2
exit 1
