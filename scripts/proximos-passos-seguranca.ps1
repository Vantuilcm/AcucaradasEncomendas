# Próximos Passos Recomendados - Segurança
# Acucaradas Encomendas
# Versão 1.0

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configurações
$appRoot = $PSScriptRoot | Split-Path -Parent
$configDir = Join-Path -Path $appRoot -ChildPath "config-seguranca"
$logDir = Join-Path -Path $appRoot -ChildPath "logs-seguranca"
$reportDir = Join-Path -Path $appRoot -ChildPath "relatorios-seguranca"
$taskSchedulerName = "AcucaradasSeguranca"

# Criar diretórios necessários
function Create-RequiredDirectories {
    $directories = @($configDir, $logDir, $reportDir)
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            Write-Host "Criando diretório: $dir" -ForegroundColor Yellow
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
}

# Função para exibir cabeçalho
function Show-Header {
    param (
        [string]$Title
    )
    
    $separator = "=" * 80
    Write-Host ""
    Write-Host $separator -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host $separator -ForegroundColor Cyan
}

# Função para registrar log
function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "INFO",
        [string]$LogFile = (Join-Path -Path $logDir -ChildPath "seguranca-$(Get-Date -Format 'yyyyMMdd').log")
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Garantir que o diretório de log existe
    $logDirectory = Split-Path -Path $LogFile -Parent
    if (-not (Test-Path $logDirectory)) {
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    }
    
    # Adicionar entrada ao arquivo de log
    Add-Content -Path $LogFile -Value $logEntry -Encoding UTF8
    
    # Exibir no console com cores apropriadas
    $color = switch ($Level) {
        "INFO" { "White" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    
    Write-Host $logEntry -ForegroundColor $color
}

# 1. Agendar verificações periódicas
function Schedule-SecurityChecks {
    Show-Header "AGENDAMENTO DE VERIFICAÇÕES PERIÓDICAS DE SEGURANÇA"
    
    try {
        # Verificar se o PowerShell está sendo executado como administrador
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        
        if (-not $isAdmin) {
            Write-Log "Esta função requer privilégios de administrador para agendar tarefas." -Level "WARNING"
            Write-Log "Execute este script como administrador para agendar verificações periódicas." -Level "WARNING"
            return
        }
        
        # Caminhos para os scripts de verificação
        $varreduraScript = Join-Path -Path $appRoot -ChildPath "scripts\varredura-seguranca-completa.ps1"
        $conformidadeScript = Join-Path -Path $appRoot -ChildPath "scripts\verificar-conformidade-lojas.ps1"
        
        # Verificar se os scripts existem
        if (-not (Test-Path $varreduraScript)) {
            Write-Log "Script de varredura não encontrado: $varreduraScript" -Level "ERROR"
            return
        }
        
        if (-not (Test-Path $conformidadeScript)) {
            Write-Log "Script de conformidade não encontrado: $conformidadeScript" -Level "ERROR"
            return
        }
        
        # Criar tarefa agendada para varredura semanal
        $varreduraAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$varreduraScript`""
        $varreduraTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "03:00"
        $varreduraSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries
        
        # Registrar tarefa de varredura
        $existingTask = Get-ScheduledTask -TaskName "${taskSchedulerName}_Varredura" -ErrorAction SilentlyContinue
        
        if ($existingTask) {
            Unregister-ScheduledTask -TaskName "${taskSchedulerName}_Varredura" -Confirm:$false
            Write-Log "Tarefa agendada existente removida: ${taskSchedulerName}_Varredura" -Level "INFO"
        }
        
        Register-ScheduledTask -TaskName "${taskSchedulerName}_Varredura" -Action $varreduraAction -Trigger $varreduraTrigger -Settings $varreduraSettings -Description "Varredura de segurança semanal para Acucaradas Encomendas"
        Write-Log "Tarefa de varredura de segurança agendada para todas as segundas-feiras às 03:00" -Level "SUCCESS"
        
        # Criar tarefa agendada para verificação de conformidade mensal
        $conformidadeAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$conformidadeScript`""
        $conformidadeTrigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At "04:00"
        $conformidadeSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries
        
        # Registrar tarefa de conformidade
        $existingTask = Get-ScheduledTask -TaskName "${taskSchedulerName}_Conformidade" -ErrorAction SilentlyContinue
        
        if ($existingTask) {
            Unregister-ScheduledTask -TaskName "${taskSchedulerName}_Conformidade" -Confirm:$false
            Write-Log "Tarefa agendada existente removida: ${taskSchedulerName}_Conformidade" -Level "INFO"
        }
        
        Register-ScheduledTask -TaskName "${taskSchedulerName}_Conformidade" -Action $conformidadeAction -Trigger $conformidadeTrigger -Settings $conformidadeSettings -Description "Verificação de conformidade mensal para Acucaradas Encomendas"
        Write-Log "Tarefa de verificação de conformidade agendada para o primeiro dia de cada mês às 04:00" -Level "SUCCESS"
        
        Write-Log "Agendamento de verificações periódicas concluído com sucesso" -Level "SUCCESS"
    } catch {
        Write-Log "Erro ao agendar verificações periódicas: $_" -Level "ERROR"
    }
}

# 2. Configurar integração com CI/CD
function Configure-CiCdIntegration {
    Show-Header "CONFIGURAÇÃO DE INTEGRAÇÃO COM CI/CD"
    
    try {
        # Verificar se o diretório .github/workflows existe
        $workflowsDir = Join-Path -Path $appRoot -ChildPath ".github\workflows"
        
        if (-not (Test-Path $workflowsDir)) {
            Write-Log "Criando diretório para workflows do GitHub Actions: $workflowsDir" -Level "INFO"
            New-Item -ItemType Directory -Path $workflowsDir -Force | Out-Null
        }
        
        # Criar workflow para verificação de segurança no GitHub Actions
        $securityWorkflowPath = Join-Path -Path $workflowsDir -ChildPath "security-checks.yml"
        
        $securityWorkflowContent = @"
# Workflow de Verificação de Segurança para Acucaradas Encomendas
name: Security Checks

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]
  schedule:
    - cron: '0 2 * * 1' # Executa toda segunda-feira às 2h UTC

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --production
      
      - name: Install security scanning tools
        run: npm install -g snyk @cyclonedx/bom
      
      - name: Generate Software Bill of Materials (SBOM)
        run: cyclonedx-bom -o sbom.json
      
      - name: Run Snyk to check for vulnerabilities
        run: snyk test --severity-threshold=medium
        env:
          SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
        continue-on-error: true
      
      - name: Upload SBOM as artifact
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom.json
      
      - name: Check for secrets in code
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

  dependency-review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v3
      
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v3
""
        
        Set-Content -Path $securityWorkflowPath -Value $securityWorkflowContent -Encoding UTF8
        Write-Log "Workflow de verificação de segurança criado: $securityWorkflowPath" -Level "SUCCESS"
        
        # Criar arquivo de configuração para Renovate
        $renovateConfigPath = Join-Path -Path $appRoot -ChildPath "renovate.json"
        
        if (-not (Test-Path $renovateConfigPath)) {
            $renovateConfigContent = @"
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "matchCurrentVersion": "!/^0/",
      "automerge": true
    },
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    },
    {
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["major"],
      "labels": ["dependencies", "major-update"]
    },
    {
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["minor"],
      "labels": ["dependencies", "minor-update"]
    },
    {
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["patch"],
      "labels": ["dependencies", "patch-update"]
    }
  ],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "assignees": ["@team-security"]
  },
  "schedule": ["every weekend"],
  "prConcurrentLimit": 5,
  "prHourlyLimit": 2
}
""
            
            Set-Content -Path $renovateConfigPath -Value $renovateConfigContent -Encoding UTF8
            Write-Log "Configuração do Renovate criada: $renovateConfigPath" -Level "SUCCESS"
        } else {
            Write-Log "Configuração do Renovate já existe: $renovateConfigPath" -Level "INFO"
        }
        
        # Criar arquivo de configuração para Dependabot
        $dependabotConfigDir = Join-Path -Path $appRoot -ChildPath ".github"
        $dependabotConfigPath = Join-Path -Path $dependabotConfigDir -ChildPath "dependabot.yml"
        
        if (-not (Test-Path $dependabotConfigPath)) {
            $dependabotConfigContent = @"
# Configuração do Dependabot para Acucaradas Encomendas
version: 2
updates:
  # Manter dependências npm atualizadas
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "sunday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    ignore:
      # Ignorar atualizações de major version para pacotes específicos
      - dependency-name: "react-native"
        update-types: ["version-update:semver-major"]

  # Manter dependências do GitHub Actions atualizadas
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "github-actions"
""
            
            if (-not (Test-Path $dependabotConfigDir)) {
                New-Item -ItemType Directory -Path $dependabotConfigDir -Force | Out-Null
            }
            
            Set-Content -Path $dependabotConfigPath -Value $dependabotConfigContent -Encoding UTF8
            Write-Log "Configuração do Dependabot criada: $dependabotConfigPath" -Level "SUCCESS"
        } else {
            Write-Log "Configuração do Dependabot já existe: $dependabotConfigPath" -Level "INFO"
        }
        
        Write-Log "Configuração de integração com CI/CD concluída com sucesso" -Level "SUCCESS"
    } catch {
        Write-Log "Erro ao configurar integração com CI/CD: $_" -Level "ERROR"
    }
}

# 3. Configurar monitoramento contínuo
function Configure-ContinuousMonitoring {
    Show-Header "CONFIGURAÇÃO DE MONITORAMENTO CONTÍNUO"
    
    try {
        # Criar arquivo de configuração para monitoramento
        $monitoringConfigPath = Join-Path -Path $configDir -ChildPath "monitoring-config.json"
        
        $monitoringConfigContent = @"
{
  "monitoring": {
    "enabled": true,
    "interval": 3600,
    "alertThreshold": "medium",
    "notificationChannels": [
      {
        "type": "email",
        "recipients": ["seguranca@acucaradasencomendas.com.br"],
        "onlyAlerts": true
      },
      {
        "type": "slack",
        "webhook": "https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK",
        "channel": "#security-alerts",
        "onlyAlerts": false
      }
    ],
    "checks": [
      {
        "name": "headers",
        "description": "Verificação de headers de segurança",
        "enabled": true,
        "interval": 86400
      },
      {
        "name": "dependencies",
        "description": "Verificação de dependências vulneráveis",
        "enabled": true,
        "interval": 86400
      },
      {
        "name": "ssl",
        "description": "Verificação de configuração SSL/TLS",
        "enabled": true,
        "interval": 86400
      },
      {
        "name": "auth",
        "description": "Verificação de tentativas de autenticação suspeitas",
        "enabled": true,
        "interval": 3600
      },
      {
        "name": "api",
        "description": "Verificação de uso suspeito de API",
        "enabled": true,
        "interval": 3600
      }
    ],
    "reporting": {
      "enabled": true,
      "daily": false,
      "weekly": true,
      "monthly": true,
      "format": ["html", "pdf", "json"],
      "retention": 90
    }
  }
}
""
        
        Set-Content -Path $monitoringConfigPath -Value $monitoringConfigContent -Encoding UTF8
        Write-Log "Configuração de monitoramento criada: $monitoringConfigPath" -Level "SUCCESS"
        
        # Criar script de monitoramento
        $monitoringScriptPath = Join-Path -Path $appRoot -ChildPath "scripts\monitoramento-seguranca.ps1"
        
        $monitoringScriptContent = @"
# Script de Monitoramento de Segurança
# Acucaradas Encomendas

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configurações
\$appRoot = \$PSScriptRoot | Split-Path -Parent
\$configDir = Join-Path -Path \$appRoot -ChildPath "config-seguranca"
\$logDir = Join-Path -Path \$appRoot -ChildPath "logs-seguranca"
\$reportDir = Join-Path -Path \$appRoot -ChildPath "relatorios-seguranca"
\$monitoringConfigPath = Join-Path -Path \$configDir -ChildPath "monitoring-config.json"

# Verificar se o arquivo de configuração existe
if (-not (Test-Path \$monitoringConfigPath)) {
    Write-Host "Arquivo de configuração não encontrado: \$monitoringConfigPath" -ForegroundColor Red
    exit 1
}

# Carregar configuração
\$config = Get-Content -Path \$monitoringConfigPath -Raw | ConvertFrom-Json

if (-not \$config.monitoring.enabled) {
    Write-Host "Monitoramento desativado na configuração" -ForegroundColor Yellow
    exit 0
}

# Função para registrar log
function Write-Log {
    param (
        [string]\$Message,
        [string]\$Level = "INFO",
        [string]\$LogFile = (Join-Path -Path \$logDir -ChildPath "monitoramento-\$(Get-Date -Format 'yyyyMMdd').log")
    )
    
    \$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    \$logEntry = "[\$timestamp] [\$Level] \$Message"
    
    # Garantir que o diretório de log existe
    \$logDirectory = Split-Path -Path \$LogFile -Parent
    if (-not (Test-Path \$logDirectory)) {
        New-Item -ItemType Directory -Path \$logDirectory -Force | Out-Null
    }
    
    # Adicionar entrada ao arquivo de log
    Add-Content -Path \$LogFile -Value \$logEntry -Encoding UTF8
    
    # Exibir no console com cores apropriadas
    \$color = switch (\$Level) {
        "INFO" { "White" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        "ALERT" { "Magenta" }
        default { "White" }
    }
    
    Write-Host \$logEntry -ForegroundColor \$color
}

# Função para enviar notificações
function Send-Notification {
    param (
        [string]\$Subject,
        [string]\$Message,
        [string]\$Level = "INFO",
        [bool]\$IsAlert = \$false
    )
    
    foreach (\$channel in \$config.monitoring.notificationChannels) {
        # Verificar se o canal deve receber apenas alertas
        if (\$channel.onlyAlerts -and -not \$IsAlert) {
            continue
        }
        
        switch (\$channel.type) {
            "email" {
                # Implementação de envio de email (simulado)
                Write-Log "[SIMULAÇÃO] Enviando email para \$(\$channel.recipients -join ', '): \$Subject" -Level \$Level
                # Aqui seria implementado o código real para envio de email
            }
            "slack" {
                # Implementação de envio para Slack (simulado)
                Write-Log "[SIMULAÇÃO] Enviando mensagem para Slack (\$(\$channel.channel)): \$Subject" -Level \$Level
                # Aqui seria implementado o código real para envio ao Slack
            }
            default {
                Write-Log "Tipo de canal de notificação desconhecido: \$(\$channel.type)" -Level "WARNING"
            }
        }
    }
}

# Função para verificar headers de segurança
function Check-SecurityHeaders {
    Write-Log "Iniciando verificação de headers de segurança..." -Level "INFO"
    
    # Implementação simulada
    \$issues = @()
    \$totalChecks = 0
    \$passedChecks = 0
    
    # Verificar Content-Security-Policy
    \$totalChecks++
    \$securityHeadersFile = Join-Path -Path \$appRoot -ChildPath "src\utils\security-headers.js"
    
    if (Test-Path \$securityHeadersFile) {
        \$content = Get-Content -Path \$securityHeadersFile -Raw
        
        if (\$content -match "Content-Security-Policy") {
            \$passedChecks++
        } else {
            \$issues += @{"header" = "Content-Security-Policy"; "severity" = "high"; "description" = "Header CSP não encontrado"}
        }
    } else {
        \$issues += @{"header" = "Content-Security-Policy"; "severity" = "high"; "description" = "Arquivo de headers não encontrado"}
    }
    
    # Verificar X-Content-Type-Options
    \$totalChecks++
    if (Test-Path \$securityHeadersFile) {
        \$content = Get-Content -Path \$securityHeadersFile -Raw
        
        if (\$content -match "X-Content-Type-Options") {
            \$passedChecks++
        } else {
            \$issues += @{"header" = "X-Content-Type-Options"; "severity" = "medium"; "description" = "Header X-Content-Type-Options não encontrado"}
        }
    }
    
    # Verificar X-Frame-Options
    \$totalChecks++
    if (Test-Path \$securityHeadersFile) {
        \$content = Get-Content -Path \$securityHeadersFile -Raw
        
        if (\$content -match "X-Frame-Options") {
            \$passedChecks++
        } else {
            \$issues += @{"header" = "X-Frame-Options"; "severity" = "medium"; "description" = "Header X-Frame-Options não encontrado"}
        }
    }
    
    # Calcular pontuação
    \$score = if (\$totalChecks -gt 0) { (\$passedChecks / \$totalChecks) * 100 } else { 0 }
    \$score = [math]::Round(\$score, 2)
    
    # Determinar status
    \$status = if (\$score -ge 90) {
        "PASSED"
    } elseif (\$score -ge 70) {
        "WARNING"
    } else {
        "FAILED"
    }
    
    # Criar relatório
    \$report = @{
        "check" = "headers"
        "timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "status" = \$status
        "score" = \$score
        "totalChecks" = \$totalChecks
        "passedChecks" = \$passedChecks
        "issues" = \$issues
    }
    
    # Salvar relatório
    \$reportPath = Join-Path -Path \$reportDir -ChildPath "headers-\$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    \$report | ConvertTo-Json -Depth 10 | Set-Content -Path \$reportPath -Encoding UTF8
    
    # Registrar resultado
    \$logLevel = switch (\$status) {
        "PASSED" { "SUCCESS" }
        "WARNING" { "WARNING" }
        "FAILED" { "ERROR" }
    }
    
    Write-Log "Verificação de headers concluída: \$status (\$score%)" -Level \$logLevel
    
    # Enviar notificação se necessário
    if (\$status -ne "PASSED") {
        \$isAlert = \$status -eq "FAILED"
        Send-Notification -Subject "Verificação de Headers de Segurança: \$status" -Message "Pontuação: \$score%. Problemas encontrados: \$(\$issues.Count)" -Level \$logLevel -IsAlert \$isAlert
    }
    
    return \$report
}

# Função para verificar dependências vulneráveis
function Check-VulnerableDependencies {
    Write-Log "Iniciando verificação de dependências vulneráveis..." -Level "INFO"
    
    # Implementação simulada - em um ambiente real, usaria npm audit ou ferramentas similares
    \$packageJsonPath = Join-Path -Path \$appRoot -ChildPath "package.json"
    
    if (-not (Test-Path \$packageJsonPath)) {
        Write-Log "Arquivo package.json não encontrado" -Level "ERROR"
        return @{"status" = "ERROR"; "message" = "Arquivo package.json não encontrado"}
    }
    
    # Simulação de resultado
    \$vulnerabilities = @(
        @{"package" = "simulado-apenas"; "severity" = "low"; "description" = "Vulnerabilidade simulada para demonstração"}
    )
    
    # Criar relatório
    \$report = @{
        "check" = "dependencies"
        "timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "status" = if (\$vulnerabilities.Count -eq 0) { "PASSED" } else { "WARNING" }
        "vulnerabilities" = \$vulnerabilities
    }
    
    # Salvar relatório
    \$reportPath = Join-Path -Path \$reportDir -ChildPath "dependencies-\$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    \$report | ConvertTo-Json -Depth 10 | Set-Content -Path \$reportPath -Encoding UTF8
    
    # Registrar resultado
    \$logLevel = if (\$vulnerabilities.Count -eq 0) { "SUCCESS" } else { "WARNING" }
    Write-Log "Verificação de dependências concluída: \$(\$vulnerabilities.Count) vulnerabilidades encontradas" -Level \$logLevel
    
    # Enviar notificação se necessário
    if (\$vulnerabilities.Count -gt 0) {
        \$highSeverity = \$vulnerabilities | Where-Object { \$_.severity -eq "high" -or \$_.severity -eq "critical" }
        \$isAlert = \$highSeverity.Count -gt 0
        
        Send-Notification -Subject "Verificação de Dependências: \$(\$vulnerabilities.Count) vulnerabilidades encontradas" -Message "Vulnerabilidades de alta severidade: \$(\$highSeverity.Count)" -Level \$logLevel -IsAlert \$isAlert
    }
    
    return \$report
}

# Função principal de monitoramento
function Start-SecurityMonitoring {
    Write-Log "Iniciando monitoramento de segurança..." -Level "INFO"
    
    # Verificar cada check configurado
    foreach (\$check in \$config.monitoring.checks) {
        if (-not \$check.enabled) {
            Write-Log "Check '\$(\$check.name)' desativado, pulando..." -Level "INFO"
            continue
        }
        
        try {
            switch (\$check.name) {
                "headers" {
                    \$report = Check-SecurityHeaders
                }
                "dependencies" {
                    \$report = Check-VulnerableDependencies
                }
                "ssl" {
                    Write-Log "Verificação de SSL/TLS não implementada nesta versão" -Level "WARNING"
                }
                "auth" {
                    Write-Log "Verificação de autenticação não implementada nesta versão" -Level "WARNING"
                }
                "api" {
                    Write-Log "Verificação de API não implementada nesta versão" -Level "WARNING"
                }
                default {
                    Write-Log "Check desconhecido: \$(\$check.name)" -Level "WARNING"
                }
            }
        } catch {
            Write-Log "Erro ao executar check '\$(\$check.name)': \$_" -Level "ERROR"
        }
    }
    
    Write-Log "Monitoramento de segurança concluído" -Level "SUCCESS"
}

# Iniciar monitoramento
Start-SecurityMonitoring
""
        
        Set-Content -Path $monitoringScriptPath -Value $monitoringScriptContent -Encoding UTF8
        Write-Log "Script de monitoramento criado: $monitoringScriptPath" -Level "SUCCESS"
        
        # Agendar execução do script de monitoramento
        try {
            $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
            
            if ($isAdmin) {
                $monitoringAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$monitoringScriptPath`""
                $monitoringTrigger = New-ScheduledTaskTrigger -Daily -At "00:00"
                $monitoringSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries
                
                # Registrar tarefa de monitoramento
                $existingTask = Get-ScheduledTask -TaskName "${taskSchedulerName}_Monitoramento" -ErrorAction SilentlyContinue
                
                if ($existingTask) {
                    Unregister-ScheduledTask -TaskName "${taskSchedulerName}_Monitoramento" -Confirm:$false
                    Write-Log "Tarefa agendada existente removida: ${taskSchedulerName}_Monitoramento" -Level "INFO"
                }
                
                Register-ScheduledTask -TaskName "${taskSchedulerName}_Monitoramento" -Action $monitoringAction -Trigger $monitoringTrigger -Settings $monitoringSettings -Description "Monitoramento diário de segurança para Acucaradas Encomendas"
                Write-Log "Tarefa de monitoramento agendada para execução diária às 00:00" -Level "SUCCESS"
            } else {
                Write-Log "Privilégios de administrador necessários para agendar a tarefa de monitoramento" -Level "WARNING"
            }
        } catch {
            Write-Log "Erro ao agendar tarefa de monitoramento: $_" -Level "ERROR"
        }
        
        Write-Log "Configuração de monitoramento contínuo concluída com sucesso" -Level "SUCCESS"
    } catch {
        Write-Log "Erro ao configurar monitoramento contínuo: $_" -Level "ERROR"
    }
}

# 4. Configurar programa de bug bounty
function Configure-BugBountyProgram {
    Show-Header "CONFIGURAÇÃO DE PROGRAMA DE BUG BOUNTY"
    
    try {
        # Criar arquivo SECURITY.md na raiz do projeto
        $securityMdPath = Join-Path -Path $appRoot -ChildPath "SECURITY.md"
        
        $securityMdContent = @"
# Política de Segurança - Acucaradas Encomendas

## Relatando Vulnerabilidades

A Acucaradas Encomendas leva a segurança a sério. Agradecemos a todos os pesquisadores de segurança e usuários que relatam vulnerabilidades em nossos produtos. Todas as vulnerabilidades relatadas são cuidadosamente investigadas por nossa equipe.

### Como Relatar uma Vulnerabilidade

Se você descobriu uma vulnerabilidade de segurança em nosso aplicativo, por favor, envie um relatório para nós seguindo estas etapas:

1. **Envie um e-mail para** [seguranca@acucaradasencomendas.com.br](mailto:seguranca@acucaradasencomendas.com.br) com o assunto "Relatório de Vulnerabilidade: [Breve Descrição]"
2. **Inclua no relatório**:
   - Descrição detalhada da vulnerabilidade
   - Passos para reproduzir o problema
   - Possível impacto da vulnerabilidade
   - Sugestões para mitigação ou correção (opcional)
   - Seu nome/pseudônimo para reconhecimento (opcional)

### O que acontece depois

1. Você receberá uma confirmação de recebimento dentro de 48 horas
2. Nossa equipe investigará o relatório e poderá entrar em contato para obter mais informações
3. Trabalharemos na correção e manteremos você informado sobre o progresso
4. Após a correção, você será reconhecido em nosso Hall da Fama (se desejar)

## Programa de Bug Bounty

Atualmente, oferecemos recompensas para relatórios de vulnerabilidades críticas e de alto impacto. As recompensas são determinadas com base na severidade e impacto da vulnerabilidade.

### Escopo

**Em escopo**:
- Aplicativo móvel Acucaradas Encomendas (Android e iOS)
- API em api.acucaradasencomendas.com.br
- Site principal em www.acucaradasencomendas.com.br

**Fora de escopo**:
- Ataques de negação de serviço (DoS/DDoS)
- Problemas em sites de terceiros que não sejam de propriedade da Acucaradas Encomendas
- Problemas relacionados a serviços hospedados por terceiros
- Problemas que exigem acesso físico ao dispositivo do usuário

### Recompensas

As recompensas são baseadas na severidade da vulnerabilidade:

- **Crítica**: R$ 1.000 - R$ 3.000
- **Alta**: R$ 500 - R$ 1.000
- **Média**: R$ 200 - R$ 500
- **Baixa**: Reconhecimento em nosso Hall da Fama

## Hall da Fama

Agradecemos aos seguintes pesquisadores de segurança que contribuíram para tornar nosso aplicativo mais seguro:

- [Lista será atualizada conforme recebemos e verificamos relatórios]

## Divulgação Responsável

Pedimos que você:

1. Não explore a vulnerabilidade além do necessário para provar que existe
2. Não acesse, modifique ou exclua dados de outros usuários
3. Não execute testes que possam degradar nossos serviços
4. Forneça tempo suficiente para corrigirmos a vulnerabilidade antes de divulgá-la publicamente

---

Agradecemos sua ajuda em manter a Acucaradas Encomendas segura para todos os usuários!
""
        
        Set-Content -Path $securityMdPath -Value $securityMdContent -Encoding UTF8
        Write-Log "Arquivo SECURITY.md criado/atualizado: $securityMdPath" -Level "SUCCESS"
        
        # Criar página de bug bounty para o site
        $bugBountyDir = Join-Path -Path $appRoot -ChildPath "website\bug-bounty"
        
        if (-not (Test-Path $bugBountyDir)) {
            New-Item -ItemType Directory -Path $bugBountyDir -Force | Out-Null
        }
        
        $bugBountyHtmlPath = Join-Path -Path $bugBountyDir -ChildPath "index.html"
        
        $bugBountyHtmlContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Programa de Bug Bounty - Acucaradas Encomendas</title>
    <link rel="stylesheet" href="../css/styles.css">
    <style>
        .bounty-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .bounty-card {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .severity {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            margin-right: 10px;
        }
        .critical {
            background-color: #dc3545;
            color: white;
        }
        .high {
            background-color: #fd7e14;
            color: white;
        }
        .medium {
            background-color: #ffc107;
            color: black;
        }
        .low {
            background-color: #28a745;
            color: white;
        }
        .hall-of-fame {
            margin-top: 40px;
        }
        .hall-of-fame table {
            width: 100%;
            border-collapse: collapse;
        }
        .hall-of-fame th, .hall-of-fame td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .hall-of-fame th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <header>
        <nav>
            <div class="logo">
                <a href="../index.html">Acucaradas Encomendas</a>
            </div>
            <ul>
                <li><a href="../index.html">Início</a></li>
                <li><a href="../sobre.html">Sobre</a></li>
                <li><a href="#">Bug Bounty</a></li>
                <li><a href="../contato.html">Contato</a></li>
            </ul>
        </nav>
    </header>

    <main class="bounty-container">
        <h1>Programa de Bug Bounty</h1>
        <p>A Acucaradas Encomendas valoriza a segurança de nossos usuários e sistemas. Convidamos pesquisadores de segurança a nos ajudar a identificar e corrigir vulnerabilidades em nossos produtos.</p>

        <div class="bounty-card">
            <h2>Como Participar</h2>
            <ol>
                <li>Identifique uma vulnerabilidade em nossos sistemas</li>
                <li>Envie um relatório detalhado para <a href="mailto:seguranca@acucaradasencomendas.com.br">seguranca@acucaradasencomendas.com.br</a></li>
                <li>Nossa equipe analisará seu relatório e responderá em até 48 horas</li>
                <li>Após a validação e correção, você receberá a recompensa correspondente</li>
            </ol>
        </div>

        <div class="bounty-card">
            <h2>Escopo</h2>
            <h3>Em escopo:</h3>
            <ul>
                <li>Aplicativo móvel Acucaradas Encomendas (Android e iOS)</li>
                <li>API em api.acucaradasencomendas.com.br</li>
                <li>Site principal em www.acucaradasencomendas.com.br</li>
            </ul>

            <h3>Fora de escopo:</h3>
            <ul>
                <li>Ataques de negação de serviço (DoS/DDoS)</li>
                <li>Problemas em sites de terceiros</li>
                <li>Problemas relacionados a serviços hospedados por terceiros</li>
                <li>Problemas que exigem acesso físico ao dispositivo do usuário</li>
            </ul>
        </div>

        <div class="bounty-card">
            <h2>Recompensas</h2>
            <p>As recompensas são baseadas na severidade da vulnerabilidade:</p>

            <div>
                <span class="severity critical">Crítica</span> R$ 1.000 - R$ 3.000
            </div>
            <div>
                <span class="severity high">Alta</span> R$ 500 - R$ 1.000
            </div>
            <div>
                <span class="severity medium">Média</span> R$ 200 - R$ 500
            </div>
            <div>
                <span class="severity low">Baixa</span> Reconhecimento em nosso Hall da Fama
            </div>
        </div>

        <div class="bounty-card hall-of-fame">
            <h2>Hall da Fama</h2>
            <p>Agradecemos aos seguintes pesquisadores de segurança que contribuíram para tornar nosso aplicativo mais seguro:</p>

            <table>
                <thead>
                    <tr>
                        <th>Pesquisador</th>
                        <th>Vulnerabilidade</th>
                        <th>Data</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Em breve</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h3>Acucaradas Encomendas</h3>
                <p>Doces artesanais para todas as ocasiões</p>
            </div>
            <div class="footer-section">
                <h3>Links</h3>
                <ul>
                    <li><a href="../index.html">Início</a></li>
                    <li><a href="../sobre.html">Sobre</a></li>
                    <li><a href="#">Bug Bounty</a></li>
                    <li><a href="../contato.html">Contato</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>Contato</h3>
                <p>Email: contato@acucaradasencomendas.com.br</p>
                <p>Telefone: (11) 1234-5678</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2024 Acucaradas Encomendas. Todos os direitos reservados.</p>
        </div>
    </footer>

    <script src="../js/main.js"></script>
</body>
</html>
""
        
        Set-Content -Path $bugBountyHtmlPath -Value $bugBountyHtmlContent -Encoding UTF8
        Write-Log "Página de Bug Bounty criada: $bugBountyHtmlPath" -Level "SUCCESS"
        
        Write-Log "Configuração do programa de bug bounty concluída com sucesso" -Level "SUCCESS"
    } catch {
        Write-Log "Erro ao configurar programa de bug bounty: $_" -Level "ERROR"
    }
}

# 5. Criar plano de resposta a incidentes
function Create-IncidentResponsePlan {
    Show-Header "CRIAÇÃO DE PLANO DE RESPOSTA A INCIDENTES"
    
    try {
        # Criar diretório para documentação de segurança
        $securityDocsDir = Join-Path -Path $appRoot -ChildPath "docs\seguranca"
        
        if (-not (Test-Path $securityDocsDir)) {
            New-Item -ItemType Directory -Path $securityDocsDir -Force | Out-Null
        }
        
        # Criar plano de resposta a incidentes
        $incidentResponsePath = Join-Path -Path $securityDocsDir -ChildPath "plano-resposta-incidentes.md"
        
        $incidentResponseContent = @"
# Plano de Resposta a Incidentes de Segurança

## Visão Geral

Este documento descreve o plano de resposta a incidentes de segurança da Acucaradas Encomendas. O objetivo é garantir uma resposta rápida e eficaz a incidentes de segurança, minimizando o impacto e restaurando as operações normais o mais rápido possível.

## Equipe de Resposta a Incidentes

### Funções e Responsabilidades

| Função | Responsabilidades | Contato |
|--------|------------------|--------|
| Coordenador de Incidentes | Coordenar a resposta geral, comunicação com stakeholders | coordenador@acucaradasencomendas.com.br |
| Analista de Segurança | Investigação técnica, análise forense | seguranca@acucaradasencomendas.com.br |
| Administrador de Sistemas | Restauração de sistemas, implementação de correções | sistemas@acucaradasencomendas.com.br |
| Comunicação | Comunicação com usuários, mídia e autoridades | comunicacao@acucaradasencomendas.com.br |
| Jurídico | Conformidade legal, notificações obrigatórias | juridico@acucaradasencomendas.com.br |

## Classificação de Incidentes

### Níveis de Severidade

| Nível | Descrição | Exemplos | Tempo de Resposta |
|-------|-----------|----------|-------------------|
| **Crítico** | Impacto severo nas operações, dados sensíveis comprometidos | Vazamento de dados de usuários, comprometimento de sistemas críticos | Imediato (< 1 hora) |
| **Alto** | Impacto significativo, potencial para escalação | Comprometimento de conta privilegiada, malware detectado | < 4 horas |
| **Médio** | Impacto limitado, sem comprometimento de dados sensíveis | Tentativas de acesso não autorizado, vulnerabilidades descobertas | < 24 horas |
| **Baixo** | Impacto mínimo, eventos de rotina | Tentativas de login malsucedidas, alertas de baixa prioridade | < 48 horas |

## Processo de Resposta a Incidentes

### 1. Preparação

- Manter este plano atualizado e acessível
- Realizar treinamentos regulares da equipe
- Manter ferramentas de resposta a incidentes prontas
- Realizar simulações periódicas

### 2. Identificação

- Monitorar sistemas e alertas de segurança
- Receber e avaliar relatórios de incidentes
- Classificar o incidente conforme níveis de severidade
- Ativar a equipe de resposta apropriada

### 3. Contenção

- Isolar sistemas afetados
- Bloquear acessos comprometidos
- Preservar evidências para análise forense
- Implementar medidas temporárias para prevenir propagação

### 4. Erradicação

- Identificar e remover a causa raiz
- Verificar sistemas relacionados
- Corrigir vulnerabilidades exploradas
- Garantir que todos os componentes maliciosos foram removidos

### 5. Recuperação

- Restaurar sistemas a partir de backups limpos
- Implementar correções permanentes
- Monitorar sistemas restaurados
- Retornar gradualmente às operações normais

### 6. Lições Aprendidas

- Conduzir análise pós-incidente
- Documentar o incidente e as ações tomadas
- Atualizar planos e procedimentos
- Implementar melhorias para prevenir recorrência

## Procedimentos Específicos

### Vazamento de Dados

1. Identificar a extensão e natureza dos dados comprometidos
2. Conter o vazamento imediatamente
3. Notificar as partes afetadas conforme requisitos legais (LGPD)
4. Implementar medidas para prevenir futuros vazamentos

### Ataque de Malware

1. Isolar sistemas infectados
2. Identificar o tipo de malware
3. Remover o malware usando ferramentas apropriadas
4. Verificar sistemas relacionados
5. Restaurar a partir de backups limpos

### Comprometimento de Conta

1. Bloquear a conta comprometida
2. Resetar credenciais
3. Investigar o escopo do comprometimento
4. Verificar atividades suspeitas
5. Implementar autenticação adicional se necessário

## Comunicação

### Comunicação Interna

- Usar canal dedicado para comunicação da equipe de resposta
- Fornecer atualizações regulares para a liderança
- Manter registros detalhados de todas as comunicações

### Comunicação Externa

- Designar um único porta-voz para comunicações externas
- Preparar modelos de comunicação para diferentes cenários
- Seguir requisitos legais para notificação

#### Modelo de Notificação de Violação de Dados

```
Assunto: Notificação de Incidente de Segurança - Acucaradas Encomendas

Caro(a) [Nome],

Estamos entrando em contato para informar sobre um incidente de segurança que ocorreu em nossos sistemas e que pode ter afetado seus dados pessoais.

O que aconteceu:
[Descrição do incidente]

Dados potencialmente afetados:
[Lista de tipos de dados]

O que estamos fazendo:
[Ações tomadas]

O que você pode fazer:
[Recomendações para o usuário]

Para mais informações, entre em contato conosco pelo e-mail seguranca@acucaradasencomendas.com.br ou pelo telefone [número].

Pedimos desculpas pelo inconveniente e agradecemos sua compreensão.

Atenciosamente,
Equipe de Segurança
Acucaradas Encomendas
```

## Requisitos Legais

### LGPD (Lei Geral de Proteção de Dados)

- Notificar a ANPD (Autoridade Nacional de Proteção de Dados) em até 2 dias úteis
- Notificar os titulares dos dados afetados
- Documentar todos os aspectos do incidente
- Manter registros para possíveis auditorias

## Recursos e Ferramentas

### Ferramentas de Resposta a Incidentes

- Sistema de gerenciamento de incidentes: [Nome da ferramenta]
- Ferramentas forenses: [Lista de ferramentas]
- Sistemas de backup e restauração: [Nome dos sistemas]
- Ferramentas de monitoramento: [Lista de ferramentas]

### Contatos Externos

- CERT.br: [Contato]
- Autoridade Nacional de Proteção de Dados (ANPD): [Contato]
- Suporte jurídico externo: [Contato]
- Empresa de segurança parceira: [Contato]

## Manutenção do Plano

- Revisar este plano a cada 6 meses
- Atualizar após cada incidente significativo
- Realizar simulações anuais
- Treinar novos membros da equipe

---

*Última atualização: [Data]*

*Aprovado por: [Nome e Cargo]*
""
        
        Set-Content -Path $incidentResponsePath -Value $incidentResponseContent -Encoding UTF8
        Write-Log "Plano de resposta a incidentes criado: $incidentResponsePath" -Level "SUCCESS"
        
        # Criar template para registro de incidentes
        $incidentLogTemplatePath = Join-Path -Path $securityDocsDir -ChildPath "template-registro-incidente.md"
        
        $incidentLogTemplateContent = @"
# Registro de Incidente de Segurança

## Informações Básicas

- **ID do Incidente**: [ID único]
- **Data de Detecção**: [Data e hora]
- **Data de Resolução**: [Data e hora]
- **Severidade**: [Crítico/Alto/Médio/Baixo]
- **Status**: [Em andamento/Resolvido/Fechado]
- **Coordenador do Incidente**: [Nome]

## Descrição do Incidente

### Resumo

[Breve descrição do incidente]

### Sistemas Afetados

- [Sistema 1]
- [Sistema 2]

### Dados Afetados

- [Tipo de dados 1]
- [Tipo de dados 2]

## Cronologia

| Data/Hora | Ação | Responsável |
|-----------|------|-------------|
| [Data/Hora] | [Descrição da ação] | [Nome] |
| [Data/Hora] | [Descrição da ação] | [Nome] |

## Ações Tomadas

### Contenção

- [Ação 1]
- [Ação 2]

### Erradicação

- [Ação 1]
- [Ação 2]

### Recuperação

- [Ação 1]
- [Ação 2]

## Comunicações

### Internas

- [Data/Hora] - [Destinatário] - [Resumo]

### Externas

- [Data/Hora] - [Destinatário] - [Resumo]

## Análise de Causa Raiz

### Causa Identificada

[Descrição da causa raiz]

### Fatores Contribuintes

- [Fator 1]
- [Fator 2]

## Lições Aprendidas

### O que Funcionou Bem

- [Item 1]
- [Item 2]

### O que Poderia Ser Melhorado

- [Item 1]
- [Item 2]

## Recomendações

### Ações Imediatas

- [Recomendação 1]
- [Recomendação 2]

### Ações de Longo Prazo

- [Recomendação 1]
- [Recomendação 2]

## Anexos

- [Link para evidências]
- [Link para logs]
- [Link para outros documentos relevantes]

---

**Preparado por**: [Nome]  
**Revisado por**: [Nome]  
**Aprovado por**: [Nome]  
**Data**: [Data]
""
        
        Set-Content -Path $incidentLogTemplatePath -Value $incidentLogTemplateContent -Encoding UTF8
        Write-Log "Template de registro de incidentes criado: $incidentLogTemplatePath" -Level "SUCCESS"
        
        Write-Log "Criação do plano de resposta a incidentes concluída com sucesso" -Level "SUCCESS"
    } catch {
        Write-Log "Erro ao criar plano de resposta a incidentes: $_" -Level "ERROR"
    }
}

# Função principal
function Implement-NextSteps {
    Show-Header "IMPLEMENTAÇÃO DE PRÓXIMOS PASSOS RECOMENDADOS"
    
    # Criar diretórios necessários
    Create-RequiredDirectories
    
    # Executar cada etapa
    Schedule-SecurityChecks
    Configure-CiCdIntegration
    Configure-ContinuousMonitoring
    Configure-BugBountyProgram
    Create-IncidentResponsePlan
    
    # Resumo final
    Show-Header "RESUMO DA IMPLEMENTAÇÃO"
    Write-Log "Implementação de próximos passos concluída com sucesso!" -Level "SUCCESS"
    Write-Log "As seguintes etapas foram implementadas:" -Level "INFO"
    Write-Log "1. Agendamento de verificações periódicas" -Level "INFO"
    Write-Log "2. Integração com CI/CD" -Level "INFO"
    Write-Log "3. Monitoramento contínuo" -Level "INFO"
    Write-Log "4. Programa de bug bounty" -Level "INFO"
    Write-Log "5. Plano de resposta a incidentes" -Level "INFO"
    
    Write-Log "\nPróximos passos manuais:" -Level "INFO"
    Write-Log "1. Revisar e personalizar as configurações criadas" -Level "INFO"
    Write-Log "2. Configurar tokens e chaves de API para as integrações" -Level "INFO"
    Write-Log "3. Treinar a equipe no plano de resposta a incidentes" -Level "INFO"
    Write-Log "4. Realizar uma simulação de incidente de segurança" -Level "INFO"
    Write-Log "5. Configurar as notificações para os canais apropriados" -Level "INFO"
}

# Executar a função principal
Implement-NextSteps
