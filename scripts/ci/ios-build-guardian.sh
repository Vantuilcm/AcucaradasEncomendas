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

# 2.2 Version Bump (Fonte Única de Verdade)
echo "🏷️ [VERSION] Incrementando buildNumber..."
node scripts/version-bump.js

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
        echo "⚠️ [WARN] EXPO_ASC_PRIVATE_KEY_BASE64 parece conter o texto RAW (PEM). Usando sem decodificar."
        echo "${EXPO_ASC_PRIVATE_KEY_BASE64}" > AuthKey.p8
    else
        echo "🛡️ [SECURE] Decodificando Base64 via Node..."
        # Usamos Node para decodificar, pois é mais resiliente a whitespaces e formatos (standard/url-safe)
        node -e "const fs = require('fs'); let b64 = process.env.EXPO_ASC_PRIVATE_KEY_BASE64.trim().replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/'); try { fs.writeFileSync('AuthKey.p8', Buffer.from(b64, 'base64')); } catch (e) { console.error('FALHA DECODER:', e.message); process.exit(1); }"
    fi
elif [ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]; then
    # Bloquear se for multiline direto (formato inválido para GitHub Secrets sem Base64)
    if [[ "${EXPO_ASC_PRIVATE_KEY}" == *"BEGIN PRIVATE KEY"* ]]; then
        echo "❌ [ERRO] EXPO_ASC_PRIVATE_KEY no formato RAW detectada. Isso causa erros no GitHub Actions."
        echo "💡 Solução: Converta sua chave para BASE64 e use EXPO_ASC_PRIVATE_KEY_BASE64."
        exit 1
    fi
    echo "🛡️ [SECURE] Normalizando ASC Private Key (Legacy String)..."
    echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
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
    # Usamos Node para decodificação resiliente
    node -e "const fs = require('fs'); let b64 = process.env.GOOGLE_SERVICES_INFO_PLIST_BASE64.trim().replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/'); try { fs.writeFileSync('GoogleService-Info.plist', Buffer.from(b64, 'base64')); } catch (e) { console.error('FALHA DECODER GOOGLE:', e.message); process.exit(1); }"
    
    if [ -f "GoogleService-Info.plist" ]; then
        echo "✅ [SUCCESS] GoogleService-Info.plist criado com sucesso."
        ls -la | grep GoogleService
    else
        echo "❌ [FATAL] Arquivo GoogleService-Info.plist não foi criado após decodificação."
        exit 1
    fi
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
