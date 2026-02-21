@echo off
echo 🚀 Iniciando desenvolvimento com Node.js 20.18.0
echo.

REM Verificar se o Node.js 20.18.0 está disponível
if not exist "node-v20.18.0-win-x64\node.exe" (
    echo ❌ Node.js 20.18.0 não encontrado!
    echo Certifique-se de que a pasta node-v20.18.0-win-x64 está presente.
    pause
    exit /b 1
)

REM Mostrar versão do Node.js
echo ⚡ Versão do Node.js:
.\node-v20.18.0-win-x64\node.exe --version
echo.

REM Mostrar versão do NPM
echo ⚡ Versão do NPM:
.\node-v20.18.0-win-x64\npm.cmd --version
echo.

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    .\node-v20.18.0-win-x64\npm.cmd install --legacy-peer-deps
    echo.
)

REM Verificar arquivos de imagem
echo 🖼️ Verificando arquivos de imagem...
if exist "assets\icon.png" (
    powershell -Command "$content = Get-Content -Path .\assets\icon.png -TotalCount 1; if ($content -match '<svg') { echo '⚠️ Arquivo icon.png é um SVG! Executando conversão...'; powershell -ExecutionPolicy Bypass -File .\convert-images.ps1 } else { echo '✅ Arquivos de imagem OK!' }"
)
echo.

REM Verificar diagnóstico do Expo
echo 🔍 Verificando configuração do projeto...
.\node-v20.18.0-win-x64\npx.cmd expo-doctor
echo.

REM Limpar cache do Metro se necessário
echo 🧹 Limpando cache do Metro...
.\node-v20.18.0-win-x64\npx.cmd expo start --clear
echo.

REM Iniciar o servidor de desenvolvimento
echo 🎯 Iniciando servidor de desenvolvimento...
.\node-v20.18.0-win-x64\npx.cmd expo start

pause