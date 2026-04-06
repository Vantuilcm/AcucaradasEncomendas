#!/usr/bin/env bash
set -euo pipefail

# 🤖 scripts/ci/android-build-guardian.sh - O Guardião do Build Android (V7.0 - ORCHESTRATOR EDITION)
# Missão: Build Android LOCAL (Zero Expo Credits) com sincronização Enterprise.

echo "🛡️ [ANDROID-BUILD-GUARDIAN] Iniciando Guardião de Build Android..."
echo "------------------------------------------------------------"

## ETAPA 1 — ORQUESTRAÇÃO
export TARGET_APP="${TARGET_APP:-acucaradas-encomendas}"
export APP_ENV="${APP_ENV:-production}"

# Rodar orchestrator para validar config e salvar status inicial
npx ts-node scripts/ci/PipelineOrchestrator.ts build

echo "🛡️ [STATE-ENGINE] Validando sincronização Enterprise para $TARGET_APP..."
node scripts/sync-build-with-apple.js

BRANCH_NAME="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
COMMIT_MSG="${GITHUB_EVENT_PATH:+$(jq -r '.head_commit.message' "$GITHUB_EVENT_PATH")}"
COMMIT_MSG="${COMMIT_MSG:-$(git log -1 --pretty=%B)}"

# Bloqueio de Produção
if [[ "$BRANCH_NAME" == "main" ]] && [[ "$COMMIT_MSG" != *"[release]"* ]]; then
    echo "⚠️ [WARN] Push na main sem tag [release]. Procedendo com build LOCAL..."
fi

echo "🛡️ [STATE-ENGINE] Validando lock..."
node scripts/build-state-check.js lock
node scripts/build-state-check.js check

# Garantir unlock
trap "node scripts/build-state-check.js unlock" EXIT

BUILD_MODE="LOCAL"
PROFILE="${PROFILE:-production_v13}"

echo "🚀 [CONTEXTO] Modo LOCAL forçado. Nunca usando EAS Cloud."

## ETAPA 2 — PRÉ-VALIDAÇÃO E LIMPEZA
echo "🧹 [INFO] Limpando ambiente..."
rm -rf android .expo dist node_modules/.cache

# Verificação de Variáveis
if [ -z "${EXPO_TOKEN:-}" ]; then
    echo "❌ [FATAL] EXPO_TOKEN não definido."
    exit 1
fi

# Firebase Android config (CRITICAL)
if [ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]; then
    echo "🔧 [CONFIG] Gerando google-services.json via Base64..."
    # Limpar espaços e decodificar com segurança
    B64_CLEAN=$(echo "${GOOGLE_SERVICES_JSON_BASE64}" | tr -d '[:space:]')
    echo "$B64_CLEAN" | base64 --decode > google-services.json
    
    if [ ! -f google-services.json ] || [ ! -s google-services.json ]; then
        echo "❌ [FATAL] Falha ao gerar google-services.json. Arquivo vazio ou não encontrado."
        exit 1
    fi
    echo "✅ [OK] google-services.json gerado e validado."
else
    echo "❌ [FATAL] GOOGLE_SERVICES_JSON_BASE64 não encontrado no ambiente."
    exit 1
fi

echo "✅ [SUCCESS] Firebase config loaded"
echo "✅ [SUCCESS] Environment ready"

## ETAPA 3 — EXECUÇÃO DO BUILD
echo "🏗️ [EXEC] Iniciando eas build LOCAL para Android..."
export CI=1
export TERM=dumb
export EXPO_NO_TELEMETRY=1
export EAS_NO_VCS=1

mkdir -p build-logs
BUILD_LOG="build-logs/eas-build-android-local.log"

echo "🕒 [TIME] Iniciando build em $(date)"
set +e
npx eas-cli build --platform android --profile "$PROFILE" --local --non-interactive 2>&1 | tee "$BUILD_LOG"
EXIT_CODE=${PIPESTATUS[0]}
set -e
echo "🕒 [TIME] Build finalizado em $(date) com código $EXIT_CODE"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ [SUCCESS] Build Android concluído com sucesso!"
    
    # Localizar AAB
    echo "📦 [ARTIFACT] Localizando AAB gerada..."
    mkdir -p dist
    AAB_FILE=$(find . -name "*.aab" -not -path "./node_modules/*" | head -n 1)
    
    if [ -n "$AAB_FILE" ]; then
        echo "✅ [FOUND] AAB localizada em: $AAB_FILE"
        cp "$AAB_FILE" ./dist/app.aab
        
        # Validar via Orchestrator
        export CURRENT_BN=$(jq -r '.expo.android.versionCode' app.json)
        export CURRENT_VERSION=$(jq -r '.expo.version' app.json)
        
        echo "🔍 [VALIDATE] Iniciando validação pós-build..."
        npx ts-node scripts/ci/PipelineOrchestrator.ts validate "./dist/app.aab" "$CURRENT_BN"
        
        node scripts/build-state-check.js success
        exit 0
    else
        echo "❌ [ERROR] Build finalizou mas .aab não foi encontrado."
        exit 1
    fi
else
    echo "❌ [FATAL] Falha no build Android LOCAL."
    exit 1
fi
