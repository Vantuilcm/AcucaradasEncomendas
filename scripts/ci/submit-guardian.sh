#!/bin/bash

# ==============================================================================
# SUBMIT GUARDIAN — IOS SUBMISSION PIPELINE
# ==============================================================================
# MISSÃO: Pré-validar, monitorar e classificar erros de submissão na Apple.
# REGRAS: Sem rebuild, sem alteração de config, sem intervenção manual.
# ==============================================================================

BUILD_ID=$1
LOG_FILE="build-logs/submission-history.json"

if [ -z "$BUILD_ID" ]; then
    echo "❌ Erro: Build ID não fornecido."
    exit 1
fi

echo "🔍 Iniciando Pré-Validação para Build: $BUILD_ID"

# 1. PRÉ-VALIDAÇÃO
# ------------------------------------------------------------------------------
echo "✅ Validando credenciais (EAS_TOKEN)..."
if [ -z "$EXPO_TOKEN" ]; then
    echo "⚠️ EXPO_TOKEN não detectado no ambiente local. Tentando via EAS CLI..."
fi

# 2. LOG DE INÍCIO
# ------------------------------------------------------------------------------
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")
echo "{\"buildId\": \"$BUILD_ID\", \"timestamp\": \"$TIMESTAMP\", \"status\": \"pending\"}" >> $LOG_FILE

# 3. EXECUÇÃO DA SUBMISSÃO
# ------------------------------------------------------------------------------
echo "🚀 Iniciando submissão non-interactive..."
eas submit --platform ios --id "$BUILD_ID" --non-interactive > submission_raw_log.txt 2>&1
SUBMIT_EXIT_CODE=$?

# 4. MONITORAMENTO E DECISÃO
# ------------------------------------------------------------------------------
RAW_LOG=$(cat submission_raw_log.txt)

if [ $SUBMIT_EXIT_CODE -eq 0 ]; then
    echo "🎉 Submissão agendada com sucesso!"
    # Atualizar log com sucesso
    sed -i "s/\"status\": \"pending\"/\"status\": \"success\"/g" $LOG_FILE
else
    echo "✖️ Falha na submissão detectada."
    
    # Classificação de Erros
    if echo "$RAW_LOG" | grep -q "duplicate"; then
        ERROR_TYPE="DUPLICATE_VERSION"
        echo "🚩 Erro Apple: Versão ou Build Number já existe."
    elif echo "$RAW_LOG" | grep -q "credential"; then
        ERROR_TYPE="CREDENTIAL_ISSUE"
        echo "🚩 Erro Apple: Problema de autenticação/ASC Key."
    elif echo "$RAW_LOG" | grep -q "metadata"; then
        ERROR_TYPE="METADATA_ISSUE"
        echo "🚩 Erro Apple: Campos obrigatórios ausentes no portal."
    else
        ERROR_TYPE="UNKNOWN_ERROR"
        echo "🚩 Erro Apple: Causa não identificada automaticamente."
    fi

    # 5. FALLBACK RECOMENDADO
    # ------------------------------------------------------------------------------
    echo "------------------------------------------------------------------------------"
    echo "⚠️ DECISÃO: Fallback Manual Necessário"
    echo "TIPO DE ERRO: $ERROR_TYPE"
    echo "RECOMENDAÇÃO: Use o Transporter (macOS) para upload manual."
    echo "LINK DA IPA: https://expo.dev/artifacts/eas/$BUILD_ID.ipa"
    echo "------------------------------------------------------------------------------"

    # Atualizar log com falha
    sed -i "s/\"status\": \"pending\"/\"status\": \"failed\", \"errorType\": \"$ERROR_TYPE\"/g" $LOG_FILE
fi

exit $SUBMIT_EXIT_CODE
