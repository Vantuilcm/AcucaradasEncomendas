#!/usr/bin/env bash
set -euo pipefail

# 🌍 scripts/ci/notify-market.sh - Alerta de Expansão e Inteligência de Mercado
# Notifica a equipe sobre oportunidades e decisões estratégicas.

TELEGRAM_TOKEN=${TELEGRAM_TOKEN:-""}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-""}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-""}
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

# Dados do Market Decision (Lidos do ENV ou simulados)
MARKET_TARGET_REGION=${MARKET_TARGET_REGION:-"Centro"}
MARKET_DECISION=${MARKET_DECISION:-"MONITOR"}
MARKET_ROI=${MARKET_ROI:-"5.5"}
MARKET_INVESTMENT=${MARKET_INVESTMENT:-"MAINTAIN"}
MARKET_GAP=${MARKET_GAP:-"12.0"}
PRICING_DELIVERY_FEE=${PRICING_DELIVERY_FEE:-"R$ 12,00"}
MARKET_TOP_PRODUCT=${MARKET_TOP_PRODUCT:-"Bolo de Rolo"}
FORECAST_PEAK_DAY=${FORECAST_PEAK_DAY:-"Sabado"}
FORECAST_STOCK_ADVICE=${FORECAST_STOCK_ADVICE:-"MAINTAIN"}

echo "------------------------------------------------------------"
echo "🌍 [NOTIFY-MARKET] Preparando Alerta Estratégico"
echo "------------------------------------------------------------"

EMOJI="🌍"
if [ "$MARKET_DECISION" == "EXPAND_NOW" ]; then EMOJI="🚀 EXPANSÃO IMEDIATA 🚀"; fi

MESSAGE="*${EMOJI} ALERTA ESTRATÉGICO: ${APP_NAME}*

*Nova Inteligência de Mercado Aplicada*
--------------------------------------------
- *Região Alvo:* ${MARKET_TARGET_REGION}
- *Gap de Demanda:* ${MARKET_GAP}x (Pedidos/Produtor)
- *Decisão de Mercado:* ${MARKET_DECISION}
- *Investimento Ads:* ${MARKET_INVESTMENT}
- *ROI Estimado:* ${MARKET_ROI}x
- *Preço de Entrega:* R$ ${PRICING_DELIVERY_FEE}
- *Top Produto:* ${MARKET_TOP_PRODUCT}
- *Pico Previsto:* ${FORECAST_PEAK_DAY}
- *Recomendação Estoque:* ${FORECAST_STOCK_ADVICE}

*Ação Tomada:* Campanhas e onboardings priorizados para dominar a região ${MARKET_TARGET_REGION} com foco em ${MARKET_TOP_PRODUCT}."

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

echo "✅ [NOTIFY-MARKET] Alerta estratégico enviado."
echo "------------------------------------------------------------"
