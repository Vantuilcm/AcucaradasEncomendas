#!/usr/bin/env bash
set -euo pipefail

# 🚀 scripts/ci/notify-growth.sh - Alertas de Ganho & Performance (Growth AI)
# Notifica a equipe sobre melhorias automáticas e aprendizados de experimentos.

TELEGRAM_TOKEN=${TELEGRAM_TOKEN:-""}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-""}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-""}
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

# Dados do Growth Decision (Lidos do ENV ou simulados)
GROWTH_GAIN=${GROWTH_GAIN:-"15"}
GROWTH_DECISION=${GROWTH_DECISION:-"PROMOTE_B"}
GROWTH_REASON=${GROWTH_REASON:-"Variante B superou a A em +15%."}
ACTIVE_EXPERIMENT=${ACTIVE_EXPERIMENT:-"FREE_SHIPPING_THRESHOLD"}
ESTIMATED_REVENUE_GAIN=${ESTIMATED_REVENUE_GAIN:-"R$ 8.500,00"}

echo "------------------------------------------------------------"
echo "🚀 [NOTIFY-GROWTH] Preparando Alerta de Ganho"
echo "------------------------------------------------------------"

EMOJI="🚀"
if [ "$GROWTH_DECISION" == "KILL_B" ]; then EMOJI="⚠️"; fi

MESSAGE="*${EMOJI} ALERTA DE GROWTH: ${APP_NAME}*

*Nova Otimização Autônoma Aplicada*
--------------------------------------------
- *Experimento:* ${ACTIVE_EXPERIMENT}
- *Resultado:* +${GROWTH_GAIN}% de Conversão
- *Decisão:* ${GROWTH_DECISION}
- *Impacto:* ${GROWTH_REASON}
- *Ganho Financeiro Est.:* ${ESTIMATED_REVENUE_GAIN}

*Ação Tomada:* Configuração promovida para 100% dos usuários via Remote Config."

# 1. Enviar para Telegram
if [ -n "$TELEGRAM_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    echo "[INFO] Enviando alerta para Telegram..."
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${MESSAGE}" \
        -d "parse_mode=Markdown" > /dev/null
fi

# 2. Enviar para Slack
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    echo "[INFO] Enviando alerta para Slack..."
    PAYLOAD=$(cat <<EOF
{
  "text": "${MESSAGE}",
  "blocks": [
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "${MESSAGE}" }
    }
  ]
}
EOF
)
    curl -s -X POST -H 'Content-type: application/json' --data "$PAYLOAD" "$SLACK_WEBHOOK_URL" > /dev/null
fi

echo "✅ [NOTIFY-GROWTH] Alerta enviado."
echo "------------------------------------------------------------"
