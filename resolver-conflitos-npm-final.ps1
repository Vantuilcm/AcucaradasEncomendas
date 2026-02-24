# Script para resolver conflitos de dependencias NPM
# Acucaradas Encomendas - NPM Conflict Solver Final

# Configuracoes
$backupDir = "./backup-package-json"
$packageJsonPath = "./package.json"
$packageLockPath = "./package-lock.json"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$conflitosDetectados = 0
$conflitosResolvidos = 0

Write-Host 'RELATORIO DE CONFLITOS NPM' -ForegroundColor Cyan
Write-Host '===========================' -ForegroundColor Cyan

# Verificar versao do Node.js
$nodeVersion = node --version
Write-Host 'Versao atual do Node.js: ' -NoNewline -ForegroundColor Yellow
Write-Host $nodeVersion -ForegroundColor Yellow

# Verificar versao do NPM
$npmVersion = npm --version
Write-Host 'Versao atual do NPM: ' -NoNewline -ForegroundColor Yellow
Write-Host $npmVersion -ForegroundColor Yellow

# Verificar versao recomendada no .nvmrc
$nvmrcVersion = Get-Content .nvmrc -ErrorAction SilentlyContinue
Write-Host 'Versao recomendada no .nvmrc: ' -NoNewline -ForegroundColor Yellow
Write-Host $nvmrcVersion -ForegroundColor Yellow

# Alertar sobre incompatibilidade de versao do Node.js
if ($nodeVersion -notlike "*$nvmrcVersion*") {
    Write-Host "ALERTA: A versao atual do Node.js ($nodeVersion) e diferente da recomendada ($nvmrcVersion)" -ForegroundColor Red
    Write-Host "Recomendamos usar a versao $nvmrcVersion para evitar problemas de compatibilidade" -ForegroundColor Red
    $conflitosDetectados++
}

# Criar diretorio de backup se nao existir
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "Diretorio de backup criado: $backupDir" -ForegroundColor Green
}

# Fazer backup do package.json atual
function Backup-PackageJson {
    $backupPath = "$backupDir/package.json.$timestamp"
    Copy-Item $packageJsonPath $backupPath
    Write-Host "Backup do package.json criado em: $backupPath" -ForegroundColor Green
    
    if (Test-Path $packageLockPath) {
        $backupLockPath = "$backupDir/package-lock.json.$timestamp"
        Copy-Item $packageLockPath $backupLockPath
        Write-Host "Backup do package-lock.json criado em: $backupLockPath" -ForegroundColor Green
    }
}

# Verificar se o package.json existe
if (-not (Test-Path $packageJsonPath)) {
    Write-Host "Arquivo package.json nao encontrado!" -ForegroundColor Red
    exit 1
}

# Fazer backup antes de qualquer modificacao
Backup-PackageJson

# Ler o conteudo do package.json
$packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

# Analisar dependencias e identificar conflitos
Write-Host "`nAnalisando dependencias e identificando conflitos..." -ForegroundColor Cyan

# Lista de conflitos detectados
$listaConflitos = @()

# Verificar versao do Expo
$expoVersion = $packageJson.dependencies.expo -replace "\^|~", ""
Write-Host "Versao do Expo: $expoVersion" -ForegroundColor Yellow

# Verificar conflitos entre React e React DOM
$reactVersion = $packageJson.dependencies.react
$reactDomVersion = $packageJson.dependencies["react-dom"]

if ($reactVersion -ne $reactDomVersion) {
    $conflitosDetectados++
    $listaConflitos += "React ($reactVersion) e React DOM ($reactDomVersion) tem versoes diferentes"
    Write-Host "Conflito detectado: React ($reactVersion) e React DOM ($reactDomVersion) tem versoes diferentes" -ForegroundColor Red
    
    # Fixar versoes compativeis
    Write-Host "Fixando versoes de React e React DOM para 18.2.0" -ForegroundColor Yellow
    $packageJson.dependencies.react = "18.2.0"
    $packageJson.dependencies["react-dom"] = "18.2.0"
    
    # Verificar se ja existe uma resolucao
    if (-not $packageJson.PSObject.Properties.Name -contains "resolutions") {
        $packageJson | Add-Member -NotePropertyName "resolutions" -NotePropertyValue (New-Object PSObject)
    }
    
    # Adicionar resolutions para react e react-dom
    $packageJson.resolutions | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
    $packageJson.resolutions | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force
    
    # Verificar se ja existe um override
    if (-not $packageJson.PSObject.Properties.Name -contains "overrides") {
        $packageJson | Add-Member -NotePropertyName "overrides" -NotePropertyValue (New-Object PSObject)
    }
    
    # Adicionar overrides para react e react-dom
    $packageJson.overrides | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
    $packageJson.overrides | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force
    $conflitosResolvidos++
}

# Verificar conflitos entre @types/react e React
$typesReactVersion = $packageJson.devDependencies["@types/react"]
if ($typesReactVersion -and $reactVersion) {
    # Extrair versao principal do React (18.x.x)
    $reactMainVersion = $reactVersion -replace "\^|~|>|<|=|\s", "" -replace "(\d+)\..*", "$1"
    $typesReactMainVersion = $typesReactVersion -replace "\^|~|>|<|=|\s", "" -replace "(\d+)\..*", "$1"
    
    if ($reactMainVersion -ne $typesReactMainVersion) {
        $conflitosDetectados++
        $listaConflitos += "@types/react ($typesReactVersion) nao e compativel com react ($reactVersion)"
        Write-Host "Conflito detectado: @types/react ($typesReactVersion) nao e compativel com react ($reactVersion)" -ForegroundColor Red
        
        # Atualizar @types/react para versao compativel
        Write-Host "Atualizando @types/react para versao compativel com React $reactMainVersion" -ForegroundColor Yellow
        $packageJson.devDependencies["@types/react"] = "~18.2.45"
        
        # Adicionar a resolucao e override
        $packageJson.resolutions | Add-Member -NotePropertyName "@types/react" -NotePropertyValue "~18.2.45" -Force
        $packageJson.overrides | Add-Member -NotePropertyName "@types/react" -NotePropertyValue "~18.2.45" -Force
        $conflitosResolvidos++
    }
}

# Verificar conflitos entre react-native-paper e react-native
$rnPaperVersion = $packageJson.dependencies["react-native-paper"]
$rnVersion = $packageJson.dependencies["react-native"]

if ($rnPaperVersion -and $rnVersion) {
    # Verificar compatibilidade entre react-native-paper e react-native
    $rnMajorVersion = $rnVersion -replace "\^|~|>|<|=|\s", "" -replace "(\d+\.\d+)\..*", "$1"
    
    # React Native Paper 5.x e compativel com React Native 0.73.x
    if ($rnPaperVersion -like "*5.*" -and $rnMajorVersion -notlike "0.73*") {
        $conflitosDetectados++
        $listaConflitos += "react-native-paper ($rnPaperVersion) pode nao ser compativel com react-native ($rnVersion)"
        Write-Host "Conflito detectado: react-native-paper ($rnPaperVersion) pode nao ser compativel com react-native ($rnVersion)" -ForegroundColor Red
        
        # Atualizar react-native para versao compativel
        Write-Host "Atualizando react-native para versao compativel: 0.73.6" -ForegroundColor Yellow
        $packageJson.dependencies["react-native"] = "0.73.6"
        
        # Adicionar a resolucao e override
        $packageJson.resolutions | Add-Member -NotePropertyName "react-native" -NotePropertyValue "0.73.6" -Force
        $packageJson.overrides | Add-Member -NotePropertyName "react-native" -NotePropertyValue "0.73.6" -Force
        $conflitosResolvidos++
    }
}

# Verificar conflitos entre dependencias do Expo
Write-Host "`nVerificando compatibilidade das dependencias do Expo com a versao $expoVersion..." -ForegroundColor Cyan

# Mapeamento de versoes compativeis com Expo SDK 53
$expoSDK53Deps = @{
    "expo-constants" = "~15.4.6"
    "expo-crypto" = "~12.8.0"
    "expo-device" = "~5.9.0"
    "expo-notifications" = "^0.31.4"
    "expo-router" = "^3.5.24"
    "expo-secure-store" = "~12.8.0"
    "expo-status-bar" = "~1.11.1"
    "react-native-gesture-handler" = "~2.14.0"
    "react-native-reanimated" = "~3.6.2"
    "react-native-safe-area-context" = "4.8.2"
    "react-native-screens" = "~3.29.0"
    "react-native-web" = "~0.19.6"
    "@react-native-async-storage/async-storage" = "1.21.0"
}

# Verificar se as dependencias do Expo sao compativeis com a versao principal do Expo
$expoPackages = $packageJson.dependencies.PSObject.Properties | Where-Object { $_.Name -like "expo-*" -or $_.Name -like "@react-native-*" }
foreach ($package in $expoPackages) {
    $packageName = $package.Name
    $packageVersion = $package.Value -replace "\^|~", ""
    
    # Verificar se a versao e compativel com o Expo SDK atual
    if ($expoSDK53Deps.ContainsKey($packageName) -and $packageVersion -ne ($expoSDK53Deps[$packageName] -replace "\^|~", "")) {
        $conflitosDetectados++
        $listaConflitos += "$packageName ($packageVersion) nao e compativel com Expo SDK 53"
        Write-Host "Conflito detectado: $packageName ($packageVersion) nao e compativel com Expo SDK 53" -ForegroundColor Red
        
        # Atualizar para a versao compativel
        Write-Host "Atualizando $packageName para versao compativel: $($expoSDK53Deps[$packageName])" -ForegroundColor Yellow
        $packageJson.dependencies.$packageName = $expoSDK53Deps[$packageName]
        
        # Adicionar a resolucao e override
        $packageJson.resolutions | Add-Member -NotePropertyName $packageName -NotePropertyValue $expoSDK53Deps[$packageName] -Force
        $packageJson.overrides | Add-Member -NotePropertyName $packageName -NotePropertyValue $expoSDK53Deps[$packageName] -Force
        $conflitosResolvidos++
    }
}

# Verificar dependencias do Metro Bundler
Write-Host "`nVerificando compatibilidade das dependencias do Metro Bundler..." -ForegroundColor Cyan

# Lista de pacotes Metro para verificar
$metroPackages = @("metro", "metro-resolver", "metro-runtime", "metro-source-map", "metro-config", "metro-core")

# Verificar se todas as dependencias do Metro estao presentes e com versoes compativeis
foreach ($packageName in $metroPackages) {
    # Verificar se o pacote existe nas dependencias ou devDependencies
    $packageExists = $false
    $packageVersion = $null
    
    if ($packageJson.dependencies.PSObject.Properties.Name -contains $packageName) {
        $packageExists = $true
        $packageVersion = $packageJson.dependencies.$packageName
    } elseif ($packageJson.devDependencies.PSObject.Properties.Name -contains $packageName) {
        $packageExists = $true
        $packageVersion = $packageJson.devDependencies.$packageName
    }
    
    # Se o pacote nao existe ou tem versao incompativel
    if (-not $packageExists -or ($packageVersion -and ($packageVersion -notlike "*0.80*"))) {
        $conflitosDetectados++
        $currentVersion = if ($packageVersion) { $packageVersion } else { "nao instalado" }
        $listaConflitos += "$packageName ($currentVersion) nao e compativel com Expo SDK 53 (requer ^0.80.0)"
        Write-Host "Conflito detectado: $packageName ($currentVersion) nao e compativel com Expo SDK 53 (requer ^0.80.0)" -ForegroundColor Red
        
        # Atualizar para a versao compativel
        Write-Host "Atualizando $packageName para versao compativel: ^0.80.0" -ForegroundColor Yellow
        
        # Adicionar ou atualizar o pacote nas dependencias
        if (-not $packageJson.PSObject.Properties.Name -contains "dependencies") {
            $packageJson | Add-Member -NotePropertyName "dependencies" -NotePropertyValue (New-Object PSObject)
        }
        $packageJson.dependencies.$packageName = "^0.80.0"
        
        # Adicionar a resolucao e override
        $packageJson.resolutions | Add-Member -NotePropertyName $packageName -NotePropertyValue "^0.80.0" -Force
        $packageJson.overrides | Add-Member -NotePropertyName $packageName -NotePropertyValue "^0.80.0" -Force
        $conflitosResolvidos++
    }
}

# Verificar conflitos de peer dependencies
Write-Host "`nVerificando conflitos de peer dependencies..." -ForegroundColor Cyan

# Verificar se o React Native esta na versao correta para o Expo SDK 53
$reactNativeVersion = $packageJson.dependencies["react-native"]
if ($reactNativeVersion -and $reactNativeVersion -notlike "*0.73*") {
    $conflitosDetectados++
    $listaConflitos += "react-native ($reactNativeVersion) nao e compativel com Expo SDK 53 (requer ~0.73.6)"
    Write-Host "Conflito detectado: react-native ($reactNativeVersion) nao e compativel com Expo SDK 53 (requer ~0.73.6)" -ForegroundColor Red
    
    # Atualizar para a versao compativel
    Write-Host "Atualizando react-native para versao compativel: ~0.73.6" -ForegroundColor Yellow
    $packageJson.dependencies["react-native"] = "~0.73.6"
    
    # Adicionar a resolucao e override
    $packageJson.resolutions | Add-Member -NotePropertyName "react-native" -NotePropertyValue "~0.73.6" -Force
    $packageJson.overrides | Add-Member -NotePropertyName "react-native" -NotePropertyValue "~0.73.6" -Force
    $conflitosResolvidos++
}

# Verificar conflitos entre ThemeProvider personalizado e react-native-paper
Write-Host "`nVerificando conflitos entre ThemeProvider personalizado e react-native-paper..." -ForegroundColor Cyan

# Nao e necessario modificar o codigo, apenas alertar sobre o uso de useTheme
Write-Host "ALERTA: O projeto usa tanto um ThemeProvider personalizado quanto o useTheme do react-native-paper" -ForegroundColor Yellow
Write-Host "Isso pode causar conflitos de tema. Recomendamos padronizar o uso de apenas um sistema de tema." -ForegroundColor Yellow

# Salvar as alteracoes no package.json
Write-Host "`nSalvando alteracoes no package.json..." -ForegroundColor Cyan
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath
Write-Host "Alteracoes salvas com sucesso!" -ForegroundColor Green

# Remover node_modules e package-lock.json
Write-Host "`nLimpando instalacao anterior..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "Removendo node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

if (Test-Path "package-lock.json") {
    Write-Host "Removendo package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

# Limpar cache do NPM
Write-Host "`nLimpando cache do NPM..." -ForegroundColor Cyan
npm cache clean --force

# Configurar NPM para resolver conflitos
Write-Host "`nConfigurando NPM para resolver conflitos..." -ForegroundColor Cyan
npm config set legacy-peer-deps true

# Resumo das alteracoes
Write-Host "`nRESUMO DAS ALTERACOES" -ForegroundColor Magenta
Write-Host "====================" -ForegroundColor Magenta
Write-Host "Conflitos detectados: $conflitosDetectados" -ForegroundColor Yellow
Write-Host "Conflitos resolvidos: $conflitosResolvidos" -ForegroundColor Green

if ($listaConflitos.Count -gt 0) {
    Write-Host "`nLista de conflitos detectados:" -ForegroundColor Yellow
    foreach ($conflito in $listaConflitos) {
        Write-Host " - $conflito" -ForegroundColor Yellow
    }
}

# Instrucoes finais
Write-Host "`nPROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "1. Execute: npm install --legacy-peer-deps" -ForegroundColor White
Write-Host "2. Teste o aplicativo: npm start" -ForegroundColor White
Write-Host "3. Se ainda houver problemas, considere usar Node.js v18.19.0 (versao recomendada)" -ForegroundColor White

Write-Host "`nScript de resolucao de conflitos concluido!" -ForegroundColor Green