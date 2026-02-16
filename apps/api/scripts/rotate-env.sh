#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$API_DIR/.env"
BACKUP_DIR="${HOME}/.tradematch-secrets"
BACKUP_FILE="$BACKUP_DIR/api.env.backup"

use_sudo() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    "$@"
  fi
}

set_immutable_flag() {
  local flag="$1"
  local target="$2"

  if ! command -v chattr >/dev/null 2>&1; then
    return 0
  fi

  use_sudo chattr "$flag" "$target" >/dev/null 2>&1 || true
}

prepare_rotation() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: Missing $ENV_FILE" >&2
    exit 1
  fi

  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR" || true

  if [[ ! -f "$BACKUP_FILE" ]]; then
    cp "$ENV_FILE" "$BACKUP_FILE"
  fi

  set_immutable_flag -i "$ENV_FILE"
  set_immutable_flag -i "$BACKUP_FILE"

  chmod 600 "$ENV_FILE" "$BACKUP_FILE" || true

  echo "Prepared for rotation."
  echo "- .env and backup unlocked (if immutable was set)."
  echo "- You can now edit: $ENV_FILE"
}

finalize_rotation() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: Missing $ENV_FILE" >&2
    exit 1
  fi

  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR" || true

  set_immutable_flag -i "$BACKUP_FILE"

  cp "$ENV_FILE" "$BACKUP_FILE"
  chmod 600 "$ENV_FILE" "$BACKUP_FILE" || true

  set_immutable_flag +i "$ENV_FILE"
  set_immutable_flag +i "$BACKUP_FILE"

  echo "Rotation finalize complete."
  echo "- Backup refreshed from .env"
  echo "- Immutable lock re-applied where supported"
}

usage() {
  cat <<'EOF'
Usage:
  bash scripts/rotate-env.sh prepare
  bash scripts/rotate-env.sh finalize

Commands:
  prepare   Unlock immutable flags (if set) and ensure backup exists
  finalize  Refresh backup from .env, set secure perms, relock immutable
EOF
}

command_name="${1:-}"

case "$command_name" in
  prepare)
    prepare_rotation
    ;;
  finalize)
    finalize_rotation
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    echo "Unknown command: $command_name" >&2
    usage
    exit 1
    ;;
esac
