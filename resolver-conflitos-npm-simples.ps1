# Script para resolver conflitos de dependencias NPM
# Acucaradas Encomendas

Write-Host "Iniciando resolucao de conflitos de dependencias NPM..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o package.json existe
if (!(Test-Path "package.json")) {
    Write-Host "Arquivo package.json nao encontrado!" -ForegroundColor Red
    exit 1
}

# Ler o conteúdo do package.json
Write-Host "Lendo package.json..." -ForegroundColor Yellow
$packageJsonContent = Get-Content -Path "package.json" -Raw
$packageJson = $packageJsonContent | ConvertFrom-Json

# Fazer backup do package.json original
$backupPath = "package.json.bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
Write-Host "Criando backup em $backupPath..." -ForegroundColor Yellow
Copy-Item -Path "package.json" -Destination $backupPath

# Adicionar seção de overrides se não existir
if (!($packageJson.PSObject.Properties.Name -contains "overrides")) {
    Write-Host "Adicionando secao 'overrides'..." -ForegroundColor Green
    $packageJson | Add-Member -NotePropertyName "overrides" -NotePropertyValue (New-Object PSObject)
}

# Adicionar seção de resolutions se não existir (para Yarn)
if (!($packageJson.PSObject.Properties.Name -contains "resolutions")) {
    Write-Host "Adicionando secao 'resolutions'..." -ForegroundColor Green
    $packageJson | Add-Member -NotePropertyName "resolutions" -NotePropertyValue (New-Object PSObject)
}

# Definir versões compatíveis para overrides
$overrides = @{
    "react" = "18.2.0"
    "react-dom" = "18.2.0"
    "@types/react" = "~18.2.14"
    "react-native" = "0.72.10"
    "expo-router" = "~2.0.0"
    "metro" = "^0.76.8"
    "metro-config" = "^0.76.8"
    "metro-core" = "^0.76.8"
    "metro-runtime" = "^0.76.8"
    "metro-resolver" = "^0.76.8"
    "@expo/metro-config" = "^0.10.0"
    "@react-native-async-storage/async-storage" = "~1.18.2"
    "@react-native-community/cli" = "^11.3.8"
    "firebase" = "^10.7.1"
    "react-native-svg" = "~13.9.0"
}

# Aplicar overrides
Write-Host "Aplicando overrides para resolver conflitos..." -ForegroundColor Yellow
foreach ($key in $overrides.Keys) {
    $value = $overrides[$key]
    
    # Adicionar ao overrides
    if ($packageJson.overrides.PSObject.Properties.Name -contains $key) {
        $packageJson.overrides.$key = $value
        Write-Host "Atualizando override: $key -> $value" -ForegroundColor Yellow
    } else {
        $packageJson.overrides | Add-Member -NotePropertyName $key -NotePropertyValue $value
        Write-Host "Adicionando override: $key -> $value" -ForegroundColor Green
    }
    
    # Adicionar ao resolutions (para Yarn)
    if ($packageJson.resolutions.PSObject.Properties.Name -contains $key) {
        $packageJson.resolutions.$key = $value
    } else {
        $packageJson.resolutions | Add-Member -NotePropertyName $key -NotePropertyValue $value
    }
}

# Verificar e corrigir versões do Metro Bundler e outras dependências críticas
Write-Host "\nVerificando dependencias com conflitos..." -ForegroundColor Cyan

# Lista de pacotes a verificar
$packagesToCheck = @(
    "metro", "metro-config", "metro-core", "metro-runtime", "metro-resolver",
    "@react-native-async-storage/async-storage", "@react-native-community/cli",
    "firebase", "react-native-svg"
)

foreach ($package in $packagesToCheck) {
    if ($packageJson.dependencies.PSObject.Properties.Name -contains $package) {
        $currentVersion = $packageJson.dependencies.$package
        $newVersion = $overrides[$package]
        
        if ($currentVersion -ne $newVersion) {
            Write-Host "Conflito detectado: $package ($currentVersion) -> $newVersion" -ForegroundColor Yellow
            $packageJson.dependencies.$package = $newVersion
        } else {
            Write-Host "$package ja esta na versao correta: $currentVersion" -ForegroundColor Green
        }
    }
}

# Salvar as alterações no package.json
Write-Host "\nSalvando alteracoes no package.json..." -ForegroundColor Yellow
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path "package.json" -Encoding UTF8

Write-Host "\nConflitos de dependencias resolvidos!" -ForegroundColor Green
Write-Host "\nProximos passos:" -ForegroundColor Cyan
Write-Host "   1. Execute: npm install --legacy-peer-deps" -ForegroundColor White
Write-Host "   2. Execute: npm start" -ForegroundColor White
Write-Host ""
Write-Host "Se ainda houver problemas, execute: npm cache clean --force && npm install --legacy-peer-deps" -ForegroundColor Yellow
Write-Host ""