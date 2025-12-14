#!/usr/bin/env bash
set -euo pipefail

echo "==> Parando nós..."

for f in logs/p0.pid logs/p1.pid logs/p2.pid; do
  if [[ -f "$f" ]]; then
    pid="$(cat "$f" || true)"
    if [[ -n "${pid:-}" ]]; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$f"
  fi
done

for port in 8080 8081 8082; do
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -t -iTCP:${port} -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids:-}" ]]; then
      kill -9 ${pids} 2>/dev/null || true
    fi
  fi
done

echo "✅ Parado."
