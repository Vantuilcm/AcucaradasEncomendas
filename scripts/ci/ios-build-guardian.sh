#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V6.0 - HYBRID INTELLIGENT EDITION)
# Missão: Pipeline Híbrido (Local vs Cloud) com Fallback Automático e Detecção de Contexto.
# Suporte: ASC API Key (Obrigatório), EAS Managed Credentials.

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Guardião de Build iOS (HYBRID V6.0)..."
echo "------------------------------------------------------------"

## ETAPA 1 — DETECÇÃO DE CONTEXTO E ESTADO (STATE ENGINE)
echo "🛡️ [STATE-ENGINE] Validando sincronização Enterprise..."
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
echo "🔑 [AUTH] Normalizando ASC Private Key..."
if [ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]; then
    echo "$EXPO_ASC_PRIVATE_KEY_BASE64" | base64 --decode > AuthKey.p8
    echo "✅ [OK] AuthKey.p8 gerada a partir do Base64."
elif [ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]; then
    # Converter \n literais para quebras de linha reais
    echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
    echo "✅ [OK] AuthKey.p8 gerada a partir da String."
fi

if [ -f "AuthKey.p8" ]; then
    if grep -q "BEGIN PRIVATE KEY" AuthKey.p8 && grep -q "END PRIVATE KEY" AuthKey.p8; then
        echo "✅ [OK] AuthKey.p8 validada com sucesso."
        # Exportar caminho para o EAS CLI
        export EXPO_ASC_PRIVATE_KEY_PATH="./AuthKey.p8"
    else
        echo "❌ [ERROR] AuthKey.p8 inválida (cabeçalho/rodapé ausente)."
        exit 1
    fi
else
    echo "⚠️ [WARN] AuthKey.p8 não pôde ser gerada. Builds locais podem falhar."
fi

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
    MISSING_VARS+=("EXPO_ASC_PRIVATE_KEY_BASE64")
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [ERRO] Variáveis obrigatórias ausentes: ${MISSING_VARS[*]}"
    exit 1
fi

export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
export EXPO_ASC_PRIVATE_KEY=$(cat AuthKey.p8)

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
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "🏗️ [BUILD] Tentativa $attempt de $MAX_RETRIES no modo: $mode (Perfil: $profile)..."
        
        set +e
        local current_exit_code=0
        if [ "$mode" == "LOCAL" ]; then
            # Limpeza rápida antes de cada tentativa local
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
    
    # Localizar IPA no diretório atual ou subdiretórios
    IPA_FILE=$(find . -maxdepth 2 -name "*.ipa" | head -n 1)
    
    if [ -n "$IPA_FILE" ]; then
        echo "✅ [FOUND] IPA localizada em: $IPA_FILE"
        cp "$IPA_FILE" ./dist/app.ipa
        echo "🚀 [READY] IPA movida para: ./dist/app.ipa"
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
    echo "📊 [AUDIT] Gerando log de auditoria..."
    mkdir -p build-logs
    cat <<EOF > build-logs/ios-build-log.json
{
  "status": "success",
  "mode": "$BUILD_MODE",
  "version": "$CURRENT_VERSION",
  "buildNumber": "$CURRENT_BN",
  "commit": "$(git rev-parse HEAD)",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "$BRANCH_NAME"
}
EOF
    # -----------------------

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
    echo "💡 Sugestão: Verifique os logs acima para erros de dependência ou credenciais."
    exit 1
fi
