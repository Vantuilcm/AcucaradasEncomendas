#!/bin/bash
# Script para verificar a integridade das dependências após a correção
# Criado pelo NPMConflictSolverAI

echo -e "\n\033[1;36m🔍 Verificando integridade das dependências...\033[0m"

# Verificar conflitos no React Navigation
echo -e "\n\033[1;33m📦 Verificando React Navigation...\033[0m"
react_nav_output=$(npm ls @react-navigation/native 2>&1)
if echo "$react_nav_output" | grep -q "invalid"; then
    echo -e "\033[1;31m❌ Conflitos detectados no React Navigation!\033[0m"
    echo -e "\033[1;31m$react_nav_output\033[0m"
else
    echo -e "\033[1;32m✅ React Navigation OK!\033[0m"
fi

# Verificar conflitos no Expo Constants
echo -e "\n\033[1;33m📦 Verificando Expo Constants...\033[0m"
expo_constants_output=$(npm ls expo-constants 2>&1)
if echo "$expo_constants_output" | grep -q "invalid"; then
    echo -e "\033[1;31m❌ Conflitos detectados no Expo Constants!\033[0m"
    echo -e "\033[1;31m$expo_constants_output\033[0m"
else
    echo -e "\033[1;32m✅ Expo Constants OK!\033[0m"
fi

# Verificar conflitos no Expo Router
echo -e "\n\033[1;33m📦 Verificando Expo Router...\033[0m"
expo_router_output=$(npm ls expo-router 2>&1)
if echo "$expo_router_output" | grep -q "invalid"; then
    echo -e "\033[1;31m❌ Conflitos detectados no Expo Router!\033[0m"
    echo -e "\033[1;31m$expo_router_output\033[0m"
else
    echo -e "\033[1;32m✅ Expo Router OK!\033[0m"
fi

# Verificar vulnerabilidades
echo -e "\n\033[1;33m🔒 Verificando vulnerabilidades...\033[0m"
npm audit

# Verificar dependências desatualizadas
echo -e "\n\033[1;33m📊 Verificando dependências desatualizadas...\033[0m"
npm outdated

echo -e "\n\033[1;36m🚀 Verificação concluída!\033[0m"