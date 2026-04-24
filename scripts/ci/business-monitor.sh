#!/usr/bin/env bash
set -euo pipefail

# 📈 scripts/ci/business-monitor.sh - Monitoramento de Negócio & Growth AI
# Detecta quedas de performance do produto (conversão, abandono) e decide ações.

BUSINESS_HISTORY="business-history.json"
INCIDENT_FILE="incident-history.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
VERSION=${VERSION:-"1.0.0"}

echo "------------------------------------------------------------"
echo "📈 [BUSINESS-MONITOR] Analisando Performance de Negócio"
echo "------------------------------------------------------------"

# 1. Simulação de Coleta de Métricas (Firebase Analytics / PostHog Mock)
# Baseline (Médias históricas)
BASELINE_CONVERSION=5.0      # 5% de conversão
BASELINE_ABANDONMENT=20.0    # 20% de abandono de carrinho

# Métricas Atuais (Mock: Lidas de variáveis ou simuladas)
CURRENT_CONVERSION=${REAL_CONVERSION:-4.2}     # 4.2%
CURRENT_ABANDONMENT=${REAL_ABANDONMENT:-22.0}  # 22%
CURRENT_REVENUE=${REAL_REVENUE:-1250.0}        # R$ 1250,00 (Última hora)
TOTAL_ORDERS=${REAL_ORDERS:-50}                # 50 pedidos

echo "[INFO] Métricas Atuais vs Baseline:"
echo " - Conversão: $CURRENT_CONVERSION% (Baseline: $BASELINE_CONVERSION%)"
echo " - Abandono: $CURRENT_ABANDONMENT% (Baseline: $BASELINE_ABANDONMENT%)"
echo " - Receita (Última Hora): R$ $CURRENT_REVENUE"

# 2. Cálculo de Impacto (Variação Percentual)
# Bash não lida bem com float, usamos 'bc' para calcular a variação
CONVERSION_DROP=$(echo "scale=2; (($BASELINE_CONVERSION - $CURRENT_CONVERSION) / $BASELINE_CONVERSION) * 100" | bc)
ABANDONMENT_RISE=$(echo "scale=2; (($CURRENT_ABANDONMENT - $BASELINE_ABANDONMENT) / $BASELINE_ABANDONMENT) * 100" | bc)

# Converte para inteiro para comparação
DROP_INT=$(echo "$CONVERSION_DROP" | cut -d'.' -f1)
RISE_INT=$(echo "$ABANDONMENT_RISE" | cut -d'.' -f1)

echo "[INFO] Impacto Detectado:"
echo " - Queda de Conversão: $DROP_INT%"
echo " - Aumento de Abandono: $RISE_INT%"

# 3. Definição de Estado de Negócio
STATE="HEALTHY"
ACTION="NONE"
IMPACT_LEVEL="LOW"

if [ $DROP_INT -ge 20 ] || [ $RISE_INT -ge 30 ]; then
    STATE="BUSINESS_CRITICAL"
    ACTION="ROLLBACK_OR_FEATURE_OFF"
    IMPACT_LEVEL="HIGH"
elif [ $DROP_INT -ge 10 ] || [ $RISE_INT -ge 15 ]; then
    STATE="BUSINESS_WARNING"
    ACTION="ALERT_AND_MONITOR"
    IMPACT_LEVEL="MEDIUM"
fi

echo "[INFO] Estado de Negócio: $STATE"
echo "[INFO] Ação Recomendada: $ACTION"

# 4. Registro de Histórico de Negócio
if [ ! -f "$BUSINESS_HISTORY" ]; then echo "[]" > "$BUSINESS_HISTORY"; fi

NEW_ENTRY=$(cat <<EOF
{
  "version": "$VERSION",
  "conversion": $CURRENT_CONVERSION,
  "abandonment": $CURRENT_ABANDONMENT,
  "revenue": $CURRENT_REVENUE,
  "orders": $TOTAL_ORDERS,
  "impact": "$IMPACT_LEVEL",
  "state": "$STATE",
  "date": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
)

TEMP_FILE=$(mktemp)
sed '$d' "$BUSINESS_HISTORY" > "$TEMP_FILE"
if [ "$(cat "$TEMP_FILE")" != "[" ]; then echo "," >> "$TEMP_FILE"; fi
echo "$NEW_ENTRY" >> "$TEMP_FILE"
echo "]" >> "$TEMP_FILE"
mv "$TEMP_FILE" "$BUSINESS_HISTORY"

# 5. Execução de Ação Automática (Feedback Loop com Incidentes)
if [ "$STATE" == "BUSINESS_CRITICAL" ]; then
    echo "🚨 [BUSINESS-CRITICAL] Iniciando proteção de receita!"
    
    # Simular Feature Flag Off (Remote Config)
    echo "[INFO] Feature Flag 'NEW_CHECKOUT_FLOW' desativada via Remote Config."
    
    # Registrar no histórico de incidentes para o motor de decisão
    if [ ! -f "$INCIDENT_FILE" ]; then echo "[]" > "$INCIDENT_FILE"; fi
    
    BUSINESS_INCIDENT=$(cat <<EOF
{
  "version": "$VERSION",
  "issue": "Business conversion drop ($DROP_INT%)",
  "action": "FEATURE_OFF",
  "users_affected": "ALL",
  "date": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
)
    TEMP_INCIDENT=$(mktemp)
    sed '$d' "$INCIDENT_FILE" > "$TEMP_INCIDENT"
    if [ "$(cat "$TEMP_INCIDENT")" != "[" ]; then echo "," >> "$TEMP_INCIDENT"; fi
    echo "$BUSINESS_INCIDENT" >> "$TEMP_INCIDENT"
    echo "]" >> "$TEMP_INCIDENT"
    mv "$TEMP_INCIDENT" "$INCIDENT_FILE"
fi

# 6. Exportar para GitHub Actions
echo "BUSINESS_STATE=$STATE" >> $GITHUB_ENV
echo "BUSINESS_ACTION=$ACTION" >> $GITHUB_ENV
echo "CONVERSION_DROP=$DROP_INT" >> $GITHUB_ENV

echo "✅ [BUSINESS-MONITOR] Concluído."
echo "------------------------------------------------------------"
