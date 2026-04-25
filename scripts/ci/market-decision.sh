#!/usr/bin/env bash
set -euo pipefail

# 🌍 scripts/ci/market-decision.sh - Motor de Decisão Estratégica de Mercado (Strategic AI)
# Decide onde investir, expandir ou reduzir operação baseada em dados reais.

MARKET_HISTORY="market-history.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

echo "------------------------------------------------------------"
echo "🌍 [MARKET-DECISION] Analisando Decisão Estratégica"
echo "------------------------------------------------------------"

# 1. Inputs das Etapas Anteriores (Lidos do ENV ou simulados)
TARGET_REGION=${MARKET_TARGET_REGION:-"Centro"}
SUGGESTION=${MARKET_SUGGESTION:-"MONITOR"}
GAP=${MARKET_GAP:-"15.0"}
PRICING_ACTION=${PRICING_ACTION:-"KEEP_STABLE"}
TOP_PRODUCT=${MARKET_TOP_PRODUCT:-"Bolo de Rolo"}
PEAK_DAY=${FORECAST_PEAK_DAY:-"Sabado"}
STOCK_ADVICE=${FORECAST_STOCK_ADVICE:-"MAINTAIN"}

# 2. Lógica de Investimento de Marketing (Aumentar Aquisição)
# Se houver um gap alto de demanda e a sugestão for expansão:
# - Aumentamos o investimento em Meta Ads / Google Ads na região.
INVESTMENT_ACTION="MAINTAIN"
ROI_ESTIMATED="5.0" # ROI Estimado de 5x

if [ "$SUGGESTION" == "EXPAND_NOW" ] && (( $(echo "$GAP > 20" | bc -l) )); then
    INVESTMENT_ACTION="INCREASE_AGGRESSIVE"
    ROI_ESTIMATED="8.5"
    REASON="Demanda reprimida em $TARGET_REGION indica alta conversão para novos usuários. Foco em $TOP_PRODUCT para o pico de $PEAK_DAY."
elif [ "$SUGGESTION" == "MONITOR" ]; then
    INVESTMENT_ACTION="OPTIMIZE"
    ROI_ESTIMATED="6.0"
    REASON="Foco em retenção e ticket médio na região $TARGET_REGION com $TOP_PRODUCT."
fi

echo "[INFO] Decisão Estratégica:"
echo " - Região Foco: $TARGET_REGION"
echo " - Ação de Mercado: $SUGGESTION"
echo " - Investimento Ads: $INVESTMENT_ACTION"
echo " - ROI Estimado: ${ROI_ESTIMATED}x"
echo " - Top Produto: $TOP_PRODUCT"
echo " - Pico Previsto: $PEAK_DAY"
echo " - Estoque: $STOCK_ADVICE"
echo " - Motivo: $REASON"

# 3. Registrar Histórico de Mercado
if [ ! -f "$MARKET_HISTORY" ]; then echo "[]" > "$MARKET_HISTORY"; fi

NEW_ENTRY=$(cat <<EOF
{
  "region": "$TARGET_REGION",
  "gap": $GAP,
  "pricing_action": "$PRICING_ACTION",
  "investment": "$INVESTMENT_ACTION",
  "roi_estimated": $ROI_ESTIMATED,
  "top_product": "$TOP_PRODUCT",
  "peak_day": "$PEAK_DAY",
  "stock_advice": "$STOCK_ADVICE",
  "reason": "$REASON",
  "date": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
)

TEMP_FILE=$(mktemp)
sed '$d' "$MARKET_HISTORY" > "$TEMP_FILE"
if [ "$(cat "$TEMP_FILE")" != "[" ]; then echo "," >> "$TEMP_FILE"; fi
echo "$NEW_ENTRY" >> "$TEMP_FILE"
echo "]" >> "$TEMP_FILE"
mv "$TEMP_FILE" "$MARKET_HISTORY"

# 4. Exportar para Alertas de Mercado
echo "MARKET_DECISION=$SUGGESTION" >> $GITHUB_ENV
echo "MARKET_ROI=$ROI_ESTIMATED" >> $GITHUB_ENV
echo "MARKET_INVESTMENT=$INVESTMENT_ACTION" >> $GITHUB_ENV

echo "✅ [MARKET-DECISION] Estratégia de dominação definida."
echo "------------------------------------------------------------"
