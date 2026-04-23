#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V4.1 - ULTRA STABLE CLOUD)
# Missão: Pipeline 100% Cloud EAS com Validação Fail-Fast, Fallback Local e Submissão Automática.

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando ULTRA STABLE V4.1 (CLOUD MODE)..."
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

# Variáveis EXPO_PUBLIC obrigatórias para o app e validação
[ -z "${EXPO_PUBLIC_FIREBASE_API_KEY:-}" ] && MISSING_VARS+=("EXPO_PUBLIC_FIREBASE_API_KEY")
[ -z "${EXPO_PUBLIC_ONESIGNAL_APP_ID:-}" ] && MISSING_VARS+=("EXPO_PUBLIC_ONESIGNAL_APP_ID")

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
npx expo-doctor || echo "⚠️ [WARNING] Expo Doctor detectou problemas, mas prosseguindo..."

# 3. Processamento de Credenciais/Arquivos
echo "🔧 [CONFIG] Processando arquivos de configuração..."

# GoogleService-Info.plist (Obrigatório para Firebase)
if [ -n "${GOOGLE_SERVICE_INFO_PLIST:-}" ]; then
    echo "📄 [GENERATE] Criando GoogleService-Info.plist..."
    if [[ "${GOOGLE_SERVICE_INFO_PLIST}" == *"<?xml"* ]]; then
        echo "${GOOGLE_SERVICE_INFO_PLIST}" > GoogleService-Info.plist
    else
        echo "${GOOGLE_SERVICE_INFO_PLIST}" | base64 --decode > GoogleService-Info.plist
    fi
    echo "✅ [SUCCESS] GoogleService-Info.plist gerado com sucesso."
    ls -l GoogleService-Info.plist
fi

# google-services.json (Opcional no iOS, mas bom ter)
if [ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]; then
    echo "${GOOGLE_SERVICES_JSON_BASE64}" | base64 --decode > google-services.json
    echo "✅ [SUCCESS] google-services.json gerado."
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
set +e
eas build --platform ios --profile production_v13 --non-interactive --wait 2>&1 | tee build-logs/cloud-build.log
BUILD_EXIT_CODE=$?
set -e

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    if grep -q -E "Free plan|limit|credits" build-logs/cloud-build.log; then
        echo "⚠️ [WARNING] Limitação de conta Cloud detectada (Free Plan ou Créditos)."
        echo "🔄 [FALLBACK] Iniciando Build Local para garantir entrega hoje..."
        
        # Build Local (Garantir que prebuild rode limpo)
        rm -rf ios android
        eas build --platform ios --profile production_v13 --local --non-interactive 2>&1 | tee -a build-logs/cloud-build.log
    else
        echo "❌ [ERROR] Build Cloud falhou por outros motivos. Verifique os logs."
        exit 1
    fi
fi

# 5. Submissão Automática
echo "📤 [SUBMIT] Iniciando submissão para TestFlight..."
# O eas submit --latest pega o build mais recente (cloud ou local enviado).
eas submit --platform ios --latest --non-interactive | tee -a build-logs/cloud-build.log

echo "------------------------------------------------------------"
echo "✅ [SUCCESS] Missão ULTRA STABLE V4 concluída com sucesso!"
echo "🕒 [TIME] $(date)"
