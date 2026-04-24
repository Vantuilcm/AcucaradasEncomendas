#!/usr/bin/env bash
set -euo pipefail

# 🧪 scripts/ci/experiment-engine.sh - Orquestração de Experimentos A/B (Growth AI)
# Cria, gerencia e monitora variações de produto automaticamente.

GROWTH_HISTORY="growth-history.json"
BUSINESS_STATUS="business-history.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

echo "------------------------------------------------------------"
echo "🧪 [EXPERIMENT-ENGINE] Orquestrando Testes A/B"
echo "------------------------------------------------------------"

# 1. Lista de Elementos Testáveis (Configuração de Growth)
# Em um cenário real, isso poderia vir de um arquivo de configuração de growth
EXPERIMENTS=(
    "FREE_SHIPPING_THRESHOLD" # Variação de valor para frete grátis
    "CHECKOUT_CTA_COLOR"      # Cor do botão de finalização
    "PRODUCT_SORTING_ALGO"    # Algoritmo de recomendação
    "DELIVERY_ESTIMATE_UI"    # Exibição de prazo de entrega
)

# 2. Verificar se o sistema está estável para novos testes
# Se o negócio estiver em WARNING ou CRITICAL, suspendemos novos experimentos
if [ -f "business-history.json" ]; then
    LATEST_STATE=$(grep '"state":' "$BUSINESS_STATUS" | tail -n 1 | cut -d'"' -f4 || echo "HEALTHY")
    if [ "$LATEST_STATE" != "HEALTHY" ]; then
        echo "[WARNING] Sistema instável ($LATEST_STATE). Suspendendo novos experimentos para proteger receita."
        exit 0
    fi
fi

# 3. Selecionar Experimento Ativo (Simulação)
ACTIVE_EXP=${EXP_NAME:-"FREE_SHIPPING_THRESHOLD"}
VARIANT_A="R$ 150,00"
VARIANT_B="R$ 120,00"

echo "[INFO] Experimento Ativo: $ACTIVE_EXP"
echo " - Variante A (Control): $VARIANT_A"
echo " - Variante B (Test): $VARIANT_B"

# 4. Simulação de Distribuição de Tráfego (50/50 Split)
# No Firebase Remote Config, isso seria configurado via API
echo "[INFO] Distribuição de tráfego configurada: 50% para cada variante."

# 5. Exportar variáveis para o motor de decisão
echo "ACTIVE_EXPERIMENT=$ACTIVE_EXP" >> $GITHUB_ENV
echo "VARIANT_A_VAL=$VARIANT_A" >> $GITHUB_ENV
echo "VARIANT_B_VAL=$VARIANT_B" >> $GITHUB_ENV

echo "✅ [EXPERIMENT-ENGINE] Configuração de teste aplicada."
echo "------------------------------------------------------------"
