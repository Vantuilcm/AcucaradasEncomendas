#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V4.0 - ULTRA STABLE CLOUD)
# Missão: Pipeline 100% Cloud EAS com Validação Fail-Fast e Submissão Automática.

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando ULTRA STABLE V4.0 (CLOUD MODE)..."
echo "------------------------------------------------------------"

mkdir -p build-logs

# 1. Validação de Ambiente (Fail-Fast)
echo "🕵️ [VALIDATE] Verificando sanidade das variáveis de ambiente críticas..."

# Tentar recuperar APPLE_ID do eas.json se estiver ausente no ENV
if [ -z "${APPLE_ID:-}" ] && [ -f "eas.json" ]; then
    echo "🔍 [INFO] APPLE_ID não detectado no ENV. Tentando recuperar do eas.json..."
    APPLE_ID=$(jq -r '.submit.production.ios.appleId' eas.json 2>/dev/null || echo "")
    if [ "$APPLE_ID" != "null" ] && [ -n "$APPLE_ID" ]; then
        export APPLE_ID="$APPLE_ID"
        echo "✅ [RECOVERY] APPLE_ID recuperado do eas.json: $APPLE_ID"
    fi
fi

MISSING_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_VARS+=("EXPO_TOKEN")
[ -z "${APPLE_ID:-}" ] && MISSING_VARS+=("APPLE_ID")
[ -z "${EXPO_ASC_KEY_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_KEY_ID")
[ -z "${EXPO_ASC_ISSUER_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_ISSUER_ID")
[ -z "${EXPO_ASC_PRIVATE_KEY:-}" ] && MISSING_VARS+=("EXPO_ASC_PRIVATE_KEY")
[ -z "${GOOGLE_SERVICE_INFO_PLIST:-}" ] && MISSING_VARS+=("GOOGLE_SERVICE_INFO_PLIST")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [FATAL] Variáveis de ambiente obrigatórias ausentes: ${MISSING_VARS[*]}"
    echo "💡 Certifique-se de que os Secrets estão configurados no GitHub."
    exit 1
fi
echo "✅ [OK] Todas as variáveis críticas detectadas."

# 2. Preparação do Toolchain
echo "📦 [TOOLCHAIN] Preparando ambiente de build..."
npx eas-cli --version
npm ci --legacy-peer-deps

echo "🩺 [DOCTOR] Executando Expo Doctor..."
npx expo-doctor || echo "⚠️ [WARNING] Expo Doctor detectou problemas, mas prosseguindo com o build cloud..."

# 3. Processamento de Credenciais/Arquivos
echo "🔧 [CONFIG] Processando arquivos de configuração..."

# GoogleService-Info.plist
if [ -n "${GOOGLE_SERVICE_INFO_PLIST:-}" ]; then
    # Se começar com <?xml, já é o conteúdo direto. Se não, assumimos base64.
    if [[ "${GOOGLE_SERVICE_INFO_PLIST}" == *"<?xml"* ]]; then
        echo "${GOOGLE_SERVICE_INFO_PLIST}" > GoogleService-Info.plist
    else
        echo "${GOOGLE_SERVICE_INFO_PLIST}" | base64 --decode > GoogleService-Info.plist
    fi
    echo "✅ [SUCCESS] GoogleService-Info.plist gerado."
fi

# AuthKey.p8
if [ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]; then
    if [[ "${EXPO_ASC_PRIVATE_KEY}" == *"BEGIN PRIVATE KEY"* ]]; then
        echo "${EXPO_ASC_PRIVATE_KEY}" > AuthKey.p8
    else
        echo "${EXPO_ASC_PRIVATE_KEY}" | base64 --decode > AuthKey.p8
    fi
    export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
fi

# 4. Execução do Build EAS Cloud
echo "🚀 [BUILD] Iniciando EAS Build Cloud (Perfil: production_v13)..."
eas build --platform ios --profile production_v13 --non-interactive --wait | tee build-logs/cloud-build.log

# 5. Submissão Automática
echo "📤 [SUBMIT] Iniciando submissão para TestFlight..."
eas submit --platform ios --latest --non-interactive | tee -a build-logs/cloud-build.log

echo "------------------------------------------------------------"
echo "✅ [SUCCESS] Missão ULTRA STABLE V4 concluída com sucesso!"
echo "🕒 [TIME] $(date)"
