# Script para iniciar o servidor web do React Native
# Contorna problemas com caracteres especiais no nome da pasta

Write-Host "Iniciando servidor web React Native..." -ForegroundColor Green

# Define o diretório do projeto
$projectDir = "c:\Users\USER_ADM\Downloads\Acucaradas Encomendas"
Set-Location $projectDir

# Usa o Node.js 20.18.0 local
Write-Host "Usando Node.js 20.18.0 local" -ForegroundColor Yellow

# Verifica a versão do Node.js
.\node-v20.18.0-win-x64\node.exe --version
Write-Host "Iniciando servidor Expo..." -ForegroundColor Cyan

# Inicia o servidor Expo
.\node-v20.18.0-win-x64\npx.cmd expo start