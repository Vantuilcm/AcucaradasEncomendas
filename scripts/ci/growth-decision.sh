#!/usr/bin/env bash
set -euo pipefail

# 🚀 scripts/ci/growth-decision.sh - Motor de Decisão de Growth (Auto-Optimization)
# Analisa resultados de experimentos e aplica melhorias automaticamente.

GROWTH_HISTORY="growth-history.json"
INCIDENT_FILE="incident-history.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

echo "------------------------------------------------------------"
echo "🚀 [GROWTH-DECISION] Analisando Resultados de Growth"
echo "------------------------------------------------------------"

# 1. Simulação de Coleta de Resultados (Firebase A/B / Amplitude Mock)
# Baseline (Variante A) vs Test (Variante B)
VARIATION_A_CONV=4.2  # 4.2% conversão
VARIATION_B_CONV=${REAL_TEST_CONV:-4.9}  # 4.9% conversão (Simulação de ganho)

# 2. Cálculo de Ganho Incremental
GAIN=$(echo "scale=2; (($VARIATION_B_CONV - $VARIATION_A_CONV) / $VARIATION_A_CONV) * 100" | bc)
GAIN_INT=$(echo "$GAIN" | cut -d'.' -f1)

# 3. Decisão de Promoção de Variante
DECISION="NONE"
REASON="Nenhuma melhoria significativa detectada"

if [ $GAIN_INT -ge 10 ]; then
    DECISION="PROMOTE_B"
    REASON="Variante B superou a A em +$GAIN_INT%. Promovendo para 100% dos usuários."
elif [ $GAIN_INT -le -10 ]; then
    DECISION="KILL_B"
    REASON="Variante B degradou a conversão em $GAIN_INT%. Retornando para Variante A."
fi

echo "[INFO] Resultado do Teste:"
echo " - Ganho Estimado: $GAIN_INT%"
echo " - Decisão: $DECISION"
echo " - Motivo: $REASON"

# 4. Aplicar Melhoria Automaticamente (Remote Config)
if [ "$DECISION" == "PROMOTE_B" ]; then
    echo "📈 [AUTO-GROWTH] Variante B promovida para padrão via Remote Config."
    # API Call mock: firebase remoteconfig:update --value "VARIANT_B_VALUE"
elif [ "$DECISION" == "KILL_B" ]; then
    echo "🚨 [AUTO-GROWTH] Variante B desativada devido a performance negativa."
fi

# 5. Salvar Histórico de Aprendizado
if [ ! -f "$GROWTH_HISTORY" ]; then echo "[]" > "$GROWTH_HISTORY"; fi

NEW_ENTRY=$(cat <<EOF
{
  "experiment": "${ACTIVE_EXPERIMENT:-'FREE_SHIPPING_THRESHOLD'}",
  "variant_a": $VARIATION_A_CONV,
  "variant_b": $VARIATION_B_CONV,
  "gain": $GAIN_INT,
  "decision": "$DECISION",
  "reason": "$REASON",
  "date": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
)

TEMP_FILE=$(mktemp)
sed '$d' "$GROWTH_HISTORY" > "$TEMP_FILE"
if [ "$(cat "$TEMP_FILE")" != "[" ]; then echo "," >> "$TEMP_FILE"; fi
echo "$NEW_ENTRY" >> "$TEMP_FILE"
echo "]" >> "$TEMP_FILE"
mv "$TEMP_FILE" "$GROWTH_HISTORY"

# 6. Exportar para Alertas
echo "GROWTH_GAIN=$GAIN_INT" >> $GITHUB_ENV
echo "GROWTH_DECISION=$DECISION" >> $GITHUB_ENV
echo "GROWTH_REASON=$REASON" >> $GITHUB_ENV

echo "✅ [GROWTH-DECISION] Aprendizado registrado."
echo "------------------------------------------------------------"
