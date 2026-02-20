# Script para migrar o projeto de NPM para PNPM

# Verificar se PNPM está instalado
$pnpmVersion = pnpm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "PNPM não encontrado. Instalando PNPM globalmente..." -ForegroundColor Yellow
    npm install -g pnpm
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha ao instalar PNPM. Abortando." -ForegroundColor Red
        exit 1
    }
}

Write-Host "PNPM versão $pnpmVersion encontrado." -ForegroundColor Green

# Criar backup do package.json
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "package.json.backup_$timestamp"
Copy-Item -Path "package.json" -Destination $backupFile
Write-Host "Backup do package.json criado: $backupFile" -ForegroundColor Green

# Criar arquivo .npmrc se não existir
if (-not (Test-Path ".npmrc")) {
    @"
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
shallow-install=false
public-hoist-pattern[]=*expo*
public-hoist-pattern[]=*@react-native*
public-hoist-pattern[]=*react-native*
public-hoist-pattern[]=*@babel/core*
public-hoist-pattern[]=babel-preset-expo
public-hoist-pattern[]=metro*
public-hoist-pattern[]=@expo/metro-config
resolve-peers-from-workspace-root=true
save-workspace-protocol=false
engine-strict=true
"@ | Out-File -FilePath ".npmrc" -Encoding utf8
    Write-Host "Arquivo .npmrc criado com configurações para React Native/Expo" -ForegroundColor Green
}

# Atualizar scripts no package.json
$packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json

# Backup dos scripts originais
$originalScripts = $packageJson.scripts

# Atualizar scripts para usar PNPM
$packageJson.scripts.start = "pnpm expo start"
$packageJson.scripts.android = "pnpm expo start --android"
$packageJson.scripts.ios = "pnpm expo start --ios"
$packageJson.scripts.web = "pnpm expo start --web"
if ($packageJson.scripts.test) {
    $packageJson.scripts.test = $packageJson.scripts.test -replace "^npm", "pnpm"
}
$packageJson.scripts.clean = "pnpm store prune"
$packageJson.scripts.reinstall = "rm -rf node_modules && pnpm install"

# Salvar package.json atualizado
$packageJson | ConvertTo-Json -Depth 100 | Out-File -FilePath "package.json" -Encoding utf8
Write-Host "Scripts no package.json atualizados para usar PNPM" -ForegroundColor Green

# Remover node_modules e arquivos de lock
Write-Host "Removendo node_modules e arquivos de lock..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
}
if (Test-Path "yarn.lock") {
    Remove-Item -Force "yarn.lock"
}

# Instalar dependências com PNPM
Write-Host "Instalando dependências com PNPM..." -ForegroundColor Yellow
pnpm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "\nMigração para PNPM concluída com sucesso!" -ForegroundColor Green
    Write-Host "\nPróximos passos:" -ForegroundColor Cyan
    Write-Host "1. Verifique se a aplicação inicia corretamente com 'pnpm start'" -ForegroundColor Cyan
    Write-Host "2. Atualize os scripts de CI/CD para usar PNPM" -ForegroundColor Cyan
    Write-Host "3. Informe a equipe sobre a mudança para PNPM" -ForegroundColor Cyan
    Write-Host "\nSe encontrar problemas, você pode restaurar o backup com:" -ForegroundColor Yellow
    Write-Host "Copy-Item -Path \"$backupFile\" -Destination \"package.json\"" -ForegroundColor Yellow
} else {
    Write-Host "\nErro ao instalar dependências com PNPM. Restaurando package.json original..." -ForegroundColor Red
    Copy-Item -Path $backupFile -Destination "package.json"
    Write-Host "package.json restaurado. Tente resolver os problemas e execute o script novamente." -ForegroundColor Yellow
}