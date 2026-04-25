# Script simplificado para resolver conflitos de dependencias NPM
# Acucaradas Encomendas

# Configuracoes
$backupDir = "./backup-package-json"
$packageJsonPath = "./package.json"
$packageLockPath = "./package-lock.json"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "RELATORIO DE CONFLITOS NPM" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Verificar versao do Node.js
$nodeVersion = node --version
Write-Host "Versao atual do Node.js: $nodeVersion" -ForegroundColor Yellow

# Verificar versao do NPM
$npmVersion = npm --version
Write-Host "Versao atual do NPM: $npmVersion" -ForegroundColor Yellow

# Verificar versao recomendada no .nvmrc
$nvmrcVersion = Get-Content .nvmrc -ErrorAction SilentlyContinue
Write-Host "Versao recomendada no .nvmrc: $nvmrcVersion" -ForegroundColor Yellow

# Criar diretorio de backup se nao existir
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "Diretorio de backup criado: $backupDir" -ForegroundColor Green
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

# Ler o conteudo do package.json
$packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

# Verificar se ja existe uma resolucao
if (-not $packageJson.PSObject.Properties.Name -contains "resolutions") {
    $packageJson | Add-Member -NotePropertyName "resolutions" -NotePropertyValue (New-Object PSObject)
}

# Verificar se ja existe um override
if (-not $packageJson.PSObject.Properties.Name -contains "overrides") {
    $packageJson | Add-Member -NotePropertyName "overrides" -NotePropertyValue (New-Object PSObject)
}

# Fixar versoes de React e React DOM
Write-Host "Fixando versoes de React e React DOM para 18.2.0" -ForegroundColor Yellow
$packageJson.dependencies.react = "18.2.0"
$packageJson.dependencies["react-dom"] = "18.2.0"

# Adicionar resolutions para react e react-dom
$packageJson.resolutions | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
$packageJson.resolutions | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force

# Adicionar overrides para react e react-dom
$packageJson.overrides | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
$packageJson.overrides | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force

# Atualizar @types/react para versao compativel
Write-Host "Atualizando @types/react para versao compativel com React 18" -ForegroundColor Yellow
$packageJson.devDependencies["@types/react"] = "~18.2.45"

# Adicionar a resolucao e override para @types/react
$packageJson.resolutions | Add-Member -NotePropertyName "@types/react" -NotePropertyValue "~18.2.45" -Force
$packageJson.overrides | Add-Member -NotePropertyName "@types/react" -NotePropertyValue "~18.2.45" -Force

# Atualizar react-native para versao compativel
Write-Host "Atualizando react-native para versao compativel: 0.73.6" -ForegroundColor Yellow
$packageJson.dependencies["react-native"] = "0.73.6"

# Adicionar a resolucao e override para react-native
$packageJson.resolutions | Add-Member -NotePropertyName "react-native" -NotePropertyValue "0.73.6" -Force
$packageJson.overrides | Add-Member -NotePropertyName "react-native" -NotePropertyValue "0.73.6" -Force

# Salvar as alteracoes no package.json
Write-Host "Salvando alteracoes no package.json..." -ForegroundColor Cyan
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath
Write-Host "Alteracoes salvas com sucesso!" -ForegroundColor Green

# Remover node_modules e package-lock.json
Write-Host "Limpando instalacao anterior..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "Removendo node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

if (Test-Path "package-lock.json") {
    Write-Host "Removendo package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

# Limpar cache do NPM
Write-Host "Limpando cache do NPM..." -ForegroundColor Cyan
npm cache clean --force

# Configurar NPM para resolver conflitos
Write-Host "Configurando NPM para resolver conflitos..." -ForegroundColor Cyan
npm config set legacy-peer-deps true

# Instrucoes finais
Write-Host "PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "1. Execute: npm install --legacy-peer-deps" -ForegroundColor White
Write-Host "2. Teste o aplicativo: npm start" -ForegroundColor White
Write-Host "3. Se ainda houver problemas, considere usar Node.js v18.19.0 (versao recomendada)" -ForegroundColor White

Write-Host "Script de resolucao de conflitos concluido!" -ForegroundColor Green