# Script para resolver conflitos de dependências NPM

Write-Host "Iniciando resolução de conflitos de dependências NPM..."

# Remover node_modules e package-lock.json
Write-Host "Removendo node_modules e package-lock.json..."
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue

# Limpar cache do NPM
Write-Host "Limpando cache do NPM..."
npm cache clean --force

# Instalar dependências com --legacy-peer-deps
Write-Host "Instalando dependências com --legacy-peer-deps..."
npm install --legacy-peer-deps