# Script para iniciar o Dashboard de Segurança

$dashboardPath = Join-Path -Path $PSScriptRoot -ChildPath "dashboard-seguranca.html"

# Verificar se o arquivo do dashboard existe
if (-not (Test-Path -Path $dashboardPath)) {
    Write-Error "Arquivo do dashboard não encontrado em: $dashboardPath"
    exit 1
}

# Função para abrir o dashboard no navegador padrão
function Open-Dashboard {
    Write-Host "Iniciando Dashboard de Segurança - Açucaradas Encomendas" -ForegroundColor Magenta
    Write-Host "Abrindo arquivo: $dashboardPath" -ForegroundColor Cyan
    
    try {
        # Abrir o dashboard no navegador padrão
        Start-Process $dashboardPath
        Write-Host "Dashboard aberto com sucesso!" -ForegroundColor Green
    }
    catch {
        Write-Error "Erro ao abrir o dashboard: $_"
        exit 1
    }
}

# Função para iniciar a implementação
function Start-Implementation {
    $implementacaoScript = Join-Path -Path $PSScriptRoot -ChildPath "iniciar-implementacao.ps1"
    
    if (Test-Path -Path $implementacaoScript) {
        Write-Host "Iniciando script de implementação..." -ForegroundColor Yellow
        try {
            & $implementacaoScript
        }
        catch {
            Write-Error "Erro ao executar o script de implementação: $_"
        }
    }
    else {
        Write-Warning "Script de implementação não encontrado em: $implementacaoScript"
        Write-Host "Você pode executar o script manualmente." -ForegroundColor Yellow
    }
}

# Menu principal
function Show-Menu {
    Clear-Host
    Write-Host "===== Dashboard de Segurança - Açucaradas Encomendas =====" -ForegroundColor Magenta
    Write-Host "1. Abrir Dashboard no navegador" -ForegroundColor Cyan
    Write-Host "2. Iniciar implementação de segurança" -ForegroundColor Cyan
    Write-Host "3. Sair" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Magenta
    
    $opcao = Read-Host "Selecione uma opção"
    
    switch ($opcao) {
        "1" { Open-Dashboard; pause; Show-Menu }
        "2" { Start-Implementation; pause; Show-Menu }
        "3" { exit }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; pause; Show-Menu }
    }
}

# Iniciar o menu
Show-Menu