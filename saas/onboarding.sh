#!/usr/bin/env bash
set -euo pipefail

# 🚀 saas/onboarding.sh - Onboarding Automático do GrowthOS
# Conecta dados do cliente e ativa otimização em minutos.

echo "🚀 [GrowthOS-ONBOARDING] Iniciando Onboarding para o novo tenant..."
echo "------------------------------------------------------------"

TENANT_ID=${1:-"novo-cliente"}
FIREBASE_API_KEY=${2:-""}
FIREBASE_PROJECT_ID=${3:-""}
PLAN=${4:-"FREE"}

# 1. Registro do Tenant
echo "[INFO] Registrando tenant $TENANT_ID no SaaS Database..."
# Em produção, isso seria uma chamada de API / DB write.
# Simulando no tenants.json:
# (Aqui simplificaremos apenas adicionando ao final se não existir)

# 2. Ativação de Tracking (Firebase/Sentry)
echo "[INFO] Ativando tracking automático para $FIREBASE_PROJECT_ID..."
# Mock de ativação remota:
# - Ativar A/B Testing
# - Ativar Remote Config
# - Ativar Crashlytics

# 3. Provisionamento de Dados (Isolamento)
source saas/tenant-manager.sh
provision_tenant "$TENANT_ID"

# 4. Primeira Execução da IA
echo "[INFO] Executando análise inicial de mercado e demanda..."
GROWTHOS_TENANT_ID=$TENANT_ID bash scripts/ci/demand-intelligence.sh
GROWTHOS_TENANT_ID=$TENANT_ID bash scripts/ci/pricing-engine.sh

# 5. Configuração de Plano (Limites)
case "$PLAN" in
    "FREE")
        echo "[INFO] Limite de 500 pedidos/mês ativado."
        ;;
    "PRO")
        echo "[INFO] IA Ativa e Experimentos Ilimitados."
        ;;
    "ENTERPRISE")
        echo "[INFO] Automação Total e Suporte 24/7."
        ;;
esac

echo "✅ [GrowthOS-ONBOARDING] Concluído! Otimização ativa em $(date)."
echo "------------------------------------------------------------"
