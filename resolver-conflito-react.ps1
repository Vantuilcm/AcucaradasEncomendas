# Script para resolver conflito específico de versão do React

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Iniciando resolução de conflito específico do React..." -ForegroundColor Yellow

# Caminho para o arquivo package.json
$packageJsonPath = "$PSScriptRoot\package.json"

# Verificar se o arquivo package.json existe
if (-not (Test-Path $packageJsonPath)) {
    Write-Host "❌ Arquivo package.json não encontrado!" -ForegroundColor Red
    exit 1
}

# Criar backup do package.json atual
$backupPath = "$PSScriptRoot\package.json.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path $packageJsonPath -Destination $backupPath -Force
Write-Host "✅ Backup do package.json criado em: $backupPath" -ForegroundColor Green

# Ler o conteúdo do package.json
$packageJsonContent = Get-Content -Path $packageJsonPath -Raw

# Substituir as versões do React e React DOM para versões fixas sem o circunflexo
$updatedContent = $packageJsonContent -replace '"react":\s*"\^18\.2\.0"', '"react": "18.2.0"'
$updatedContent = $updatedContent -replace '"react-dom":\s*"\^18\.2\.0"', '"react-dom": "18.2.0"'

# Salvar as alterações no package.json
$updatedContent | Set-Content -Path $packageJsonPath -Encoding UTF8

Write-Host "✅ Versões do React e React DOM atualizadas para fixas (18.2.0)" -ForegroundColor Green

# Verificar se o PNPM está instalado
$pnpmInstalled = $null
try {
    $pnpmInstalled = Get-Command pnpm -ErrorAction SilentlyContinue
} catch {
    $pnpmInstalled = $null
}

if ($pnpmInstalled) {
    # Usar PNPM conforme recomendado na documentação
    Write-Host "\nUsando PNPM para gerenciar dependências conforme recomendado..." -ForegroundColor Cyan
    
    # Limpar cache do PNPM
    Write-Host "Limpando cache do PNPM..." -ForegroundColor Cyan
    pnpm store prune
    
    # Remover node_modules
    Write-Host "Removendo node_modules..." -ForegroundColor Cyan
    Remove-Item -Path "$PSScriptRoot\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Remover pnpm-lock.yaml
    Write-Host "Removendo pnpm-lock.yaml..." -ForegroundColor Cyan
    Remove-Item -Path "$PSScriptRoot\pnpm-lock.yaml" -Force -ErrorAction SilentlyContinue
    
    # Instalar dependências com PNPM
    Write-Host "\nInstalando dependências com PNPM..." -ForegroundColor Yellow
    pnpm install --no-frozen-lockfile
    
    # Verificar se a instalação foi bem-sucedida
    if ($LASTEXITCODE -eq 0) {
        Write-Host "\n✅ Dependências instaladas com sucesso usando PNPM!" -ForegroundColor Green
    } else {
        Write-Host "\n❌ Falha ao instalar dependências com PNPM. Tentando com NPM..." -ForegroundColor Red
        # Fallback para NPM
        npm cache clean --force
        npm install --legacy-peer-deps
    }
} else {
    # Fallback para NPM se PNPM não estiver instalado
    Write-Host "\nPNPM não encontrado. Usando NPM como alternativa..." -ForegroundColor Yellow
    
    # Limpar cache do npm
    Write-Host "Limpando cache do npm..." -ForegroundColor Cyan
    npm cache clean --force
    
    # Remover node_modules
    Write-Host "Removendo node_modules..." -ForegroundColor Cyan
    Remove-Item -Path "$PSScriptRoot\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Remover package-lock.json
    Write-Host "Removendo package-lock.json..." -ForegroundColor Cyan
    Remove-Item -Path "$PSScriptRoot\package-lock.json" -Force -ErrorAction SilentlyContinue
    
    # Instalar dependências com --legacy-peer-deps
    Write-Host "\nInstalando dependências com --legacy-peer-deps..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

# Verificar resultado final
if ($LASTEXITCODE -eq 0) {
    Write-Host "\n✅ Resolução de conflito concluída com sucesso!" -ForegroundColor Green
    Write-Host "\nResumo das ações realizadas:" -ForegroundColor Cyan
    Write-Host "1. Versões do React e React DOM fixadas em 18.2.0" -ForegroundColor White
    Write-Host "2. Dependências reinstaladas" -ForegroundColor White
    Write-Host "\nPróximos passos:" -ForegroundColor Yellow
    Write-Host "1. Verifique se a aplicação inicia corretamente com 'pnpm start' ou 'npm start'" -ForegroundColor White
    Write-Host "2. Se persistirem problemas, consulte README-PNPM.md para mais informações" -ForegroundColor White
} else {
    Write-Host "\n❌ Falha na resolução do conflito. Tente:" -ForegroundColor Red
    Write-Host "1. Verificar se há conflitos em outras dependências" -ForegroundColor White
    Write-Host "2. Consultar MIGRACAO-PNPM.md para instruções específicas" -ForegroundColor White
    Write-Host "3. Adicionar mais overrides no package.json se necessário" -ForegroundColor White
}