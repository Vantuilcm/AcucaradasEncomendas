# Script para atualizar dependências com versionamento rígido
# Este script demonstra um fluxo de trabalho para atualizar dependências mantendo versões exatas

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Função para exibir mensagens coloridas
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Verificar se o Node.js está instalado
try {
    $nodeVersion = node -v
    Write-ColorOutput Green "✅ Node.js $nodeVersion encontrado"
} catch {
    Write-ColorOutput Red "❌ Node.js não encontrado. Por favor, instale o Node.js antes de continuar."
    exit 1
}

# Fazer backup do package.json
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "../package.json.backup-$timestamp"
Copy-Item -Path "../package.json" -Destination $backupPath
Write-ColorOutput Green "✅ Backup do package.json criado em: $backupPath"

# Perguntar ao usuário qual dependência atualizar
Write-ColorOutput Cyan "\n📦 ATUALIZAÇÃO DE DEPENDÊNCIAS COM VERSIONAMENTO RÍGIDO"
Write-ColorOutput Cyan "=================================================="

$packageName = Read-Host "\nDigite o nome do pacote que deseja atualizar (ex: react-native)"

# Verificar se o pacote existe no package.json
$packageJson = Get-Content -Path "../package.json" | ConvertFrom-Json
$packageExists = $false

if ($packageJson.dependencies.PSObject.Properties.Name -contains $packageName) {
    $currentVersion = $packageJson.dependencies.$packageName
    $packageExists = $true
    Write-ColorOutput Yellow "📌 Versão atual: $currentVersion"
} elseif ($packageJson.devDependencies.PSObject.Properties.Name -contains $packageName) {
    $currentVersion = $packageJson.devDependencies.$packageName
    $packageExists = $true
    Write-ColorOutput Yellow "📌 Versão atual: $currentVersion (devDependency)"
} else {
    Write-ColorOutput Red "❌ Pacote '$packageName' não encontrado no package.json"
    $installNew = Read-Host "Deseja instalar este pacote? (s/n)"
    if ($installNew -ne "s") {
        exit 1
    }
}

# Perguntar qual versão instalar
if ($packageExists) {
    $newVersion = Read-Host "Digite a nova versão (ou deixe em branco para ver as versões disponíveis)"
    
    if ([string]::IsNullOrEmpty($newVersion)) {
        # Mostrar versões disponíveis
        Write-ColorOutput Cyan "\n🔍 Buscando versões disponíveis..."
        npm view $packageName versions --json
        $newVersion = Read-Host "\nDigite a versão desejada"
    }
} else {
    $newVersion = Read-Host "Digite a versão a ser instalada (ou deixe em branco para a mais recente)"
}

# Instalar a nova versão com --save-exact
Write-ColorOutput Cyan "\n📥 Instalando $packageName@$newVersion com versão exata..."

if ([string]::IsNullOrEmpty($newVersion)) {
    npm install $packageName --save-exact
} else {
    npm install "$packageName@$newVersion" --save-exact
}

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ Falha ao instalar o pacote. Restaurando backup..."
    Copy-Item -Path $backupPath -Destination "../package.json"
    Write-ColorOutput Green "✅ Backup restaurado com sucesso."
    exit 1
}

# Executar o script de fixação de versões
Write-ColorOutput Cyan "\n🔒 Executando script para fixar todas as versões..."
node ./fixar-versoes.js

# Verificar se há conflitos
Write-ColorOutput Cyan "\n🔍 Verificando conflitos de dependências..."
npx expo-doctor

# Perguntar se deseja testar a aplicação
$testarApp = Read-Host "\nDeseja iniciar a aplicação para testar? (s/n)"
if ($testarApp -eq "s") {
    Write-ColorOutput Cyan "\n🚀 Iniciando a aplicação..."
    npx expo start --clear
}

Write-ColorOutput Green "\n✅ Processo de atualização concluído com sucesso!"