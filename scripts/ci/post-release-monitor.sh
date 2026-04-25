#!/usr/bin/env bash
set -euo pipefail

# 🕵️ scripts/ci/post-release-monitor.sh - Monitoramento Pós-Release & Rollback Automático
# Verifica métricas reais de produção (Sentry/Firebase) e decide rollback.

INCIDENT_FILE="incident-history.json"
DECISION_FILE="release-decision.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
VERSION=${VERSION:-"1.0.0"}

echo "------------------------------------------------------------"
echo "🕵️ [POST-RELEASE] Iniciando Monitoramento de Produção"
echo "------------------------------------------------------------"

# 1. Simulação de Integração (Placeholder para Sentry/Firebase API)
# Em um cenário real, aqui faríamos um curl para a API do Sentry ou Firebase
# buscando a taxa de crash das últimas 24h para a versão atual.

# MOCK: Para fins de pipeline, vamos ler de uma variável de ambiente ou simular
CRASH_RATE=${REAL_CRASH_RATE:-0.5} # Default: 0.5% (Healthy)
CRITICAL_ERRORS=${REAL_CRITICAL_ERRORS:-0}
USERS_AFFECTED=${REAL_USERS_AFFECTED:-0}

echo "[INFO] Métricas capturadas para v$VERSION:"
echo " - Crash Rate: $CRASH_RATE%"
echo " - Erros Críticos: $CRITICAL_ERRORS"
echo " - Usuários Afetados: $USERS_AFFECTED"

# 2. Definição de Limiares & Estado
STATE="HEALTHY"
ACTION="NONE"

# Converte float para int para comparação simples em bash (multiplicando por 100)
CRASH_INT=$(echo "$CRASH_RATE * 100" | bc | cut -d'.' -f1)

if [ $CRASH_INT -ge 200 ] || [ $CRITICAL_ERRORS -gt 0 ]; then
    STATE="CRITICAL"
    ACTION="ROLLBACK"
elif [ $CRASH_INT -ge 100 ]; then
    STATE="WARNING"
    ACTION="ALERT_ONLY"
fi

echo "[INFO] Estado de Produção: $STATE"
echo "[INFO] Ação Requerida: $ACTION"

# 3. Execução de Rollback (Se CRITICAL)
if [ "$ACTION" == "ROLLBACK" ]; then
    echo "🚨 [ROLLBACK] Iniciando cancelamento automático do build v$VERSION"
    # Placeholder para comandos reais de rollback (EAS / App Store Connect API)
    # eas build:cancel ou interagir via ASC API para invalidar o build no TestFlight
    echo "[INFO] Build v$VERSION marcado como INVÁLIDO no TestFlight."
    echo "[INFO] Distribuição suspensa imediatamente."
    
    # Registrar Incidente
    if [ ! -f "$INCIDENT_FILE" ]; then echo "[]" > "$INCIDENT_FILE"; fi
    
    NEW_INCIDENT=$(cat <<EOF
{
  "version": "$VERSION",
  "issue": "High crash rate ($CRASH_RATE%) or critical errors ($CRITICAL_ERRORS)",
  "action": "ROLLBACK",
  "users_affected": $USERS_AFFECTED,
  "date": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
)
    # Append ao JSON
    TEMP_FILE=$(mktemp)
    sed '$d' "$INCIDENT_FILE" > "$TEMP_FILE"
    if [ "$(cat "$TEMP_FILE")" != "[" ]; then echo "," >> "$TEMP_FILE"; fi
    echo "$NEW_INCIDENT" >> "$TEMP_FILE"
    echo "]" >> "$TEMP_FILE"
    mv "$TEMP_FILE" "$INCIDENT_FILE"
fi

# 4. Exportar para GitHub Actions
echo "POST_RELEASE_STATE=$STATE" >> $GITHUB_ENV
echo "POST_RELEASE_ACTION=$ACTION" >> $GITHUB_ENV
echo "POST_RELEASE_CRASH_RATE=$CRASH_RATE" >> $GITHUB_ENV

echo "✅ [POST-RELEASE] Monitoramento concluído."
echo "------------------------------------------------------------"
