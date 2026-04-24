#!/bin/bash

# ==============================================================================
# MONITOR APPLE STATUS — IOS SUBMISSION PIPELINE
# ==============================================================================
# MISSÃO: Monitorar o status de uma submissão agendada na Apple.
# REGRAS: Sem intervenção manual, log detalhado de falhas.
# ==============================================================================

SUBMISSION_ID=$1
LOG_FILE="build-logs/submission-history.json"

if [ -z "$SUBMISSION_ID" ]; then
    echo "❌ Erro: ID de Submissão não fornecido."
    exit 1
fi

echo "🔍 Monitorando status da submissão: $SUBMISSION_ID"

# 1. CONSULTA DE STATUS
# ------------------------------------------------------------------------------
# eas submit:view --id "$SUBMISSION_ID" --non-interactive
# Para este script, simularemos a captura do status via log

STATUS_RAW=$(eas submit:view --id "$SUBMISSION_ID" --non-interactive 2>&1)

if echo "$STATUS_RAW" | grep -q "finished"; then
    echo "✅ Submissão concluída com sucesso na Apple Store Connect!"
    # Log: SUCCESS
elif echo "$STATUS_RAW" | grep -q "failed"; then
    echo "❌ Falha detectada no processamento da Apple."
    
    # 2. IDENTIFICAÇÃO DO ERRO
    # ------------------------------------------------------------------------------
    if echo "$STATUS_RAW" | grep -q "Redundant Binary"; then
        ERROR_MSG="VERSÃO_DUPLICADA: O build number ou versão já existe."
    elif echo "$STATUS_RAW" | grep -q "Missing compliance"; then
        ERROR_MSG="METADATA_MISSING: Conformidade de exportação ausente."
    elif echo "$STATUS_RAW" | grep -q "Internal Server Error"; then
        ERROR_MSG="APPLE_SERVER_ERROR: Erro interno nos servidores da Apple."
    else
        ERROR_MSG="ERRO_DESCONHECIDO: Verifique os logs detalhados no Expo."
    fi

    echo "🚩 MOTIVO: $ERROR_MSG"
    echo "⚠️ RECOMENDAÇÃO: Use Transporter para upload manual se o erro persistir."
fi
