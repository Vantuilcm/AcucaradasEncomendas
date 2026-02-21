# Script para atualizar todos os componentes do dashboard de segurança

$scriptRoot = $PSScriptRoot
$atualizarDashboardScript = Join-Path -Path $scriptRoot -ChildPath "atualizar-dashboard.ps1"
$dashboardPath = Join-Path -Path $scriptRoot -ChildPath "dashboard-seguranca.html"
$verificarIntegridadeScript = Join-Path -Path $scriptRoot -ChildPath "verificar-integridade.ps1"
$verificarSegurancaServidorScript = Join-Path -Path $scriptRoot -ChildPath "verificar-seguranca-servidor.ps1"
$verificarSegurancaBDScript = Join-Path -Path $scriptRoot -ChildPath "verificar-seguranca-bd.ps1"

Write-Host "=== Atualização Completa do Dashboard de Segurança ===" -ForegroundColor Magenta

# Verificar se o script de atualização existe
if (-not (Test-Path -Path $atualizarDashboardScript)) {
    Write-Host "ERRO: Script de atualização do dashboard não encontrado em: $atualizarDashboardScript" -ForegroundColor Red
    exit 1
}

# Verificar se o dashboard existe
if (-not (Test-Path -Path $dashboardPath)) {
    Write-Host "ERRO: Dashboard de segurança não encontrado em: $dashboardPath" -ForegroundColor Red
    exit 1
}

# Executar a atualização automática do dashboard
Write-Host "`n1. Executando atualização automática do dashboard..." -ForegroundColor Cyan
try {
    & $atualizarDashboardScript
    Write-Host "   Atualização automática concluída com sucesso." -ForegroundColor Green
} catch {
    Write-Host "   ERRO ao executar a atualização automática: $_" -ForegroundColor Red
}

# Perguntar se deseja atualizar manualmente também
$atualizarManual = Read-Host "`nDeseja também atualizar manualmente os percentuais de progresso? (S/N)"

if ($atualizarManual -eq "S" -or $atualizarManual -eq "s") {
    $atualizarManualScript = Join-Path -Path $scriptRoot -ChildPath "atualizar-progresso-manual.ps1"
    
    if (Test-Path -Path $atualizarManualScript) {
        Write-Host "`n2. Iniciando atualização manual de progresso..." -ForegroundColor Cyan
        try {
            & $atualizarManualScript
            Write-Host "   Atualização manual concluída com sucesso." -ForegroundColor Green
        } catch {
            Write-Host "   ERRO ao executar a atualização manual: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "`nERRO: Script de atualização manual não encontrado em: $atualizarManualScript" -ForegroundColor Red
    }
}

# Verificar se o script de verificação de vulnerabilidades existe
$verificarVulnerabilidadesScript = Join-Path -Path $scriptRoot -ChildPath "verificar-vulnerabilidades.ps1"
if (Test-Path -Path $verificarVulnerabilidadesScript) {
    $verificarVulnerabilidades = Read-Host "`nDeseja executar a verificação de vulnerabilidades? (S/N)"
    if ($verificarVulnerabilidades -eq "S" -or $verificarVulnerabilidades -eq "s") {
        & $verificarVulnerabilidadesScript
    }
}

# Verificar se o script de monitoramento de segurança existe
$monitoramentoSegurancaScript = Join-Path -Path $scriptRoot -ChildPath "monitoramento-seguranca.ps1"
if (Test-Path -Path $monitoramentoSegurancaScript) {
    $executarMonitoramento = Read-Host "`nDeseja executar o monitoramento de segurança? (S/N)"
    if ($executarMonitoramento -eq "S" -or $executarMonitoramento -eq "s") {
        & $monitoramentoSegurancaScript
    }
}

# Verificar se o script de integração com ferramentas existe
$integracaoFerramentasScript = Join-Path -Path $scriptRoot -ChildPath "integracao-ferramentas.ps1"
if (Test-Path -Path $integracaoFerramentasScript) {
    $executarIntegracao = Read-Host "`nDeseja executar a integração com ferramentas externas? (S/N)"
    if ($executarIntegracao -eq "S" -or $executarIntegracao -eq "s") {
        & $integracaoFerramentasScript
    }
}

# Verificar se o script de treinamento de segurança existe
$treinamentoSegurancaScript = Join-Path -Path $scriptRoot -ChildPath "treinamento-seguranca.ps1"
if (Test-Path -Path $treinamentoSegurancaScript) {
    $gerenciarTreinamento = Read-Host "`nDeseja gerenciar os treinamentos de segurança? (S/N)"
    if ($gerenciarTreinamento -eq "S" -or $gerenciarTreinamento -eq "s") {
        & $treinamentoSegurancaScript
    }
}

# Verificar se o script de resposta a incidentes existe
$respostaIncidentesScript = Join-Path -Path $scriptRoot -ChildPath "resposta-incidentes.ps1"
if (Test-Path -Path $respostaIncidentesScript) {
    $gerenciarIncidentes = Read-Host "`nDeseja gerenciar a resposta a incidentes? (S/N)"
    if ($gerenciarIncidentes -eq "S" -or $gerenciarIncidentes -eq "s") {
        & $respostaIncidentesScript
    }
}

# Verificar se o script de verificação de integridade existe
if (Test-Path -Path $verificarIntegridadeScript) {
    $verificarIntegridade = Read-Host "`nDeseja verificar a integridade do sistema de segurança? (S/N)"
    if ($verificarIntegridade -eq "S" -or $verificarIntegridade -eq "s") {
        & $verificarIntegridadeScript
    }
}

# Verificar se o script de verificação de segurança do servidor existe
if (Test-Path -Path $verificarSegurancaServidorScript) {
    $verificarSegurancaServidor = Read-Host "`nDeseja verificar a segurança do servidor web? (S/N)"
    if ($verificarSegurancaServidor -eq "S" -or $verificarSegurancaServidor -eq "s") {
        & $verificarSegurancaServidorScript
    }
}

# Verificar se o script de verificação de segurança do banco de dados existe
if (Test-Path -Path $verificarSegurancaBDScript) {
    $verificarSegurancaBD = Read-Host "`nDeseja verificar a segurança do banco de dados? (S/N)"
    if ($verificarSegurancaBD -eq "S" -or $verificarSegurancaBD -eq "s") {
        & $verificarSegurancaBDScript
    }
}

# Perguntar se deseja abrir o dashboard
$abrirDashboard = Read-Host "`nDeseja abrir o dashboard no navegador? (S/N)"

if ($abrirDashboard -eq "S" -or $abrirDashboard -eq "s") {
    Write-Host "`n3. Abrindo dashboard no navegador..." -ForegroundColor Cyan
    try {
        Start-Process $dashboardPath
        Write-Host "   Dashboard aberto com sucesso." -ForegroundColor Green
    } catch {
        Write-Host "   ERRO ao abrir o dashboard: $_" -ForegroundColor Red
    }
}

Write-Host "`nProcesso de atualização concluído." -ForegroundColor Magenta