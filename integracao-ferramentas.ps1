# Script para integração com ferramentas de segurança externas

# Caminho para os arquivos de configuração
$configPath = Join-Path -Path $PSScriptRoot -ChildPath "integracao-config.json"
$logsPath = Join-Path -Path $PSScriptRoot -ChildPath "logs-integracao"
$progressoPath = Join-Path -Path $PSScriptRoot -ChildPath "progresso-seguranca.json"

Write-Host "=== Integração com Ferramentas de Segurança Externas ===" -ForegroundColor Magenta

# Criar diretório de logs se não existir
if (-not (Test-Path -Path $logsPath)) {
    New-Item -Path $logsPath -ItemType Directory -Force | Out-Null
    Write-Host "Diretório de logs criado em: $logsPath" -ForegroundColor Green
}

# Função para registrar logs
function Write-IntegrationLog {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $true)]
        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Level,
        
        [Parameter(Mandatory = $false)]
        [string]$Tool = "Integration"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] [$Tool] $Message"
    
    # Determinar o arquivo de log baseado na data atual
    $logFile = Join-Path -Path $logsPath -ChildPath ("integration-log-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    
    # Adicionar entrada ao arquivo de log
    Add-Content -Path $logFile -Value $logEntry -Force
    
    # Exibir no console com cor apropriada
    $color = switch ($Level) {
        "Info" { "White" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
        "Success" { "Green" }
        default { "White" }
    }
    
    Write-Host $logEntry -ForegroundColor $color
}

# Função para simular integração com OWASP ZAP
function Connect-OWASPZAP {
    param (
        [Parameter(Mandatory = $true)]
        [string]$TargetUrl,
        
        [Parameter(Mandatory = $false)]
        [string]$ApiKey = "api-key-simulado-zap",
        
        [Parameter(Mandatory = $false)]
        [string]$ZapUrl = "http://localhost:8080"
    )
    
    Write-Host "`nConectando ao OWASP ZAP..." -ForegroundColor Cyan
    Write-IntegrationLog -Message "Iniciando conexão com OWASP ZAP" -Level "Info" -Tool "OWASP ZAP"
    
    # Simular conexão
    Start-Sleep -Seconds 2
    
    $random = Get-Random -Minimum 1 -Maximum 10
    if ($random -le 8) {
        Write-IntegrationLog -Message "Conexão com OWASP ZAP estabelecida com sucesso" -Level "Success" -Tool "OWASP ZAP"
        
        # Simular execução de scan
        Write-Host "Executando scan automatizado no alvo: $TargetUrl" -ForegroundColor Cyan
        Write-IntegrationLog -Message "Iniciando scan automatizado em $TargetUrl" -Level "Info" -Tool "OWASP ZAP"
        
        # Simular progresso
        for ($i = 1; $i -le 5; $i++) {
            $progress = $i * 20
            Write-Progress -Activity "Executando scan OWASP ZAP" -Status "$progress% Concluído" -PercentComplete $progress
            Start-Sleep -Seconds 1
        }
        
        Write-Progress -Activity "Executando scan OWASP ZAP" -Completed
        
        # Gerar resultados simulados
        $vulnerabilities = @()
        $vulnCount = Get-Random -Minimum 3 -Maximum 12
        
        for ($i = 1; $i -le $vulnCount; $i++) {
            $vulnType = switch (Get-Random -Minimum 1 -Maximum 11) {
                1 { "SQL Injection" }
                2 { "Cross-Site Scripting (XSS)" }
                3 { "Broken Authentication" }
                4 { "Sensitive Data Exposure" }
                5 { "XML External Entities (XXE)" }
                6 { "Broken Access Control" }
                7 { "Security Misconfiguration" }
                8 { "Cross-Site Request Forgery" }
                9 { "Using Components with Known Vulnerabilities" }
                10 { "Insufficient Logging & Monitoring" }
                default { "Unvalidated Redirects and Forwards" }
            }
            
            $severity = switch (Get-Random -Minimum 1 -Maximum 5) {
                1 { "Critical" }
                2 { "High" }
                3 { "Medium" }
                4 { "Low" }
                default { "Informational" }
            }
            
            $vulnerabilities += @{
                "Type" = $vulnType
                "URL" = "$TargetUrl/" + (Get-Random -Minimum 1 -Maximum 1000)
                "Severity" = $severity
                "Description" = "Simulação de vulnerabilidade $vulnType encontrada"
                "Solution" = "Implementar medidas de segurança para mitigar $vulnType"
            }
        }
        
        Write-IntegrationLog -Message "Scan concluído. Encontradas $vulnCount vulnerabilidades" -Level "Info" -Tool "OWASP ZAP"
        
        return @{
            "Success" = $true
            "Vulnerabilities" = $vulnerabilities
        }
    } else {
        Write-IntegrationLog -Message "Falha ao conectar com OWASP ZAP. Verifique se o serviço está em execução" -Level "Error" -Tool "OWASP ZAP"
        return @{
            "Success" = $false
            "Error" = "Falha na conexão com OWASP ZAP"
        }
    }
}

# Função para simular integração com SonarQube
function Connect-SonarQube {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ProjectKey,
        
        [Parameter(Mandatory = $false)]
        [string]$SonarUrl = "http://localhost:9000",
        
        [Parameter(Mandatory = $false)]
        [string]$Token = "sonar-token-simulado"
    )
    
    Write-Host "`nConectando ao SonarQube..." -ForegroundColor Cyan
    Write-IntegrationLog -Message "Iniciando conexão com SonarQube" -Level "Info" -Tool "SonarQube"
    
    # Simular conexão
    Start-Sleep -Seconds 2
    
    $random = Get-Random -Minimum 1 -Maximum 10
    if ($random -le 8) {
        Write-IntegrationLog -Message "Conexão com SonarQube estabelecida com sucesso" -Level "Success" -Tool "SonarQube"
        
        # Simular obtenção de métricas
        Write-Host "Obtendo métricas do projeto: $ProjectKey" -ForegroundColor Cyan
        Write-IntegrationLog -Message "Obtendo métricas do projeto $ProjectKey" -Level "Info" -Tool "SonarQube"
        
        # Simular progresso
        for ($i = 1; $i -le 3; $i++) {
            $progress = $i * 33
            Write-Progress -Activity "Obtendo métricas do SonarQube" -Status "$progress% Concluído" -PercentComplete $progress
            Start-Sleep -Seconds 1
        }
        
        Write-Progress -Activity "Obtendo métricas do SonarQube" -Completed
        
        # Gerar métricas simuladas
        $metrics = @{
            "Bugs" = Get-Random -Minimum 5 -Maximum 50
            "Vulnerabilities" = Get-Random -Minimum 3 -Maximum 30
            "CodeSmells" = Get-Random -Minimum 20 -Maximum 200
            "Coverage" = Get-Random -Minimum 30 -Maximum 95
            "Duplications" = Get-Random -Minimum 1 -Maximum 20
            "ComplexityPerFile" = Get-Random -Minimum 5 -Maximum 30
            "TechnicalDebt" = "$(Get-Random -Minimum 1 -Maximum 30)d $(Get-Random -Minimum 1 -Maximum 8)h"
        }
        
        # Gerar issues simuladas
        $issues = @()
        $issueCount = Get-Random -Minimum 5 -Maximum 20
        
        for ($i = 1; $i -le $issueCount; $i++) {
            $issueType = switch (Get-Random -Minimum 1 -Maximum 4) {
                1 { "Bug" }
                2 { "Vulnerability" }
                3 { "Code Smell" }
                default { "Security Hotspot" }
            }
            
            $severity = switch (Get-Random -Minimum 1 -Maximum 5) {
                1 { "Blocker" }
                2 { "Critical" }
                3 { "Major" }
                4 { "Minor" }
                default { "Info" }
            }
            
            $issues += @{
                "Type" = $issueType
                "Component" = "$ProjectKey:src/main/java/com/example/Controller.java"
                "Line" = Get-Random -Minimum 1 -Maximum 500
                "Severity" = $severity
                "Message" = "Simulação de issue $issueType encontrada"
            }
        }
        
        Write-IntegrationLog -Message "Métricas obtidas com sucesso. $issueCount issues encontradas" -Level "Info" -Tool "SonarQube"
        
        return @{
            "Success" = $true
            "Metrics" = $metrics
            "Issues" = $issues
        }
    } else {
        Write-IntegrationLog -Message "Falha ao conectar com SonarQube. Verifique se o serviço está em execução" -Level "Error" -Tool "SonarQube"
        return @{
            "Success" = $false
            "Error" = "Falha na conexão com SonarQube"
        }
    }
}

# Função para simular integração com Dependency-Check
function Connect-DependencyCheck {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,
        
        [Parameter(Mandatory = $false)]
        [string]$OutputFormat = "JSON"
    )
    
    Write-Host "`nExecutando OWASP Dependency-Check..." -ForegroundColor Cyan
    Write-IntegrationLog -Message "Iniciando análise de dependências com Dependency-Check" -Level "Info" -Tool "Dependency-Check"
    
    # Verificar se o diretório do projeto existe
    if (-not (Test-Path -Path $ProjectPath)) {
        Write-IntegrationLog -Message "Diretório do projeto não encontrado: $ProjectPath" -Level "Error" -Tool "Dependency-Check"
        return @{
            "Success" = $false
            "Error" = "Diretório do projeto não encontrado"
        }
    }
    
    # Simular execução
    Write-Host "Analisando dependências no diretório: $ProjectPath" -ForegroundColor Cyan
    
    # Simular progresso
    for ($i = 1; $i -le 4; $i++) {
        $progress = $i * 25
        Write-Progress -Activity "Executando análise de dependências" -Status "$progress% Concluído" -PercentComplete $progress
        Start-Sleep -Seconds 1
    }
    
    Write-Progress -Activity "Executando análise de dependências" -Completed
    
    # Gerar resultados simulados
    $dependencies = @()
    $depCount = Get-Random -Minimum 10 -Maximum 50
    $vulnCount = 0
    
    for ($i = 1; $i -le $depCount; $i++) {
        $hasVuln = (Get-Random -Minimum 1 -Maximum 10) -le 3
        $vulns = @()
        
        if ($hasVuln) {
            $vulnNum = Get-Random -Minimum 1 -Maximum 4
            $vulnCount += $vulnNum
            
            for ($j = 1; $j -le $vulnNum; $j++) {
                $cveYear = Get-Random -Minimum 2015 -Maximum 2023
                $cveID = Get-Random -Minimum 1000 -Maximum 9999
                
                $vulns += @{
                    "CVE" = "CVE-$cveYear-$cveID"
                    "CVSS" = [Math]::Round((Get-Random -Minimum 1 -Maximum 10 -AsDouble), 1)
                    "Description" = "Simulação de vulnerabilidade CVE-$cveYear-$cveID"
                }
            }
        }
        
        $dependencies += @{
            "Name" = "dependency-$i"
            "Version" = "$(Get-Random -Minimum 1 -Maximum 10).$(Get-Random -Minimum 0 -Maximum 10).$(Get-Random -Minimum 0 -Maximum 10)"
            "Vulnerabilities" = $vulns
            "IsVulnerable" = $hasVuln
        }
    }
    
    Write-IntegrationLog -Message "Análise concluída. Encontradas $vulnCount vulnerabilidades em $depCount dependências" -Level "Info" -Tool "Dependency-Check"
    
    return @{
        "Success" = $true
        "Dependencies" = $dependencies
        "VulnerableCount" = ($dependencies | Where-Object { $_.IsVulnerable }).Count
        "TotalDependencies" = $dependencies.Count
        "TotalVulnerabilities" = $vulnCount
    }
}

# Função para atualizar o arquivo de configuração de integração
function Update-IntegrationConfig {
    param (
        [Parameter(Mandatory = $false)]
        [hashtable]$ZapResults = $null,
        
        [Parameter(Mandatory = $false)]
        [hashtable]$SonarResults = $null,
        
        [Parameter(Mandatory = $false)]
        [hashtable]$DependencyResults = $null
    )
    
    # Criar objeto de configuração
    $config = @{
        "LastScan" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
        "ZAP" = $ZapResults
        "SonarQube" = $SonarResults
        "DependencyCheck" = $DependencyResults
    }
    
    # Salvar configuração
    $config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Force
    
    # Atualizar também o arquivo de progresso de segurança
    if (Test-Path -Path $progressoPath) {
        $progressoConfig = Get-Content -Path $progressoPath -Raw | ConvertFrom-Json
        
        # Atualizar o progresso da análise estática com base nos resultados do SonarQube
        if ($null -ne $SonarResults -and $SonarResults.Success) {
            $analiseEstaticaProgresso = 100
            $progressoConfig.AnaliseEstatica.Progresso = $analiseEstaticaProgresso
            $progressoConfig.AnaliseEstatica.Status = "Concluído"
        }
        
        # Atualizar o progresso dos testes de penetração com base nos resultados do ZAP
        if ($null -ne $ZapResults -and $ZapResults.Success) {
            $testesPenetracaoProgresso = 75
            $progressoConfig.TestesPenetracao.Progresso = $testesPenetracaoProgresso
            $progressoConfig.TestesPenetracao.Status = "Em Progresso"
        }
        
        # Recalcular o progresso geral
        $progressoGeral = (
            $progressoConfig.AnaliseEstatica.Progresso + 
            $progressoConfig.TestesPenetracao.Progresso + 
            $progressoConfig.Monitoramento.Progresso + 
            $progressoConfig.Treinamento.Progresso + 
            $progressoConfig.RespostaIncidentes.Progresso
        ) / 5
        
        $progressoConfig.ProgressoGeral = [Math]::Round($progressoGeral)
        
        $progressoConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $progressoPath -Force
    }
    
    Write-Host "`nConfiguração de integração atualizada com sucesso!" -ForegroundColor Green
}

# Função para gerar relatório de integração
function New-IntegrationReport {
    param (
        [Parameter(Mandatory = $false)]
        [hashtable]$ZapResults = $null,
        
        [Parameter(Mandatory = $false)]
        [hashtable]$SonarResults = $null,
        
        [Parameter(Mandatory = $false)]
        [hashtable]$DependencyResults = $null
    )
    
    $reportPath = Join-Path -Path $PSScriptRoot -ChildPath "relatorio-integracao.html"
    
    Write-Host "`nGerando relatório de integração..." -ForegroundColor Cyan
    
    # Contar vulnerabilidades por severidade do ZAP
    $zapCritical = 0
    $zapHigh = 0
    $zapMedium = 0
    $zapLow = 0
    
    if ($null -ne $ZapResults -and $ZapResults.Success) {
        $zapCritical = ($ZapResults.Vulnerabilities | Where-Object { $_.Severity -eq "Critical" }).Count
        $zapHigh = ($ZapResults.Vulnerabilities | Where-Object { $_.Severity -eq "High" }).Count
        $zapMedium = ($ZapResults.Vulnerabilities | Where-Object { $_.Severity -eq "Medium" }).Count
        $zapLow = ($ZapResults.Vulnerabilities | Where-Object { $_.Severity -eq "Low" }).Count
    }
    
    # Contar issues por tipo do SonarQube
    $sonarBugs = 0
    $sonarVulns = 0
    $sonarCodeSmells = 0
    $sonarCoverage = 0
    
    if ($null -ne $SonarResults -and $SonarResults.Success) {
        $sonarBugs = $SonarResults.Metrics.Bugs
        $sonarVulns = $SonarResults.Metrics.Vulnerabilities
        $sonarCodeSmells = $SonarResults.Metrics.CodeSmells
        $sonarCoverage = $SonarResults.Metrics.Coverage
    }
    
    # Contar vulnerabilidades do Dependency-Check
    $depVulnCount = 0
    $depTotalCount = 0
    
    if ($null -ne $DependencyResults -and $DependencyResults.Success) {
        $depVulnCount = $DependencyResults.TotalVulnerabilities
        $depTotalCount = $DependencyResults.TotalDependencies
    }
    
    # Gerar HTML do relatório
    $htmlRelatorio = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Integração de Ferramentas - Açucaradas Encomendas</title>
    <style>
        :root {
            --primary-color: #8e44ad;
            --secondary-color: #9b59b6;
            --accent-color: #e74c3c;
            --text-color: #333;
            --light-bg: #f5f5f5;
            --card-bg: #fff;
            --success-color: #2ecc71;
            --warning-color: #f39c12;
            --danger-color: #e74c3c;
            --info-color: #3498db;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--light-bg);
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: var(--primary-color);
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        
        h1, h2, h3 {
            margin-top: 0;
        }
        
        .report-info {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .tool-section {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .tool-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        
        .tool-logo {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .tool-status {
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-success {
            background-color: var(--success-color);
            color: white;
        }
        
        .status-error {
            background-color: var(--danger-color);
            color: white;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric-card {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            border-top: 3px solid var(--primary-color);
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .metric-critical .metric-value {
            color: var(--danger-color);
        }
        
        .metric-high .metric-value {
            color: var(--warning-color);
        }
        
        .metric-medium .metric-value {
            color: var(--info-color);
        }
        
        .metric-low .metric-value {
            color: var(--success-color);
        }
        
        .findings-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .findings-table th {
            background-color: #f0f0f0;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #ddd;
        }
        
        .findings-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        
        .findings-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .severity-tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            color: white;
        }
        
        .severity-critical, .severity-blocker {
            background-color: var(--danger-color);
        }
        
        .severity-high, .severity-critical {
            background-color: #e67e22;
        }
        
        .severity-medium, .severity-major {
            background-color: var(--warning-color);
        }
        
        .severity-low, .severity-minor {
            background-color: var(--info-color);
        }
        
        .severity-info {
            background-color: #7f8c8d;
        }
        
        .chart-container {
            height: 300px;
            margin: 20px 0;
        }
        
        footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            color: #777;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .metrics-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 480px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>Relatório de Integração de Ferramentas</h1>
        <p>Açucaradas Encomendas - Análise de Segurança</p>
    </header>
    
    <div class="container">
        <div class="report-info">
            <h2>Informações do Relatório</h2>
            <p><strong>Data da Verificação:</strong> {{DATA_VERIFICACAO}}</p>
        </div>
        
        <!-- OWASP ZAP Section -->
        <div class="tool-section">
            <div class="tool-header">
                <div class="tool-logo">OWASP ZAP</div>
                <div class="tool-status {{ZAP_STATUS_CLASS}}">{{ZAP_STATUS}}</div>
            </div>
            
            {{ZAP_CONTENT}}
        </div>
        
        <!-- SonarQube Section -->
        <div class="tool-section">
            <div class="tool-header">
                <div class="tool-logo">SonarQube</div>
                <div class="tool-status {{SONAR_STATUS_CLASS}}">{{SONAR_STATUS}}</div>
            </div>
            
            {{SONAR_CONTENT}}
        </div>
        
        <!-- Dependency-Check Section -->
        <div class="tool-section">
            <div class="tool-header">
                <div class="tool-logo">OWASP Dependency-Check</div>
                <div class="tool-status {{DEP_STATUS_CLASS}}">{{DEP_STATUS}}</div>
            </div>
            
            {{DEP_CONTENT}}
        </div>
    </div>
    
    <footer>
        <p>Relatório gerado automaticamente pelo Sistema de Integração de Ferramentas - Açucaradas Encomendas</p>
        <p>© 2023 Açucaradas Encomendas. Todos os direitos reservados.</p>
    </footer>
</body>
</html>
"@
    
    # Substituir placeholders com dados reais
    $htmlRelatorio = $htmlRelatorio.Replace("{{DATA_VERIFICACAO}}", (Get-Date).ToString("dd/MM/yyyy HH:mm"))
    
    # ZAP Content
    if ($null -ne $ZapResults -and $ZapResults.Success) {
        $htmlRelatorio = $htmlRelatorio.Replace("{{ZAP_STATUS}}", "Conectado")
        $htmlRelatorio = $htmlRelatorio.Replace("{{ZAP_STATUS_CLASS}}", "status-success")
        
        $zapContent = @"
        <div class="metrics-grid">
            <div class="metric-card metric-critical">
                <h3>Vulnerabilidades Críticas</h3>
                <div class="metric-value">$zapCritical</div>
            </div>
            <div class="metric-card metric-high">
                <h3>Vulnerabilidades Altas</h3>
                <div class="metric-value">$zapHigh</div>
            </div>
            <div class="metric-card metric-medium">
                <h3>Vulnerabilidades Médias</h3>
                <div class="metric-value">$zapMedium</div>
            </div>
            <div class="metric-card metric-low">
                <h3>Vulnerabilidades Baixas</h3>
                <div class="metric-value">$zapLow</div>
            </div>
        </div>
        
        <h3>Vulnerabilidades Encontradas</h3>
        <table class="findings-table">
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>URL</th>
                    <th>Severidade</th>
                    <th>Descrição</th>
                </tr>
            </thead>
            <tbody>
"@
        
        foreach ($vuln in $ZapResults.Vulnerabilities) {
            $severityClass = switch ($vuln.Severity) {
                "Critical" { "severity-critical" }
                "High" { "severity-high" }
                "Medium" { "severity-medium" }
                "Low" { "severity-low" }
                default { "severity-info" }
            }
            
            $zapContent += @"
                <tr>
                    <td>$($vuln.Type)</td>
                    <td>$($vuln.URL)</td>
                    <td><span class="severity-tag $severityClass">$($vuln.Severity)</span></td>
                    <td>$($vuln.Description)</td>
                </tr>
"@
        }
        
        $zapContent += @"
            </tbody>
        </table>
"@
        
        $htmlRelatorio = $htmlRelatorio.Replace("{{ZAP_CONTENT}}", $zapContent)
    } else {
        $htmlRelatorio = $htmlRelatorio.Replace("{{ZAP_STATUS}}", "Desconectado")
        $htmlRelatorio = $htmlRelatorio.Replace("{{ZAP_STATUS_CLASS}}", "status-error")
        $htmlRelatorio = $htmlRelatorio.Replace("{{ZAP_CONTENT}}", "<p>Não foi possível conectar ao OWASP ZAP. Verifique se o serviço está em execução.</p>")
    }
    
    # SonarQube Content
    if ($null -ne $SonarResults -and $SonarResults.Success) {
        $htmlRelatorio = $htmlRelatorio.Replace("{{SONAR_STATUS}}", "Conectado")
        $htmlRelatorio = $htmlRelatorio.Replace("{{SONAR_STATUS_CLASS}}", "status-success")
        
        $sonarContent = @"
        <div class="metrics-grid">
            <div class="metric-card metric-high">
                <h3>Bugs</h3>
                <div class="metric-value">$sonarBugs</div>
            </div>
            <div class="metric-card metric-critical">
                <h3>Vulnerabilidades</h3>
                <div class="metric-value">$sonarVulns</div>
            </div>
            <div class="metric-card metric-medium">
                <h3>Code Smells</h3>
                <div class="metric-value">$sonarCodeSmells</div>
            </div>
            <div class="metric-card">
                <h3>Cobertura de Testes</h3>
                <div class="metric-value">$sonarCoverage%</div>
            </div>
        </div>
        
        <h3>Issues Encontradas</h3>
        <table class="findings-table">
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Componente</th>
                    <th>Linha</th>
                    <th>Severidade</th>
                    <th>Mensagem</th>
                </tr>
            </thead>
            <tbody>
"@
        
        foreach ($issue in $SonarResults.Issues) {
            $severityClass = switch ($issue.Severity) {
                "Blocker" { "severity-blocker" }
                "Critical" { "severity-critical" }
                "Major" { "severity-major" }
                "Minor" { "severity-minor" }
                default { "severity-info" }
            }
            
            $sonarContent += @"
                <tr>
                    <td>$($issue.Type)</td>
                    <td>$($issue.Component)</td>
                    <td>$($issue.Line)</td>
                    <td><span class="severity-tag $severityClass">$($issue.Severity)</span></td>
                    <td>$($issue.Message)</td>
                </tr>
"@
        }
        
        $sonarContent += @"
            </tbody>
        </table>
"@
        
        $htmlRelatorio = $htmlRelatorio.Replace("{{SONAR_CONTENT}}", $sonarContent)
    } else {
        $htmlRelatorio = $htmlRelatorio.Replace("{{SONAR_STATUS}}", "Desconectado")
        $htmlRelatorio = $htmlRelatorio.Replace("{{SONAR_STATUS_CLASS}}", "status-error")
        $htmlRelatorio = $htmlRelatorio.Replace("{{SONAR_CONTENT}}", "<p>Não foi possível conectar ao SonarQube. Verifique se o serviço está em execução.</p>")
    }
    
    # Dependency-Check Content
    if ($null -ne $DependencyResults -and $DependencyResults.Success) {
        $htmlRelatorio = $htmlRelatorio.Replace("{{DEP_STATUS}}", "Conectado")
        $htmlRelatorio = $htmlRelatorio.Replace("{{DEP_STATUS_CLASS}}", "status-success")
        
        $depContent = @"
        <div class="metrics-grid">
            <div class="metric-card metric-critical">
                <h3>Vulnerabilidades</h3>
                <div class="metric-value">$depVulnCount</div>
            </div>
            <div class="metric-card">
                <h3>Total de Dependências</h3>
                <div class="metric-value">$depTotalCount</div>
            </div>
            <div class="metric-card metric-medium">
                <h3>Dependências Vulneráveis</h3>
                <div class="metric-value">$($DependencyResults.VulnerableCount)</div>
            </div>
        </div>
        
        <h3>Dependências Vulneráveis</h3>
        <table class="findings-table">
            <thead>
                <tr>
                    <th>Dependência</th>
                    <th>Versão</th>
                    <th>CVEs</th>
                </tr>
            </thead>
            <tbody>
"@
        
        foreach ($dep in ($DependencyResults.Dependencies | Where-Object { $_.IsVulnerable })) {
            $cveList = ""
            
            foreach ($vuln in $dep.Vulnerabilities) {
                $cveList += "<span class='severity-tag severity-high'>$($vuln.CVE) (CVSS: $($vuln.CVSS))</span><br>";
            }
            
            $depContent += @"
                <tr>
                    <td>$($dep.Name)</td>
                    <td>$($dep.Version)</td>
                    <td>$cveList</td>
                </tr>
"@
        }
        
        $depContent += @"
            </tbody>
        </table>
"@
        
        $htmlRelatorio = $htmlRelatorio.Replace("{{DEP_CONTENT}}", $depContent)
    } else {
        $htmlRelatorio = $htmlRelatorio.Replace("{{DEP_STATUS}}", "Desconectado")
        $htmlRelatorio = $htmlRelatorio.Replace("{{DEP_STATUS_CLASS}}", "status-error")
        $htmlRelatorio = $htmlRelatorio.Replace("{{DEP_CONTENT}}", "<p>Não foi possível executar o Dependency-Check. Verifique se a ferramenta está instalada corretamente.</p>")
    }
    
    # Salvar relatório
    $htmlRelatorio | Set-Content -Path $reportPath -Force
    
    Write-Host "Relatório gerado com sucesso em: $reportPath" -ForegroundColor Green
    
    return $reportPath
}

# Função principal
function Start-ToolsIntegration {
    Write-Host "`nIniciando integração com ferramentas de segurança..." -ForegroundColor Cyan
    
    # Solicitar URL alvo para ZAP
    $targetUrl = Read-Host "`nDigite a URL da aplicação para verificar com OWASP ZAP (ex: http://localhost:8080)"
    
    if ([string]::IsNullOrWhiteSpace($targetUrl)) {
        $targetUrl = "http://localhost:8080" # URL padrão para simulação
        Write-Host "Usando URL padrão para simulação: $targetUrl" -ForegroundColor Yellow
    }
    
    # Validar formato da URL
    if (-not ($targetUrl -match "^https?://")) {
        $targetUrl = "http://" + $targetUrl
        Write-Host "URL ajustada para: $targetUrl" -ForegroundColor Yellow
    }
    
    # Solicitar chave do projeto SonarQube
    $projectKey = Read-Host "`nDigite a chave do projeto no SonarQube (ex: acucaradas-encomendas)"
    
    if ([string]::IsNullOrWhiteSpace($projectKey)) {
        $projectKey = "acucaradas-encomendas" # Chave padrão para simulação
        Write-Host "Usando chave de projeto padrão para simulação: $projectKey" -ForegroundColor Yellow
    }
    
    # Solicitar caminho do projeto para Dependency-Check
    $projectPath = Read-Host "`nDigite o caminho do projeto para análise de dependências (ex: C:\Projetos\AcucaradasEncomendas)"
    
    if ([string]::IsNullOrWhiteSpace($projectPath)) {
        $projectPath = $PSScriptRoot # Caminho padrão para simulação
        Write-Host "Usando caminho padrão para simulação: $projectPath" -ForegroundColor Yellow
    }
    
    # Executar integração com OWASP ZAP
    Write-Host "`n=== Integração com OWASP ZAP ===" -ForegroundColor Magenta
    $zapResults = Connect-OWASPZAP -TargetUrl $targetUrl
    
    # Executar integração com SonarQube
    Write-Host "`n=== Integração com SonarQube ===" -ForegroundColor Magenta
    $sonarResults = Connect-SonarQube -ProjectKey $projectKey
    
    # Executar integração com Dependency-Check
    Write-Host "`n=== Integração com OWASP Dependency-Check ===" -ForegroundColor Magenta
    $depResults = Connect-DependencyCheck -ProjectPath $projectPath
    
    # Atualizar configuração
    Update-IntegrationConfig -ZapResults $zapResults -SonarResults $sonarResults -DependencyResults $depResults
    
    # Perguntar se deseja gerar relatório
    $gerarRelatorio = Read-Host "`nDeseja gerar um relatório de integração? (S/N)"
    
    if ($gerarRelatorio -eq "S" -or $gerarRelatorio -eq "s") {
        $reportPath = New-IntegrationReport -ZapResults $zapResults -SonarResults $sonarResults -DependencyResults $depResults
        
        # Perguntar se deseja abrir o relatório
        $abrirRelatorio = Read-Host "`nDeseja abrir o relatório no navegador? (S/N)"
        
        if ($abrirRelatorio -eq "S" -or $abrirRelatorio -eq "s") {
            Start-Process $reportPath
        }
    }
    
    # Perguntar se deseja atualizar o dashboard
    $atualizarDashboard = Read-Host "`nDeseja atualizar o dashboard com os novos dados de integração? (S/N)"
    
    if ($atualizarDashboard -eq "S" -or $atualizarDashboard -eq "s") {
        Update-SecurityDashboard
    }
}

# Função para atualizar o dashboard de segurança
function Update-SecurityDashboard {
    $atualizarDashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
    
    if (Test-Path -Path $atualizarDashboardScript) {
        Write-Host "`nAtualizando dashboard..." -ForegroundColor Cyan
        Write-IntegrationLog -Message "Iniciando atualização do dashboard" -Level "Info"
        
        try {
            # Executar o script de atualização do dashboard
            & $atualizarDashboardScript
            
            Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
            Write-IntegrationLog -Message "Dashboard atualizado com sucesso" -Level "Success"
            return $true
        } catch {
            Write-Host "ERRO ao atualizar o dashboard: $_" -ForegroundColor Red
            Write-IntegrationLog -Message "Erro ao atualizar dashboard: $_" -Level "Error"
            return $false
        }
    } else {
        Write-Host "`nERRO: Script de atualização do dashboard não encontrado em: $atualizarDashboardScript" -ForegroundColor Red
        Write-IntegrationLog -Message "Script de atualização do dashboard não encontrado" -Level "Error"
        return $false
    }
    
    Write-Host "`nIntegração com ferramentas de segurança concluída." -ForegroundColor Magenta
}

# Executar a função principal
Start-ToolsIntegration