#!/usr/bin/env bash
set -euo pipefail

P0="http://127.0.0.1:8080"
P1="http://127.0.0.1:8081"

echo "========================================="
echo "TESTE CC - Conversa de futebol (sem reply órfã)"
echo "========================================="

echo "[1/2] Leonardo (P0) posta o assunto (vai atrasar para P2)..."
curl -s -X POST "$P0/post" -H "Content-Type: application/json" -d '{
  "processId": 0,
  "evtId": "POST_FUT_101",
  "author": "Leonardo",
  "text": "Se o Arrascaeta estiver inspirado hoje, a bola vai chegar redonda na \u00e1rea. Jogo pra ter assist\u00eancia!"
}' | sed 's/^/[P0] /'
echo ""

echo "Aguardando 2s para P1 receber o post..."
sleep 2

echo "[2/2] Eduardo (P1) responde (em CC P2 N\u00c3O deve mostrar \u00f3rf\u00e3; deve bufferizar)..."
curl -s -X POST "$P1/post" -H "Content-Type: application/json" -d '{
  "processId": 1,
  "evtId": "RPL_FUT_101",
  "parentEvtId": "POST_FUT_101",
  "author": "Eduardo",
  "text": "Fato! Mas se o lateral n\u00e3o subir pra dar op\u00e7\u00e3o, ele vai ficar sem linha de passe. Quero ver triangula\u00e7\u00e3o!"
}' | sed 's/^/[P1] /'
echo ""

echo "✅ Disparos conclu\u00eddos."
echo ""
echo "Agora acompanhe os logs (principalmente P2):"
echo "  tail -f logs/p2.log"
echo ""
echo "Esperado em CC:"
echo "  - N\u00c3O aparece 'REPLIES \u00d3RF\u00c3S'"
echo "  - aparece algo como 'ADIADO/BUFFER' para o reply"
echo "  - quando o post pai chegar (atraso), o reply \u00e9 entregue na sequ\u00eancia"
