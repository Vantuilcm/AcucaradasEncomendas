#!/usr/bin/env bash
set -euo pipefail

# 🗺️ scripts/ci/demand-intelligence.sh - Inteligência de Demanda e Oportunidade
# Analisa pedidos por região e identifica áreas de expansão.

MARKET_HISTORY="market-history.json"
BUSINESS_HISTORY="business-history.json"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

echo "------------------------------------------------------------"
echo "🗺️ [DEMAND-INTELLIGENCE] Analisando Oportunidades de Mercado"
echo "------------------------------------------------------------"

# 1. Simulação de Dados Geográficos (Pedidos por Bairro/Região)
# Em um cenário real, isso viria de uma query no banco de dados de pedidos.
REGIONS=(
    "Centro|150|10"       # Região|Pedidos|Produtores_Ativos
    "Zona_Norte|200|5"    # Alta Demanda / Baixa Oferta (OPORTUNIDADE)
    "Zona_Sul|80|15"      # Baixa Demanda / Alta Oferta (SATURADO)
    "Zona_Leste|50|2"     # Crescente
)

echo "[INFO] Analisando densidade de pedidos vs oferta de produtores..."

# 2. Identificar Região com maior Gap (Demanda/Oferta)
MAX_GAP=0
BEST_REGION=""

for ENTRY in "${REGIONS[@]}"; do
    NAME=$(echo $ENTRY | cut -d'|' -f1)
    ORDERS=$(echo $ENTRY | cut -d'|' -f2)
    PROVIDERS=$(echo $ENTRY | cut -d'|' -f3)
    
    # Gap = Pedidos / Produtores (Quanto maior, mais demanda reprimida)
    GAP=$(echo "scale=2; $ORDERS / $PROVIDERS" | bc)
    
    echo " - $NAME: $ORDERS pedidos / $PROVIDERS produtores (Densidade: $GAP)"
    
    if (( $(echo "$GAP > $MAX_GAP" | bc -l) )); then
        MAX_GAP=$GAP
        BEST_REGION=$NAME
    fi
done

echo "[INFO] Região de Expansão Prioritária: $BEST_REGION (Gap: $MAX_GAP)"

# 3. Ranking Automático de Produtos (Etapa 3 - Recomendação Inteligente)
# Simula a identificação de produtos tendência por região.
echo "[INFO] Gerando ranking automático de produtos..."
PRODUCTS=(
    "Bolo_de_Rolo|High|Growth"
    "Coxinha_Gourmet|Medium|Stable"
    "Brownie_Fit|Low|New"
    "Pao_de_Mel|High|Peak"
)

RANKING_FILE="product-ranking.json"
echo "[" > "$RANKING_FILE"
FIRST=true
for P in "${PRODUCTS[@]}"; do
    PNAME=$(echo $P | cut -d'|' -f1)
    PDEMAND=$(echo $P | cut -d'|' -f2)
    PTREND=$(echo $P | cut -d'|' -f3)
    
    if [ "$FIRST" = false ]; then echo "," >> "$RANKING_FILE"; fi
    echo "  { \"name\": \"$PNAME\", \"demand\": \"$PDEMAND\", \"trend\": \"$PTREND\" }" >> "$RANKING_FILE"
    FIRST=false
done
echo "]" >> "$RANKING_FILE"

echo "[INFO] Top Produto Tendência: $(echo ${PRODUCTS[0]} | cut -d'|' -f1)"

# 4. Sugerir Expansão Automática
if (( $(echo "$MAX_GAP > 20" | bc -l) )); then
    SUGGESTION="EXPAND_NOW"
    REASON="Demanda em $BEST_REGION está 20x maior que a oferta atual. Foco em $(echo ${PRODUCTS[0]} | cut -d'|' -f1)."
else
    SUGGESTION="MONITOR"
    REASON="Equilíbrio de mercado estável."
fi

# 5. Exportar para Decisão Estratégica
echo "MARKET_TARGET_REGION=$BEST_REGION" >> $GITHUB_ENV
echo "MARKET_SUGGESTION=$SUGGESTION" >> $GITHUB_ENV
echo "MARKET_GAP=$MAX_GAP" >> $GITHUB_ENV
echo "MARKET_TOP_PRODUCT=$(echo ${PRODUCTS[0]} | cut -d'|' -f1)" >> $GITHUB_ENV

echo "✅ [DEMAND-INTELLIGENCE] Análise concluída."
echo "------------------------------------------------------------"
