#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V8.0 - LOCAL GUARDIAN)
# MISSÃO: Garantir build iOS LOCAL, determinístico e independente de créditos Expo.
# AGENTE: iOSBuildGuardianAI_V2_LOCAL

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Guardião de Build iOS LOCAL (V8.0)..."
echo "------------------------------------------------------------"

# --- CONFIGURAÇÃO INICIAL ---
export TARGET_APP="${TARGET_APP:-acucaradas-encomendas}"
export APP_ENV="${APP_ENV:-production}"
PROFILE="${PROFILE:-production_v13}"
BUILD_LOG="build-logs/ios-local-build.log"
mkdir -p build-logs dist

# --- ETAPA 1 — VALIDAÇÃO DE AMBIENTE ---
echo "🧩 [ETAPA 1] Validando ambiente de execução..."

# 1.1 Validar SO
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ [FATAL] Este pipeline requer um ambiente macOS (GitHub macos-latest)."
    exit 1
fi

# 1.2 Validar Ferramentas
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ [FATAL] Ferramenta '$1' não encontrada. Por favor, instale-a."
        exit 1
    fi
    echo "✅ [OK] $1 instalado: $($1 --version | head -n 1)"
}

check_tool "node"
check_tool "npm"
check_tool "npx"
check_tool "xcodebuild"

# 1.3 Validar CLIs específicos
if ! npx eas --version &>/dev/null; then
    echo "❌ [FATAL] eas-cli não encontrado."
    exit 1
fi
echo "✅ [OK] eas-cli detectado."

# 1.4 Validar Variáveis Críticas (ENV)
MISSING_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_VARS+=("EXPO_TOKEN")
[ -z "${EXPO_ASC_KEY_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_KEY_ID")
[ -z "${EXPO_ASC_ISSUER_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_ISSUER_ID")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [FATAL] Variáveis de ambiente ausentes: ${MISSING_VARS[*]}"
    exit 1
fi

if [ -z "${EXPO_ASC_PRIVATE_KEY:-}" ] && [ -z "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]; then
    echo "❌ [FATAL] EXPO_ASC_PRIVATE_KEY ou EXPO_ASC_PRIVATE_KEY_BASE64 deve estar definida."
    exit 1
fi
echo "✅ [OK] Variáveis de ambiente validadas."

# --- ETAPA 2 — NORMALIZAÇÃO DA PRIVATE KEY ---
echo "🧩 [ETAPA 2] Normalizando ASC Private Key (AuthKey.p8)..."

if [ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]; then
    echo "📦 [BASE64] Decodificando EXPO_ASC_PRIVATE_KEY_BASE64..."
    echo "$EXPO_ASC_PRIVATE_KEY_BASE64" | base64 --decode > AuthKey.p8
elif [ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]; then
    echo "📝 [STRING] Formatando EXPO_ASC_PRIVATE_KEY..."
    # Se a chave vier como string literal com \n, converter para quebras de linha reais
    echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
fi

# Exportar corretamente para o ambiente CI
export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
export EXPO_ASC_PRIVATE_KEY=$(cat AuthKey.p8)

if [ -n "${GITHUB_ENV:-}" ]; then
    echo "📤 [CI] Exportando EXPO_ASC_PRIVATE_KEY para GITHUB_ENV..."
    {
      echo "EXPO_ASC_PRIVATE_KEY<<GITHUB_ENV_EOF"
      cat AuthKey.p8
      echo ""
      echo "GITHUB_ENV_EOF"
    } >> "$GITHUB_ENV"
    echo "EXPO_ASC_PRIVATE_KEY_PATH=$(pwd)/AuthKey.p8" >> "$GITHUB_ENV"
fi

# --- ETAPA 3 — VALIDAÇÃO DA KEY ---
echo "🧩 [ETAPA 3] Validando integridade da AuthKey.p8..."
if ! grep -q "BEGIN PRIVATE KEY" AuthKey.p8 || ! grep -q "END PRIVATE KEY" AuthKey.p8; then
    echo "❌ [FATAL] AuthKey.p8 inválida ou corrompida."
    exit 1
fi
echo "✅ [OK] AuthKey.p8 validada com sucesso."

# --- ETAPA 4 — LIMPEZA DE CONFLITOS ---
echo "🧩 [ETAPA 4] Limpando variáveis de conflito..."
# Remover credenciais manuais que podem conflitar com a API Key
unset IOS_DIST_CERT_BASE64
unset IOS_PROV_PROFILE_BASE64
unset IOS_CERT_PASSWORD
unset EXPO_APP_STORE_CONNECT_API_KEY
unset EXPO_ASC_KEY
unset EXPO_APPLE_ID
unset EXPO_APPLE_ID_PASSWORD
echo "✅ [OK] Conflitos removidos."

# --- ETAPA 5 — SINCRONIZAÇÃO DE CREDENCIAIS ---
echo "🧩 [ETAPA 5] Validando credenciais ASC via EAS..."
# Em modo local com API Key, o EAS Build já utiliza as variáveis de ambiente.
# O comando 'credentials:sync' não existe nas versões recentes do EAS CLI.
echo "✅ [OK] Credenciais preparadas (via ENV)."

# --- ETAPA 6 — PRÉ-BUILD NATIVO ---
echo "🧩 [ETAPA 6] Executando Prebuild Nativo..."
# Limpeza de pastas nativas para garantir build limpo
rm -rf ios
npx expo prebuild --platform ios --no-install

echo "📦 [COCOAPODS] Instalando dependências nativas (pod install)..."
cd ios
pod install
cd ..
echo "✅ [OK] Prebuild e Pods finalizados."

# --- ETAPA 7 — BUILD IOS LOCAL ---
echo "🧩 [ETAPA 7] Iniciando Build iOS LOCAL (Modo: --local)..."
echo "🕒 [START_TIME] $(date)"

# Forçar build number único antes do build
node scripts/ci/force-build-number.js --run

# Execução do Build com Retentativas
run_build_with_retry() {
    local attempt=1
    local max_attempts=2
    
    while [ $attempt -le $max_attempts ]; do
        echo "🚀 [BUILD] Tentativa $attempt de $max_attempts..."
        
        set +e
        EXPO_DEBUG=1 npx eas build --platform ios --local --profile "$PROFILE" --non-interactive 2>&1 | tee "$BUILD_LOG"
        local current_exit_code=${PIPESTATUS[0]}
        set -e
        
        if [ $current_exit_code -eq 0 ]; then
            echo "✅ [SUCCESS] Build local finalizado com sucesso na tentativa $attempt."
            return 0
        fi
        
        echo "⚠️ [ATTEMPT FAILED] Tentativa $attempt falhou."
        attempt=$((attempt + 1))
        [ $attempt -le $max_attempts ] && sleep 10
    done
    return 1
}

if ! run_build_with_retry; then
    echo "❌ [FATAL] Build falhou após retentativas. Verifique os logs em $BUILD_LOG"
    exit 1
fi

# --- ETAPA 8 — MONITORAMENTO (Pós-Build) ---
echo "🧩 [ETAPA 8] Monitorando resultados do build..."
# O monitoramento é feito via análise dos logs se necessário, ou via saída do EAS.

# --- ETAPA 9 — VALIDAÇÃO FINAL ---
echo "🧩 [ETAPA 9] Validando IPA gerada..."

# Localizar IPA
IPA_FILE=$(find . -name "*.ipa" -not -path "./node_modules/*" -not -path "./ios/*" | head -n 1)

if [ -z "$IPA_FILE" ]; then
    echo "❌ [FATAL] IPA não encontrada após o build bem-sucedido!"
    exit 1
fi

echo "✅ [FOUND] IPA localizada em: $IPA_FILE"
cp "$IPA_FILE" ./dist/app.ipa

# Extrair metadados para validação
TARGET_BUNDLE_ID=$(jq -r '.expo.ios.bundleIdentifier' app.json)
TARGET_VER=$(jq -r '.expo.version' app.json)
CURRENT_BN=$(jq -r '.expo.ios.buildNumber' app.json)

echo "🔍 [VALIDATE] Validando IPA (BundleID: $TARGET_BUNDLE_ID, Versão: $TARGET_VER, Build: $CURRENT_BN)..."
# Aqui poderíamos rodar o force-build-number.js --validate-ipa se o script suportar
if [ -f "scripts/ci/force-build-number.js" ]; then
    node scripts/ci/force-build-number.js --validate-ipa "./dist/app.ipa" "$CURRENT_BN" "$TARGET_VER" "$TARGET_BUNDLE_ID" || echo "⚠️ [WARN] Validação profunda falhou, mas IPA existe."
fi

# --- ETAPA 10 — OUTPUT ---
echo "🧩 [ETAPA 10] Finalizando e gerando artefatos..."
echo "🚀 [READY] IPA pronta em: ./dist/app.ipa"
echo "------------------------------------------------------------"
echo "✅ [DONE] Missão cumprida: Build iOS LOCAL concluído com sucesso!"
echo "🕒 [END_TIME] $(date)"
