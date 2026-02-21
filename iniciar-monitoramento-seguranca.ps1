# Script para iniciar o monitoramento de segurança integrado

# Definir caminhos dos scripts
$scriptsPaths = @{
    "IniciarImplementacao" = Join-Path -Path $PSScriptRoot -ChildPath "iniciar-implementacao.ps1"
    "ImplementacaoGradual" = Join-Path -Path $PSScriptRoot -ChildPath "implementacao-gradual.ps1"
    "SIEMHomologacao" = Join-Path -Path $PSScriptRoot -ChildPath "implementacao-siem-homologacao.ps1"
    "SimulacaoIncidentes" = Join-Path -Path $PSScriptRoot -ChildPath "simulacao-incidentes.ps1"
    "Dashboard" = Join-Path -Path $PSScriptRoot -ChildPath "iniciar-dashboard.ps1"
    "AtualizarDashboard" = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
    "GerarRelatorio" = Join-Path -Path $PSScriptRoot -ChildPath "gerar-relatorio-seguranca.ps1"
}

# Verificar existência dos scripts
function Test-ScriptsExistence {
    $missingScripts = @()
    
    foreach ($key in $scriptsPaths.Keys) {
        if (-not (Test-Path -Path $scriptsPaths[$key])) {
            $missingScripts += $key
        }
    }
    
    if ($missingScripts.Count -gt 0) {
        Write-Warning "Os seguintes scripts não foram encontrados:"
        foreach ($script in $missingScripts) {
            Write-Warning "- $script: $($scriptsPaths[$script])"
        }
        return $false
    }
    
    return $true
}

# Função para revisar documentação
function Review-SecurityDocumentation {
    $documentationFiles = @(
        "PROXIMOS_PASSOS_IMPLEMENTACAO.md",
        "CHECKLIST_IMPLEMENTACAO_SEGURANCA.md",
        "MODELO_RELATORIO_PROGRESSO.md",
        "PLANO_TREINAMENTO_SEGURANCA.md",
        "PLANO_RESPOSTA_INCIDENTES.md",
        "SIEM_DOCUMENTATION.md"
    )
    
    $missingDocs = @()
    foreach ($doc in $documentationFiles) {
        $docPath = Join-Path -Path $PSScriptRoot -ChildPath $doc
        if (-not (Test-Path -Path $docPath)) {
            $missingDocs += $doc
        }
    }
    
    if ($missingDocs.Count -gt 0) {
        Write-Warning "Os seguintes documentos não foram encontrados:"
        foreach ($doc in $missingDocs) {
            Write-Warning "- $doc"
        }
    }
    else {
        Write-Host "Todos os documentos de segurança estão disponíveis para revisão." -ForegroundColor Green
    }
    
    # Perguntar se deseja abrir os documentos para revisão
    $abrirDocs = Read-Host "Deseja abrir os documentos para revisão? (S/N)"
    if ($abrirDocs -eq "S" -or $abrirDocs -eq "s") {
        foreach ($doc in $documentationFiles) {
            $docPath = Join-Path -Path $PSScriptRoot -ChildPath $doc
            if (Test-Path -Path $docPath) {
                Write-Host "Abrindo documento: $doc" -ForegroundColor Cyan
                Start-Process $docPath
                Start-Sleep -Seconds 1  # Pequena pausa entre aberturas
            }
        }
    }
}

# Função para iniciar implementação gradual
function Start-GradualImplementation {
    if (Test-Path -Path $scriptsPaths.ImplementacaoGradual) {
        Write-Host "Iniciando implementação gradual..." -ForegroundColor Yellow
        & $scriptsPaths.ImplementacaoGradual
    }
    else {
        Write-Error "Script de implementação gradual não encontrado!"
    }
}

# Função para configurar ambiente SIEM
function Start-SIEMConfiguration {
    if (Test-Path -Path $scriptsPaths.SIEMHomologacao) {
        Write-Host "Iniciando configuração do ambiente SIEM..." -ForegroundColor Yellow
        & $scriptsPaths.SIEMHomologacao
    }
    else {
        Write-Error "Script de configuração SIEM não encontrado!"
    }
}

# Função para iniciar dashboard de segurança
function Start-SecurityDashboard {
    if (Test-Path -Path $scriptsPaths.Dashboard) {
        Write-Host "Iniciando dashboard de segurança..." -ForegroundColor Yellow
        & $scriptsPaths.Dashboard
    }
    else {
        Write-Error "Script do dashboard não encontrado!"
    }
}

# Função para atualizar dashboard
function Update-SecurityDashboard {
    if (Test-Path -Path $scriptsPaths.AtualizarDashboard) {
        Write-Host "Atualizando dados do dashboard..." -ForegroundColor Yellow
        & $scriptsPaths.AtualizarDashboard
    }
    else {
        Write-Error "Script de atualização do dashboard não encontrado!"
    }
}

# Função para gerar relatório de segurança
function Generate-SecurityReport {
    if (Test-Path -Path $scriptsPaths.GerarRelatorio) {
        Write-Host "Gerando relatório de segurança..." -ForegroundColor Yellow
        & $scriptsPaths.GerarRelatorio
    }
    else {
        Write-Error "Script de geração de relatórios não encontrado!"
    }
}

# Função para iniciar implementação completa
function Start-FullImplementation {
    if (Test-Path -Path $scriptsPaths.IniciarImplementacao) {
        Write-Host "Iniciando implementação completa..." -ForegroundColor Yellow
        & $scriptsPaths.IniciarImplementacao
    }
    else {
        Write-Error "Script de implementação completa não encontrado!"
    }
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-Host "Verificando pré-requisitos..." -ForegroundColor Cyan
    
    # Verificar PowerShell versão
    $psVersion = $PSVersionTable.PSVersion
    Write-Host "Versão do PowerShell: $($psVersion.Major).$($psVersion.Minor).$($psVersion.Build)" -ForegroundColor Yellow
    
    # Verificar permissões de administrador
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) {
        Write-Host "Executando como administrador: Sim" -ForegroundColor Green
    }
    else {
        Write-Host "Executando como administrador: Não" -ForegroundColor Red
        Write-Warning "Algumas funcionalidades podem requerer privilégios de administrador."
    }
    
    # Verificar conectividade de rede
    try {
        $pingResult = Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet
        if ($pingResult) {
            Write-Host "Conectividade de rede: OK" -ForegroundColor Green
        }
        else {
            Write-Host "Conectividade de rede: Falha" -ForegroundColor Red
            Write-Warning "Verifique sua conexão com a internet."
        }
    }
    catch {
        Write-Host "Conectividade de rede: Erro ao verificar" -ForegroundColor Red
        Write-Warning "Erro ao verificar conectividade: $_"
    }
    
    # Verificar espaço em disco
    $drive = Get-PSDrive -Name ($PSScriptRoot.Substring(0, 1))
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
    $totalSpaceGB = [math]::Round(($drive.Free + $drive.Used) / 1GB, 2)
    $percentFree = [math]::Round(($drive.Free / ($drive.Free + $drive.Used)) * 100, 2)
    
    Write-Host "Espaço livre em disco: $freeSpaceGB GB de $totalSpaceGB GB ($percentFree%)" -ForegroundColor Yellow
    
    if ($percentFree -lt 10) {
        Write-Warning "Espaço em disco baixo! Recomenda-se pelo menos 10% de espaço livre."
    }
    
    # Verificar scripts necessários
    $scriptsExist = Test-ScriptsExistence
    if (-not $scriptsExist) {
        Write-Warning "Alguns scripts necessários não foram encontrados."
    }
    else {
        Write-Host "Todos os scripts necessários estão disponíveis." -ForegroundColor Green
    }
    
    return $true
}

# Menu principal
function Show-Menu {
    Clear-Host
    Write-Host "===== Monitoramento de Segurança - Açucaradas Encomendas =====" -ForegroundColor Magenta
    Write-Host "1. Verificar pré-requisitos" -ForegroundColor Cyan
    Write-Host "2. Revisar documentação de segurança" -ForegroundColor Cyan
    Write-Host "3. Iniciar implementação gradual" -ForegroundColor Cyan
    Write-Host "4. Configurar ambiente SIEM (homologação)" -ForegroundColor Cyan
    Write-Host "5. Visualizar dashboard de segurança" -ForegroundColor Cyan
    Write-Host "6. Atualizar dados do dashboard" -ForegroundColor Cyan
    Write-Host "7. Gerar relatório de segurança" -ForegroundColor Cyan
    Write-Host "8. Iniciar implementação completa" -ForegroundColor Cyan
    Write-Host "9. Sair" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Magenta
    
    $opcao = Read-Host "Selecione uma opção"
    
    switch ($opcao) {
        "1" { Test-Prerequisites; pause; Show-Menu }
        "2" { Review-SecurityDocumentation; pause; Show-Menu }
        "3" { Start-GradualImplementation; Show-Menu }
        "4" { Start-SIEMConfiguration; Show-Menu }
        "5" { Start-SecurityDashboard; Show-Menu }
        "6" { Update-SecurityDashboard; pause; Show-Menu }
        "7" { Generate-SecurityReport; Show-Menu }
        "8" { Start-FullImplementation; Show-Menu }
        "9" { exit }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; pause; Show-Menu }
    }
}

# Exibir banner inicial
function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  █████╗  ██████╗██╗   ██╗ ██████╗ █████╗ ██████╗  █████╗ ██████╗  █████╗ ███████╗" -ForegroundColor Magenta
    Write-Host " ██╔══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝" -ForegroundColor Magenta
    Write-Host " ███████║██║     ██║   ██║██║     ███████║██████╔╝███████║██║  ██║███████║███████╗" -ForegroundColor Magenta
    Write-Host " ██╔══██║██║     ██║   ██║██║     ██╔══██║██╔══██╗██╔══██║██║  ██║██╔══██║╚════██║" -ForegroundColor Magenta
    Write-Host " ██║  ██║╚██████╗╚██████╔╝╚██████╗██║  ██║██║  ██║██║  ██║██████╔╝██║  ██║███████║" -ForegroundColor Magenta
    Write-Host " ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝" -ForegroundColor Magenta
    Write-Host "                                                                                    " -ForegroundColor Magenta
    Write-Host "                   SISTEMA DE MONITORAMENTO DE SEGURANÇA                          " -ForegroundColor Cyan
    Write-Host "                                                                                    " -ForegroundColor Magenta
    Write-Host ""
    Start-Sleep -Seconds 2
}

# Iniciar o programa
Show-Banner
Show-Menu