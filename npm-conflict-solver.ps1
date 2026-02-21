# Script para resolver conflitos de dependencias NPM
# Acucaradas Encomendas - NPM Conflict Solver

# Configuracoes
$backupDir = "./backup-package-json"
$packageJsonPath = "./package.json"
$packageLockPath = "./package-lock.json"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$conflitosDetectados = 0
$conflitosResolvidos = 0
$projectRoot = (Get-Location).Path
$listaConflitos = @()

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
Write-Host "Analisando dependencias e identificando conflitos..." -ForegroundColor Cyan

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
    
    # Verificar se ja existe uma resolucao
    if (-not $packageJson.resolutions -or -not $packageJson.resolutions.react -or -not $packageJson.resolutions["react-dom"]) {
        Write-Host "Adicionando resolutions para react e react-dom" -ForegroundColor Yellow
        
        # Criar objeto resolutions se nao existir
        if (-not $packageJson.PSObject.Properties.Name -contains "resolutions") {
            $packageJson | Add-Member -NotePropertyName "resolutions" -NotePropertyValue (New-Object PSObject)
        }
        
        # Adicionar resolutions para react e react-dom
        $packageJson.resolutions | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
        $packageJson.resolutions | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force
        $conflitosResolvidos++
    }
    
    # Verificar se ja existe um override
    if (-not $packageJson.overrides -or -not $packageJson.overrides.react -or -not $packageJson.overrides["react-dom"]) {
        Write-Host "Adicionando overrides para react e react-dom" -ForegroundColor Yellow
        
        # Criar objeto overrides se nao existir
        if (-not $packageJson.PSObject.Properties.Name -contains "overrides") {
            $packageJson | Add-Member -NotePropertyName "overrides" -NotePropertyValue (New-Object PSObject)
        }
        
        # Adicionar overrides para react e react-dom
        $packageJson.overrides | Add-Member -NotePropertyName "react" -NotePropertyValue "18.2.0" -Force
        $packageJson.overrides | Add-Member -NotePropertyName "react-dom" -NotePropertyValue "18.2.0" -Force
        $conflitosResolvidos++
    }
}

# Atualizar package.json com versoes compativeis
Write-Host "Atualizando package.json..." -ForegroundColor Yellow

# Salvar o package.json atualizado
$packageJsonPath = Join-Path $projectRoot "package.json"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath -Encoding UTF8

# Criar arquivo .npmrc se nao existir
$npmrcPath = Join-Path $projectRoot ".npmrc"
if (-not (Test-Path $npmrcPath)) {
    Write-Host "Criando arquivo .npmrc com configuracoes otimizadas..." -ForegroundColor Yellow
    @"
legacy-peer-deps=true
strict-peer-dependencies=false
engine-strict=false
resolve-peers-from-workspace-root=true
"@ | Set-Content -Path $npmrcPath -Encoding UTF8
}

# Gerar relatorio de conflitos
Write-Host "RELATORIO DE CONFLITOS NPM" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Determinar status geral
$statusGeral = "Sem conflitos"
if ($conflitosDetectados -gt 0) {
    if ($conflitosDetectados -eq $conflitosResolvidos) {
        $statusGeral = "Conflitos resolvidos"
    } elseif ($conflitosResolvidos -gt 0) {
        $statusGeral = "Conflitos parcialmente resolvidos"
    } else {
        $statusGeral = "Conflitos graves nao resolvidos"
    }
}

Write-Host "STATUS GERAL: $statusGeral" -ForegroundColor Yellow
Write-Host "Conflitos detectados: $conflitosDetectados" -ForegroundColor Yellow
Write-Host "Conflitos resolvidos: $conflitosResolvidos" -ForegroundColor Yellow

# Listar conflitos detectados
if ($listaConflitos.Count -gt 0) {
    Write-Host "CONFLITOS DETECTADOS:" -ForegroundColor Yellow
    foreach ($conflito in $listaConflitos) {
        Write-Host "- $conflito" -ForegroundColor Yellow
    }
}

# Sugestoes avancadas
Write-Host "SUGESTOES AVANCADAS:" -ForegroundColor Cyan
Write-Host "- Execute 'npm install --legacy-peer-deps' para aplicar as alteracoes" -ForegroundColor White
Write-Host "- Execute 'npx expo-doctor' para verificar a integridade do projeto" -ForegroundColor White
Write-Host "- Execute 'npx expo start --clear' para iniciar o projeto com cache limpo" -ForegroundColor White

# Verificar se ha conflitos nao resolvidos
if ($conflitosDetectados -gt $conflitosResolvidos) {
    Write-Host "ATENCAO: Existem conflitos que nao puderam ser resolvidos automaticamente." -ForegroundColor Red
    Write-Host "Recomenda-se revisar manualmente o package.json e resolver os conflitos restantes." -ForegroundColor Red
} elseif ($conflitosResolvidos -gt 0) {
    Write-Host "SUCESSO: Todos os conflitos foram resolvidos automaticamente." -ForegroundColor Green
    Write-Host "Execute 'npm install --legacy-peer-deps' para aplicar as alteracoes." -ForegroundColor Green
} else {
    Write-Host "SUCESSO: Nao foram detectados conflitos no projeto." -ForegroundColor Green
}

Write-Host "Relatorio concluido em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# Limpar cache e arquivos antigos
Write-Host "Deseja limpar o cache do NPM e reinstalar as dependencias? (S/N)" -ForegroundColor Cyan
$resposta = Read-Host

if ($resposta -eq "S" -or $resposta -eq "s") {
    Write-Host "Limpando cache e arquivos temporarios..." -ForegroundColor Yellow
    
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
    
    # Reinstalar dependencias
    Write-Host "Reinstalando dependencias..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
    
    # Verificar integridade do projeto
    Write-Host "Verificando integridade do projeto com expo-doctor..." -ForegroundColor Yellow
    npx expo-doctor
    
    Write-Host "Processo de limpeza e reinstalacao concluido!" -ForegroundColor Green
    Write-Host "Voce pode iniciar o projeto com 'npx expo start --clear' ou usar o script 'dev-with-node20.bat'" -ForegroundColor Green
} else {
    Write-Host "Operacao de limpeza e reinstalacao cancelada pelo usuario." -ForegroundColor Yellow
    Write-Host "Para aplicar as alteracoes manualmente, execute:" -ForegroundColor Yellow
    Write-Host "1. npm cache clean --force" -ForegroundColor White
    Write-Host "2. npm install --legacy-peer-deps" -ForegroundColor White
    Write-Host "3. npx expo-doctor" -ForegroundColor White
    Write-Host "4. npx expo start --clear" -ForegroundColor White
}

Write-Host "Script concluido!" -ForegroundColor Cyan