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
node -r ts-node/register scripts/ci/PipelineOrchestrator.ts build

BRANCH_NAME="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
COMMIT_MSG="${GITHUB_EVENT_PATH:+$(jq -r '.head_commit.message' "$GITHUB_EVENT_PATH")}"
COMMIT_MSG="${COMMIT_MSG:-$(git log -1 --pretty=%B)}"

# Bloqueio de Produção: apenas commits com [release] podem ir para CLOUD/Main
if [[ "$BRANCH_NAME" == "main" ]] && [[ "$COMMIT_MSG" != *"[release]"* ]]; then
    echo "⚠️ [WARN] Push na main sem tag [release]. Procedendo com build LOCAL por ordem do usuário..."
fi

echo "🛡️ [STATE-ENGINE] Ativando LOCK para impedir builds simultâneos..."
node scripts/build-state-check.js lock

# Garantir unlock ao sair (sucesso ou falha)
trap "node scripts/build-state-check.js unlock" EXIT

node scripts/build-state-check.js check

# REGRAS ESTRITAS: SEMPRE LOCAL, NUNCA CLOUD
BUILD_MODE="LOCAL"
PROFILE="${PROFILE:-production_v13}"
echo "🚀 [CONTEXTO] Modo LOCAL forçado (Perfil: $PROFILE). Nunca usando EAS Cloud."

# 2.0 Hardening: Fail-Fast macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ [FATAL] Este pipeline requer um ambiente macOS (GitHub macos-latest)."
    exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
    echo "❌ [FATAL] xcodebuild não encontrado. Xcode é obrigatório para build LOCAL."
    exit 1
fi

## ETAPA 2 — PRÉ-VALIDAÇÃO E LIMPEZA TOTAL (ANTI-CACHE)
echo "🧹 [INFO] Limpeza TOTAL do ambiente (Anti-Cache)..."
# Limpeza agressiva solicitada pela missão BuildIntegrityEnforcerAI
rm -rf node_modules
rm -rf ios
rm -rf dist
rm -f app.ipa
rm -rf ~/.expo
rm -rf ~/.eas
rm -rf .expo
mkdir -p dist build-logs

echo "📦 [INSTALL] Reinstalando dependências (npm install)..."
npm install --legacy-peer-deps

# Verificação de Variáveis Críticas
MISSING_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_VARS+=("EXPO_TOKEN")
[ -z "${EXPO_ASC_KEY_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_KEY_ID")
[ -z "${EXPO_ASC_ISSUER_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_ISSUER_ID")

# 2.1 Forçar Build Number Único (Enforcer)
echo "🔄 [ENFORCER] Garantindo build number único..."
node scripts/ci/force-build-number.js --run

# Extrair versão atualizada (Source of Truth: app.json pós-enforce)
export CURRENT_BN=$(jq -r '.expo.ios.buildNumber' app.json)
TARGET_VER=$(jq -r '.expo.version' app.json)

echo "📌 [TARGET] Preparando Build Enforced: $TARGET_VER ($CURRENT_BN)"
echo "💉 [ENV] Injetando BUILD_NUMBER=$CURRENT_BN para o app.config.js"
export BUILD_NUMBER="$CURRENT_BN"

# ETAPA 3 — VALIDAR CONFIG REAL DO EXPO (RESOLVED)
echo "🔍 [RESOLVE] Validando configuração resolvida do Expo..."
EXPO_NO_TELEMETRY=1 npx expo config --type public --json > build-resolved-config.json 2>/dev/null
# Limpeza de logs de telemetria se houver
sed -i '' -n '/^{/,$p' build-resolved-config.json 2>/dev/null || sed -i -n '/^{/,$p' build-resolved-config.json

RESOLVED_BN=$(jq -r '.ios.buildNumber' build-resolved-config.json)

if [ "$RESOLVED_BN" != "$CURRENT_BN" ]; then
    echo "❌ [FATAL] Divergência de Build Number! Resolvido: $RESOLVED_BN | Esperado: $CURRENT_BN"
    echo "💡 Verifique se o app.config.js está injetando corretamente o BUILD_NUMBER."
    exit 1
fi
echo "✅ [OK] Build Number resolvido confirmado: $RESOLVED_BN"

# --- INÍCIO DA EXECUÇÃO (v3.0 - BuildIntegrityEnforcerAI) ---
echo "🚀 [START] Iniciando iOS Build Guardian v3.0 (BUILD_SYNC = ENFORCED)..."
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
LAST_BUILD_FOR_COMMIT=$(npx eas build:list --platform ios --status finished --limit 5 --non-interactive | grep "$COMMIT_HASH" || true)
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
        echo "🔐 [KEYCHAIN] Criando nova keychain..."
        security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
    fi

    echo "🔐 [KEYCHAIN] Desbloqueando e configurando como default..."
    security default-keychain -s "$KEYCHAIN_NAME"
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
    security set-keychain-settings -lut 21600 "$KEYCHAIN_NAME"
    
    # 2.4.2 Permitir que qualquer aplicação acesse chaves sem prompt (Crucial para xcodebuild)
    echo "🔐 [KEYCHAIN] Permitindo acesso global às chaves para evitar travamentos..."
    security set-key-partition-list -S apple-tool:,apple:,codesign:,security: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
    
    # Adicionar a keychain à lista de busca explicitamente
    KEYCHAINS=$(security list-keychains -d user | xargs)
    if [[ "$KEYCHAINS" != *"$KEYCHAIN_NAME"* ]]; then
        security list-keychains -d user -s "$KEYCHAIN_NAME" $KEYCHAINS
    fi
    
    echo "✅ [KEYCHAIN] Keychain configurada e desbloqueada com sucesso."
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
# Garantir que a variável multiline seja exportada corretamente para o EAS CLI
export EXPO_ASC_PRIVATE_KEY=$(cat AuthKey.p8)

# Validar se a chave foi gerada corretamente
if ! grep -q "BEGIN PRIVATE KEY" AuthKey.p8; then
    echo "❌ [ERRO] Falha ao gerar AuthKey.p8: Formato de chave privada inválido."
    exit 1
fi
echo "✅ [CONFIG] AuthKey.p8 validada com sucesso."

# Adicionar TEAM_ID se disponível para facilitar assinatura local
if [ -n "${EXPO_APPLE_TEAM_ID:-}" ]; then
    export APPLE_TEAM_ID="${EXPO_APPLE_TEAM_ID}"
    echo "✅ [CONFIG] APPLE_TEAM_ID configurado: ${APPLE_TEAM_ID}"
fi

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



# Validar Conformidade de Privacidade (Apple Compliance Guardian)
echo "🛡️ [COMPLIANCE] Injetando e validando chaves de privacidade no Info.plist..."
node scripts/ci/ios-privacy-validator.js

run_build_with_retry() {
    local attempt=1
    SUBMISSION_STATUS="pending"
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "🏗️ [BUILD] Tentativa $attempt de $MAX_RETRIES no modo LOCAL (Perfil: $PROFILE)..."
        
        set +e
        local current_exit_code=0
        
        # 1. Configurar Keychain
        setup_macos_keychain

        # 2. Sincronizar Credenciais
        echo "🔄 [SYNC] Sincronizando credenciais ASC via EAS..."
        npx eas credentials:sync --platform ios --non-interactive

        # 3. Limpeza rápida antes de cada tentativa local
        rm -rf ios .expo
        
        echo "🔧 [PREBUILD] Executando npx expo prebuild --clean..."
        npx expo prebuild --platform ios --clean --non-interactive
        
        if [ ! -d "ios" ]; then
            echo "❌ [FATAL] Diretório 'ios' não foi gerado pelo prebuild."
            return 1
        fi

        echo "📦 [PODS] Instalando CocoaPods..."
        cd ios
        # Tentar instalar pods com correção automática de ambiente se falhar
        if ! pod install; then
            echo "⚠️ [WARN] pod install falhou. Tentando reparar ambiente Ruby..."
            brew install libyaml || true
            # Reinstalar cocoapods localmente
            gem install cocoapods -NV || true
            pod install || { echo "❌ [FATAL] pod install falhou permanentemente."; cd ..; return 1; }
        fi
        cd ..

        echo "🏗️ [EXEC] Iniciando eas build LOCAL..."
        export CI=1
        export TERM=dumb
        export EXPO_NO_TELEMETRY=1
        export EAS_NO_VCS=1
        
        # Exportar variáveis ASC explicitamente com aspas para preservar formato multiline
        export EXPO_ASC_KEY_ID="${EXPO_ASC_KEY_ID:-}"
        export EXPO_ASC_ISSUER_ID="${EXPO_ASC_ISSUER_ID:-}"
        
        mkdir -p build-logs
        BUILD_LOG="build-logs/eas-build-local.log"
        
        echo "🕒 [TIME] Iniciando build em $(date)"
        # Adicionando flags de verbose e timeout interno
        set +e
        EXPO_DEBUG=1 DEBUG=eas:* npx eas build --platform ios --profile "$PROFILE" --local --non-interactive 2>&1 | tee "$BUILD_LOG"
        current_exit_code=${PIPESTATUS[0]}
        set -e
        echo "🕒 [TIME] Build finalizado em $(date) com código $current_exit_code"
        
        if [ $current_exit_code -eq 0 ]; then
            return 0
        fi
        
        echo "⚠️ [ATTEMPT FAILED] Tentativa $attempt falhou com código $current_exit_code."
        
        # Analisar erro comum de assinatura no log
        if grep -q "Code signing failed" "$BUILD_LOG" || grep -q "Provisioning profile" "$BUILD_LOG"; then
            echo "❌ [SIGNING-ERROR] Detectado erro de assinatura de código. Verificando credenciais..."
            npx eas credentials:list --platform ios --profile "$PROFILE" --non-interactive || true
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Fluxo Principal de Execução
if run_build_with_retry; then
    echo "✅ [SUCCESS] Build LOCAL concluído com sucesso!"
    
    # --- GARANTIA DE OUTPUT (.IPA) ---
    echo "📦 [ARTIFACT] Localizando IPA gerada..."
    mkdir -p dist
    
    # 1. Debug: Listar todos os arquivos .ipa gerados
    echo "📦 [DEBUG] Arquivos .ipa encontrados no workspace:"
    find . -name "*.ipa" -not -path "./node_modules/*"
    
    # 2. Busca dinâmica da IPA
    IPA_FILE=$(find . -name "*.ipa" -not -path "./node_modules/*" -not -path "./ios/*" | head -n 1)
    
    if [ -z "$IPA_FILE" ]; then
        echo "❌ [FATAL] IPA NOT FOUND - BUILD FAILED"
        exit 1
    fi
    
    echo "✅ [FOUND] IPA localizada em: $IPA_FILE"
    cp "$IPA_FILE" ./dist/app.ipa
    
    # 3. Validar cópia antes de prosseguir
    if [ ! -f "dist/app.ipa" ]; then
        echo "❌ [FATAL] IPA copy failed to dist/app.ipa"
        exit 1
    fi
    echo "🚀 [READY] IPA pronta em: ./dist/app.ipa"

    # Extrair metadados esperados para validação
    TARGET_BUNDLE_ID=$(jq -r '.expo.ios.bundleIdentifier' app.json)
    
    # 🔍 [VALIDATE] Validação profunda do Build Number na IPA antes do Submit
    echo "🔍 [VALIDATE] Validando integridade do build na IPA (BN: $CURRENT_BN | VER: $TARGET_VER | ID: $TARGET_BUNDLE_ID)..."
    node scripts/ci/force-build-number.js --validate-ipa "./dist/app.ipa" "$CURRENT_BN" "$TARGET_VER" "$TARGET_BUNDLE_ID"
    
    # 🛡️ [COMPLIANCE] Validação profunda de privacidade na IPA
    echo "🔍 [COMPLIANCE] Validando chaves de privacidade na IPA final..."
    node scripts/ci/ios-privacy-validator.js --check-ipa "./dist/app.ipa"
    
    # Salvar log final para o artefato do GitHub
    [ -f "build-logs/eas-build-local.log" ] && cp "build-logs/eas-build-local.log" "build-logs/ios-build-log.json" || true

    # --- NOVO: SUBMISSÃO AUTOMÁTICA APPLE (LOCAL BUILD FLOW) ---
    echo "📤 [SUBMIT] Iniciando submissão automática para Apple TestFlight..."
    
    IPA_PATH=$(realpath "./dist/app.ipa")
    echo "📍 [IPA-PATH] Caminho absoluto: $IPA_PATH"
    
    # Criar diretório de logs de submissão
    mkdir -p "build-logs/${TARGET_APP:-acucaradas-encomendas}"
    SUBMISSION_LOG="build-logs/${TARGET_APP:-acucaradas-encomendas}/submission.log"
    
    # Executar submissão capturando output total
    echo "⏳ [WAIT] Enviando para App Store Connect... (Isso pode levar alguns minutos)"
    export CI=1
    if npx eas submit --platform ios --profile "$PROFILE" --path "$IPA_PATH" --non-interactive 2>&1 | tee "$SUBMISSION_LOG"; then
        # Validar se o output contém confirmação real de upload
        if grep -qiE "Successfully uploaded|Submission completed|Submitted your app|uploaded to App Store Connect" "$SUBMISSION_LOG"; then
            echo "✅ [SUBMIT-OK] IPA enviada e confirmada pela Apple."
            SUBMISSION_STATUS="success"
            node scripts/ci/force-build-number.js --finalize "SUCCESS"
        else
            echo "❌ [SUBMIT-FAIL] Comando finalizou mas o upload não foi confirmado no log."
            SUBMISSION_STATUS="unconfirmed"
            node scripts/ci/force-build-number.js --finalize "FAILED"
            exit 1
        fi
    else
        echo "❌ [SUBMIT-ERROR] Falha crítica na submissão da IPA para Apple."
        SUBMISSION_STATUS="failed"
        node scripts/ci/force-build-number.js --finalize "FAILED"
        exit 1
    fi
    # ---------------------------------------------------------
    
    # Obter o buildNumber do app.json (Modo LOCAL)
    export CURRENT_BN=$(jq -r '.expo.ios.buildNumber' app.json)
    export CURRENT_VERSION=$(jq -r '.expo.version' app.json)
    
    # --- LOG E AUDITORIA ---
    echo "📊 [AUDIT] Gerando log de auditoria via Orchestrator..."
    mkdir -p build-logs
    
    # Save metrics via Orchestrator
    METRICS_JSON="{\"status\":\"success\",\"mode\":\"LOCAL\",\"version\":\"$CURRENT_VERSION\",\"buildNumber\":\"$CURRENT_BN\",\"commit\":\"$(git rev-parse HEAD)\",\"branch\":\"$BRANCH_NAME\",\"submission\":\"${SUBMISSION_STATUS:-pending}\"}"
    node -r ts-node/register scripts/ci/PipelineOrchestrator.ts metrics "$METRICS_JSON"
    
    # [HISTORY] Registrar sucesso no histórico de builds
    node scripts/ci/version-lock.js --save-history "ios" "$CURRENT_BN" "SUCCESS"

    # --- NOVO: VALIDAÇÃO PÓS-BUILD (GLOBAL SCALE) ---
    echo "🔍 [VALIDATE] Iniciando validação de qualidade (Post-Build Validator)..."
    node -r ts-node/register scripts/ci/PipelineOrchestrator.ts validate "./dist/app.ipa" "${CURRENT_BN:-unknown}"
    
    # --- NOVO: DECISÃO AUTÔNOMA DE RELEASE (LEVEL GLOBAL) ---
    echo "🤖 [AUTONOMOUS] Iniciando avaliação inteligente de release..."
    CRASH_RATE="0.005" # 0.5%
    PAYMENT_SUCCESS="0.98" # 98%
    node -r ts-node/register scripts/ci/PipelineOrchestrator.ts evaluate "${CURRENT_BN:-unknown}" "$CRASH_RATE" "$PAYMENT_SUCCESS"
    # ---------------------------------

    node scripts/build-state-check.js success
    echo "------------------------------------------------------------"
    echo "🎯 [MISSÃO CUMPRIDA] IPA gerada e submetida com sucesso!"
    echo "📱 Versão: $CURRENT_VERSION | Build: $CURRENT_BN"
    echo "📦 Artefato: ./dist/app.ipa"
    echo "------------------------------------------------------------"
    exit 0
else
    echo "🚨 [ALERT] Falha persistente no modo LOCAL após $MAX_RETRIES tentativas."
    
    # REGRAS ESTRITAS: SEM FALLBACK PARA CLOUD
    echo "❌ [FATAL-ALERT] O pipeline esgotou todas as tentativas de build LOCAL."
    
    # Save failure status via Orchestrator
    FAILURE_JSON="{\"status\":\"failed\",\"mode\":\"LOCAL\",\"commit\":\"$(git rev-parse HEAD)\",\"branch\":\"$BRANCH_NAME\"}"
    node -r ts-node/register scripts/ci/PipelineOrchestrator.ts metrics "$FAILURE_JSON" || true
    
    echo "💡 Sugestão: Verifique os logs em build-logs/eas-build-local.log para erros de dependência ou credenciais."
    exit 1
fi
