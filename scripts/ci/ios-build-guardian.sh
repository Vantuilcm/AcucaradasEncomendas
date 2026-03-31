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
[ -z "${EXPO_ASC_PRIVATE_KEY:-}" ] && MISSING_VARS+=("EXPO_ASC_PRIVATE_KEY")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [ERRO] Variáveis ausentes: ${MISSING_VARS[*]}"
    exit 1
fi

# 2. NORMALIZAÇÃO DA PRIVATE KEY (BASE64)
# Remove espaços e quebras de linha se existirem
RAW_KEY=$(echo "$EXPO_ASC_PRIVATE_KEY" | tr -d '[:space:]')

# Se não estiver em Base64 válido (checa o prefixo 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t' que é '-----BEGIN PRIVATE KEY-----')
if [[ ! "$RAW_KEY" =~ ^LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t ]]; then
    echo "[INFO] Detectada chave em formato texto. Convertendo para BASE64..."
    # Se a chave for multiline (com \n literal ou real), normalizamos
    NORMALIZED_KEY=$(echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g')
    B64_KEY=$(echo "$NORMALIZED_KEY" | base64 | tr -d '[:space:]')
    
    if [[ ! "$B64_KEY" =~ ^LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t ]]; then
        echo "❌ [ERRO] ASC KEY INVALIDA - Falha na conversão ou formato incorreto."
        exit 1
    fi
    export EXPO_ASC_PRIVATE_KEY="$B64_KEY"
    echo "[SUCCESS] Chave normalizada com sucesso."
else
    echo "[INFO] ASC Key já está em formato BASE64 válido."
    export EXPO_ASC_PRIVATE_KEY="$RAW_KEY"
fi

# 3. LIMPEZA PROFUNDA DE CREDENCIAIS (FORÇADO)
echo "[INFO] Executando limpeza profunda de credenciais no EAS..."
# Usando --non-interactive com as variáveis de ambiente de ASC Key presentes
eas credentials:revoke -p ios --dist-cert --non-interactive || true
eas credentials:revoke -p ios --push-key --non-interactive || true
eas credentials:revoke -p ios --profile --non-interactive || true
eas credentials:sync -p ios --non-interactive || true

# 4. EXECUÇÃO DO BUILD (ETAPA 4)
START_TIME=$(date +%s)
echo "🚀 [INFO] Iniciando build iOS (Profile: production_v13)..."

# Tenta o build com debug ativado
set +e # Não parar imediatamente para capturar logs e erro
EXPO_DEBUG=1 EAS_VERBOSE=1 eas build \
  --platform ios \
  --profile production_v13 \
  --non-interactive > build_output.log 2>&1
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
    # Verifica se o erro foi de autenticação para tentar fallback
    if grep -qE "authentication|401|403|credentials" build_output.log; then
        echo "⚠️ [WARNING] Falha de autenticação detectada. Tentando Fallback..."
        # Fallback (Note: o usuário pediu modo interativo, mas no CI isso falhará se não houver um TTY. 
        # No entanto, seguiremos a instrução de tentar o comando sem --non-interactive como último recurso)
        eas build --platform ios --profile production_v13 || echo "❌ [FAIL] Fallback também falhou."
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
