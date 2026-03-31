#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS
# Garante validação, normalização e execução segura do build no EAS Cloud.

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando validação de ambiente..."
echo "------------------------------------------------------------"

# 1. VALIDAÇÃO DE VARIÁVEIS OBRIGATÓRIAS
MISSING_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_VARS+=("EXPO_TOKEN")
[ -z "${EXPO_ASC_KEY_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_KEY_ID")
[ -z "${EXPO_ASC_ISSUER_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_ISSUER_ID")
[ -z "${EXPO_ASC_PRIVATE_KEY:-}" ] && [ -z "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ] && MISSING_VARS+=("EXPO_ASC_PRIVATE_KEY")
[ -z "${EXPO_APPLE_TEAM_ID:-}" ] && MISSING_VARS+=("EXPO_APPLE_TEAM_ID")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [ERRO] Variáveis obrigatórias ausentes: ${MISSING_VARS[*]}"
    exit 1
fi

# 1.1 Governança de Arquivos (Anti-Signing Manual)
echo "[INFO] Validando governança de credenciais..."
forbidden_files=("credentials.json" "*.p12" "*.mobileprovision")
for pattern in "${forbidden_files[@]}"; do
    if ls $pattern 1> /dev/null 2>&1; then
        echo "❌ [ERROR] [GOVERNANÇA] Arquivo proibido detectado: $pattern"
        echo "💡 [DICA] O pipeline exige EAS Managed Credentials. Remova arquivos de signing manuais do repositório."
        exit 1
    fi
done

# 1.2 Governança de eas.json
if grep -q "appStoreConnectApiKey" eas.json; then
    echo "❌ [ERROR] [GOVERNANÇA] Configuração 'appStoreConnectApiKey' detectada no eas.json!"
    echo "💡 [DICA] Use variáveis de ambiente EXPO_ASC_* para maior segurança."
    exit 1
fi

# 2. NORMALIZAÇÃO E EXPORTAÇÃO DA ASC API KEY
echo "[INFO] Normalizando credenciais da App Store Connect API..."

if [[ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]]; then
    echo "🔑 Decodificando chave via Base64..."
    # Decodifica e remove espaços/quebras extras
    decoded_key=$(echo "$EXPO_ASC_PRIVATE_KEY_BASE64" | base64 --decode)
    export EXPO_ASC_PRIVATE_KEY="$decoded_key"
elif [[ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]]; then
    echo "🔑 Normalizando chave de texto (multiline safe)..."
    # Garante que \n literais sejam quebras reais
    normalized_key=$(echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g')
    export EXPO_ASC_PRIVATE_KEY="$normalized_key"
else
    echo "❌ [ERRO] Nenhuma chave encontrada em EXPO_ASC_PRIVATE_KEY ou EXPO_ASC_PRIVATE_KEY_BASE64"
    exit 1
fi

# Exporta para o GITHUB_ENV para que sub-processos e o EAS CLI vejam a chave corretamente
{
    echo "EXPO_ASC_PRIVATE_KEY<<EOF"
    echo "$EXPO_ASC_PRIVATE_KEY"
    echo "EOF"
    echo "EXPO_ASC_KEY_ID=${EXPO_ASC_KEY_ID}"
    echo "EXPO_ASC_ISSUER_ID=${EXPO_ASC_ISSUER_ID}"
} >> "$GITHUB_ENV"

# Cria arquivo físico também como redundância (alguns plugins podem exigir)
echo "$EXPO_ASC_PRIVATE_KEY" > AuthKey.p8
export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
echo "EXPO_ASC_PRIVATE_KEY_PATH=$(pwd)/AuthKey.p8" >> "$GITHUB_ENV"

echo "[SUCCESS] Credenciais ASC normalizadas e exportadas."

# 2.4 DEFINIÇÃO DO TIPO DE TIME (Para evitar prompt no CI)
# O EAS CLI pode buscar por EXPO_APPLE_TEAM_TYPE ou APPLE_TEAM_TYPE
export APPLE_TEAM_TYPE="COMPANY_OR_ORGANIZATION"
export EXPO_APPLE_TEAM_TYPE="COMPANY_OR_ORGANIZATION"
echo "APPLE_TEAM_TYPE=COMPANY_OR_ORGANIZATION" >> $GITHUB_ENV
echo "EXPO_APPLE_TEAM_TYPE=COMPANY_OR_ORGANIZATION" >> $GITHUB_ENV

# Garantir que o Team ID também esteja no ambiente global
if [[ -n "${EXPO_APPLE_TEAM_ID:-}" ]]; then
    echo "EXPO_APPLE_TEAM_ID=${EXPO_APPLE_TEAM_ID}" >> $GITHUB_ENV
fi

echo "[INFO] Variáveis de Time (Type e ID) exportadas para GITHUB_ENV."

# 2.5 INJEÇÃO DE ARQUIVOS CRÍTICOS (Firebase)
echo "[INFO] Injetando arquivos de configuração (Firebase)..."

if [[ -n "${GOOGLE_SERVICE_INFO_PLIST:-}" ]]; then
    echo "🍏 Injetando GoogleService-Info.plist..."
    if [[ "$GOOGLE_SERVICE_INFO_PLIST" == *"<"* ]]; then
        echo "$GOOGLE_SERVICE_INFO_PLIST" > GoogleService-Info.plist
    else
        echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist
    fi
fi

if [[ -n "${GOOGLE_SERVICES_JSON:-}" ]]; then
    echo "🤖 Injetando google-services.json..."
    if [[ "$GOOGLE_SERVICES_JSON" == *"{"* ]]; then
        echo "$GOOGLE_SERVICES_JSON" > google-services.json
    else
        echo "$GOOGLE_SERVICES_JSON" | base64 --decode > google-services.json
    fi
fi

# 3. VERIFICAÇÃO DE CREDENCIAIS
echo "[INFO] Verificando credenciais para o build..."

# Não limpamos mais as credenciais automaticamente para evitar erros no CI
# O EAS CLI usará as credenciais existentes ou criará novas usando a ASC API Key
echo "🛡️ O EAS tentará validar as credenciais usando a ASC API Key configurada."

# 4. EXECUÇÃO DO BUILD (ETAPA 4)
START_TIME=$(date +%s)
echo "🚀 [INFO] Iniciando build iOS LOCAL (GitHub Runner - No Expo Credits)..."

# Tenta o build com debug ativado e modo LOCAL para não usar créditos do EAS
set +e # Não parar imediatamente para capturar logs e erro
EXPO_DEBUG=1 EAS_VERBOSE=1 npx eas-cli build \
  --platform ios \
  --profile production_v13 \
  --local \
  --non-interactive \
  --clear-cache \
  2>&1 | tee build_output.log 2>&1
BUILD_EXIT_CODE=$?
set -e

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 5. VALIDAÇÃO DE SUCESSO E FALLBACK (ETAPA 5 e 6)
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    STATUS="SUCESSO"
    # Local build gera o artefato no diretório atual ou subdiretório
    BUILD_PATH=$(ls *.ipa 2>/dev/null | head -1 || echo "")
    
    if [ -n "$BUILD_PATH" ]; then
        echo "✅ [SUCCESS] Build LOCAL finalizado com sucesso em ${DURATION}s."
        echo "📦 Artefato: $BUILD_PATH"
        # Exportar para o GitHub Actions usar no próximo step
        echo "IPA_PATH=$BUILD_PATH" >> $GITHUB_ENV
    else
        STATUS="FALHA"
        echo "❌ [FAIL] Build finalizado mas arquivo .ipa não foi encontrado."
        BUILD_EXIT_CODE=1
    fi
else
    # Verifica se o erro foi de autenticação ou falta de dados para tentar fallback
    if grep -qE "authentication|401|403|credentials|Team Type" build_output.log; then
        echo "⚠️ [WARNING] Falha de autenticação ou configuração detectada."
        echo "📝 Verifique se EXPO_APPLE_TEAM_TYPE e ASC API Key estão corretos."
    fi
    
    STATUS="FALHA"
    CAUSE=$(tail -n 10 build_output.log)
    echo "❌ [FAIL] Build falhou após ${DURATION}s."
    echo "📝 Causa Raiz Provável:"
    echo "$CAUSE"
fi

# 6. LOGS ESTRUTURADOS (ETAPA 7)
echo "------------------------------------------------------------"
echo "📊 RESUMO FINAL:"
echo "STATUS: $STATUS"
echo "TEMPO: ${DURATION}s"
if [ "$STATUS" == "SUCESSO" ]; then
    echo "ARTEFATO: $BUILD_PATH"
else
    echo "LOG: build_output.log"
fi
echo "------------------------------------------------------------"

[ "$STATUS" == "SUCESSO" ] || exit 1
