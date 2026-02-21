<#
.SYNOPSIS
    Script para verificar a integridade dos arquivos de segurança.
.DESCRIPTION
    Este script verifica a integridade e disponibilidade de todos os scripts de segurança
    e arquivos de configuração do sistema de segurança da Açucaradas Encomendas.
.NOTES
    Versão:        1.0
    Autor:         Equipe de Segurança
    Data Criação:  $(Get-Date -Format "dd/MM/yyyy")
#>

# Definição de caminhos
$scriptPath = $PSScriptRoot
$logsPath = Join-Path -Path $scriptPath -ChildPath "logs-integridade"
$reportPath = Join-Path -Path $scriptPath -ChildPath "relatorios-integridade"

# Criar diretórios necessários
if (-not (Test-Path -Path $logsPath)) {
    New-Item -Path $logsPath -ItemType Directory -Force | Out-Null
}

if (-not (Test-Path -Path $reportPath)) {
    New-Item -Path $reportPath -ItemType Directory -Force | Out-Null
}

# Função para registrar logs
function Write-IntegrityLog {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Level = "Info",
        
        [Parameter(Mandatory = $false)]
        [string]$Component = "Integridade"
    )
    
    $logFile = Join-Path -Path $logsPath -ChildPath "integridade-$(Get-Date -Format 'yyyy-MM-dd').log"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] [$Component] $Message"
    
    Add-Content -Path $logFile -Value $logEntry -Encoding UTF8
    
    # Exibir mensagem no console com cores apropriadas
    $color = switch ($Level) {
        "Info"    { "White" }
        "Warning" { "Yellow" }
        "Error"   { "Red" }
        "Success" { "Green" }
        default    { "White" }
    }
    
    Write-Host "[$timestamp] [$Component] $Message" -ForegroundColor $color
}

# Lista de arquivos críticos para verificar
$criticalFiles = @(
    @{Path = "atualizar-dashboard.ps1"; Description = "Script de atualização do dashboard de segurança"; Required = $true},
    @{Path = "verificar-vulnerabilidades.ps1"; Description = "Script de verificação de vulnerabilidades"; Required = $true},
    @{Path = "monitoramento-seguranca.ps1"; Description = "Script de monitoramento de segurança"; Required = $true},
    @{Path = "treinamento-seguranca.ps1"; Description = "Script de treinamento de segurança"; Required = $true},
    @{Path = "resposta-incidentes.ps1"; Description = "Script de resposta a incidentes"; Required = $true},
    @{Path = "integracao-ferramentas.ps1"; Description = "Script de integração de ferramentas"; Required = $true},
    @{Path = "atualizar-tudo.ps1"; Description = "Script de atualização geral"; Required = $true},
    @{Path = "progresso-seguranca.json"; Description = "Arquivo de progresso de segurança"; Required = $true},
    @{Path = "vulnerabilidades-data.json"; Description = "Dados de vulnerabilidades"; Required = $true},
    @{Path = "dashboard-template.html"; Description = "Template HTML do dashboard"; Required = $true}
)

# Função para verificar a integridade de um arquivo
function Test-FileIntegrity {
    param (
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        
        [Parameter(Mandatory = $true)]
        [string]$Description,
        
        [Parameter(Mandatory = $true)]
        [bool]$Required
    )
    
    $fullPath = Join-Path -Path $scriptPath -ChildPath $FilePath
    
    if (Test-Path -Path $fullPath) {
        # Verificar se o arquivo não está vazio
        $fileContent = Get-Content -Path $fullPath -Raw -ErrorAction SilentlyContinue
        
        if ([string]::IsNullOrWhiteSpace($fileContent)) {
            Write-IntegrityLog -Message "Arquivo $FilePath está vazio" -Level "Warning" -Component "Arquivo"
            return @{Status = "Warning"; Message = "Arquivo vazio"; Path = $fullPath}
        }
        
        Write-IntegrityLog -Message "Arquivo $FilePath está íntegro" -Level "Success" -Component "Arquivo"
        return @{Status = "Success"; Message = "Íntegro"; Path = $fullPath}
    } else {
        if ($Required) {
            Write-IntegrityLog -Message "Arquivo crítico $FilePath não encontrado" -Level "Error" -Component "Arquivo"
            return @{Status = "Error"; Message = "Não encontrado (crítico)"; Path = $fullPath}
        } else {
            Write-IntegrityLog -Message "Arquivo opcional $FilePath não encontrado" -Level "Warning" -Component "Arquivo"
            return @{Status = "Warning"; Message = "Não encontrado (opcional)"; Path = $fullPath}
        }
    }
}

# Função para verificar a integridade de todos os arquivos
function Test-AllFilesIntegrity {
    $results = @()
    $errorCount = 0
    $warningCount = 0
    $successCount = 0
    
    foreach ($file in $criticalFiles) {
        $result = Test-FileIntegrity -FilePath $file.Path -Description $file.Description -Required $file.Required
        
        $results += [PSCustomObject]@{
            Arquivo = $file.Path
            Descrição = $file.Description
            Status = $result.Status
            Mensagem = $result.Message
            Caminho = $result.Path
        }
        
        switch ($result.Status) {
            "Error" { $errorCount++ }
            "Warning" { $warningCount++ }
            "Success" { $successCount++ }
        }
    }
    
    return @{
        Results = $results
        ErrorCount = $errorCount
        WarningCount = $warningCount
        SuccessCount = $successCount
        TotalCount = $criticalFiles.Count
    }
}

# Função para testar a execução de scripts críticos
function Test-ScriptExecution {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        
        [Parameter(Mandatory = $true)]
        [string]$Description
    )
    
    $fullPath = Join-Path -Path $scriptPath -ChildPath $ScriptPath
    
    if (-not (Test-Path -Path $fullPath)) {
        Write-IntegrityLog -Message "Script $ScriptPath não encontrado para teste de execução" -Level "Error" -Component "Execução"
        return @{Status = "Error"; Message = "Script não encontrado"; Path = $fullPath}
    }
    
    try {
        # Verificar sintaxe do script sem executá-lo
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content -Path $fullPath -Raw), [ref]$null)
        
        Write-IntegrityLog -Message "Script $ScriptPath passou na verificação de sintaxe" -Level "Success" -Component "Execução"
        return @{Status = "Success"; Message = "Sintaxe válida"; Path = $fullPath}
    } catch {
        Write-IntegrityLog -Message "Erro de sintaxe no script $ScriptPath: $_" -Level "Error" -Component "Execução"
        return @{Status = "Error"; Message = "Erro de sintaxe: $($_.Exception.Message)"; Path = $fullPath}
    }
}

# Função para testar a execução de todos os scripts
function Test-AllScriptsExecution {
    $results = @()
    $errorCount = 0
    $successCount = 0
    
    # Filtrar apenas os scripts PowerShell da lista de arquivos críticos
    $scripts = $criticalFiles | Where-Object { $_.Path -like "*.ps1" }
    
    foreach ($script in $scripts) {
        $result = Test-ScriptExecution -ScriptPath $script.Path -Description $script.Description
        
        $results += [PSCustomObject]@{
            Script = $script.Path
            Descrição = $script.Description
            Status = $result.Status
            Mensagem = $result.Message
            Caminho = $result.Path
        }
        
        switch ($result.Status) {
            "Error" { $errorCount++ }
            "Success" { $successCount++ }
        }
    }
    
    return @{
        Results = $results
        ErrorCount = $errorCount
        SuccessCount = $successCount
        TotalCount = $scripts.Count
    }
}

# Função para verificar a integridade dos arquivos JSON
function Test-JsonIntegrity {
    param (
        [Parameter(Mandatory = $true)]
        [string]$JsonPath,
        
        [Parameter(Mandatory = $true)]
        [string]$Description
    )
    
    $fullPath = Join-Path -Path $scriptPath -ChildPath $JsonPath
    
    if (-not (Test-Path -Path $fullPath)) {
        Write-IntegrityLog -Message "Arquivo JSON $JsonPath não encontrado" -Level "Error" -Component "JSON"
        return @{Status = "Error"; Message = "Arquivo não encontrado"; Path = $fullPath}
    }
    
    try {
        # Tentar converter o conteúdo do arquivo para JSON
        $null = Get-Content -Path $fullPath -Raw | ConvertFrom-Json
        
        Write-IntegrityLog -Message "Arquivo JSON $JsonPath é válido" -Level "Success" -Component "JSON"
        return @{Status = "Success"; Message = "JSON válido"; Path = $fullPath}
    } catch {
        Write-IntegrityLog -Message "Erro no arquivo JSON $JsonPath: $_" -Level "Error" -Component "JSON"
        return @{Status = "Error"; Message = "JSON inválido: $($_.Exception.Message)"; Path = $fullPath}
    }
}

# Função para verificar todos os arquivos JSON
function Test-AllJsonFiles {
    $results = @()
    $errorCount = 0
    $successCount = 0
    
    # Filtrar apenas os arquivos JSON da lista de arquivos críticos
    $jsonFiles = $criticalFiles | Where-Object { $_.Path -like "*.json" }
    
    foreach ($file in $jsonFiles) {
        $result = Test-JsonIntegrity -JsonPath $file.Path -Description $file.Description
        
        $results += [PSCustomObject]@{
            Arquivo = $file.Path
            Descrição = $file.Description
            Status = $result.Status
            Mensagem = $result.Message
            Caminho = $result.Path
        }
        
        switch ($result.Status) {
            "Error" { $errorCount++ }
            "Success" { $successCount++ }
        }
    }
    
    return @{
        Results = $results
        ErrorCount = $errorCount
        SuccessCount = $successCount
        TotalCount = $jsonFiles.Count
    }
}

# Função para gerar relatório HTML
function New-IntegrityReport {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$FileResults,
        
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$ScriptResults,
        
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$JsonResults
    )
    
    $reportFile = Join-Path -Path $reportPath -ChildPath "relatorio-integridade-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').html"
    $timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
    
    # Calcular estatísticas gerais
    $totalErrors = $FileResults.ErrorCount + $ScriptResults.ErrorCount + $JsonResults.ErrorCount
    $totalWarnings = $FileResults.WarningCount
    $totalSuccess = $FileResults.SuccessCount + $ScriptResults.SuccessCount + $JsonResults.SuccessCount
    $totalChecks = $FileResults.TotalCount + $ScriptResults.TotalCount + $JsonResults.TotalCount
    
    $integrityScore = [Math]::Round(($totalSuccess / $totalChecks) * 100)
    
    # Gerar tabela de resultados de arquivos
    $fileResultsHtml = ""
    foreach ($result in $FileResults.Results) {
        $statusColor = switch ($result.Status) {
            "Error" { "#ffcccc" }
            "Warning" { "#ffffcc" }
            "Success" { "#ccffcc" }
            default { "#ffffff" }
        }
        
        $fileResultsHtml += @"
        <tr style="background-color: $statusColor">
            <td>$($result.Arquivo)</td>
            <td>$($result.Descrição)</td>
            <td>$($result.Status)</td>
            <td>$($result.Mensagem)</td>
        </tr>
"@
    }
    
    # Gerar tabela de resultados de scripts
    $scriptResultsHtml = ""
    foreach ($result in $ScriptResults.Results) {
        $statusColor = switch ($result.Status) {
            "Error" { "#ffcccc" }
            "Success" { "#ccffcc" }
            default { "#ffffff" }
        }
        
        $scriptResultsHtml += @"
        <tr style="background-color: $statusColor">
            <td>$($result.Script)</td>
            <td>$($result.Descrição)</td>
            <td>$($result.Status)</td>
            <td>$($result.Mensagem)</td>
        </tr>
"@
    }
    
    # Gerar tabela de resultados de arquivos JSON
    $jsonResultsHtml = ""
    foreach ($result in $JsonResults.Results) {
        $statusColor = switch ($result.Status) {
            "Error" { "#ffcccc" }
            "Success" { "#ccffcc" }
            default { "#ffffff" }
        }
        
        $jsonResultsHtml += @"
        <tr style="background-color: $statusColor">
            <td>$($result.Arquivo)</td>
            <td>$($result.Descrição)</td>
            <td>$($result.Status)</td>
            <td>$($result.Mensagem)</td>
        </tr>
"@
    }
    
    # Criar HTML do relatório
    $html = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Integridade - Açucaradas Encomendas</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .header {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 5px solid #2c3e50;
        }
        .summary {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .summary-card {
            background-color: #fff;
            border-radius: 5px;
            padding: 15px;
            width: 23%;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card.error {
            border-top: 4px solid #e74c3c;
        }
        .summary-card.warning {
            border-top: 4px solid #f39c12;
        }
        .summary-card.success {
            border-top: 4px solid #2ecc71;
        }
        .summary-card.total {
            border-top: 4px solid #3498db;
        }
        .summary-card h3 {
            margin-top: 0;
            font-size: 16px;
            color: #7f8c8d;
        }
        .summary-card p {
            font-size: 28px;
            font-weight: bold;
            margin: 10px 0;
        }
        .score {
            font-size: 48px;
            font-weight: bold;
            color: #2c3e50;
            text-align: center;
            margin: 20px 0;
        }
        .score-label {
            font-size: 18px;
            color: #7f8c8d;
            text-align: center;
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .section {
            margin-bottom: 40px;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #7f8c8d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Relatório de Integridade de Segurança</h1>
            <p>Açucaradas Encomendas - Gerado em: $timestamp</p>
        </div>
        
        <div class="score">$integrityScore%</div>
        <div class="score-label">Pontuação de Integridade</div>
        
        <div class="summary">
            <div class="summary-card error">
                <h3>Erros</h3>
                <p>$totalErrors</p>
            </div>
            <div class="summary-card warning">
                <h3>Avisos</h3>
                <p>$totalWarnings</p>
            </div>
            <div class="summary-card success">
                <h3>Sucesso</h3>
                <p>$totalSuccess</p>
            </div>
            <div class="summary-card total">
                <h3>Total</h3>
                <p>$totalChecks</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Integridade de Arquivos</h2>
            <table>
                <thead>
                    <tr>
                        <th>Arquivo</th>
                        <th>Descrição</th>
                        <th>Status</th>
                        <th>Mensagem</th>
                    </tr>
                </thead>
                <tbody>
                    $fileResultsHtml
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Verificação de Scripts</h2>
            <table>
                <thead>
                    <tr>
                        <th>Script</th>
                        <th>Descrição</th>
                        <th>Status</th>
                        <th>Mensagem</th>
                    </tr>
                </thead>
                <tbody>
                    $scriptResultsHtml
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Verificação de Arquivos JSON</h2>
            <table>
                <thead>
                    <tr>
                        <th>Arquivo</th>
                        <th>Descrição</th>
                        <th>Status</th>
                        <th>Mensagem</th>
                    </tr>
                </thead>
                <tbody>
                    $jsonResultsHtml
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Este relatório foi gerado automaticamente pelo sistema de verificação de integridade.</p>
            <p>© $(Get-Date -Format "yyyy") Açucaradas Encomendas - Equipe de Segurança</p>
        </div>
    </div>
</body>
</html>
"@
    
    # Salvar relatório
    $html | Set-Content -Path $reportFile -Force
    
    Write-IntegrityLog -Message "Relatório de integridade gerado com sucesso em: $reportFile" -Level "Success"
    
    return $reportFile
}

# Função para verificar a integridade do sistema
function Test-SystemIntegrity {
    Write-Host "`n=== Verificação de Integridade do Sistema de Segurança ===" -ForegroundColor Magenta
    Write-Host "Açucaradas Encomendas" -ForegroundColor Magenta
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    Write-Host "`nIniciando verificação de integridade..." -ForegroundColor Cyan
    
    # Verificar integridade dos arquivos
    Write-Host "`nVerificando integridade dos arquivos..." -ForegroundColor Yellow
    $fileResults = Test-AllFilesIntegrity
    
    # Verificar sintaxe dos scripts
    Write-Host "`nVerificando sintaxe dos scripts..." -ForegroundColor Yellow
    $scriptResults = Test-AllScriptsExecution
    
    # Verificar arquivos JSON
    Write-Host "`nVerificando arquivos JSON..." -ForegroundColor Yellow
    $jsonResults = Test-AllJsonFiles
    
    # Exibir resumo
    Write-Host "`n=== Resumo da Verificação de Integridade ===" -ForegroundColor Cyan
    
    Write-Host "Arquivos:" -ForegroundColor White
    Write-Host " - Total: $($fileResults.TotalCount)" -ForegroundColor White
    Write-Host " - Íntegros: $($fileResults.SuccessCount)" -ForegroundColor Green
    Write-Host " - Avisos: $($fileResults.WarningCount)" -ForegroundColor Yellow
    Write-Host " - Erros: $($fileResults.ErrorCount)" -ForegroundColor Red
    
    Write-Host "`nScripts:" -ForegroundColor White
    Write-Host " - Total: $($scriptResults.TotalCount)" -ForegroundColor White
    Write-Host " - Válidos: $($scriptResults.SuccessCount)" -ForegroundColor Green
    Write-Host " - Erros: $($scriptResults.ErrorCount)" -ForegroundColor Red
    
    Write-Host "`nArquivos JSON:" -ForegroundColor White
    Write-Host " - Total: $($jsonResults.TotalCount)" -ForegroundColor White
    Write-Host " - Válidos: $($jsonResults.SuccessCount)" -ForegroundColor Green
    Write-Host " - Erros: $($jsonResults.ErrorCount)" -ForegroundColor Red
    
    # Calcular pontuação geral
    $totalChecks = $fileResults.TotalCount + $scriptResults.TotalCount + $jsonResults.TotalCount
    $totalSuccess = $fileResults.SuccessCount + $scriptResults.SuccessCount + $jsonResults.SuccessCount
    $integrityScore = [Math]::Round(($totalSuccess / $totalChecks) * 100)
    
    Write-Host "`nPontuação de Integridade: $integrityScore%" -ForegroundColor $(if ($integrityScore -ge 90) { "Green" } elseif ($integrityScore -ge 70) { "Yellow" } else { "Red" })
    
    # Perguntar se deseja gerar relatório
    $gerarRelatorio = Read-Host "`nDeseja gerar um relatório detalhado? (S/N)"
    
    if ($gerarRelatorio -eq "S" -or $gerarRelatorio -eq "s") {
        $reportPath = New-IntegrityReport -FileResults $fileResults -ScriptResults $scriptResults -JsonResults $jsonResults
        
        # Perguntar se deseja abrir o relatório
        $abrirRelatorio = Read-Host "`nDeseja abrir o relatório no navegador? (S/N)"
        
        if ($abrirRelatorio -eq "S" -or $abrirRelatorio -eq "s") {
            Start-Process $reportPath
        }
    }
    
    # Perguntar se deseja atualizar o dashboard
    $atualizarDashboard = Read-Host "`nDeseja atualizar o dashboard de segurança? (S/N)"
    
    if ($atualizarDashboard -eq "S" -or $atualizarDashboard -eq "s") {
        Update-SecurityDashboard
    }
    
    return $integrityScore
}

# Função para atualizar o dashboard de segurança
function Update-SecurityDashboard {
    $dashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
    
    if (Test-Path -Path $dashboardScript) {
        Write-Host "`nAtualizando dashboard de segurança..." -ForegroundColor Cyan
        Write-IntegrityLog -Message "Iniciando atualização do dashboard" -Level "Info"
        
        try {
            # Executar o script de atualização do dashboard
            & $dashboardScript
            
            Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
            Write-IntegrityLog -Message "Dashboard atualizado com sucesso" -Level "Success"
            return $true
        } catch {
            Write-Host "ERRO ao atualizar o dashboard: $_" -ForegroundColor Red
            Write-IntegrityLog -Message "Erro ao atualizar dashboard: $_" -Level "Error"
            return $false
        }
    } else {
        Write-Host "`nERRO: Script de atualização do dashboard não encontrado em: $dashboardScript" -ForegroundColor Red
        Write-IntegrityLog -Message "Script de atualização do dashboard não encontrado" -Level "Error"
        return $false
    }
}

# Menu principal
function Show-MainMenu {
    Clear-Host
    Write-Host "=== Sistema de Verificação de Integridade ===" -ForegroundColor Magenta
    Write-Host "Açucaradas Encomendas" -ForegroundColor Magenta
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host "1. Verificar Integridade do Sistema" -ForegroundColor Yellow
    Write-Host "2. Verificar Apenas Arquivos" -ForegroundColor Yellow
    Write-Host "3. Verificar Apenas Scripts" -ForegroundColor Yellow
    Write-Host "4. Verificar Apenas Arquivos JSON" -ForegroundColor Yellow
    Write-Host "5. Gerar Relatório de Integridade" -ForegroundColor Yellow
    Write-Host "6. Atualizar Dashboard de Segurança" -ForegroundColor Yellow
    Write-Host "0. Sair" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    $opcao = Read-Host "Escolha uma opção"
    
    switch ($opcao) {
        "1" { Test-SystemIntegrity; pause; Show-MainMenu }
        "2" { 
            $fileResults = Test-AllFilesIntegrity
            Write-Host "`nArquivos:" -ForegroundColor White
            Write-Host " - Total: $($fileResults.TotalCount)" -ForegroundColor White
            Write-Host " - Íntegros: $($fileResults.SuccessCount)" -ForegroundColor Green
            Write-Host " - Avisos: $($fileResults.WarningCount)" -ForegroundColor Yellow
            Write-Host " - Erros: $($fileResults.ErrorCount)" -ForegroundColor Red
            pause; Show-MainMenu 
        }
        "3" { 
            $scriptResults = Test-AllScriptsExecution
            Write-Host "`nScripts:" -ForegroundColor White
            Write-Host " - Total: $($scriptResults.TotalCount)" -ForegroundColor White
            Write-Host " - Válidos: $($scriptResults.SuccessCount)" -ForegroundColor Green
            Write-Host " - Erros: $($scriptResults.ErrorCount)" -ForegroundColor Red
            pause; Show-MainMenu 
        }
        "4" { 
            $jsonResults = Test-AllJsonFiles
            Write-Host "`nArquivos JSON:" -ForegroundColor White
            Write-Host " - Total: $($jsonResults.TotalCount)" -ForegroundColor White
            Write-Host " - Válidos: $($jsonResults.SuccessCount)" -ForegroundColor Green
            Write-Host " - Erros: $($jsonResults.ErrorCount)" -ForegroundColor Red
            pause; Show-MainMenu 
        }
        "5" { 
            $fileResults = Test-AllFilesIntegrity
            $scriptResults = Test-AllScriptsExecution
            $jsonResults = Test-AllJsonFiles
            $reportPath = New-IntegrityReport -FileResults $fileResults -ScriptResults $scriptResults -JsonResults $jsonResults
            $abrirRelatorio = Read-Host "`nDeseja abrir o relatório no navegador? (S/N)"
            if ($abrirRelatorio -eq "S" -or $abrirRelatorio -eq "s") {
                Start-Process $reportPath
            }
            pause; Show-MainMenu 
        }
        "6" { Update-SecurityDashboard; pause; Show-MainMenu }
        "0" { return }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; pause; Show-MainMenu }
    }
}

# Função auxiliar para pausar a execução
function pause {
    Write-Host "`nPressione qualquer tecla para continuar..." -ForegroundColor Cyan
    [Console]::ReadKey($true) | Out-Null
}

# Iniciar o sistema
Write-Host "Iniciando Sistema de Verificação de Integridade..." -ForegroundColor Green
Show-MainMenu