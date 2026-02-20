# Script para resolver conflitos de dependências NPM
# Criado pelo NPMConflictSolverAI

Write-Host "Iniciando resolução de conflitos de dependências NPM..." -ForegroundColor Cyan

# Verificar se o diretório node_modules existe e removê-lo
if (Test-Path -Path "..\node_modules") {
    Write-Host "Removendo node_modules existente..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "..\node_modules"
    Write-Host "node_modules removido com sucesso!" -ForegroundColor Green
}

# Limpar cache do NPM
Write-Host "Limpando cache do NPM..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "Cache do NPM limpo com sucesso!" -ForegroundColor Green

# Reinstalar dependências com legacy-peer-deps
Write-Host "Reinstalando dependências..." -ForegroundColor Yellow
cd ..
npm install --legacy-peer-deps

Write-Host "Processo de resolução de conflitos concluído!" -ForegroundColor Cyan