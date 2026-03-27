# Script para atualizar o Expo SDK para a versão 50 e resolver vulnerabilidades de segurança

# Configurações
$nodeVersion = "18.19.0"
$backupDir = "./backup-package-json"

# Cria diretório de backup
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# Faz backup do package.json atual
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -Path "./package.json" -Destination "$backupDir/package.json.$timestamp.bak" -Force

Write-Host "Backup do package.json criado em $backupDir/package.json.$timestamp.bak"

# Atualiza as dependências para o Expo SDK 50
Write-Host "Atualizando dependências para o Expo SDK 50..."

# Instala o pacote npm-check-updates se não estiver instalado
npx npm-check-updates --target minor -u

# Lista de pacotes específicos para atualizar para o Expo SDK 50
$packagesToUpdate = @(
    "expo@~50.0.0",
    "expo-constants@~15.0.0",
    "expo-crypto@~12.8.0",
    "expo-device@~5.9.0",
    "expo-notifications@~0.27.0",
    "expo-router@^3.0.0",
    "expo-secure-store@~12.8.0",
    "expo-status-bar@~1.11.0",
    "react-native@0.73.2",
    "react-native-gesture-handler@~2.14.0",
    "react-native-reanimated@~3.6.0",
    "react-native-safe-area-context@4.8.2",
    "react-native-screens@~3.29.0",
    "@expo/vector-icons@^14.0.0"
)

# Instala os pacotes atualizados
npm install $packagesToUpdate.ForEach({ $_ }) --legacy-peer-deps

# Atualiza as dependências de desenvolvimento
Write-Host "Atualizando dependências de desenvolvimento..."
npm install @babel/core@^7.23.0 @types/react@~18.2.45 --save-dev --legacy-peer-deps

# Corrige vulnerabilidades de segurança
Write-Host "Corrigindo vulnerabilidades de segurança..."
npm audit fix --force

# Adiciona overrides para pacotes problemáticos
Write-Host "Adicionando overrides para pacotes problemáticos..."

$packageJson = Get-Content -Path "./package.json" -Raw | ConvertFrom-Json

# Verifica se já existe a propriedade overrides
if (-not $packageJson.overrides) {
    $packageJson | Add-Member -NotePropertyName "overrides" -NotePropertyValue @{}
}

# Adiciona overrides para pacotes problemáticos
$packageJson.overrides | Add-Member -NotePropertyName "undici" -NotePropertyValue "6.21.2" -Force

# Salva o package.json atualizado
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path "./package.json"

Write-Host "Limpando cache do npm..."
npm cache clean --force

Write-Host "Reinstalando dependências..."
npm install --legacy-peer-deps

Write-Host "Atualização concluída com sucesso!"
Write-Host "Execute 'npx expo-doctor' para verificar se há problemas restantes."