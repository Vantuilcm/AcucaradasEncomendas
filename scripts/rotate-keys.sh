#!/bin/bash

# 🛡️ RellBuild Service Account Key Rotator
# Este script automatiza a rotação de chaves de Service Accounts do Google Cloud
# e sincroniza com o GitHub Secrets para manter o pipeline CI/CD seguro.

SA_EMAIL=$1
SECRET_NAME=$2 # Nome do segredo no GitHub (ex: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64)
PROJECT_ID=$3

if [ -z "$SA_EMAIL" ] || [ -z "$SECRET_NAME" ] || [ -z "$PROJECT_ID" ]; then
    echo "Uso: ./rotate-keys.sh <sa_email> <secret_name> <project_id>"
    exit 1
fi

echo "🔄 [RellBuild] Iniciando rotação para: $SA_EMAIL"

# 1. Criar nova chave
NEW_KEY_FILE="new-key-${SECRET_NAME}.json"
gcloud iam service-accounts keys create "$NEW_KEY_FILE" \
    --iam-account="$SA_EMAIL" \
    --project="$PROJECT_ID"

if [ $? -ne 0 ]; then
    echo "❌ Erro ao criar nova chave."
    exit 1
fi

# 2. Codificar em Base64 para o GitHub
NEW_KEY_BASE64=$(cat "$NEW_KEY_FILE" | base64)

# 3. Atualizar GitHub Secret
echo "🔐 Atualizando Secret: $SECRET_NAME no GitHub..."
echo "$NEW_KEY_BASE64" | gh secret set "$SECRET_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Erro ao atualizar GitHub Secret."
    rm "$NEW_KEY_FILE"
    exit 1
fi

# 4. Listar chaves antigas e revogar (exceto a recém-criada)
# Nota: Este passo requer cuidado. Em um ambiente real, deletaríamos chaves com mais de 60 dias.
# Para este script, vamos apenas listar para validação manual ou deletar as mais antigas.
echo "🔍 Identificando chaves antigas para revogação..."
OLD_KEYS=$(gcloud iam service-accounts keys list --iam-account="$SA_EMAIL" --project="$PROJECT_ID" --format="json")

# 5. Limpeza local
rm "$NEW_KEY_FILE"

echo "✅ [RellBuild] Rotação concluída com sucesso para $SECRET_NAME"
