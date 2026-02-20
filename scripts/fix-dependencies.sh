#!/bin/bash
# Script para resolver conflitos de dependências NPM
# Criado pelo NPMConflictSolverAI

echo -e "\n\033[1;36m🔍 Iniciando resolução de conflitos de dependências NPM...\033[0m"

# Verificar se o diretório node_modules existe e removê-lo
if [ -d "../node_modules" ]; then
    echo -e "\n\033[1;33m🧹 Removendo node_modules existente...\033[0m"
    rm -rf "../node_modules"
    echo -e "\033[1;32m✅ node_modules removido com sucesso!\033[0m"
fi

# Limpar cache do NPM
echo -e "\n\033[1;33m🧹 Limpando cache do NPM...\033[0m"
npm cache clean --force
echo -e "\033[1;32m✅ Cache do NPM limpo com sucesso!\033[0m"

# Reinstalar dependências com legacy-peer-deps
echo -e "\n\033[1;33m📦 Reinstalando dependências...\033[0m"
npm install --legacy-peer-deps

# Verificar se a instalação foi bem-sucedida
if [ $? -eq 0 ]; then
    echo -e "\n\033[1;32m✅ Dependências reinstaladas com sucesso!\033[0m"
    
    # Verificar se ainda existem conflitos
    echo -e "\n\033[1;36m🔍 Verificando se ainda existem conflitos...\033[0m"
    npm_ls_output=$(npm ls @react-navigation/native 2>&1)
    
    if echo "$npm_ls_output" | grep -q "invalid"; then
        echo -e "\n\033[1;31m⚠️ Ainda existem conflitos de dependências. Pode ser necessário ajustar manualmente os overrides no package.json.\033[0m"
    else
        echo -e "\n\033[1;32m🎉 Nenhum conflito detectado! O projeto está pronto para ser executado.\033[0m"
    fi
else
    echo -e "\n\033[1;31m❌ Falha ao reinstalar dependências. Verifique os erros acima.\033[0m"
fi

echo -e "\n\033[1;36m📋 Próximos passos:\033[0m"
echo -e "\033[1;37m1. Execute 'npm start' para verificar se o aplicativo inicia corretamente\033[0m"
echo -e "\033[1;37m2. Se ocorrerem erros, verifique o arquivo package.json e ajuste os overrides conforme necessário\033[0m"
echo -e "\033[1;37m3. Para uma solução mais robusta, considere migrar para pnpm no futuro\033[0m"

echo -e "\n\033[1;36m🚀 Processo de resolução de conflitos concluído!\033[0m"