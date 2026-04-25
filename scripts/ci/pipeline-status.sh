#!/usr/bin/env bash
set -euo pipefail

# 🛡️ scripts/ci/pipeline-status.sh - Health Check & Métricas de Estabilidade
# Gera saída estruturada em JSON para visibilidade operacional.

APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
PLATFORM=${PLATFORM:-"ios"}
STATUS_FILE="pipeline_status.json"

# Iniciar estrutura JSON
echo "------------------------------------------------------------"
echo "🔍 [PIPELINE STATUS] Gerando Health Check Operacional"
echo "------------------------------------------------------------"

# Determinar status do build
BUILD_STATUS="unknown"
if [ -f "build_log.txt" ]; then
    if grep -q "Build failed" build_log.txt; then
        BUILD_STATUS="failed"
    elif grep -q "Build successful" build_log.txt; then
        BUILD_STATUS="success"
    fi
fi

# Determinar status do submit
SUBMIT_STATUS="unknown"
if [ -f "submit_log.txt" ]; then
    if grep -q "Submission failed" submit_log.txt; then
        SUBMIT_STATUS="failed"
    elif grep -q "Submission successful" submit_log.txt; then
        SUBMIT_STATUS="success"
    fi
fi

# Detectar Auto-Heal
AUTO_HEAL_TRIGGERED="false"
if [ -f "auto_heal_log.txt" ] || grep -q "AUTO-HEAL" build_log.txt 2>/dev/null; then
    AUTO_HEAL_TRIGGERED="true"
fi

# Determinar Saúde Geral
HEALTH="healthy"
if [ "$BUILD_STATUS" == "failed" ] || [ "$SUBMIT_STATUS" == "failed" ]; then
    HEALTH="failed"
fi
if [ "$AUTO_HEAL_TRIGGERED" == "true" ] && [ "$BUILD_STATUS" == "success" ]; then
    HEALTH="degraded"
fi

# Persistir JSON
cat <<EOF > "$STATUS_FILE"
{
  "app_name": "$APP_NAME",
  "platform": "$PLATFORM",
  "health": "$HEALTH",
  "last_build": "$BUILD_STATUS",
  "last_submit": "$SUBMIT_STATUS",
  "auto_heal_triggered": $AUTO_HEAL_TRIGGERED,
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "metrics": {
    "build_time_sec": $(grep -oP 'Build finished in \K\d+' build_log.txt || echo 0),
    "consecutive_failures": $(cat consecutive_failures.txt 2>/dev/null || echo 0)
  }
}
EOF

echo "✅ [STATUS] Health Check gerado em $STATUS_FILE"
echo "------------------------------------------------------------"
cat "$STATUS_FILE"
echo "------------------------------------------------------------"
