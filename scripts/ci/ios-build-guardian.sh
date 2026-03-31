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

# 2. NORMALIZAÇÃO E CRIAÇÃO DO ARQUIVO DE CHAVE (.p8)
echo "[INFO] Preparando arquivo AuthKey.p8..."

if [[ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]]; then
    echo "🔑 Decodificando chave via Base64..."
    echo "$EXPO_ASC_PRIVATE_KEY_BASE64" | base64 --decode > AuthKey.p8
elif [[ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]]; then
    echo "🔑 Normalizando chave de texto (multiline safe)..."
    # Converte \n literais para quebras de linha reais se necessário
    echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
else
    echo "❌ [ERRO] Nenhuma chave encontrada em EXPO_ASC_PRIVATE_KEY ou EXPO_ASC_PRIVATE_KEY_BASE64"
    exit 1
fi

# Validação básica do arquivo gerado
if ! grep -q "BEGIN PRIVATE KEY" AuthKey.p8; then
    echo "❌ [ERRO] O arquivo AuthKey.p8 gerado é inválido (não contém BEGIN PRIVATE KEY)."
    rm -f AuthKey.p8
    exit 1
fi

export EXPO_ASC_API_KEY_PATH="./AuthKey.p8"
echo "[SUCCESS] Arquivo AuthKey.p8 pronto e EXPO_ASC_API_KEY_PATH configurado."

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

# 3. LIMPEZA PROFUNDA DE CREDENCIAIS (FORÇADO)
echo "[INFO] Iniciando limpeza profunda de credenciais para resolver erro de Serial Number..."

# Tenta remover certificados e perfis de provisionamento que possam estar corrompidos ou inexistentes no portal da Apple
# mas ainda referenciados no banco de dados do EAS.
# --non-interactive é crucial aqui.
set +e
echo "🧹 Removendo credenciais locais e remotas (Sync Force)..."
npx eas-cli credentials:clear --platform ios --non-interactive || true

# Forçar a limpeza do cache de build para garantir que nada antigo seja reutilizado
echo "🧹 Limpando cache do EAS Build..."
set -e

echo "[SUCCESS] Limpeza concluída. O EAS tentará recriar as credenciais usando a ASC API Key."

# 4. EXECUÇÃO DO BUILD (ETAPA 4)
START_TIME=$(date +%s)
echo "🚀 [INFO] Iniciando build iOS (Profile: production_v13)..."

# Tenta o build com debug ativado
set +e # Não parar imediatamente para capturar logs e erro
EXPO_DEBUG=1 EAS_VERBOSE=1 npx eas-cli build \
  --platform ios \
  --profile production_v13 \
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
    BUILD_URL=$(grep -o "https://expo.dev/artifacts/[^ ]*" build_output.log | head -1 || echo "Link não encontrado")
    echo "✅ [SUCCESS] Build finalizado com sucesso em ${DURATION}s."
    echo "🔗 Link: $BUILD_URL"
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
[ "$STATUS" == "SUCESSO" ] && echo "LINK: $BUILD_URL"
[ "$STATUS" == "FALHA" ] && echo "LOG: build_output.log"
echo "------------------------------------------------------------"

[ "$STATUS" == "SUCESSO" ] || exit 1
