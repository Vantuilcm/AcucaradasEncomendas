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
# Usando node com registro ts-node para robustez máxima em CI
node -r ts-node/register scripts/ci/PipelineOrchestrator.ts build

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
echo "🧹 [INFO] Limpando ambiente e artefatos antigos..."
# Limpeza agressiva para evitar submissão de artefatos antigos
rm -rf android .expo dist/*.aab *.aab build-logs/*.log
mkdir -p dist build-logs

# 2.1 Sincronizar Versão
echo "🔄 [SYNC] Sincronizando build number..."
node scripts/sync-build-with-apple.js

# Extrair versão atualizada para log e injeção
export CURRENT_BN=$(jq -r '.expo.android.versionCode' app.json)
TARGET_VER=$(jq -r '.expo.version' app.json)
echo "📌 [TARGET] Preparando Build: $TARGET_VER (VersionCode: $CURRENT_BN)"
echo "💉 [ENV] Injetando CURRENT_BN=$CURRENT_BN para o app.config.js"

# Verificação de Variáveis
if [ -z "${EXPO_TOKEN:-}" ]; then
    echo "❌ [FATAL] EXPO_TOKEN não definido."
    exit 1
fi

# Firebase Android config (CRITICAL)
echo "🔧 [CONFIG] Preparando Firebase config (google-services.json)..."

if [ -f "google-services.json" ]; then
    echo "✅ [OK] google-services.json já existe no diretório raiz."
elif [ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]; then
    echo "🔧 [CONFIG] Gerando google-services.json via Base64 (env: GOOGLE_SERVICES_JSON_BASE64)..."
    # Limpar espaços e decodificar com segurança
    B64_CLEAN=$(echo "${GOOGLE_SERVICES_JSON_BASE64}" | tr -d '[:space:]')
    echo "$B64_CLEAN" | base64 --decode > google-services.json
    echo "✅ [OK] google-services.json gerado e validado via Base64."
elif [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
    echo "🔧 [CONFIG] Gerando google-services.json via string direta (env: GOOGLE_SERVICES_JSON)..."
    echo "${GOOGLE_SERVICES_JSON}" > google-services.json
    echo "✅ [OK] google-services.json gerado via string direta."
else
    # Se chegarmos aqui, nenhuma fonte foi encontrada
    echo "⚠️ [WARN] GOOGLE_SERVICES_JSON_BASE64 não encontrado no ambiente."
    echo "🔍 [CHECK] Verificando se existe em ./android/app/google-services.json..."
    
    if [ -f "./android/app/google-services.json" ]; then
        echo "✅ [OK] Localizado em ./android/app/google-services.json. Copiando para a raiz..."
        cp "./android/app/google-services.json" "./google-services.json"
    else
        echo "❌ [FATAL] Firebase config (google-services.json) não encontrado em nenhuma fonte!"
        echo "💡 Dica: Verifique os secrets do GitHub ou o arquivo local."
        exit 1
    fi
fi

# Validação final do arquivo
if [ ! -s "google-services.json" ]; then
    echo "❌ [FATAL] google-services.json gerado está vazio ou inválido."
    exit 1
fi

echo "✅ [SUCCESS] Firebase config loaded"
echo "✅ [SUCCESS] Environment ready"

## ETAPA 3 — EXECUÇÃO DO BUILD
# Sincronização de credenciais é feita automaticamente pelo EAS Build LOCAL.
# Apenas garantimos que o ambiente está pronto.

echo "🏗️ [PREBUILD] Gerando código nativo Android..."
npx expo prebuild --platform android --non-interactive

if [ -d "android" ]; then
    echo "✅ [OK] Pasta 'android' gerada. Garantindo permissões do gradlew..."
    chmod +x android/gradlew
fi

echo "🏗️ [EXEC] Iniciando eas build LOCAL para Android..."
export CI=1
export TERM=dumb
export EXPO_NO_TELEMETRY=1
export EAS_NO_VCS=1

# Garantir que credenciais remotas possam ser baixadas em modo não interativo
export EAS_NO_VCS=1

mkdir -p build-logs
BUILD_LOG="build-logs/eas-build-android-local.log"

echo "🕒 [TIME] Iniciando build em $(date)"
set +e
EXPO_DEBUG=1 DEBUG=eas:* npx eas build --platform android --profile "$PROFILE" --local --non-interactive 2>&1 | tee "$BUILD_LOG"
EXIT_CODE=${PIPESTATUS[0]}
set -e
echo "🕒 [TIME] Build finalizado em $(date) com código $EXIT_CODE"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ [SUCCESS] Build Android concluído com sucesso!"
    
    # Localizar AAB
    echo "📦 [ARTIFACT] Localizando AAB gerada..."
    mkdir -p dist
    # Busca inteligente: log do EAS ou recursiva
    AAB_FILE=$(grep -oE "/[^ ]+\.aab" "$BUILD_LOG" | tail -n 1 || true)
    
    if [ -z "$AAB_FILE" ] || [ ! -f "$AAB_FILE" ]; then
        echo "🔍 [SEARCH] Buscando AAB recursivamente..."
        AAB_FILE=$(find . -name "*.aab" -not -path "./node_modules/*" -not -path "./android/*" | head -n 1)
    fi
    
    if [ -n "$AAB_FILE" ] && [ -f "$AAB_FILE" ]; then
        echo "✅ [FOUND] AAB localizada em: $AAB_FILE"
        cp "$AAB_FILE" ./dist/app.aab
        echo "🚀 [READY] AAB movida para: ./dist/app.aab"
        
        # Validar via Orchestrator
        export CURRENT_BN=$(jq -r '.expo.android.versionCode' app.json)
        export CURRENT_VERSION=$(jq -r '.expo.version' app.json)
        
        echo "🔍 [VALIDATE] Iniciando validação pós-build..."
        node -r ts-node/register scripts/ci/PipelineOrchestrator.ts validate "./dist/app.aab" "$CURRENT_BN"
        
        node scripts/build-state-check.js success
        exit 0
    else
        echo "❌ [ERROR] Build finalizou mas .aab não foi encontrado."
        exit 1
    fi
else
    echo "❌ [FATAL] Falha no build Android LOCAL."
    echo "------------------------------------------------------------"
    echo "📄 [LOG-DIAGNOSTIC] Analisando logs de erro..."
    
    # Se falhou no Gradle, tentar mostrar o erro real do gradlew
    if grep -q "gradlew" "$BUILD_LOG"; then
        echo "🔍 [GRADLE-ERROR] Detectada falha no Gradle. Tentando extrair log nativo..."
        if [ -d "android" ]; then
            echo "🐘 [GRADLEW] Executando análise detalhada do erro..."
            cd android
            ./gradlew assembleRelease --stacktrace --info | tail -n 100 > ../build-logs/gradle-error-detailed.log || true
            cd ..
            echo "📄 [LOG-DETAIL] Primeiras 20 linhas do erro detalhado:"
            head -n 20 build-logs/gradle-error-detailed.log
        fi
    fi

    echo "📄 [LOG-SUMMARY] Últimas 50 linhas do log principal:"
    tail -n 50 "$BUILD_LOG"
    echo "------------------------------------------------------------"
    echo "💡 Sugestão: Verifique se as credenciais Android estão configuradas no Expo Dashboard ou se há erros de SDK/NDK no runner."
    exit 1
fi
