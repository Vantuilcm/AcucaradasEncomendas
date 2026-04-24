# Script para resolver conflitos de dependências NPM
# NPMConflictSolverAI - Versão Final

# Configurações iniciais
$ErrorActionPreference = "Stop"
$backupDir = "./backup-npm-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$packageJsonPath = "./package.json"
$packageLockPath = "./package-lock.json"
$nodeModulesPath = "./node_modules"

# Função para exibir mensagens formatadas
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Cabeçalho
Write-ColorMessage "\n🔍 RELATÓRIO DE CONFLITOS NPM - INÍCIO DA ANÁLISE" "Cyan"
Write-ColorMessage "================================================" "Cyan"

# Verificar versões do Node.js e NPM
$nodeVersion = node -v
$npmVersion = npm -v
Write-ColorMessage "Node.js: $nodeVersion" "Green"
Write-ColorMessage "NPM: $npmVersion" "Green"

# Criar backup dos arquivos importantes
Write-ColorMessage "\n📦 Criando backup dos arquivos..." "Yellow"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

if (Test-Path $packageJsonPath) {
    Copy-Item $packageJsonPath -Destination "$backupDir/package.json"
    Write-ColorMessage "✅ Backup do package.json criado" "Green"
}

if (Test-Path $packageLockPath) {
    Copy-Item $packageLockPath -Destination "$backupDir/package-lock.json"
    Write-ColorMessage "✅ Backup do package-lock.json criado" "Green"
}

# Resolver conflitos específicos
Write-ColorMessage "\n🔧 Resolvendo conflitos de dependências..." "Yellow"

# 1. Corrigir conflito entre react e react-dom
Write-ColorMessage "1. Fixando react e react-dom na versão 18.2.0" "Magenta"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

# Atualizar dependências diretas
if ($packageJson.dependencies.react) {
    $packageJson.dependencies.react = "18.2.0"
}

if ($packageJson.dependencies."react-dom") {
    $packageJson.dependencies."react-dom" = "18.2.0"
}

# 2. Corrigir conflito de @types/react
Write-ColorMessage "2. Fixando @types/react na versão ~18.2.45" "Magenta"
if ($packageJson.devDependencies."@types/react") {
    $packageJson.devDependencies."@types/react" = "~18.2.45"
}

# 3. Corrigir conflito de react-native
Write-ColorMessage "3. Fixando react-native na versão 0.73.6" "Magenta"
if ($packageJson.dependencies."react-native") {
    $packageJson.dependencies."react-native" = "0.73.6"
}

# 4. Garantir que as overrides estejam corretas
Write-ColorMessage "4. Configurando overrides para garantir compatibilidade" "Magenta"
if (-not $packageJson.overrides) {
    $packageJson | Add-Member -NotePropertyName "overrides" -NotePropertyValue @{}
}

$packageJson.overrides."react" = "18.2.0"
$packageJson.overrides."react-dom" = "18.2.0"
$packageJson.overrides."@types/react" = "~18.2.45"
$packageJson.overrides."react-native" = "0.73.6"

# Salvar as alterações no package.json
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
Write-ColorMessage "✅ package.json atualizado com sucesso" "Green"

# Limpar cache e node_modules
Write-ColorMessage "\n🧹 Limpando ambiente para reinstalação..." "Yellow"

if (Test-Path $nodeModulesPath) {
    Write-ColorMessage "Removendo node_modules..." "Magenta"
    Remove-Item -Recurse -Force $nodeModulesPath -ErrorAction SilentlyContinue
}

if (Test-Path $packageLockPath) {
    Write-ColorMessage "Removendo package-lock.json..." "Magenta"
    Remove-Item -Force $packageLockPath -ErrorAction SilentlyContinue
}

Write-ColorMessage "Limpando cache do NPM..." "Magenta"
npm cache clean --force

# Configurar NPM para usar legacy-peer-deps
Write-ColorMessage "\n⚙️ Configurando NPM para usar legacy-peer-deps..." "Yellow"
npm config set legacy-peer-deps true

# Resumo das alterações
Write-ColorMessage "\n📋 RESUMO DAS ALTERAÇÕES:" "Cyan"
Write-ColorMessage "================================================" "Cyan"
Write-ColorMessage "✅ Backup dos arquivos criado em: $backupDir" "Green"
Write-ColorMessage "✅ React e React DOM fixados na versão 18.2.0" "Green"
Write-ColorMessage "✅ @types/react fixado na versão ~18.2.45" "Green"
Write-ColorMessage "✅ react-native fixado na versão 0.73.6" "Green"
Write-ColorMessage "✅ Overrides configurados para garantir compatibilidade" "Green"
Write-ColorMessage "✅ Cache e node_modules limpos" "Green"
Write-ColorMessage "✅ NPM configurado para usar legacy-peer-deps" "Green"

# Instruções finais
Write-ColorMessage "\n🚀 PRÓXIMOS PASSOS:" "Yellow"
Write-ColorMessage "================================================" "Yellow"
Write-ColorMessage "Execute o comando abaixo para reinstalar as dependências:" "White"
Write-ColorMessage "npm install --legacy-peer-deps" "Green"
Write-ColorMessage "\nApós a instalação, execute o projeto com:" "White"
Write-ColorMessage "npx expo start" "Green"

Write-ColorMessage "\n🔍 RELATÓRIO DE CONFLITOS NPM - ANÁLISE CONCLUÍDA" "Cyan"
Write-ColorMessage "================================================" "Cyan"