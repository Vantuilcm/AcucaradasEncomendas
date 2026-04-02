#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V6.0 - HYBRID INTELLIGENT EDITION)
# Missão: Pipeline Híbrido (Local vs Cloud) com Fallback Automático e Detecção de Contexto.
# Suporte: ASC API Key (Obrigatório), EAS Managed Credentials.

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Guardião de Build iOS (HYBRID V6.0)..."
echo "------------------------------------------------------------"

## ETAPA 1 — DETECÇÃO DE CONTEXTO E ESTADO (STATE ENGINE)
BRANCH_NAME="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
COMMIT_MSG="${GITHUB_EVENT_PATH:+$(jq -r '.head_commit.message' "$GITHUB_EVENT_PATH")}"
COMMIT_MSG="${COMMIT_MSG:-$(git log -1 --pretty=%B)}"

# Bloqueio de Produção: apenas commits com [release] podem ir para CLOUD/Main
if [[ "$BRANCH_NAME" == "main" ]] && [[ "$COMMIT_MSG" != *"[release]"* ]]; then
    echo "❌ [BLOCK] Builds na branch main EXIGEM a tag [release] no commit."
    echo "💡 Sugestão: Use 'git commit --allow-empty -m \"build: trigger release [release]\"' para disparar."
    exit 1
fi

echo "🛡️ [STATE-ENGINE] Validando lock e duplicidade..."
node scripts/build-state-check.js lock
node scripts/build-state-check.js check

# Garantir unlock ao sair (sucesso ou falha)
trap "node scripts/build-state-check.js unlock" EXIT

BUILD_MODE="LOCAL" # Default para segurança e velocidade

if [[ "$BRANCH_NAME" == "main" ]] || [[ "$COMMIT_MSG" == *"[release]"* ]]; then
    BUILD_MODE="CLOUD"
    echo "🚀 [CONTEXTO] Produção/Release detectada. Modo: CLOUD (EAS Cloud)."
else
    echo "🧪 [CONTEXTO] Branch de desenvolvimento detectada. Modo: LOCAL (GitHub Runner)."
fi

# Sobrescrever via ENV se necessário
if [ -n "${FORCE_BUILD_MODE:-}" ]; then
    BUILD_MODE="$FORCE_BUILD_MODE"
    echo "⚠️ [OVERRIDE] Modo de build forçado via ENV: $BUILD_MODE"
fi

## ETAPA 2 — PRÉ-VALIDAÇÃO E LIMPEZA (FAIL FAST)

# 2.1 Limpeza Profunda (Deep Clean)
echo "🧹 [INFO] Limpando ambiente (DEEP CLEAN)..."
rm -rf ios .expo dist node_modules/.cache
# Nota: node_modules é mantido se o cache do GitHub Actions estiver ativo para velocidade.

# --- INÍCIO DA EXECUÇÃO ---
echo "🚀 [START] Iniciando iOS Build Guardian v2.1..."
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

# 2.3 ASC Build Check (Proteção contra duplicidade)
echo "🛡️ [CHECK] Verificando duplicidade no App Store Connect..."
CURRENT_BN=$(grep "buildNumber:" app.config.ts | sed 's/[^0-9]*//g')

# Usamos 'eas build:list' para ver se o número já foi usado
# Se falhar (por falta de login no EAS), o build continua normalmente
set +e
BN_EXISTS=$(npx eas-cli build:list --platform ios --status finished --limit 10 --non-interactive | grep "Build number: $CURRENT_BN" || true)
set -e

if [ -n "$BN_EXISTS" ]; then
    echo "⚠️ [DUPLICATE] Build $CURRENT_BN detectado em builds anteriores. Forçando novo incremento..."
    node scripts/version-bump.js
    CURRENT_BN=$(grep "buildNumber:" app.config.ts | sed 's/[^0-9]*//g')
    echo "✅ [FIXED] Novo buildNumber definido: $CURRENT_BN"
fi

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
        if [ "$mode" == "LOCAL" ]; then
            # Limpeza rápida antes de cada tentativa local
            rm -rf ios .expo
            npx expo prebuild --platform ios --no-install --non-interactive
            EXPO_DEBUG=1 eas build --platform ios --profile "$profile" --local --non-interactive
        else
            # Garantir que o arquivo GoogleService-Info.plist esteja no lugar certo antes do build cloud
            # O EAS Cloud as vezes falha se o arquivo for gerado dinamicamente e não estiver "visto" pelo git
            # mas como usamos --non-interactive, vamos garantir que ele exista.
            cp GoogleService-Info.plist ./ios/GoogleService-Info.plist 2>/dev/null || true
            EXPO_DEBUG=1 eas build --platform ios --profile "$profile" --non-interactive
        fi
        local exit_code=$?
        set -e
        
        if [ $exit_code -eq 0 ]; then
            return 0
        fi
        
        echo "⚠️ [ATTEMPT FAILED] Tentativa $attempt falhou com código $exit_code."
        
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
    export CURRENT_VERSION=$(grep "version:" app.config.ts | sed "s/.*'\(.*\)'.*/\1/")
    export CURRENT_BN=$(grep "buildNumber:" app.config.ts | sed 's/[^0-9]*//g')
    node scripts/build-state-check.js success
    exit 0
else
    echo "🚨 [ALERT] Falha persistente no modo $BUILD_MODE após $MAX_RETRIES tentativas."
    
    # Lógica de Fallback Automático: LOCAL -> CLOUD
    if [ "$BUILD_MODE" == "LOCAL" ]; then
        echo "🔄 [FALLBACK-ALERT] Iniciando recuperação automática via CLOUD (EAS Cloud)..."
        if run_build_with_retry "CLOUD"; then
            echo "✅ [RECOVERED] Build concluído via CLOUD após falha no LOCAL!"
            export CURRENT_VERSION=$(grep "version:" app.config.ts | sed "s/.*'\(.*\)'.*/\1/")
            export CURRENT_BN=$(grep "buildNumber:" app.config.ts | sed 's/[^0-9]*//g')
            node scripts/build-state-check.js success
            exit 0
        fi
    fi
    
    echo "❌ [FATAL-ALERT] O pipeline esgotou todas as tentativas de recuperação (LOCAL e CLOUD)."
    echo "💡 Sugestão: Verifique os logs acima para erros de dependência ou credenciais."
    exit 1
fi
