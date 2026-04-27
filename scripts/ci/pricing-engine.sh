#!/usr/bin/env bash
set -euo pipefail

# 💰 scripts/ci/pricing-engine.sh - Otimização de Preço Dinâmico (Margem + Conversão)
# Ajusta taxa de entrega e preços dinamicamente.

GROWTH_HISTORY="growth-history.json"
BUSINESS_HISTORY="business-history.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

echo "------------------------------------------------------------"
echo "💰 [PRICING-ENGINE] Otimizando Precificação Dinâmica"
echo "------------------------------------------------------------"

# 1. Simulação de Elasticidade de Preço (Mock)
# Em um cenário real, isso viria de um modelo de ML que prevê a queda de conversão
# em relação ao aumento do preço.

# Baseline (Taxa de Entrega Atual)
CURRENT_DELIVERY_FEE=12.00 # R$ 12,00
MAX_FEE=25.00              # R$ 25,00

# 2. Analisar Demanda Atual (Lida do Business Monitor)
if [ -f "business-history.json" ]; then
    LATEST_REVENUE=$(grep '"revenue":' "$BUSINESS_HISTORY" | tail -n 1 | cut -d':' -f2 | cut -d',' -f1 || echo 1000.0)
    LATEST_CONV=$(grep '"conversion":' "$BUSINESS_HISTORY" | tail -n 1 | cut -d':' -f2 | cut -d',' -f1 || echo 5.0)
else
    LATEST_REVENUE=1000.0
    LATEST_CONV=5.0
fi

# 3. Lógica de Ajuste Dinâmico (Simulação)
# Se a conversão estiver alta (> 5%) e a demanda alta, podemos testar um aumento de margem.
# Se a conversão estiver baixa (< 4%), reduzimos a taxa para estimular pedidos.

if (( $(echo "$LATEST_CONV > 5.0" | bc -l) )); then
    # Aumentar levemente a margem
    NEW_FEE=$(echo "$CURRENT_DELIVERY_FEE * 1.1" | bc)
    PRICING_ACTION="INCREASE_MARGIN"
    REASON="Conversão alta ($LATEST_CONV%). Oportunidade de aumentar ticket médio."
elif (( $(echo "$LATEST_CONV < 4.0" | bc -l) )); then
    # Reduzir para ganhar volume
    NEW_FEE=$(echo "$CURRENT_DELIVERY_FEE * 0.9" | bc)
    PRICING_ACTION="STIMULATE_VOLUME"
    REASON="Conversão baixa ($LATEST_CONV%). Reduzindo barreiras para aumentar pedidos."
else
    NEW_FEE=$CURRENT_DELIVERY_FEE
    PRICING_ACTION="KEEP_STABLE"
    REASON="Conversão estável. Nenhuma alteração necessária."
fi

# Garantir limites
if (( $(echo "$NEW_FEE > $MAX_FEE" | bc -l) )); then NEW_FEE=$MAX_FEE; fi

echo "[INFO] Decisão de Precificação:"
echo " - Preço Anterior: R$ $CURRENT_DELIVERY_FEE"
echo " - Novo Preço Sugerido: R$ $NEW_FEE"
echo " - Ação: $PRICING_ACTION"
echo " - Motivo: $REASON"

# 4. Exportar para Remote Config (Feature Flag)
echo "PRICING_DELIVERY_FEE=$NEW_FEE" >> $GITHUB_ENV
echo "PRICING_ACTION=$PRICING_ACTION" >> $GITHUB_ENV

echo "✅ [PRICING-ENGINE] Estratégia de preço definida."
echo "------------------------------------------------------------"
