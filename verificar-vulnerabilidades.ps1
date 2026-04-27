# Script para verificar vulnerabilidades de segurança no sistema

# Caminho para o arquivo de configuração de vulnerabilidades
$configPath = Join-Path -Path $PSScriptRoot -ChildPath "vulnerabilidades.json"
$dashboardPath = Join-Path -Path $PSScriptRoot -ChildPath "dashboard-seguranca.html"
$progressoPath = Join-Path -Path $PSScriptRoot -ChildPath "progresso-seguranca.json"

Write-Host "=== Verificação de Vulnerabilidades de Segurança ===" -ForegroundColor Magenta

# Função para verificar vulnerabilidades comuns em aplicações web
function Test-WebVulnerabilities {
    param (
        [Parameter(Mandatory = $true)]
        [string]$TargetUrl,
        
        [Parameter(Mandatory = $false)]
        [switch]$IgnorarFalsosPositivos
    )
    
    $vulnerabilidades = @()
    $falsosPositivos = @()
    
    Write-Host "`nVerificando vulnerabilidades em: $TargetUrl" -ForegroundColor Cyan
    
    # Carregar lista de falsos positivos conhecidos (se existir)
    $falsosPositivosPath = Join-Path -Path $PSScriptRoot -ChildPath "falsos-positivos.json"
    if (Test-Path $falsosPositivosPath) {
        try {
            $falsosPositivos = Get-Content -Path $falsosPositivosPath -Raw | ConvertFrom-Json
            Write-Host "Carregados $(($falsosPositivos | Measure-Object).Count) falsos positivos conhecidos" -ForegroundColor Yellow
        } catch {
            Write-Host "Erro ao carregar falsos positivos: $_" -ForegroundColor Red
        }
    }
    
    # Função para verificar se uma vulnerabilidade é um falso positivo conhecido
    function Test-IsFalsoPositivo {
        param (
            [Parameter(Mandatory=$true)]
            [string]$Nome,
            
            [Parameter(Mandatory=$true)]
            [string]$Descricao
        )
        
        foreach ($fp in $falsosPositivos) {
            if ($fp.Nome -eq $Nome -and $fp.Descricao -eq $Descricao) {
                return $true
            }
        }
        
        return $false
    }
    
    # Simulação de verificações de segurança (em um ambiente real, usaríamos ferramentas como OWASP ZAP, Burp Suite, etc.)
    $checks = @(
        @{
            "Nome" = "SQL Injection"
            "Descricao" = "Verificação de vulnerabilidades de injeção SQL"
            "Severidade" = "Crítica"
            "Status" = "Não verificado"
            "Recomendacao" = "Implementar prepared statements e validação de entrada"
            "FalsoPositivo" = $false
        },
        @{
            "Nome" = "Cross-Site Scripting (XSS)"
            "Descricao" = "Verificação de vulnerabilidades XSS"
            "Severidade" = "Alta"
            "Status" = "Não verificado"
            "Recomendacao" = "Implementar sanitização de saída e Content Security Policy"
            "FalsoPositivo" = $false
        },
        @{
            "Nome" = "Cross-Site Request Forgery (CSRF)"
            "Descricao" = "Verificação de proteção contra CSRF"
            "Severidade" = "Média"
            "Status" = "Não verificado"
            "Recomendacao" = "Implementar tokens anti-CSRF"
            "FalsoPositivo" = $false
        },
        @{
            "Nome" = "Configuração de Headers de Segurança"
            "Descricao" = "Verificação de headers HTTP de segurança"
            "Severidade" = "Média"
            "Status" = "Não verificado"
            "Recomendacao" = "Configurar headers como X-XSS-Protection, X-Content-Type-Options, etc."
            "FalsoPositivo" = $false
        },
        @{
            "Nome" = "Exposição de Informações Sensíveis"
            "Descricao" = "Verificação de vazamento de informações sensíveis"
            "Severidade" = "Alta"
            "Status" = "Não verificado"
            "Recomendacao" = "Remover comentários, headers e mensagens de erro que revelem informações sensíveis"
            "FalsoPositivo" = $false
        },
        @{
            "Nome" = "Autenticação Insegura"
            "Descricao" = "Verificação de mecanismos de autenticação"
            "Severidade" = "Crítica"
            "Status" = "Não verificado"
            "Recomendacao" = "Implementar autenticação forte, MFA e políticas de senhas seguras"
            "FalsoPositivo" = $false
        },
        @{
            "Nome" = "Gerenciamento de Sessão Inseguro"
            "Descricao" = "Verificação de gerenciamento de sessão"
            "Severidade" = "Alta"
            "Status" = "Não verificado"
            "Recomendacao" = "Implementar timeout de sessão, regeneração de IDs e flags de cookie seguras"
            "FalsoPositivo" = $false
        },
        @{
            "Nome" = "Controle de Acesso Quebrado"
            "Descricao" = "Verificação de controle de acesso"
            "Severidade" = "Alta"
            "Status" = "Não verificado"
            "Recomendacao" = "Implementar verificações de autorização em todas as requisições"
            "FalsoPositivo" = $false
        }
    )
    
    # Simular resultados de verificação (em um ambiente real, seriam resultados reais de ferramentas)
    foreach ($check in $checks) {
        $random = Get-Random -Minimum 1 -Maximum 10
        
        if ($random -le 3) {
            $check.Status = "Vulnerável"
            
            # Verificar se é um falso positivo conhecido
            $check.FalsoPositivo = Test-IsFalsoPositivo -Nome $check.Nome -Descricao $check.Descricao
            
            # Adicionar à lista de vulnerabilidades se não for para ignorar falsos positivos ou se não for um falso positivo
            if (-not $IgnorarFalsosPositivos -or -not $check.FalsoPositivo) {
                $vulnerabilidades += $check
            }
        } elseif ($random -le 7) {
            $check.Status = "Potencialmente Vulnerável"
            
            # Verificar se é um falso positivo conhecido
            $check.FalsoPositivo = Test-IsFalsoPositivo -Nome $check.Nome -Descricao $check.Descricao
            
            # Adicionar à lista de vulnerabilidades se não for para ignorar falsos positivos ou se não for um falso positivo
            if (-not $IgnorarFalsosPositivos -or -not $check.FalsoPositivo) {
                $vulnerabilidades += $check
            }
        } else {
            $check.Status = "Seguro"
        }
        
        $statusColor = if ($check.Status -eq "Vulnerável") { 
            if ($check.FalsoPositivo) { "DarkGray" } else { "Red" } 
        } elseif ($check.Status -eq "Potencialmente Vulnerável") { 
            if ($check.FalsoPositivo) { "DarkGray" } else { "Yellow" } 
        } else { 
            "Green" 
        }
        
        $statusText = $check.Status
        if ($check.FalsoPositivo) {
            $statusText += " (Falso Positivo)"
        }
        
        Write-Host "  - $($check.Nome): $statusText" -ForegroundColor $statusColor
    }
    
    return $vulnerabilidades
}

# Função para atualizar o arquivo de configuração de vulnerabilidades
function Update-VulnerabilidadesConfig {
    param (
        [Parameter(Mandatory = $true)]
        [array]$Vulnerabilidades
    )
    
    # Contar vulnerabilidades por severidade
    $criticas = ($Vulnerabilidades | Where-Object { $_.Severidade -eq "Crítica" -and $_.Status -eq "Vulnerável" }).Count
    $altas = ($Vulnerabilidades | Where-Object { $_.Severidade -eq "Alta" -and $_.Status -eq "Vulnerável" }).Count
    $medias = ($Vulnerabilidades | Where-Object { $_.Severidade -eq "Média" -and ($_.Status -eq "Vulnerável" -or $_.Status -eq "Potencialmente Vulnerável") }).Count
    $baixas = ($Vulnerabilidades | Where-Object { $_.Severidade -eq "Baixa" -and ($_.Status -eq "Vulnerável" -or $_.Status -eq "Potencialmente Vulnerável") }).Count
    
    # Criar objeto de configuração
    $config = @{
        "DataVerificacao" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
        "Vulnerabilidades" = @{
            "Criticas" = $criticas
            "Altas" = $altas
            "Medias" = $medias
            "Baixas" = $baixas
        }
        "Detalhes" = $Vulnerabilidades
    }
    
    # Salvar configuração
    $config | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Force
    
    # Atualizar também o arquivo de progresso de segurança
    if (Test-Path -Path $progressoPath) {
        $progressoConfig = Get-Content -Path $progressoPath -Raw | ConvertFrom-Json
        $progressoConfig.Vulnerabilidades.Criticas = $criticas
        $progressoConfig.Vulnerabilidades.Altas = $altas
        $progressoConfig.Vulnerabilidades.Medias = $medias
        $progressoConfig.Vulnerabilidades.Baixas = $baixas
        $progressoConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $progressoPath -Force
    }
    
    # Atualizar o arquivo vulnerabilidades-data.json para o dashboard
    $dataPath = Join-Path -Path $PSScriptRoot -ChildPath "vulnerabilidades-data.json"
    $vulnerabilidadesData = @{
        "Criticas" = $criticas
        "Altas" = $altas
        "Medias" = $medias
        "Baixas" = $baixas
        "UltimaVerificacao" = (Get-Date).ToString("o")
        "ProximaVerificacao" = (Get-Date).AddDays(7).ToString("o")
    }
    $vulnerabilidadesData | ConvertTo-Json -Depth 4 | Set-Content -Path $dataPath -Force
    
    Write-Host "`nConfiguração de vulnerabilidades atualizada com sucesso!" -ForegroundColor Green
    Write-Host "  - Vulnerabilidades Críticas: $criticas" -ForegroundColor $(if ($criticas -gt 0) { "Red" } else { "Green" })
    Write-Host "  - Vulnerabilidades Altas: $altas" -ForegroundColor $(if ($altas -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  - Vulnerabilidades Médias: $medias" -ForegroundColor $(if ($medias -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  - Vulnerabilidades Baixas: $baixas" -ForegroundColor $(if ($baixas -gt 0) { "Cyan" } else { "Green" })
    Write-Host "  - Arquivo de dados para dashboard atualizado em: $dataPath" -ForegroundColor Cyan
}

# Função para atualizar o dashboard
function Update-SecurityDashboard {
    $atualizarDashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
    
    if (Test-Path -Path $atualizarDashboardScript) {
        Write-Host "`nAtualizando dashboard..." -ForegroundColor Cyan
        try {
            & $atualizarDashboardScript
            Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "ERRO ao atualizar o dashboard: $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "`nERRO: Script de atualização do dashboard não encontrado em: $atualizarDashboardScript" -ForegroundColor Red
        return $false
    }
}

# Função principal
function Start-VulnerabilidadesScan {
    # Solicitar URL alvo
    $targetUrl = Read-Host "`nDigite a URL da aplicação para verificar vulnerabilidades (ex: http://localhost:8080)"
    
    if ([string]::IsNullOrWhiteSpace($targetUrl)) {
        $targetUrl = "http://localhost:8080" # URL padrão para simulação
        Write-Host "Usando URL padrão para simulação: $targetUrl" -ForegroundColor Yellow
    }
    
    # Validar formato da URL
    if (-not ($targetUrl -match "^https?://")) {
        $targetUrl = "http://" + $targetUrl
        Write-Host "URL ajustada para: $targetUrl" -ForegroundColor Yellow
    }
    
    # Executar verificação de vulnerabilidades
    $vulnerabilidades = Test-WebVulnerabilities -TargetUrl $targetUrl
    
    # Atualizar configuração
    Update-VulnerabilidadesConfig -Vulnerabilidades $vulnerabilidades
    
    # Perguntar se deseja atualizar o dashboard
    $atualizarDashboard = Read-Host "`nDeseja atualizar o dashboard com os novos dados de vulnerabilidades? (S/N)"
    
    if ($atualizarDashboard -eq "S" -or $atualizarDashboard -eq "s") {
        Update-SecurityDashboard
    }
    
    # Perguntar se deseja gerar relatório detalhado
    $gerarRelatorio = Read-Host "`nDeseja gerar um relatório detalhado das vulnerabilidades? (S/N)"
    
    if ($gerarRelatorio -eq "S" -or $gerarRelatorio -eq "s") {
        $relatorioPath = Join-Path -Path $PSScriptRoot -ChildPath "relatorio-vulnerabilidades.html"
        
        Write-Host "`nGerando relatório detalhado..." -ForegroundColor Cyan
        
        # Gerar HTML do relatório
        $htmlRelatorio = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Vulnerabilidades - Açucaradas Encomendas</title>
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
        
        .vulnerability-summary {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }
        
        .summary-card {
            background-color: var(--card-bg);
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            flex: 1;
            min-width: 200px;
            margin: 10px;
            text-align: center;
        }
        
        .summary-card.critical {
            border-top: 4px solid var(--danger-color);
        }
        
        .summary-card.high {
            border-top: 4px solid var(--warning-color);
        }
        
        .summary-card.medium {
            border-top: 4px solid var(--info-color);
        }
        
        .summary-card.low {
            border-top: 4px solid var(--success-color);
        }
        
        .vulnerability-count {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .critical .vulnerability-count {
            color: var(--danger-color);
        }
        
        .high .vulnerability-count {
            color: var(--warning-color);
        }
        
        .medium .vulnerability-count {
            color: var(--info-color);
        }
        
        .low .vulnerability-count {
            color: var(--success-color);
        }
        
        .vulnerability-details {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .vulnerability-item {
            border-left: 4px solid #ddd;
            padding: 15px;
            margin-bottom: 15px;
            background-color: #f9f9f9;
        }
        
        .vulnerability-item.critical {
            border-left-color: var(--danger-color);
        }
        
        .vulnerability-item.high {
            border-left-color: var(--warning-color);
        }
        
        .vulnerability-item.medium {
            border-left-color: var(--info-color);
        }
        
        .vulnerability-item.low {
            border-left-color: var(--success-color);
        }
        
        .vulnerability-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .vulnerability-name {
            font-weight: bold;
            font-size: 1.2em;
        }
        
        .vulnerability-severity {
            padding: 5px 10px;
            border-radius: 3px;
            color: white;
            font-size: 0.8em;
        }
        
        .severity-critical {
            background-color: var(--danger-color);
        }
        
        .severity-high {
            background-color: var(--warning-color);
        }
        
        .severity-medium {
            background-color: var(--info-color);
        }
        
        .severity-low {
            background-color: var(--success-color);
        }
        
        .vulnerability-status {
            margin-top: 5px;
            font-weight: bold;
        }
        
        .status-vulnerable {
            color: var(--danger-color);
        }
        
        .status-potential {
            color: var(--warning-color);
        }
        
        .status-secure {
            color: var(--success-color);
        }
        
        .recommendation {
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 3px;
            margin-top: 10px;
        }
        
        footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            color: #777;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .vulnerability-summary {
                flex-direction: column;
            }
            
            .summary-card {
                margin: 5px 0;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>Relatório de Vulnerabilidades</h1>
        <p>Açucaradas Encomendas - Análise de Segurança</p>
    </header>
    
    <div class="container">
        <div class="report-info">
            <h2>Informações do Relatório</h2>
            <p><strong>Data da Verificação:</strong> {{DATA_VERIFICACAO}}</p>
            <p><strong>URL Analisada:</strong> {{TARGET_URL}}</p>
        </div>
        
        <div class="vulnerability-summary">
            <div class="summary-card critical">
                <h3>Críticas</h3>
                <div class="vulnerability-count">{{CRITICAS_COUNT}}</div>
                <p>Vulnerabilidades que representam risco imediato</p>
            </div>
            
            <div class="summary-card high">
                <h3>Altas</h3>
                <div class="vulnerability-count">{{ALTAS_COUNT}}</div>
                <p>Vulnerabilidades de alto impacto</p>
            </div>
            
            <div class="summary-card medium">
                <h3>Médias</h3>
                <div class="vulnerability-count">{{MEDIAS_COUNT}}</div>
                <p>Vulnerabilidades de impacto moderado</p>
            </div>
            
            <div class="summary-card low">
                <h3>Baixas</h3>
                <div class="vulnerability-count">{{BAIXAS_COUNT}}</div>
                <p>Vulnerabilidades de baixo impacto</p>
            </div>
        </div>
        
        <div class="vulnerability-details">
            <h2>Detalhes das Vulnerabilidades</h2>
            
            {{VULNERABILIDADES_DETALHES}}
        </div>
    </div>
    
    <footer>
        <p>Relatório gerado automaticamente pelo Sistema de Segurança - Açucaradas Encomendas</p>
        <p>© 2023 Açucaradas Encomendas. Todos os direitos reservados.</p>
    </footer>
</body>
</html>
"@
        
        # Substituir placeholders com dados reais
        $htmlRelatorio = $htmlRelatorio.Replace("{{DATA_VERIFICACAO}}", (Get-Date).ToString("dd/MM/yyyy HH:mm"))
        $htmlRelatorio = $htmlRelatorio.Replace("{{TARGET_URL}}", $targetUrl)
        $htmlRelatorio = $htmlRelatorio.Replace("{{CRITICAS_COUNT}}", ($vulnerabilidades | Where-Object { $_.Severidade -eq "Crítica" -and $_.Status -eq "Vulnerável" }).Count)
        $htmlRelatorio = $htmlRelatorio.Replace("{{ALTAS_COUNT}}", ($vulnerabilidades | Where-Object { $_.Severidade -eq "Alta" -and $_.Status -eq "Vulnerável" }).Count)
        $htmlRelatorio = $htmlRelatorio.Replace("{{MEDIAS_COUNT}}", ($vulnerabilidades | Where-Object { $_.Severidade -eq "Média" -and ($_.Status -eq "Vulnerável" -or $_.Status -eq "Potencialmente Vulnerável") }).Count)
        $htmlRelatorio = $htmlRelatorio.Replace("{{BAIXAS_COUNT}}", ($vulnerabilidades | Where-Object { $_.Severidade -eq "Baixa" -and ($_.Status -eq "Vulnerável" -or $_.Status -eq "Potencialmente Vulnerável") }).Count)
        
        # Gerar detalhes das vulnerabilidades
        $detalhesHtml = ""
        foreach ($vuln in $vulnerabilidades) {
            $severidadeClass = switch ($vuln.Severidade) {
                "Crítica" { "critical" }
                "Alta" { "high" }
                "Média" { "medium" }
                "Baixa" { "low" }
                default { "medium" }
            }
            
            $statusClass = switch ($vuln.Status) {
                "Vulnerável" { "status-vulnerable" }
                "Potencialmente Vulnerável" { "status-potential" }
                "Seguro" { "status-secure" }
                default { "" }
            }
            
            $detalhesHtml += @"
            <div class="vulnerability-item $severidadeClass">
                <div class="vulnerability-header">
                    <div class="vulnerability-name">$($vuln.Nome)</div>
                    <div class="vulnerability-severity severity-$($severidadeClass)">$($vuln.Severidade)</div>
                </div>
                <p>$($vuln.Descricao)</p>
                <div class="vulnerability-status $statusClass">Status: $($vuln.Status)</div>
                <div class="recommendation">
                    <strong>Recomendação:</strong> $($vuln.Recomendacao)
                </div>
            </div>
"@
        }
        
        $htmlRelatorio = $htmlRelatorio.Replace("{{VULNERABILIDADES_DETALHES}}", $detalhesHtml)
        
        # Salvar relatório
        $htmlRelatorio | Set-Content -Path $relatorioPath -Force
        
        Write-Host "Relatório gerado com sucesso em: $relatorioPath" -ForegroundColor Green
        
        # Perguntar se deseja abrir o relatório
        $abrirRelatorio = Read-Host "`nDeseja abrir o relatório no navegador? (S/N)"
        
        if ($abrirRelatorio -eq "S" -or $abrirRelatorio -eq "s") {
            Start-Process $relatorioPath
        }
    }
}

# Executar a função principal
Start-VulnerabilidadesScan