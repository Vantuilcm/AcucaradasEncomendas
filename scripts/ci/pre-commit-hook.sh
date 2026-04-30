#!/usr/bin/env bash

# ==============================================================================
# HOOK: pre-commit
# OBJETIVO: Blindar a branch principal contra commits diretos e forçar o uso de branches / PRs
# LOCAL: .git/hooks/pre-commit
# ==============================================================================

# Obter o nome da branch atual
BRANCH_NAME=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")

# Branches protegidas (lista separada por pipe)
PROTECTED_BRANCHES="main|master|release-1194-final"

if echo "$BRANCH_NAME" | grep -Eq "^($PROTECTED_BRANCHES)$"; then
    echo "================================================================================"
    echo "🚨 [BLINDAGEM] COMMIT REJEITADO 🚨"
    echo "Você está tentando commitar diretamente na branch protegida: '$BRANCH_NAME'"
    echo "--------------------------------------------------------------------------------"
    echo "Regra: Todos os novos desenvolvimentos devem ocorrer em branches separadas"
    echo "       (ex: feature/nome-da-tarefa) e incorporadas via Pull Request."
    echo "================================================================================"
    exit 1
fi

# Passa se não for branch protegida
exit 0