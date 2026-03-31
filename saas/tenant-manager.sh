#!/usr/bin/env bash
set -euo pipefail

# 🏢 saas/tenant-manager.sh - Gerenciador de Multi-tenancy do GrowthOS
# Responsável por isolamento de dados e configuração de clientes.

TENANTS_FILE="saas/tenants.json"
DATA_ROOT="saas/data"

echo "🏢 [TENANT-MANAGER] Inicializando Gestão SaaS"
echo "------------------------------------------------------------"

# Função: Criar estrutura de dados para novo tenant
provision_tenant() {
    local TENANT_ID=$1
    echo "[INFO] Provisionando infraestrutura para o cliente: $TENANT_ID"
    
    mkdir -p "$DATA_ROOT/$TENANT_ID/history"
    mkdir -p "$DATA_ROOT/$TENANT_ID/experiments"
    mkdir -p "$DATA_ROOT/$TENANT_ID/market"
    
    # Inicializar arquivos de histórico se não existirem
    [ ! -f "$DATA_ROOT/$TENANT_ID/history/pipeline-status.json" ] && echo "{}" > "$DATA_ROOT/$TENANT_ID/history/pipeline-status.json"
    [ ! -f "$DATA_ROOT/$TENANT_ID/history/release-history.json" ] && echo "[]" > "$DATA_ROOT/$TENANT_ID/history/release-history.json"
    [ ! -f "$DATA_ROOT/$TENANT_ID/market/market-history.json" ] && echo "[]" > "$DATA_ROOT/$TENANT_ID/market/market-history.json"
    
    echo "[SUCCESS] Tenant $TENANT_ID provisionado com isolamento total."
}

# Função: Validar acesso e plano
get_tenant_config() {
    local TENANT_ID=$1
    # Mock de busca no JSON (em prod seria um DB)
    grep -A 10 "\"tenant_id\": \"$TENANT_ID\"" "$TENANTS_FILE"
}

# Exportar caminhos de dados baseados no tenant atual
export_tenant_env() {
    local TENANT_ID=${GROWTHOS_TENANT_ID:-"acucaradas"}
    
    echo "[INFO] Ativando contexto para: $TENANT_ID"
    
    export GROWTHOS_DATA_DIR="$DATA_ROOT/$TENANT_ID"
    export GROWTHOS_HISTORY_DIR="$GROWTHOS_DATA_DIR/history"
    export GROWTHOS_MARKET_DIR="$GROWTHOS_DATA_DIR/market"
    
    # Criar se não existir
    provision_tenant "$TENANT_ID"
    
    # Injetar no GITHUB_ENV se estiver em CI
    if [ "${GITHUB_ENV:-}" ]; then
        echo "GROWTHOS_DATA_DIR=$GROWTHOS_DATA_DIR" >> $GITHUB_ENV
        echo "GROWTHOS_HISTORY_DIR=$GROWTHOS_HISTORY_DIR" >> $GITHUB_ENV
        echo "GROWTHOS_MARKET_DIR=$GROWTHOS_MARKET_DIR" >> $GITHUB_ENV
    fi
}

# Execução principal se chamado diretamente
if [[ "${1:-}" == "--provision" ]]; then
    provision_tenant "${2:-}"
elif [[ "${1:-}" == "--activate" ]]; then
    export_tenant_env
fi
