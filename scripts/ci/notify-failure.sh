#!/usr/bin/env bash
set -euo pipefail

# 🚨 scripts/ci/notify-failure.sh - Sistema de Alertas Automáticos Multinacional
# Suporta: Telegram, Slack (Webhook) e fallback via Log

APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
GITHUB_RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-vantuil/AcucaradasEncomendas}/actions/runs/${GITHUB_RUN_ID:-0}"
SUMMARY_FILE="error_summary.txt"

# Cores e Emojis
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "------------------------------------------------------------"
echo "🚨 [NOTIFY FAILURE] Iniciando disparo de alertas para: $APP_NAME"
echo "------------------------------------------------------------"

# Extrair resumo se existir
if [ -f "$SUMMARY_FILE" ]; then
    SUMMARY_CONTENT=$(cat "$SUMMARY_FILE")
else
    SUMMARY_CONTENT="Resumo de erro não disponível."
fi

MESSAGE="🚨 *iOS Pipeline Failure — $APP_NAME*
📍 *Etapa:* $(grep "ETAPA:" "$SUMMARY_FILE" | cut -d':' -f2- || echo "Desconhecida")
🔍 *Causa:* $(grep "CAUSA:" "$SUMMARY_FILE" | cut -d':' -f2- || echo "Desconhecida")
🛠️ *Ação:* $(grep "AÇÃO" "$SUMMARY_FILE" | cut -d':' -f2- || echo "Verificar logs")

🔗 [Visualizar Execução no GitHub Actions]($GITHUB_RUN_URL)

---
*Resumo Técnico:*
\`\`\`
$SUMMARY_CONTENT
\`\`\`"

# 1. Notificar via Telegram (Se TELEGRAM_TOKEN e TELEGRAM_CHAT_ID existirem)
if [[ -n "${TELEGRAM_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    echo "[INFO] Disparando alerta via Telegram..."
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d text="$MESSAGE" \
        -d parse_mode="Markdown" > /dev/null
fi

# 2. Notificar via Slack (Se SLACK_WEBHOOK_URL existir)
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    echo "[INFO] Disparando alerta via Slack..."
    # Formatação Slack é diferente do Markdown puro
    SLACK_MSG="{\"text\": \"🚨 *iOS Pipeline Failure — $APP_NAME*\n*Link:* $GITHUB_RUN_URL\n*Detalhes:* \n$SUMMARY_CONTENT\"}"
    curl -s -X POST -H 'Content-type: application/json' --data "$SLACK_MSG" "$SLACK_WEBHOOK_URL" > /dev/null
fi

# 3. Fallback: Log Estruturado para Monitoramento de Terceiros
echo -e "${RED}[ERROR] Pipeline falhou para $APP_NAME. Resumo técnico anexado.${NC}"
echo "------------------------------------------------------------"
echo "$SUMMARY_CONTENT"
echo "------------------------------------------------------------"
echo "✅ Alertas processados."
