#!/bin/bash

# 🛡️ RellBuild WIF Configurator
# Este script gera os comandos necessários para configurar o Workload Identity Federation (WIF)
# no Google Cloud para permitir o GitHub Actions se autenticar de forma keyless.

PROJECT_ID=$1
REPO_NAME=$2 # Formato: "usuario/repositorio"

if [ -z "$PROJECT_ID" ] || [ -z "$REPO_NAME" ]; then
    echo "Uso: ./setup-wif.sh <project_id> <repo_name>"
    exit 1
fi

POOL_ID="rellbuild-github-pool"
PROVIDER_ID="rellbuild-github-provider"
SA_NAME="play-deploy-bot"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🚀 [RellBuild] Gerando comandos de configuração para $REPO_NAME..."

echo "---------------------------------------------------------"
echo "1. Criar Workload Identity Pool:"
echo "gcloud iam workload-identity-pools create \"$POOL_ID\" \\"
echo "  --project=\"$PROJECT_ID\" \\"
echo "  --location=\"global\" \\"
echo "  --display-name=\"RellBuild GitHub Pool\""

echo "---------------------------------------------------------"
echo "2. Criar Workload Identity Provider para GitHub:"
echo "gcloud iam workload-identity-pools providers create-oidc \"$PROVIDER_ID\" \\"
echo "  --project=\"$PROJECT_ID\" \\"
echo "  --location=\"global\" \\"
echo "  --workload-identity-pool=\"$POOL_ID\" \\"
echo "  --display-name=\"RellBuild GitHub Provider\" \\"
echo "  --attribute-mapping=\"google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor\" \\"
echo "  --issuer-uri=\"https://token.actions.githubusercontent.com\""

echo "---------------------------------------------------------"
echo "3. Permitir que o repositório use a Service Account via WIF:"
echo "gcloud iam service-accounts add-iam-policy-binding \"$SA_EMAIL\" \\"
echo "  --project=\"$PROJECT_ID\" \\"
echo "  --role=\"roles/iam.workloadIdentityUser\" \\"
echo "  --member=\"principalSet://iam.googleapis.com/projects/\$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$REPO_NAME\""

echo "---------------------------------------------------------"
echo "🔍 IDs para o GitHub Actions (Configurar no workflow):"
echo "workload_identity_provider: projects/\$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
echo "service_account: $SA_EMAIL"
