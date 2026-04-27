#!/usr/bin/env bash
set -euo pipefail

# 📈 scripts/ci/demand-forecast.sh - Previsão de Demanda e Estoque (IA Forecast)
# Integração com modelos de previsão (Etapa 6 - Previsão de Demanda IA).

FORECAST_FILE="demand-forecast.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

echo "------------------------------------------------------------"
echo "📈 [DEMAND-FORECAST] Calculando Previsão de Mercado (IA)"
echo "------------------------------------------------------------"

# 1. Simulação de Previsão de Demanda (TCC Connection Mock)
# Simula a saída de um modelo de Machine Learning que prevê picos de demanda.
echo "[INFO] Analisando séries temporais de pedidos..."

# Dados simulados para os próximos 7 dias
FORECAST_DATA=(
    "Segunda|120|High"
    "Terca|105|Normal"
    "Quarta|110|Normal"
    "Quinta|135|High"
    "Sexta|180|Peak"
    "Sabado|220|Critical_Peak"
    "Domingo|150|High"
)

echo "[INFO] Gerando arquivo de previsão para estoque e logística..."
echo "{" > "$FORECAST_FILE"
echo "  \"app\": \"$APP_NAME\"," >> "$FORECAST_FILE"
echo "  \"forecast_horizon\": \"7_days\"," >> "$FORECAST_FILE"
echo "  \"predictions\": [" >> "$FORECAST_FILE"

FIRST=true
PEAK_DAY=""
MAX_DEMAND=0

for F in "${FORECAST_DATA[@]}"; do
    DAY=$(echo $F | cut -d'|' -f1)
    VAL=$(echo $F | cut -d'|' -f2)
    TYPE=$(echo $F | cut -d'|' -f3)
    
    if [ "$FIRST" = false ]; then echo "," >> "$FORECAST_FILE"; fi
    echo "    { \"day\": \"$DAY\", \"estimated_orders\": $VAL, \"demand_level\": \"$TYPE\" }" >> "$FORECAST_FILE"
    
    if [ $VAL -gt $MAX_DEMAND ]; then
        MAX_DEMAND=$VAL
        PEAK_DAY=$DAY
    fi
    FIRST=false
done

echo "  ]," >> "$FORECAST_FILE"
echo "  \"peak_prediction\": { \"day\": \"$PEAK_DAY\", \"value\": $MAX_DEMAND }," >> "$FORECAST_FILE"
echo "  \"stock_recommendation\": \"Aumentar estoque em 30% para $PEAK_DAY\"" >> "$FORECAST_FILE"
echo "}" >> "$FORECAST_FILE"

echo "[INFO] Previsão de Pico: $PEAK_DAY com $MAX_DEMAND pedidos estimados."
echo "[INFO] Recomendação de Estoque: Aumentar estoque em 30% para $PEAK_DAY."

# 2. Exportar para o Workflow
echo "FORECAST_PEAK_DAY=$PEAK_DAY" >> $GITHUB_ENV
echo "FORECAST_PEAK_VALUE=$MAX_DEMAND" >> $GITHUB_ENV
echo "FORECAST_STOCK_ADVICE=INCREASE_30_PERCENT" >> $GITHUB_ENV

echo "✅ [DEMAND-FORECAST] Previsão de IA concluída."
echo "------------------------------------------------------------"
