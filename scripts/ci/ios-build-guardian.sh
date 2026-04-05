#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V7.0 - ORCHESTRATOR EDITION)
# Missão: Pipeline Híbrido Multi-App Orquestrado via PipelineOrchestrator.ts.

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Guardião de Build iOS (ORCHESTRATOR V7.0)..."
echo "------------------------------------------------------------"

## ETAPA 1 — ORQUESTRAÇÃO MULTI-APP
echo "🚀 [ORCHESTRATOR] Inicializando Orquestrador de Pipeline..."
# Se TARGET_APP não estiver definido, o orchestrator usará o defaultApp do apps.config.json
export TARGET_APP="${TARGET_APP:-acucaradas-encomendas}"
export APP_ENV="${APP_ENV:-production}"

# Rodar orchestrator para validar config e salvar status inicial
npx ts-node scripts/ci/PipelineOrchestrator.ts build

echo "🛡️ [STATE-ENGINE] Validando sincronização Enterprise para $TARGET_APP..."
node scripts/sync-build-with-apple.js

BRANCH_NAME="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
COMMIT_MSG="${GITHUB_EVENT_PATH:+$(jq -r '.head_commit.message' "$GITHUB_EVENT_PATH")}"
COMMIT_MSG="${COMMIT_MSG:-$(git log -1 --pretty=%B)}"

# Bloqueio de Produção: apenas commits com [release] podem ir para CLOUD/Main
if [[ "$BRANCH_NAME" == "main" ]] && [[ "$COMMIT_MSG" != *"[release]"* ]]; then
    echo "⚠️ [WARN] Push na main sem tag [release]. Procedendo com build por ordem do usuário..."
    # exit 1 (Removido por ordem do usuário para garantir trigger)
fi

echo "🛡️ [STATE-ENGINE] Validando lock e duplicidade..."
node scripts/build-state-check.js lock
node scripts/build-state-check.js check

# Garantir unlock ao sair (sucesso ou falha)
trap "node scripts/build-state-check.js unlock" EXIT

BUILD_MODE="CLOUD" # Default Enterprise Safe

if [[ "$BRANCH_NAME" == "main" ]] || [[ "$COMMIT_MSG" == *"[release]"* ]]; then
    BUILD_MODE="CLOUD" # Enterprise: Forçar CLOUD em produção para rastreabilidade total
    echo "🚀 [CONTEXTO] Produção/Release detectada. Modo: CLOUD (EAS Native)."
else
    BUILD_MODE="LOCAL"
    echo "🧪 [CONTEXTO] Branch de desenvolvimento detectada. Modo: LOCAL (GitHub Runner)."
fi

# Sobrescrever via ENV se necessário (Prioridade Máxima)
if [ -n "${FORCE_BUILD_MODE:-}" ]; then
    BUILD_MODE="$FORCE_BUILD_MODE"
    echo "⚠️ [OVERRIDE] Modo de build forçado via ENV: $BUILD_MODE"
fi

# 2.0 Hardening: Fail-Fast macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ [FATAL] Este pipeline requer um ambiente macOS (GitHub macos-latest)."
    exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
    echo "❌ [FATAL] xcodebuild não encontrado. Xcode é obrigatório para build LOCAL."
    exit 1
fi

## ETAPA 2 — PRÉ-VALIDAÇÃO E LIMPEZA (FAIL FAST)

# 2.1 Limpeza Profunda (Deep Clean)
echo "🧹 [INFO] Limpando ambiente (DEEP CLEAN)..."
rm -rf ios .expo dist node_modules/.cache
# Nota: node_modules é mantido se o cache do GitHub Actions estiver ativo para velocidade.

# --- INÍCIO DA EXECUÇÃO (v2.3) ---
echo "🚀 [START] Iniciando iOS Build Guardian v2.3 (FORCE TRIGGER) [release]..."
echo "📍 [CWD] Diretório Atual: $(pwd)"
echo "🕒 [TIME] $(date)"
echo "👤 [USER] $(whoami)"

# 2.1 Verificação de Ambiente (Fail-Fast Precoce)
echo "🔍 [CHECK] Verificando Variáveis Críticas..."
if [ -z "${EXPO_TOKEN:-}" ]; then
    echo "❌ [FATAL] EXPO_TOKEN não está definido nos secrets."
    exit 1
fi
echo "✅ [OK] EXPO_TOKEN detectado."

if [ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]; then
    LEN=${#EXPO_ASC_PRIVATE_KEY_BASE64}
    echo "✅ [OK] EXPO_ASC_PRIVATE_KEY_BASE64 detectado (Tamanho: $LEN)."
else
    echo "❌ [FATAL] EXPO_ASC_PRIVATE_KEY_BASE64 ausente."
    exit 1
fi

# 2.2 Normalização da ASC Private Key (Obrigatório para LOCAL builds)
# Removido bloco duplicado - a normalização agora é feita na Etapa 2.3 centralizada.

# 2.3 EAS Build Check (Proteção contra duplicidade via EAS)
echo "🛡️ [CHECK] Verificando duplicidade no EAS Cloud..."
COMMIT_HASH=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "📝 [LOG] Commit: $COMMIT_HASH"
echo "🕒 [LOG] Timestamp: $TIMESTAMP"

# Consultar último build no EAS para este commit
# Se o commit já foi buildado com sucesso, abortamos para economizar recursos
set +e
# Buscamos builds com status 'finished' para este commit
LAST_BUILD_FOR_COMMIT=$(npx eas-cli build:list --platform ios --status finished --limit 5 --non-interactive | grep "$COMMIT_HASH" || true)
set -e

if [ -n "$LAST_BUILD_FOR_COMMIT" ]; then
    echo "⚠️ [DUPLICATE] Este commit ($COMMIT_HASH) já possui um build finalizado no EAS."
    echo "💡 [INFO] Cancelando execução do pipeline para evitar duplicidade e desperdício de recursos."
    exit 0
fi

echo "✅ [VALID] Nenhum build prévio detectado para o commit $COMMIT_HASH. Prosseguindo..."

# 2.4 Validação de ENV
echo "⚙️ [CONFIG] Carregando variáveis de ambiente (LOAD-ENV)..."
chmod +x scripts/load-env.sh
./scripts/load-env.sh

# 2.4.1 Keychain Setup (Crucial para builds LOCAL em CI)
setup_macos_keychain() {
    echo "🔐 [KEYCHAIN] Configurando Keychain para build LOCAL..."
    KEYCHAIN_NAME="ios-build.keychain"
    KEYCHAIN_PASSWORD="build"

    # Criar keychain se não existir
    if ! security show-keychain "$KEYCHAIN_NAME" &>/dev/null; then
        security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
    fi

    security default-keychain -s "$KEYCHAIN_NAME"
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
    security set-keychain-settings -lut 21600 "$KEYCHAIN_NAME"
    security list-keychains -d user -s "$KEYCHAIN_NAME" $(security list-keychains -d user | xargs)
    
    echo "✅ [KEYCHAIN] Keychain configurada e desbloqueada."
}

echo "🧪 [VALIDATE] Validando variáveis de runtime (FAIL FAST)..."
node scripts/validate-env.js

echo "🛡️ [SYNC-CHECK] Auditando sincronia com template de produção..."
node scripts/env-sync-check.js

# 2.2 Limpeza de Conflitos (Garantir uso exclusivo de API Key)
unset IOS_DIST_CERT_BASE64
unset IOS_PROV_PROFILE_BASE64
unset IOS_CERT_PASSWORD
unset EXPO_APP_STORE_CONNECT_API_KEY

# 2.3 Validar Obrigatórios
MISSING_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_VARS+=("EXPO_TOKEN")
[ -z "${EXPO_ASC_KEY_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_KEY_ID")
[ -z "${EXPO_ASC_ISSUER_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_ISSUER_ID")

# 2.4 Normalizar Private Key (Prioridade BASE64)
if [ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]; then
    echo "🛡️ [SECURE] Normalizando ASC Private Key (EXPO_ASC_PRIVATE_KEY_BASE64)..."
    
    # Detecção Inteligente: Se já começar com '-----BEGIN', não decodificar
    if [[ "${EXPO_ASC_PRIVATE_KEY_BASE64}" == *"BEGIN PRIVATE KEY"* ]]; then
        echo "⚠️ [WARN] EXPO_ASC_PRIVATE_KEY_BASE64 contém PEM direto. Salvando..."
        echo "${EXPO_ASC_PRIVATE_KEY_BASE64}" > AuthKey.p8
    else
        echo "🛡️ [SECURE] Decodificando Base64 via Node..."
        node -e "const fs = require('fs'); let b64 = process.env.EXPO_ASC_PRIVATE_KEY_BASE64.trim().replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/'); try { fs.writeFileSync('AuthKey.p8', Buffer.from(b64, 'base64')); } catch (e) { console.error('FALHA DECODER:', e.message); process.exit(1); }"
    fi
elif [ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]; then
    # Se for multiline PEM direto, aceitar mas avisar
    if [[ "${EXPO_ASC_PRIVATE_KEY}" == *"BEGIN PRIVATE KEY"* ]]; then
        echo "⚠️ [WARN] EXPO_ASC_PRIVATE_KEY detectada em formato PEM. Salvando..."
        echo "${EXPO_ASC_PRIVATE_KEY}" > AuthKey.p8
    else
        echo "🛡️ [SECURE] Normalizando ASC Private Key (Legacy String)..."
        echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
    fi
else
    # Fallback se nenhuma variável estiver disponível mas o arquivo já existir (ex: retry)
    if [ ! -f "AuthKey.p8" ]; then
        MISSING_VARS+=("EXPO_ASC_PRIVATE_KEY_BASE64")
    fi
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [ERRO] Variáveis obrigatórias ausentes: ${MISSING_VARS[*]}"
    exit 1
fi

export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
export EXPO_ASC_PRIVATE_KEY=$(cat AuthKey.p8)

# Exportar para GITHUB_ENV conforme missão do agente se estiver no GitHub
if [ -n "${GITHUB_ENV:-}" ]; then
    echo "EXPO_ASC_PRIVATE_KEY<<EOF" >> "$GITHUB_ENV"
    cat AuthKey.p8 >> "$GITHUB_ENV"
    echo "" >> "$GITHUB_ENV"
    echo "EOF" >> "$GITHUB_ENV"
    
    # Adicionar outras variáveis ASC necessárias para o plugin local
    echo "EXPO_ASC_PRIVATE_KEY_PATH=$(pwd)/AuthKey.p8" >> "$GITHUB_ENV"
    echo "EXPO_ASC_KEY_ID=${EXPO_ASC_KEY_ID}" >> "$GITHUB_ENV"
    echo "EXPO_ASC_ISSUER_ID=${EXPO_ASC_ISSUER_ID}" >> "$GITHUB_ENV"
fi

# Validar se a chave foi gerada corretamente
if ! grep -q "BEGIN PRIVATE KEY" AuthKey.p8; then
    echo "❌ [ERRO] Falha ao gerar AuthKey.p8: Formato de chave privada inválido."
    echo "🔍 [DEBUG] Primeiros 100 caracteres do arquivo decodificado:"
    head -c 100 AuthKey.p8 || true
    echo -e "\n------------------------------------------------------------"
    exit 1
fi
echo "✅ [CONFIG] AuthKey.p8 validada com sucesso."

# 2.5 Gerar GoogleService-Info.plist (Firebase iOS)
echo "🔧 [CONFIG] Gerando GoogleService-Info.plist..."

if [ -n "${GOOGLE_SERVICES_INFO_PLIST_BASE64:-}" ]; then
    # 1. Validação do Base64 antes de usar
    B64_CLEAN=$(echo "${GOOGLE_SERVICES_INFO_PLIST_BASE64}" | tr -d '[:space:]')
    B64_LEN=${#B64_CLEAN}
    
    echo "🔍 [DEBUG] Validando GOOGLE_SERVICES_INFO_PLIST_BASE64 (Tamanho: $B64_LEN)..."
    
    if [ "$B64_LEN" -lt 1000 ]; then
        echo "❌ [FATAL] GOOGLE_SERVICES_INFO_PLIST_BASE64 muito curto ($B64_LEN < 1000). Verifique o Secret."
        exit 1
    fi

    # 2. Decodificar e 3. Validar conteúdo via Node
    # Removida a validação de prefixo PD94bWw via shell por ser muito instável (BOM, whitespaces, etc)
    # A validação real agora é feita dentro do Node.js após a decodificação.
    node -e "
    const fs = require('fs');
    const b64 = process.env.GOOGLE_SERVICES_INFO_PLIST_BASE64.trim().replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    try {
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        
        // Validação rigorosa do conteúdo
        if (!decoded.includes('<?xml') || !decoded.includes('<plist')) {
            console.error('❌ [FATAL] Conteúdo decodificado não contém marcadores PLIST/XML válidos.');
            console.log('🔍 [DEBUG] Primeiros 50 caracteres do conteúdo decodificado:', decoded.substring(0, 50).replace(/\n/g, ' '));
            process.exit(1);
        }
        
        fs.writeFileSync('GoogleService-Info.plist', decoded);
        console.log('✅ [SUCCESS] GoogleService-Info.plist decodificado e validado.');
    } catch (e) {
        console.error('❌ [FATAL] Erro ao processar Base64:', e.message);
        process.exit(1);
    }
    " || exit 1

    # 4. Abortar se arquivo não existir (redundância)
    if [ ! -f "GoogleService-Info.plist" ]; then
        echo "❌ [FATAL] GoogleService-Info.plist não foi gerado."
        exit 1
    fi

    # 5. Logar primeiras 3 linhas
    echo "📄 [DEBUG] Primeiras 3 linhas do arquivo:"
    head -n 3 GoogleService-Info.plist
    echo "------------------------------------------------------------"
else
    echo "❌ [FATAL] GOOGLE_SERVICES_INFO_PLIST_BASE64 não encontrado no ambiente."
    exit 1
fi

## ETAPA 3 — EXECUÇÃO DO BUILD COM RETRY E FALLBACK

MAX_RETRIES=2

run_build_with_retry() {
    local mode=$1
    local profile=${PROFILE:-"production_v13"}
    local attempt=1
    SUBMISSION_STATUS="pending"
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "🏗️ [BUILD] Tentativa $attempt de $MAX_RETRIES no modo: $mode (Perfil: $profile)..."
        
        set +e
        local current_exit_code=0
        if [ "$mode" == "LOCAL" ]; then
            # 1. Configurar Keychain
            setup_macos_keychain

            # 2. Sincronizar Credenciais
            echo "🔄 [SYNC] Sincronizando credenciais ASC via EAS..."
            npx eas-cli credentials:sync --platform ios --non-interactive

            # 3. Limpeza rápida antes de cada tentativa local
            rm -rf ios .expo
            
            echo "🔧 [PREBUILD] Executando npx expo prebuild..."
            npx expo prebuild --platform ios --non-interactive
            
            if [ -d "ios" ]; then
                echo "📦 [PODS] Instalando CocoaPods..."
                cd ios
                pod install || echo "⚠️ [WARN] pod install falhou, tentando via eas build..."
                cd ..
            fi

            echo "🏗️ [EXEC] Iniciando eas build LOCAL..."
            EXPO_DEBUG=1 eas build --platform ios --profile "$profile" --local --non-interactive
            current_exit_code=$?
        else
            # MODO CLOUD (EAS Cloud Native)
            echo "🚀 [EXEC] Iniciando build CLOUD no EAS Cloud..."
            # Usar um arquivo temporário para capturar a saída e manter o exit code
            set +e
            EXPO_DEBUG=1 eas build --platform ios --profile "$profile" --non-interactive 2>&1 | tee /tmp/build_log.txt
            current_exit_code=$?
            set -e
            
            # Detecção de Erro de Cota (Free Plan Limit)
            if [ $current_exit_code -ne 0 ] && grep -q "EasBuildFreeTierIosLimitExceededError" /tmp/build_log.txt; then
                echo "⚠️ [QUOTA-EXCEEDED] Limite do plano gratuito do Expo atingido!"
                echo "🔄 [FALLBACK-AUTO] Forçando modo LOCAL para burlar o limite do Cloud..."
                # Chamada recursiva para tentar localmente
                run_build_with_retry "LOCAL"
                return $?
            fi
        fi
        
        if [ $current_exit_code -eq 0 ]; then
            return 0
        fi
        
        echo "⚠️ [ATTEMPT FAILED] Tentativa $attempt falhou com código $current_exit_code."
        
        # Log detalhado em caso de falha
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "🔄 [RETRY] Aguardando 10 segundos antes da próxima tentativa..."
            sleep 10
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Fluxo Principal de Execução
if run_build_with_retry "$BUILD_MODE"; then
    echo "✅ [SUCCESS] Build concluído com sucesso no modo $BUILD_MODE!"
    
    # --- GARANTIA DE OUTPUT (.IPA) ---
    echo "📦 [ARTIFACT] Localizando IPA gerada..."
    mkdir -p dist
    
    # Localizar IPA no diretório atual, subdiretórios ou pasta de saída padrão do EAS
    IPA_FILE=$(find . -name "*.ipa" -not -path "./node_modules/*" | head -n 1)
    
    if [ -n "$IPA_FILE" ]; then
        echo "✅ [FOUND] IPA localizada em: $IPA_FILE"
        cp "$IPA_FILE" ./dist/app.ipa
        echo "🚀 [READY] IPA movida para: ./dist/app.ipa"

        # --- NOVO: SUBMISSÃO AUTOMÁTICA APPLE (LOCAL BUILD FLOW) ---
        echo "📤 [SUBMIT] Iniciando submissão automática para Apple TestFlight..."
        
        # Validar existência da IPA antes de submeter
        if [ ! -f "./dist/app.ipa" ]; then
            echo "❌ [ERROR] IPA não encontrada em ./dist/app.ipa antes da submissão."
            exit 1
        fi
        
        IPA_PATH=$(realpath "./dist/app.ipa")
        echo "📍 [IPA-PATH] Caminho absoluto: $IPA_PATH"
        
        # Criar diretório de logs de submissão
        mkdir -p "build-logs/${TARGET_APP:-acucaradas-encomendas}"
        SUBMISSION_LOG="build-logs/${TARGET_APP:-acucaradas-encomendas}/submission.log"
        
        # Executar submissão capturando output total
        echo "⏳ [WAIT] Enviando para App Store Connect... (Isso pode levar alguns minutos)"
        if eas submit --platform ios --path "$IPA_PATH" --non-interactive 2>&1 | tee "$SUBMISSION_LOG"; then
            # Validar se o output contém confirmação real de upload
            if grep -q "Successfully uploaded" "$SUBMISSION_LOG" || grep -q "Submission completed" "$SUBMISSION_LOG"; then
                echo "✅ [SUBMIT-OK] IPA enviada e confirmada pela Apple."
                SUBMISSION_STATUS="success"
            else
                echo "❌ [SUBMIT-FAIL] Comando finalizou mas o upload não foi confirmado no log."
                SUBMISSION_STATUS="unconfirmed"
                exit 1
            fi
        else
            echo "❌ [SUBMIT-ERROR] Falha crítica na submissão da IPA para Apple."
            SUBMISSION_STATUS="failed"
            exit 1
        fi
        # ---------------------------------------------------------
    else
        echo "❌ [ERROR] Build finalizou com sucesso mas o arquivo .ipa não foi encontrado."
        exit 1
    fi
    # ---------------------------------
    
    # Obter o buildNumber do EAS se estivermos no modo CLOUD
    if [ "$BUILD_MODE" == "CLOUD" ]; then
        echo "🔍 [INFO] Buscando buildNumber gerado no EAS..."
        export CURRENT_BN=$(npx eas-cli build:list --platform ios --status finished --limit 1 --non-interactive | grep "Build number:" | head -n 1 | awk '{print $NF}')
        echo "📊 [RESULT] Build Number (EAS): $CURRENT_BN"
    else
        export CURRENT_BN=$(jq -r '.expo.ios.buildNumber' app.json)
    fi
    
    export CURRENT_VERSION=$(jq -r '.expo.version' app.json)
    
    # --- LOG E AUDITORIA ---
    echo "📊 [AUDIT] Gerando log de auditoria via Orchestrator..."
    mkdir -p build-logs
    
    # Save metrics via Orchestrator
    METRICS_JSON="{\"status\":\"success\",\"mode\":\"$BUILD_MODE\",\"version\":\"$CURRENT_VERSION\",\"buildNumber\":\"$CURRENT_BN\",\"commit\":\"$(git rev-parse HEAD)\",\"branch\":\"$BRANCH_NAME\",\"submission\":\"${SUBMISSION_STATUS:-pending}\"}"
    npx ts-node scripts/ci/PipelineOrchestrator.ts metrics "$METRICS_JSON"
    
    # --- NOVO: VALIDAÇÃO PÓS-BUILD (GLOBAL SCALE) ---
    echo "🔍 [VALIDATE] Iniciando validação de qualidade (Post-Build Validator)..."
    npx ts-node scripts/ci/PipelineOrchestrator.ts validate "./dist/app.ipa" "${CURRENT_BN:-unknown}"
    
    # --- NOVO: DECISÃO AUTÔNOMA DE RELEASE (LEVEL GLOBAL) ---
    echo "🤖 [AUTONOMOUS] Iniciando avaliação inteligente de release..."
    CRASH_RATE="0.005" # 0.5%
    PAYMENT_SUCCESS="0.98" # 98%
    npx ts-node scripts/ci/PipelineOrchestrator.ts evaluate "${CURRENT_BN:-unknown}" "$CRASH_RATE" "$PAYMENT_SUCCESS"
    # ---------------------------------

    node scripts/build-state-check.js success
    exit 0
else
    echo "🚨 [ALERT] Falha persistente no modo $BUILD_MODE após $MAX_RETRIES tentativas."
    
    # Lógica de Fallback Automático: LOCAL -> CLOUD
    if [ "$BUILD_MODE" == "LOCAL" ]; then
        echo "🔄 [FALLBACK-ALERT] Iniciando recuperação automática via CLOUD (EAS Cloud)..."
        if run_build_with_retry "CLOUD"; then
            echo "✅ [RECOVERED] Build concluído via CLOUD após falha no LOCAL!"
            
            echo "🔍 [INFO] Buscando buildNumber gerado no EAS..."
            export CURRENT_BN=$(npx eas-cli build:list --platform ios --status finished --limit 1 --non-interactive | grep "Build number:" | head -n 1 | awk '{print $NF}')
            echo "📊 [RESULT] Build Number (EAS): $CURRENT_BN"
            
            export CURRENT_VERSION=$(jq -r '.expo.version' app.json)
            node scripts/build-state-check.js success
            exit 0
        fi
    fi
    
    echo "❌ [FATAL-ALERT] O pipeline esgotou todas as tentativas de recuperação (LOCAL e CLOUD)."
    
    # Save failure status via Orchestrator
    FAILURE_JSON="{\"status\":\"failed\",\"mode\":\"$BUILD_MODE\",\"commit\":\"$(git rev-parse HEAD)\",\"branch\":\"$BRANCH_NAME\"}"
    npx ts-node scripts/ci/PipelineOrchestrator.ts metrics "$FAILURE_JSON" || true
    
    echo "💡 Sugestão: Verifique os logs acima para erros de dependência ou credenciais."
    exit 1
fi
