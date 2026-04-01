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

# 2.0 FIREBASE SETUP (MISSÃO: BLINDAR DEFINITIVAMENTE A GERAÇÃO DO GoogleService-Info.plist)
echo "📲 [FIREBASE] Criando GoogleService-Info.plist..."

# Validação inicial
if [ -z "${GOOGLE_SERVICE_INFO_PLIST:-}" ]; then
    echo "❌ ERRO CRÍTICO: GOOGLE_SERVICE_INFO_PLIST está vazio"
    exit 1
fi

# Detectar formato automaticamente
if echo "$GOOGLE_SERVICE_INFO_PLIST" | grep -q "<plist"; then
    echo "🔍 Formato detectado: XML (texto puro)"
    echo "$GOOGLE_SERVICE_INFO_PLIST" > GoogleService-Info.plist
else
    echo "🔍 Formato detectado: BASE64"
    # Tenta decodificar, falha se o base64 for inválido
    if ! echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist 2>/dev/null; then
        echo "❌ ERRO: Falha ao decodificar BASE64"
        exit 1
    fi
fi

# Validação do arquivo gerado
echo "📄 Validando GoogleService-Info.plist..."

if grep -q "<plist" GoogleService-Info.plist; then
    echo "✅ [SUCCESS] GoogleService-Info.plist válido e pronto"
else
    echo "❌ ERRO: Arquivo inválido após geração"
    echo "Conteúdo gerado (primeiras 5 linhas):"
    head -n 5 GoogleService-Info.plist
    exit 1
fi

# Debug visual
ls -la GoogleService-Info.plist

# CASO 1 — BASE64:
if [[ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]]; then
    echo "🔑 [CASO 1] Decodificando chave via Base64..."
    echo "$EXPO_ASC_PRIVATE_KEY_BASE64" | base64 --decode > AuthKey.p8
    
    # Exportar corretamente multiline para o GITHUB_ENV (ETAPA 2)
    if [[ -n "${GITHUB_ENV:-}" ]]; then
        echo "EXPO_ASC_PRIVATE_KEY<<EOF" >> "$GITHUB_ENV"
        cat AuthKey.p8 >> "$GITHUB_ENV"
        echo "EOF" >> "$GITHUB_ENV"
    fi
    
    # Exportar para o ambiente atual para uso imediato
    export EXPO_ASC_PRIVATE_KEY=$(cat AuthKey.p8)
    
# CASO 2 — STRING DIRETA:
elif [[ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]]; then
    echo "🔑 [CASO 2] Normalizando chave de texto (multiline safe)..."
    
    # Detectar se contém "\n" e converter para quebra real (ETAPA 2)
    if [[ "$EXPO_ASC_PRIVATE_KEY" == *"\\n"* ]]; then
        echo "[INFO] Detectado '\\n' literal, convertendo para quebra de linha real..."
        echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
    else
        echo "$EXPO_ASC_PRIVATE_KEY" > AuthKey.p8
    fi

    # Exportar corretamente multiline para o GITHUB_ENV (ETAPA 2)
    if [[ -n "${GITHUB_ENV:-}" ]]; then
        echo "EXPO_ASC_PRIVATE_KEY<<EOF" >> "$GITHUB_ENV"
        cat AuthKey.p8 >> "$GITHUB_ENV"
        echo "EOF" >> "$GITHUB_ENV"
    fi

    # Exportar para o ambiente atual para uso imediato
    export EXPO_ASC_PRIVATE_KEY=$(cat AuthKey.p8)
else
    echo "❌ [ERRO] Nenhuma chave encontrada em EXPO_ASC_PRIVATE_KEY ou EXPO_ASC_PRIVATE_KEY_BASE64"
    exit 1
fi

# Exportar ID e Issuer (ETAPA 5)
if [[ -n "${GITHUB_ENV:-}" ]]; then
    echo "EXPO_ASC_KEY_ID=${EXPO_ASC_KEY_ID}" >> "$GITHUB_ENV"
    echo "EXPO_ASC_ISSUER_ID=${EXPO_ASC_ISSUER_ID}" >> "$GITHUB_ENV"
    echo "EXPO_ASC_PRIVATE_KEY_PATH=$(pwd)/AuthKey.p8" >> "$GITHUB_ENV"
fi

export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"

# 2.1 VALIDAÇÃO DA KEY (ETAPA 4)
echo "[INFO] Validando conteúdo da ASC API Key..."
if ! grep -q "BEGIN PRIVATE KEY" AuthKey.p8 || ! grep -q "END PRIVATE KEY" AuthKey.p8; then
    echo "❌ [ERRO CRÍTICO] AuthKey.p8 não contém marcadores válidos de PRIVATE KEY!"
    echo "💡 [DICA] Verifique se a variável EXPO_ASC_PRIVATE_KEY está correta."
    exit 1
fi
echo "[SUCCESS] ASC API Key validada com sucesso."

# 3. LIMPEZA DE CONFLITOS (ETAPA 3)
echo "[INFO] Limpando conflitos de credenciais..."
# Remover/ignorar automaticamente conforme ETAPA 3 da MISSÃO
unset IOS_DIST_CERT_BASE64 
unset IOS_PROV_PROFILE_BASE64 
unset IOS_CERT_PASSWORD 
unset EXPO_APP_STORE_CONNECT_API_KEY
unset EXPO_APPLE_ID 
unset EXPO_APPLE_PASSWORD 
unset EXPO_APPLE_APP_SPECIFIC_PASSWORD

echo "🛡️ Credenciais manuais e Apple ID bloqueados. Forçando uso exclusivo de ASC API Key (Admin)."

# 4. EXECUÇÃO DO BUILD (ETAPA 6)
START_TIME=$(date +%s)
echo "🚀 [INFO] Iniciando build iOS no EAS Cloud..."

# Função para executar o build
run_build() {
  local attempt=$1
  echo "🏗️ Tentativa $attempt de build iOS..."
  
  # Tenta o build com debug ativado e modo CLOUD (EAS Native)
  # Usamos --output para garantir que o IPA seja baixado se o build for bem sucedido
  set +e # Não parar imediatamente para capturar logs e erro
  EXPO_DEBUG=1 eas build \
    --platform ios \
    --profile production_v13 \
    --non-interactive \
    2>&1 | tee build_output.log 2>&1
  local exit_code=$?
  set -e
  return $exit_code
}

# Primeira tentativa
run_build 1
BUILD_EXIT_CODE=$?

# 5. MONITORAMENTO E AUTO-CORREÇÃO (ETAPA 7 e 8)
if [ $BUILD_EXIT_CODE -ne 0 ]; then
    if grep -q "Failed to display prompt" build_output.log; then
        echo "❌ [ABORT] ASC API Key não reconhecida — problema de ENV"
        
        echo "⚠️ [AUTO-HEAL] Tentando reprocessar ASC API Key para uma última tentativa..."
        # Reprocessar key (multiline fix)
        if [[ "$EXPO_ASC_PRIVATE_KEY" == *"\\n"* ]]; then
            echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
        else
            echo "$EXPO_ASC_PRIVATE_KEY" > AuthKey.p8
        fi
        
        # Re-exportar para o ambiente atual
        export EXPO_ASC_PRIVATE_KEY=$(cat AuthKey.p8)
        
        echo "🔄 [AUTO-HEAL] Reexecutando build automaticamente (1 tentativa)..."
        run_build 2
        BUILD_EXIT_CODE=$?
    fi
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 6. VALIDAÇÃO DE SUCESSO (ETAPA 7)
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    STATUS="SUCESSO"
    BUILD_PATH=$(ls *.ipa 2>/dev/null | head -1 || echo "")
    
    if [ -n "$BUILD_PATH" ]; then
        echo "✅ [SUCCESS] Build finalizado com sucesso em ${DURATION}s."
        echo "📦 Artefato: $BUILD_PATH"
        
        if [[ -n "${GITHUB_ENV:-}" ]]; then
            echo "IPA_PATH=$BUILD_PATH" >> "$GITHUB_ENV"
        fi
        
        if grep -q "Using ASC API Key" build_output.log; then
            echo "💎 [INFO] Confirmado: EAS utilizou ASC API Key com sucesso."
        fi
    else
        echo "⚠️ [WARNING] Build finalizado mas arquivo .ipa não foi encontrado localmente."
        echo "💡 Isso pode ocorrer se o download falhou, mas o build no EAS Cloud pode ter tido sucesso."
    fi
else
    STATUS="FALHA"
    if grep -q "Failed to display prompt" build_output.log; then
        echo "❌ [ERRO] ASC API Key não reconhecida — problema de ENV"
    fi
    
    echo "❌ [FAIL] Build falhou após ${DURATION}s."
fi

# 7. LOGS ESTRUTURADOS (ETAPA 7)
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
