#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

# Prefer the user's Node installation; use Codex's bundled runtime on this Mac if needed.
if ! command -v node >/dev/null 2>&1; then
  task_runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
  if [ ! -x "$task_runtime/node/bin/node" ]; then
    echo '需要 Node.js 22.12 或更新版本。安裝後執行 npm install 與 npm run dev。' >&2
    exit 1
  fi
  PATH="$task_runtime/node/bin:$task_runtime/bin/fallback:$PATH"
  export PATH
fi
if command -v pnpm >/dev/null 2>&1; then
  if [ ! -d node_modules ]; then pnpm install --frozen-lockfile; fi
  exec pnpm run "${@:-dev}"
elif command -v npm >/dev/null 2>&1; then
  if [ ! -d node_modules ]; then npm install; fi
  exec npm run "${@:-dev}"
else
  echo '找不到 pnpm 或 npm，請安裝其中一個套件管理器。' >&2
  exit 1
fi
