# Script para resolver conflitos de dependências NPM
# Açucaradas Encomendas - NPM Conflict Solver

# Configurações
$backupDir = "./backup-package-json"
$packageJsonPath = "./package.json"
$packageLockPath = "./package-lock.json"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$conflitosDetectados = 0
$conflitosResolvidos = 0
$projectRoot = (Get-Location).Path

Write-Host 'RELATÓRIO DE CONFLITOS NPM' -ForegroundColor Cyan
Write-Host '===========================' -ForegroundColor Cyan

# Verificar versão do Node.js
$nodeVersion = node --version
Write-Host 'Versão atual do Node.js: ' -NoNewline -ForegroundColor Yellow
Write-Host $nodeVersion -ForegroundColor Yellow

# Verificar versão do NPM
$npmVersion = npm --version
Write-Host 'Versão atual do NPM: ' -NoNewline -ForegroundColor Yellow
Write-Host $npmVersion -ForegroundColor Yellow

# Verificar versão recomendada no .nvmrc
$nvmrcVersion = Get-Content .nvmrc -ErrorAction SilentlyContinue
Write-Host 'Versão recomendada no .nvmrc: ' -NoNewline -ForegroundColor Yellow
Write-Host $nvmrcVersion -ForegroundColor Yellow

# Criar diretório de backup se não existir
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "Diretório de backup criado: $backupDir" -ForegroundColor Green
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
    Write-Host "Arquivo package.json não encontrado!" -ForegroundColor Red
    exit 1
}

# Fazer backup antes de qualquer modificação
Backup-PackageJson

# Ler o conteúdo do package.json
$packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

# Analisar dependências e identificar conflitos
Write-Host "`nAnalisando dependências e identificando conflitos..." -ForegroundColor Cyan

# Verificar versão do Expo
$expoVersion = $packageJson.dependencies.expo -replace "\^|~", ""
Write-Host "Versão do Expo: $expoVersion" -ForegroundColor Yellow

# Lista de conflitos detectados
$listaConflitos = @()

# Verificar conflitos entre React e React DOM
$reactVersion = $packageJson.dependencies.react
$reactDomVersion = $packageJson.dependencies["react-dom"]

if ($reactVersion -ne $reactDomVersion) {
    $conflitosDetectados++
    $listaConflitos += "React ($reactVersion) e React DOM ($reactDomVersion) têm versões diferentes"
    Write-Host "Conflito detectado: React ($reactVersion) e React DOM ($reactDomVersion) têm versões diferentes" -ForegroundColor Red
    
    # Verificar se já existe uma resolução
    if (-not $packageJson.resolutions -or -not $packageJson.resolutions.react -or -not $packageJson.resolutions["react-dom"]) {
        Write-Host "Adicionando resolutions para react e react-dom" -ForegroundColor Yellow
        
        # Criar objeto resolutions se não existir
        if (-not $packageJson.PSObject.Properties.Name -contains "resolutions") {
            $packageJson | Add-Member -NotePropertyName "resolutions" -NotePropertyValue (New-Object PSObject)
        }
        
        # Adicionar resolutions para react e react-dom
        $packageJson.resolutions | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
        $packageJson.resolutions | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force
        $conflitosResolvidos++
    }
    
    # Verificar se já existe um override
    if (-not $packageJson.overrides -or -not $packageJson.overrides.react -or -not $packageJson.overrides["react-dom"]) {
        Write-Host "Adicionando overrides para react e react-dom" -ForegroundColor Yellow
        
        # Criar objeto overrides se não existir
        if (-not $packageJson.PSObject.Properties.Name -contains "overrides") {
            $packageJson | Add-Member -NotePropertyName "overrides" -NotePropertyValue (New-Object PSObject)
        }
        
        # Adicionar overrides para react e react-dom
        $packageJson.overrides | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
        $packageJson.overrides | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force
        $conflitosResolvidos++
    }
}

# Verificar conflitos entre @types/react e React
$typesReactVersion = $packageJson.devDependencies["@types/react"]
if ($typesReactVersion -and $reactVersion) {
    # Extrair versão principal do React (18.x.x)
    $reactMainVersion = $reactVersion -replace "\^|~|>|<|=|\s", "" -replace "(\d+)\..*", "$1"
    $typesReactMainVersion = $typesReactVersion -replace "\^|~|>|<|=|\s", "" -replace "(\d+)\..*", "$1"
    
    if ($reactMainVersion -ne $typesReactMainVersion) {
        $conflitosDetectados++
        $listaConflitos += "@types/react ($typesReactVersion) não é compatível com react ($reactVersion)"
        Write-Host "Conflito detectado: @types/react ($typesReactVersion) não é compatível com react ($reactVersion)" -ForegroundColor Red
        
        # Atualizar @types/react para versão compatível
        Write-Host "Atualizando @types/react para versão compatível com React $reactMainVersion" -ForegroundColor Yellow
        $packageJson.devDependencies["@types/react"] = "~18.2.45"
        
        # Adicionar à resolução e override
        $packageJson.resolutions | Add-Member -NotePropertyName "@types/react" -NotePropertyValue "~18.2.45" -Force
        $packageJson.overrides | Add-Member -NotePropertyName "@types/react" -NotePropertyValue "~18.2.45" -Force
        $conflitosResolvidos++
    }
}

# Verificar conflitos entre dependências do Expo
Write-Host "`nVerificando compatibilidade das dependências do Expo com a versão $expoVersion..." -ForegroundColor Cyan

# Mapeamento de versões compatíveis com Expo SDK 53
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
    "metro" = "^0.80.0"
    "metro-resolver" = "^0.80.0"
    "metro-runtime" = "^0.80.0"
    "metro-source-map" = "^0.80.0"
    "metro-config" = "^0.80.0"
}

# Verificar se as dependências do Expo são compatíveis com a versão principal do Expo
$expoPackages = $packageJson.dependencies.PSObject.Properties | Where-Object { $_.Name -like "expo-*" }
foreach ($package in $expoPackages) {
    $packageName = $package.Name
    $packageVersion = $package.Value -replace "\^|~", ""
    
    # Verificar se a versão é compatível com o Expo SDK atual
    if ($expoSDK53Deps.ContainsKey($packageName) -and $packageVersion -ne ($expoSDK53Deps[$packageName] -replace "\^|~", "")) {
        $conflitosDetectados++
        $listaConflitos += "$packageName ($packageVersion) não é compatível com Expo SDK 53"
        Write-Host "Conflito detectado: $packageName ($packageVersion) não é compatível com Expo SDK 53" -ForegroundColor Red
        
        # Atualizar para a versão compatível
        Write-Host "Atualizando $packageName para versão compatível: $($expoSDK53Deps[$packageName])" -ForegroundColor Yellow
        $packageJson.dependencies.$packageName = $expoSDK53Deps[$packageName]
        $conflitosResolvidos++
    }
}

# Verificar dependências do Metro Bundler
Write-Host "`nVerificando compatibilidade das dependências do Metro Bundler..." -ForegroundColor Cyan

# Lista de pacotes Metro para verificar
$metroPackages = @("metro", "metro-resolver", "metro-runtime", "metro-source-map", "metro-config")

# Verificar se todas as dependências do Metro estão presentes e com versões compatíveis
foreach ($packageName in $metroPackages) {
    # Verificar se o pacote existe nas dependências ou devDependencies
    $packageExists = $false
    $packageVersion = $null
    
    if ($packageJson.dependencies.PSObject.Properties.Name -contains $packageName) {
        $packageExists = $true
        $packageVersion = $packageJson.dependencies.$packageName
    } elseif ($packageJson.devDependencies.PSObject.Properties.Name -contains $packageName) {
        $packageExists = $true
        $packageVersion = $packageJson.devDependencies.$packageName
    }
    
    # Se o pacote não existe ou tem versão incompatível
    if (-not $packageExists -or ($packageVersion -and ($packageVersion -notlike "*0.80*"))) {
        $conflitosDetectados++
        $currentVersion = if ($packageVersion) { $packageVersion } else { "não instalado" }
        $listaConflitos += "$packageName ($currentVersion) não é compatível com Expo SDK 53"
        Write-Host "Conflito detectado: $packageName ($currentVersion) não é compatível com Expo SDK 53" -ForegroundColor Red
        
        # Adicionar ou atualizar para a versão compatível
        Write-Host "Adicionando/atualizando $packageName para versão compatível: $($expoSDK53Deps[$packageName])" -ForegroundColor Yellow
        
        # Decidir se adiciona em dependencies ou devDependencies
        if ($packageExists -and $packageJson.devDependencies.PSObject.Properties.Name -contains $packageName) {
            $packageJson.devDependencies.$packageName = $expoSDK53Deps[$packageName]
        } else {
            # Garantir que o objeto dependencies existe
            if (-not $packageJson.PSObject.Properties.Name -contains "dependencies") {
                $packageJson | Add-Member -NotePropertyName "dependencies" -NotePropertyValue (New-Object PSObject)
            }
            $packageJson.dependencies.$packageName = $expoSDK53Deps[$packageName]
        }
        
        # Adicionar à resolução e override
        $packageJson.resolutions | Add-Member -NotePropertyName $packageName -NotePropertyValue $expoSDK53Deps[$packageName] -Force
        $packageJson.overrides | Add-Member -NotePropertyName $packageName -NotePropertyValue $expoSDK53Deps[$packageName] -Force
        
        $conflitosResolvidos++
    }
}

# Verificar conflitos de peer dependencies
Write-Host "`nVerificando conflitos de peer dependencies..." -ForegroundColor Cyan

# Verificar se o React Native está na versão correta para o Expo SDK 53
$reactNativeVersion = $packageJson.dependencies["react-native"]
if ($reactNativeVersion -and $reactNativeVersion -notlike "*0.73*") {
    $conflitosDetectados++
    $listaConflitos += "react-native ($reactNativeVersion) não é compatível com Expo SDK 53 (requer ~0.73.2)"
    Write-Host "Conflito detectado: react-native ($reactNativeVersion) não é compatível com Expo SDK 53 (requer ~0.73.2)" -ForegroundColor Red
    
    # Atualizar para a versão compatível
    Write-Host "Atualizando react-native para versão compatível: ~0.73.2" -ForegroundColor Yellow
    $packageJson.dependencies["react-native"] = "~0.73.2"
    
    # Adicionar à resolução e override
    $packageJson.resolutions | Add-Member -NotePropertyName "react-native" -NotePropertyValue "~0.73.2" -Force
    $packageJson.overrides | Add-Member -NotePropertyName "react-native" -NotePropertyValue "~0.73.2" -Force
    
    $conflitosResolvidos++
}

# Atualizar package.json com versões compatíveis
Write-Host "`nAtualizando package.json..." -ForegroundColor Yellow

# Salvar o package.json atualizado
$packageJsonPath = Join-Path $projectRoot "package.json"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath -Encoding UTF8

# Criar arquivo .npmrc se não existir
$npmrcPath = Join-Path $projectRoot ".npmrc"
if (-not (Test-Path $npmrcPath)) {
    Write-Host "Criando arquivo .npmrc com configurações otimizadas..." -ForegroundColor Yellow
    @"
legacy-peer-deps=true
strict-peer-dependencies=false
engine-strict=false
resolve-peers-from-workspace-root=true
"@ | Set-Content -Path $npmrcPath -Encoding UTF8
}

# Gerar relatório de conflitos
Write-Host "`n`n🔍 RELATÓRIO DE CONFLITOS NPM" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Determinar status geral
$statusGeral = "Sem conflitos"
if ($conflitosDetectados -gt 0) {
    if ($conflitosDetectados -eq $conflitosResolvidos) {
        $statusGeral = "Conflitos resolvidos"
    } elseif ($conflitosResolvidos -gt 0) {
        $statusGeral = "Conflitos parcialmente resolvidos"
    } else {
        $statusGeral = "Conflitos graves não resolvidos"
    }
}

Write-Host "STATUS GERAL: $statusGeral" -ForegroundColor $(if ($statusGeral -eq "Sem conflitos") { "Green" } elseif ($statusGeral -eq "Conflitos resolvidos") { "Yellow" } else { "Red" })
Write-Host "Conflitos detectados: $conflitosDetectados" -ForegroundColor $(if ($conflitosDetectados -eq 0) { "Green" } else { "Yellow" })
Write-Host "Conflitos resolvidos: $conflitosResolvidos" -ForegroundColor $(if ($conflitosResolvidos -eq $conflitosDetectados) { "Green" } else { "Yellow" })

# Listar conflitos detectados
if ($listaConflitos.Count -gt 0) {
    Write-Host "`n📦 CONFLITOS DETECTADOS:" -ForegroundColor Yellow
    foreach ($conflito in $listaConflitos) {
        Write-Host "- $conflito" -ForegroundColor Yellow
    }
}

# Sugestões avançadas
Write-Host "`n🧠 SUGESTÕES AVANÇADAS:" -ForegroundColor Cyan
Write-Host "- Execute 'npm install --legacy-peer-deps' para aplicar as alterações" -ForegroundColor White
Write-Host "- Execute 'npx expo-doctor' para verificar a integridade do projeto" -ForegroundColor White
Write-Host "- Execute 'npx expo start --clear' para iniciar o projeto com cache limpo" -ForegroundColor White
Write-Host "- Considere usar o script 'dev-with-node20.bat' para desenvolvimento" -ForegroundColor White

# Verificar se há conflitos não resolvidos
if ($conflitosDetectados -gt $conflitosResolvidos) {
    Write-Host "`n⚠️ ATENÇÃO: Existem conflitos que não puderam ser resolvidos automaticamente." -ForegroundColor Red
    Write-Host "   Recomenda-se revisar manualmente o package.json e resolver os conflitos restantes." -ForegroundColor Red
} elseif ($conflitosResolvidos -gt 0) {
    Write-Host "`n✅ SUCESSO: Todos os conflitos foram resolvidos automaticamente." -ForegroundColor Green
    Write-Host "   Execute 'npm install --legacy-peer-deps' para aplicar as alterações." -ForegroundColor Green
} else {
    Write-Host "`n✅ SUCESSO: Não foram detectados conflitos no projeto." -ForegroundColor Green
}

Write-Host "`nRelatório concluído em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# Limpar cache e arquivos antigos
Write-Host "`nDeseja limpar o cache do NPM e reinstalar as dependências? (S/N)" -ForegroundColor Cyan
$resposta = Read-Host

if ($resposta -eq "S" -or $resposta -eq "s") {
    Write-Host "`nLimpando cache e arquivos temporários..." -ForegroundColor Yellow
    
    # Limpar cache do NPM
    npm cache clean --force
    
    # Remover node_modules
    $nodeModulesPath = Join-Path $projectRoot "node_modules"
    if (Test-Path $nodeModulesPath) {
        Write-Host "Removendo node_modules..." -ForegroundColor Yellow
        Remove-Item -Path $nodeModulesPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Remover .expo
    $expoPath = Join-Path $projectRoot ".expo"
    if (Test-Path $expoPath) {
        Write-Host "Removendo .expo..." -ForegroundColor Yellow
        Remove-Item -Path $expoPath -Recurse -Force -ErrorAction SilentlyContinue
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

Write-Host "Script concluido!" -ForegroundColor Cyan