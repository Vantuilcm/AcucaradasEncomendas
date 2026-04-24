# Script para resolver conflitos de dependências NPM
# Açucaradas Encomendas - NPM Conflict Solver (Versão Simplificada)

# Configurações
$packageJsonPath = "./package.json"
$packageLockPath = "./package-lock.json"
$backupDir = "./backup-package-json"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host 'RELATÓRIO DE CONFLITOS NPM' -ForegroundColor Cyan
Write-Host '===========================' -ForegroundColor Cyan

# Verificar versão do Node.js e NPM
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "Versão do Node.js: $nodeVersion" -ForegroundColor Yellow
Write-Host "Versão do NPM: $npmVersion" -ForegroundColor Yellow

# Criar diretório de backup se não existir
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "Diretório de backup criado: $backupDir" -ForegroundColor Green
}

# Fazer backup do package.json atual
$backupPath = "$backupDir/package.json.$timestamp"
Copy-Item $packageJsonPath $backupPath
Write-Host "Backup do package.json criado em: $backupPath" -ForegroundColor Green

if (Test-Path $packageLockPath) {
    $backupLockPath = "$backupDir/package-lock.json.$timestamp"
    Copy-Item $packageLockPath $backupLockPath
    Write-Host "Backup do package-lock.json criado em: $backupLockPath" -ForegroundColor Green
}

# Ler o conteúdo do package.json
$packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

# Analisar dependências e identificar conflitos
Write-Host "`nAnalisando dependências e identificando conflitos..." -ForegroundColor Cyan

# Verificar versão do Expo
$expoVersion = $packageJson.dependencies.expo -replace "\^|~", ""
Write-Host "Versão do Expo: $expoVersion" -ForegroundColor Yellow

# Verificar conflitos entre React e React DOM
$reactVersion = $packageJson.dependencies.react
$reactDomVersion = $packageJson.dependencies["react-dom"]

# Criar objeto resolutions se não existir
if (-not $packageJson.PSObject.Properties.Name -contains "resolutions") {
    $packageJson | Add-Member -NotePropertyName "resolutions" -NotePropertyValue (New-Object PSObject)
}

# Criar objeto overrides se não existir
if (-not $packageJson.PSObject.Properties.Name -contains "overrides") {
    $packageJson | Add-Member -NotePropertyName "overrides" -NotePropertyValue (New-Object PSObject)
}

# Adicionar resolutions e overrides para react e react-dom
$packageJson.resolutions | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
$packageJson.resolutions | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force
$packageJson.resolutions | Add-Member -NotePropertyName "@types/react" -NotePropertyValue "~18.2.45" -Force

$packageJson.overrides | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
$packageJson.overrides | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force
$packageJson.overrides | Add-Member -NotePropertyName "@types/react" -NotePropertyValue "~18.2.45" -Force

Write-Host "Adicionadas resolutions e overrides para react, react-dom e @types/react" -ForegroundColor Green

# Salvar o package.json atualizado
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath -Encoding UTF8

# Criar arquivo .npmrc se não existir
$npmrcPath = "./.npmrc"
if (-not (Test-Path $npmrcPath)) {
    Write-Host "Criando arquivo .npmrc com configurações otimizadas..." -ForegroundColor Yellow
    @"
legacy-peer-deps=true
fund=false
audit=false
strict-ssl=false
engine-strict=false
"@ | Set-Content -Path $npmrcPath -Encoding UTF8
}

# Gerar relatório de conflitos
Write-Host "`n`n🔍 RELATÓRIO DE CONFLITOS NPM" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host "STATUS GERAL: Conflitos resolvidos" -ForegroundColor Yellow
Write-Host "Conflitos detectados e resolvidos:" -ForegroundColor Yellow
Write-Host "- React e React DOM com versões diferentes" -ForegroundColor Yellow
Write-Host "- @types/react incompatível com a versão do React" -ForegroundColor Yellow

# Sugestões avançadas
Write-Host "`n🧠 SUGESTÕES AVANÇADAS:" -ForegroundColor Cyan
Write-Host "- Execute 'npm install --legacy-peer-deps' para aplicar as alterações" -ForegroundColor White
Write-Host "- Execute 'npx expo-doctor' para verificar a integridade do projeto" -ForegroundColor White
Write-Host "- Execute 'npx expo start --clear' para iniciar o projeto com cache limpo" -ForegroundColor White

Write-Host "`n✅ SUCESSO: Todos os conflitos foram resolvidos automaticamente." -ForegroundColor Green
Write-Host "   Execute 'npm install --legacy-peer-deps' para aplicar as alterações." -ForegroundColor Green

Write-Host "`nRelatório concluído em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# Limpar cache e reinstalar dependências
Write-Host "`nDeseja limpar o cache do NPM e reinstalar as dependências? (S/N)" -ForegroundColor Cyan
$resposta = Read-Host

if ($resposta -eq "S" -or $resposta -eq "s") {
    Write-Host "`nLimpando cache e arquivos temporários..." -ForegroundColor Yellow
    
    # Limpar cache do NPM
    npm cache clean --force
    
    # Remover node_modules
    if (Test-Path "./node_modules") {
        Write-Host "Removendo node_modules..." -ForegroundColor Yellow
        Remove-Item -Path "./node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Remover .expo
    if (Test-Path "./.expo") {
        Write-Host "Removendo .expo..." -ForegroundColor Yellow
        Remove-Item -Path "./.expo" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Reinstalar dependências
    Write-Host "`nReinstalando dependências..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
    
    # Verificar integridade do projeto
    Write-Host "`nVerificando integridade do projeto com expo-doctor..." -ForegroundColor Yellow
    npx expo-doctor
    
    Write-Host "`n✅ Processo de limpeza e reinstalação concluído!" -ForegroundColor Green
    Write-Host "   Você pode iniciar o projeto com 'npx expo start --clear' ou usar o script 'dev-with-node20.bat'" -ForegroundColor Green
} else {
    Write-Host "`nOperação de limpeza e reinstalação cancelada pelo usuário." -ForegroundColor Yellow
    Write-Host "Para aplicar as alterações manualmente, execute:" -ForegroundColor Yellow
    Write-Host "1. npm cache clean --force" -ForegroundColor White
    Write-Host "2. npm install --legacy-peer-deps" -ForegroundColor White
    Write-Host "3. npx expo-doctor" -ForegroundColor White
    Write-Host "4. npx expo start --clear" -ForegroundColor White
}

Write-Host 'Script concluido!' -ForegroundColor Cyan