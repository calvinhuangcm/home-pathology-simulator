#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

SIMULATOR_URL=""

find_simulator() {
  for port in 5173 5174 5175 5176 5177 5178 5179 5180; do
    local candidate html
    candidate="http://127.0.0.1:${port}/"
    html="$(curl --connect-timeout 1 --max-time 2 -fsS "$candidate" 2>/dev/null || true)"
    if printf '%s' "$html" | grep -Fq '<title>壁癌模擬器'; then
      SIMULATOR_URL="$candidate"
      return 0
    fi
  done
  return 1
}

show_simulator() {
  if [ "${SIMULATOR_NO_OPEN:-0}" != "1" ]; then
    open "$SIMULATOR_URL"
  fi
  echo "模擬器網址：$SIMULATOR_URL"
}

if find_simulator; then
  echo '模擬器已在執行，直接開啟現有頁面。'
  show_simulator
  exit 0
fi

echo '正在啟動壁癌模擬器…'
./scripts/run.sh dev &
SERVER_PID=$!

stop_server() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap stop_server EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

attempt=0
while [ "$attempt" -lt 60 ]; do
  if find_simulator; then
    echo '模擬器已就緒。'
    show_simulator
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo '啟動失敗，請查看上方錯誤訊息。' >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ -z "$SIMULATOR_URL" ]; then
  echo '等待模擬器啟動逾時。' >&2
  exit 1
fi

echo '此終端機會保持開啟以顯示伺服器訊息；按 Ctrl+C 可停止模擬器。'
wait "$SERVER_PID"
