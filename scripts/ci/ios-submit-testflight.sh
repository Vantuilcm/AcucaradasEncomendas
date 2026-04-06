#!/usr/bin/env bash
set -euo pipefail

echo "🚀 [TESTFLIGHT] Iniciando envio para TestFlight..."

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# --- VALIDAÇÃO DE ENV ---

REQUIRED_VARS=(
EXPO_TOKEN
EXPO_ASC_KEY_ID
EXPO_ASC_ISSUER_ID
)

MISSING=()

for VAR in "${REQUIRED_VARS[@]}"; do
if [ -z "${!VAR:-}" ]; then
MISSING+=("$VAR")
fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
echo "❌ [ERRO] Variáveis ausentes: ${MISSING[*]}"
exit 0
fi

echo "✅ [OK] Variáveis críticas detectadas."

# --- EXECUÇÃO DO SUBMIT ---

set +e

# Usar o --latest para pegar o build mais recente gerado localmente ou no EAS
OUTPUT=$(npx eas submit --platform ios --latest --non-interactive 2>&1)
EXIT_CODE=$?

set -e

echo "$OUTPUT"

# --- EXTRAÇÃO DE DADOS ---

VERSION=$(jq -r '.expo.version' app.json)
BUILD_NUMBER=$(jq -r '.expo.ios.buildNumber' app.json)

mkdir -p build-logs

if [ $EXIT_CODE -eq 0 ]; then
STATUS="SUCCESS"
else
STATUS="FAILED"
fi

# --- LOG JSON ---

cat <<EOF > build-logs/testflight-log.json
{
"status": "$STATUS",
"version": "$VERSION",
"buildNumber": "$BUILD_NUMBER",
"timestamp": "$TIMESTAMP"
}
EOF

echo "📄 [LOG] Registro salvo em build-logs/testflight-log.json"

# NÃO quebrar pipeline

exit 0
