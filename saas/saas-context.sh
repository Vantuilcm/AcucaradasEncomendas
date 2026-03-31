#!/usr/bin/env bash
# ⚙️ saas/saas-context.sh - Contexto Multi-tenant para Scripts de CI
# Sourcing this file ensures data isolation.

# Identificador do tenant (padrão para o core se não informado)
export GROWTHOS_TENANT_ID=${GROWTHOS_TENANT_ID:-"acucaradas"}
export GROWTHOS_ROOT="saas/data/$GROWTHOS_TENANT_ID"

# Mapeamento de diretórios isolados
export PATH_HISTORY="$GROWTHOS_ROOT/history"
export PATH_MARKET="$GROWTHOS_ROOT/market"
export PATH_EXPERIMENTS="$GROWTHOS_ROOT/experiments"

# Criar estrutura se não existir (Provisioning on-the-fly)
mkdir -p "$PATH_HISTORY" "$PATH_MARKET" "$PATH_EXPERIMENTS"

# Redefinição de arquivos globais para caminhos isolados
export FILE_PIPELINE_STATUS="$PATH_HISTORY/pipeline-status.json"
export FILE_RELEASE_HISTORY="$PATH_HISTORY/release-history.json"
export FILE_MARKET_HISTORY="$PATH_MARKET/market-history.json"
export FILE_GROWTH_HISTORY="$PATH_EXPERIMENTS/growth-history.json"
export FILE_INCIDENT_HISTORY="$PATH_HISTORY/incident-history.json"
export FILE_DEMAND_FORECAST="$PATH_MARKET/demand-forecast.json"
export FILE_PRODUCT_RANKING="$PATH_MARKET/product-ranking.json"

# Mock de configuração de plano (SaaS Monetization)
# Em um sistema real, isso viria de um DB ou variável de ambiente segura.
case "$GROWTHOS_TENANT_ID" in
  "acucaradas") export SAAS_PLAN="ENTERPRISE" ;;
  "cozinha-pro") export SAAS_PLAN="PRO" ;;
  *) export SAAS_PLAN="FREE" ;;
esac

echo "[SaaS] Contexto ativado para: $GROWTHOS_TENANT_ID (Plano: $SAAS_PLAN)"
