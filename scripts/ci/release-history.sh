#!/usr/bin/env bash
set -euo pipefail

# 📝 scripts/ci/release-history.sh - Governança de Histórico de Release
# Mantém rastro de versões, build numbers e classificação de estabilidade.

HISTORY_FILE="release-history.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
VERSION=${VERSION:-"1.0.0"}
BUILD_NUMBER=${BUILD_NUMBER:-"1"}
BUILD_STATUS=${1:-"unknown"} # success | failure
AUTO_HEAL_USED=${2:-"false"} # true | false

# Determinar Classificação de Estabilidade
STABILITY="FAILED"
if [ "$BUILD_STATUS" == "success" ]; then
    if [ "$AUTO_HEAL_USED" == "true" ]; then
        STABILITY="DEGRADED"
    else
        STABILITY="STABLE"
    fi
fi

echo "[INFO] [RELEASE HISTORY] Registrando evento: Version $VERSION ($BUILD_NUMBER) - Stability: $STABILITY"

# Criar arquivo se não existir
if [ ! -f "$HISTORY_FILE" ]; then
    echo "[]" > "$HISTORY_FILE"
fi

# Gerar nova entrada
NEW_ENTRY=$(cat <<EOF
{
  "app": "$APP_NAME",
  "version": "$VERSION",
  "build_number": "$BUILD_NUMBER",
  "date": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "status": "$BUILD_STATUS",
  "auto_heal": $AUTO_HEAL_USED,
  "stability": "$STABILITY"
}
EOF
)

# Adicionar ao JSON (usando jq se disponível ou substituição simples de string)
# Como jq pode não estar no runner, usamos uma abordagem de append simples para um array JSON
TEMP_FILE=$(mktemp)
sed '$d' "$HISTORY_FILE" > "$TEMP_FILE" # Remove a última linha ']'
if [ "$(cat "$TEMP_FILE")" != "[" ]; then
    echo "," >> "$TEMP_FILE"
fi
echo "$NEW_ENTRY" >> "$TEMP_FILE"
echo "]" >> "$TEMP_FILE"
mv "$TEMP_FILE" "$HISTORY_FILE"

# Verificar Bloqueio de Release Arriscado
# Se o último registro também foi DEGRADED ou FAILED, podemos sinalizar bloqueio
# (Lógica simplificada para o workflow consumir)
if [ "$STABILITY" == "FAILED" ] || [ "$STABILITY" == "DEGRADED" ]; then
    echo "[WARNING] [GOVERNANÇA] Release classificado como $STABILITY. Revisão recomendada."
fi

echo "[INFO] Histórico atualizado em $HISTORY_FILE"
