#!/usr/bin/env bash
set -euo pipefail

P0="http://127.0.0.1:8080"
P1="http://127.0.0.1:8081"

echo "========================================="
echo "TESTE EC - Conversa de futebol (com reply órfã)"
echo "========================================="

echo "[1/2] Leonardo (P0) posta o assunto (vai atrasar para P2)..."
curl -s -X POST "$P0/post" -H "Content-Type: application/json" -d '{
  "processId": 0,
  "evtId": "POST_FUT_001",
  "author": "Leonardo",
  "text": "Hoje \u00e9 jogo grande! Aposto que o time vai pressionar alto e resolver no 1\u00ba tempo."
}' | sed 's/^/[P0] /'
echo ""

echo "Aguardando 2s para P1 receber o post..."
sleep 2

echo "[2/2] Eduardo (P1) responde o post (P2 vai receber o reply antes do pai em EC)..."
curl -s -X POST "$P1/post" -H "Content-Type: application/json" -d '{
  "processId": 1,
  "evtId": "RPL_FUT_001",
  "parentEvtId": "POST_FUT_001",
  "author": "Eduardo",
  "text": "Calma! Se o meio n\u00e3o encaixar a marca\u00e7\u00e3o, vai sofrer no contra-ataque. Quero ver como o treinador ajusta."
}' | sed 's/^/[P1] /'
echo ""

echo "✅ Disparos conclu\u00eddos."
echo ""
echo "Agora acompanhe os logs (principalmente P2):"
echo "  tail -f logs/p2.log"
echo ""
echo "Esperado em EC:"
echo "  - P2 mostra REPLIES \u00d3RF\u00c3S antes do POST_FUT_001 chegar"
echo "  - depois o post pai chega e o feed se organiza"
