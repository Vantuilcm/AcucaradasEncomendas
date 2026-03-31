#!/usr/bin/env bash
set -euo pipefail

# 📉 scripts/ci/notify-business.sh - Alerta de Negócio & Growth Impact
# Envia notificações ricas para Telegram/Slack sobre métricas de produto.

TELEGRAM_TOKEN=${TELEGRAM_TOKEN:-""}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-""}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-""}
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
VERSION=${VERSION:-"1.0.0"}

# Dados do Business Monitor (Lidos do ENV ou simulados)
BUSINESS_STATE=${BUSINESS_STATE:-"BUSINESS_WARNING"}
BUSINESS_ACTION=${BUSINESS_ACTION:-"ALERT_ONLY"}
CONVERSION_DROP=${CONVERSION_DROP:-"15"}
USERS_AFFECTED=${REAL_USERS_AFFECTED:-"~500"}
REVENUE_IMPACT=${REVENUE_IMPACT:-"R$ 5.200,00"}

echo "------------------------------------------------------------"
echo "📉 [NOTIFY-BUSINESS] Preparando Alerta de Negócio"
echo "------------------------------------------------------------"

EMOJI="📉"
if [ "$BUSINESS_STATE" == "BUSINESS_CRITICAL" ]; then EMOJI="🚨 CRITICAL 🚨"; fi

MESSAGE="*${EMOJI} ALERTA DE NEGÓCIO: ${APP_NAME}*

*Impacto Detectado após Release v${VERSION}*
--------------------------------------------
- *Queda de Conversão:* ${CONVERSION_DROP}%
- *Estado:* ${BUSINESS_STATE}
- *Ação Tomada:* ${BUSINESS_ACTION}
- *Usuários Afetados:* ${USERS_AFFECTED}
- *Impacto Financeiro Est.:* ${REVENUE_IMPACT}

*Ação Recomendada:* Revisar logs de produto e Remote Config imediatamente."

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

echo "✅ [NOTIFY-BUSINESS] Alerta enviado."
echo "------------------------------------------------------------"
