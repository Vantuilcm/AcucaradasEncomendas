#!/usr/bin/env bash
set -euo pipefail

# 🧠 scripts/ci/release-decision.sh - Motor de Decisão Inteligente (IA-Driven)
# Analisa histórico e status atual para decidir automaticamente o fluxo de release.

HISTORY_FILE="release-history.json"
STATUS_FILE="pipeline_status.json"
DECISION_FILE="release-decision.json"

echo "------------------------------------------------------------"
echo "🧠 [IA-DRIVEN] Iniciando Motor de Decisão de Release"
echo "------------------------------------------------------------"

# 1. Carregar dados do build atual
if [ ! -f "$STATUS_FILE" ]; then
    echo "[ERROR] pipeline_status.json não encontrado. Abortando decisão."
    exit 1
fi

CURRENT_HEALTH=$(grep '"health":' "$STATUS_FILE" | cut -d'"' -f4)
AUTO_HEAL_USED=$(grep '"auto_heal_triggered":' "$STATUS_FILE" | cut -d' ' -f4 | tr -d ',')

# 2. Analisar histórico (últimos 3 builds)
# Como não temos jq, vamos usar uma abordagem de grep/tail no release-history.json
STABLE_COUNT=0
INCIDENT_RECENT=0
HISTORY_FILE="release-history.json"
INCIDENT_FILE="incident-history.json"

if [ -f "$HISTORY_FILE" ]; then
    # Conta quantos dos últimos 3 registros foram STABLE
    STABLE_COUNT=$(grep '"stability":' "$HISTORY_FILE" | tail -n 3 | grep -c "STABLE" || echo 0)
    DEGRADED_COUNT=$(grep '"stability":' "$HISTORY_FILE" | tail -n 2 | grep -c "DEGRADED" || echo 0)
    FAILED_RECENT=$(grep '"stability":' "$HISTORY_FILE" | tail -n 1 | grep -c "FAILED" || echo 0)
else
    echo "[INFO] Histórico não encontrado. Assumindo primeiro build."
    STABLE_COUNT=0
    DEGRADED_COUNT=0
    FAILED_RECENT=0
fi

# 2.1 Verificar Incidentes de Produção (Feedback Loop)
if [ -f "$INCIDENT_FILE" ]; then
    # Conta incidentes de rollback ou queda de negócio nos últimos 30 dias (simplificado para últimos 2 registros)
    INCIDENT_RECENT=$(grep -E '"action": "ROLLBACK"|"action": "FEATURE_OFF"' "$INCIDENT_FILE" | tail -n 2 | wc -l || echo 0)
    BUSINESS_INCIDENT=$(grep '"action": "FEATURE_OFF"' "$INCIDENT_FILE" | tail -n 1 | wc -l || echo 0)
    
    if [ $INCIDENT_RECENT -gt 0 ]; then
        echo "[WARNING] [FEEDBACK LOOP] Incidentes reais detectados recentemente ($INCIDENT_RECENT). Aumentando rigor."
    fi
    if [ $BUSINESS_INCIDENT -gt 0 ]; then
        echo "[CRITICAL] [BUSINESS FEEDBACK] Impacto de negócio recente detectado. Bloqueio de AUTO-RELEASE ativo."
    fi
fi

# 2.2 Verificar Inteligência de Mercado (Feedback Loop)
MARKET_FILE="market-history.json"
MARKET_OPPORTUNITY=0
if [ -f "$MARKET_FILE" ]; then
    # Verifica se há uma oportunidade de expansão agressiva recente
    MARKET_OPPORTUNITY=$(grep '"investment": "INCREASE_AGGRESSIVE"' "$MARKET_FILE" | tail -n 1 | wc -l || echo 0)
    if [ $MARKET_OPPORTUNITY -gt 0 ]; then
        echo "[INFO] [MARKET FEEDBACK] Oportunidade de expansão agressiva detectada. Foco em estabilidade para escala."
    fi
fi

DECISION="REQUIRE_APPROVAL"
REASON="Análise de risco padrão"
RISK_LEVEL="medium"

# 3. Aplicar Regras de Decisão

# REGRA 1: AUTO-RELEASE
# Build atual estável + últimos 3 estáveis + sem incidentes técnicos OU de negócio recentes
if [ "$CURRENT_HEALTH" == "healthy" ] && [ $STABLE_COUNT -ge 2 ] && [ $INCIDENT_RECENT -eq 0 ] && [ $BUSINESS_INCIDENT -eq 0 ]; then
    DECISION="AUTO-RELEASE"
    REASON="Build atual estável e histórico de alta confiabilidade em produção e negócio (STABLE_COUNT: $STABLE_COUNT)"
    RISK_LEVEL="low"
fi

# REGRA 1.1: BLOQUEAR AUTO-RELEASE SE HOUVE INCIDENTE TÉCNICO OU NEGÓCIO
if ([ $INCIDENT_RECENT -gt 0 ] || [ $BUSINESS_INCIDENT -gt 0 ]) && [ "$DECISION" == "AUTO-RELEASE" ]; then
    DECISION="REQUIRE_APPROVAL"
    REASON="Histórico técnico estável, mas incidentes reais em produção ou negócio exigem cautela humana."
    RISK_LEVEL="medium"
fi

# REGRA 1.2: PRIORIZAR ESTABILIDADE EM MOMENTO DE EXPANSÃO AGRESSIVA
if [ $MARKET_OPPORTUNITY -gt 0 ] && [ "$DECISION" == "AUTO-RELEASE" ]; then
    DECISION="REQUIRE_APPROVAL"
    REASON="Expansão agressiva em andamento. Foco em estabilidade máxima para escala de novos usuários."
    RISK_LEVEL="medium"
fi

# REGRA 2: REQUIRE_APPROVAL
# Build atual degradado ou apenas 1 auto-heal recente
if [ "$CURRENT_HEALTH" == "degraded" ] || [ $DEGRADED_COUNT -ge 1 ]; then
    DECISION="REQUIRE_APPROVAL"
    REASON="Build atual ou recente recuperado via Auto-Heal. Necessita validação humana."
    RISK_LEVEL="medium"
fi

# REGRA 3: BLOCK_RELEASE
# 2 degradados seguidos ou 1 falha recente
if [ $DEGRADED_COUNT -ge 2 ] || [ "$CURRENT_HEALTH" == "failed" ] || [ $FAILED_RECENT -ge 1 ]; then
    DECISION="BLOCK_RELEASE"
    REASON="Instabilidade detectada: falhas recentes ou múltiplos auto-heals consecutivos."
    RISK_LEVEL="high"
fi

# 4. Gerar Log de Decisão
cat <<EOF > "$DECISION_FILE"
{
  "decision": "$DECISION",
  "reason": "$REASON",
  "risk_level": "$RISK_LEVEL",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "metrics": {
    "stable_history_count": $STABLE_COUNT,
    "current_health": "$CURRENT_HEALTH"
  }
}
EOF

echo "[INFO] Decisão Tomada: $DECISION"
echo "[INFO] Motivo: $REASON"
echo "[INFO] Nível de Risco: $RISK_LEVEL"
echo "✅ [DECISION] Log gerado em $DECISION_FILE"

# Exportar para GitHub Actions
echo "RELEASE_DECISION=$DECISION" >> $GITHUB_ENV
echo "RELEASE_RISK=$RISK_LEVEL" >> $GITHUB_ENV
echo "RELEASE_REASON=$REASON" >> $GITHUB_ENV

# 5. Evolução Futura: Placeholder para métricas externas
# TODO: Integrar com Sentry API para verificar crash rate
# TODO: Integrar com Firebase Analytics para erros reais

echo "------------------------------------------------------------"
