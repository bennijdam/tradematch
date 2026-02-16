#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  jobs -pr | xargs -r kill
}

trap cleanup EXIT INT TERM

echo "Starting TradeMatch frontend on :8080 and API on :3001..."
npm start &
frontend_pid=$!

npm --prefix apps/api run dev &
api_pid=$!

echo "Frontend PID: ${frontend_pid}"
echo "API PID: ${api_pid}"
echo "Press Ctrl+C to stop both services."

wait -n "${frontend_pid}" "${api_pid}"