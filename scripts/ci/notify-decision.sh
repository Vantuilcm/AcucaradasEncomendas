#!/usr/bin/env bash
set -euo pipefail

# 📢 scripts/ci/notify-decision.sh - Notificação Inteligente de Decisão de Release
# Envia alertas sobre a decisão automática tomada pelo motor de IA.

APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
DECISION_FILE="release-decision.json"
GITHUB_RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-vantuil/AcucaradasEncomendas}/actions/runs/${GITHUB_RUN_ID:-0}"

echo "------------------------------------------------------------"
echo "📢 [NOTIFY DECISION] Enviando notificação de decisão"
echo "------------------------------------------------------------"

if [ ! -f "$DECISION_FILE" ]; then
    echo "[ERROR] release-decision.json não encontrado."
    exit 1
fi

DECISION=$(grep '"decision":' "$DECISION_FILE" | cut -d'"' -f4)
REASON=$(grep '"reason":' "$DECISION_FILE" | cut -d'"' -f4)
RISK=$(grep '"risk_level":' "$DECISION_FILE" | cut -d'"' -f4)

# Definir Emojis por Nível de Risco
EMOJI="⚪"
if [ "$DECISION" == "AUTO-RELEASE" ]; then EMOJI="🚀"; fi
if [ "$DECISION" == "REQUIRE_APPROVAL" ]; then EMOJI="⚠️"; fi
if [ "$DECISION" == "BLOCK_RELEASE" ]; then EMOJI="🚫"; fi

MESSAGE="$EMOJI *IA Decision: $DECISION — $APP_NAME*

🧠 *Decisão:* $DECISION
🎯 *Motivo:* $REASON
⚖️ *Risco:* $RISK

🔗 [Visualizar Execução no GitHub Actions]($GITHUB_RUN_URL)

---
*Status:* $([ "$DECISION" == "AUTO-RELEASE" ] && echo "✅ Submissão Iniciada" || echo "⏳ Aguardando Ação Manual")"

# 1. Notificar via Telegram
if [[ -n "${TELEGRAM_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    echo "[INFO] Disparando alerta via Telegram..."
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d text="$MESSAGE" \
        -d parse_mode="Markdown" > /dev/null
fi

# 2. Notificar via Slack
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    echo "[INFO] Disparando alerta via Slack..."
    SLACK_MSG="{\"text\": \"$EMOJI *IA Decision: $DECISION — $APP_NAME*\n*Motivo:* $REASON\n*Risco:* $RISK\n*Link:* $GITHUB_RUN_URL\"}"
    curl -s -X POST -H 'Content-type: application/json' --data "$SLACK_MSG" "$SLACK_WEBHOOK_URL" > /dev/null
fi

echo "✅ [NOTIFY] Decisão notificada com sucesso."
echo "------------------------------------------------------------"
