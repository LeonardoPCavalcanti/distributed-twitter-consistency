#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-EC}"   # EC ou CC
MODE_UPPER="$(echo "$MODE" | tr '[:lower:]' '[:upper:]')"

if [[ "$MODE_UPPER" != "EC" && "$MODE_UPPER" != "CC" ]]; then
  echo "Uso: $0 EC|CC"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

mkdir -p logs

echo "==> (1) Preparando venv..."
if [[ ! -d "venv" ]]; then
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

echo "==> (2) Instalando dependências..."
pip -q install --upgrade pip >/dev/null
pip -q install -r requirements.txt

echo "==> (3) Limpando processos antigos (uvicorn/python) e portas 8080-8082..."

# mata pelo PID salvo (se existir)
for f in logs/p0.pid logs/p1.pid logs/p2.pid; do
  if [[ -f "$f" ]]; then
    oldpid="$(cat "$f" || true)"
    if [[ -n "${oldpid:-}" ]]; then
      kill -9 "$oldpid" 2>/dev/null || true
    fi
    rm -f "$f"
  fi
done

# mata qualquer coisa que esteja ouvindo nas portas
for port in 8080 8081 8082; do
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -t -iTCP:${port} -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids:-}" ]]; then
      echo "   - Matando processos na porta ${port}: ${pids}"
      kill -9 ${pids} 2>/dev/null || true
    fi
  else
    # fallback sem lsof
    pkill -f "127.0.0.1:${port}" 2>/dev/null || true
  fi
done

# limpa logs antigos
: > logs/p0.log
: > logs/p1.log
: > logs/p2.log

echo "==> (4) Subindo nós em background (MODE=${MODE_UPPER})..."

if [[ "$MODE_UPPER" == "EC" ]]; then
  python -m src.twitter_eventual 0 > logs/p0.log 2>&1 & echo $! > logs/p0.pid
  python -m src.twitter_eventual 1 > logs/p1.log 2>&1 & echo $! > logs/p1.pid
  python -m src.twitter_eventual 2 > logs/p2.log 2>&1 & echo $! > logs/p2.pid
else
  python -m src.twitter_causal 0 > logs/p0.log 2>&1 & echo $! > logs/p0.pid
  python -m src.twitter_causal 1 > logs/p1.log 2>&1 & echo $! > logs/p1.pid
  python -m src.twitter_causal 2 > logs/p2.log 2>&1 & echo $! > logs/p2.pid
fi

echo "==> (5) Aguardando health checks..."
sleep 1

check() {
  local url="$1"
  for i in {1..20}; do
    if curl -s "$url" >/dev/null 2>&1; then
      echo "   OK: $url"
      return 0
    fi
    sleep 0.3
  done
  echo "   FALHOU: $url"
  return 1
}

check "http://127.0.0.1:8080/health"
check "http://127.0.0.1:8081/health"
check "http://127.0.0.1:8082/health"

echo ""
echo "✅ Subiu tudo!"
echo "   P0: http://127.0.0.1:8080"
echo "   P1: http://127.0.0.1:8081"
echo "   P2: http://127.0.0.1:8082"
echo ""
echo "Logs (abra 3 terminais e rode):"
echo "  tail -f logs/p0.log"
echo "  tail -f logs/p1.log"
echo "  tail -f logs/p2.log"
echo ""
echo "Para parar tudo:"
echo "  ./stop.sh"
