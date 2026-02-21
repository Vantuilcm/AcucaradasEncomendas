Write-Host "Iniciando instalacao das dependencias..." -ForegroundColor Green
Write-Host "Node.js versao: $(node --version)" -ForegroundColor Yellow
Write-Host "NPM versao: $(npm --version)" -ForegroundColor Yellow

# Limpeza completa
Write-Host "Limpando arquivos antigos..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "node_modules removido" -ForegroundColor Green
}

if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "package-lock.json removido" -ForegroundColor Green
}

# Limpando cache NPM
Write-Host "Limpando cache NPM..." -ForegroundColor Cyan
try {
    npm cache clean --force
    Write-Host "Cache NPM limpo" -ForegroundColor Green
} catch {
    Write-Host "Erro ao limpar cache NPM" -ForegroundColor Yellow
}

# Instalacao com flags de compatibilidade
Write-Host "Instalando dependencias..." -ForegroundColor Cyan
$env:NODE_OPTIONS = "--max-old-space-size=8192"

try {
    npm install --legacy-peer-deps --no-audit --no-fund
    Write-Host "Instalacao concluida com sucesso!" -ForegroundColor Green
    
    if (Test-Path "node_modules") {
        Write-Host "node_modules criado com sucesso" -ForegroundColor Green
        
        Write-Host "Testando Expo..." -ForegroundColor Cyan
        npx expo --version
        Write-Host "Expo funcionando!" -ForegroundColor Green
        
        Write-Host "INSTALACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
        Write-Host "Execute 'npm start' para iniciar o projeto" -ForegroundColor Yellow
    } else {
        Write-Host "Erro: node_modules nao foi criado" -ForegroundColor Red
    }
} catch {
    Write-Host "Erro na instalacao" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}