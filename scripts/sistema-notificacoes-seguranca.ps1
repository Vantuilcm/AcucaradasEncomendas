# Sistema de Notificações de Segurança
# Acucaradas Encomendas
# Versão 1.0

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configurações
$appRoot = $PSScriptRoot | Split-Path -Parent
$configDir = Join-Path -Path $appRoot -ChildPath "config-seguranca"
$logDir = Join-Path -Path $appRoot -ChildPath "logs-seguranca"
$notificationsDir = Join-Path -Path $appRoot -ChildPath "notificacoes-seguranca"

# Criar diretórios necessários
function Create-RequiredDirectories {
    $directories = @($configDir, $logDir, $notificationsDir)
    
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
        [string]$LogFile = (Join-Path -Path $logDir -ChildPath "notificacoes-$(Get-Date -Format 'yyyyMMdd').log")
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
        "ALERT" { "Magenta" }
        default { "White" }
    }
    
    Write-Host $logEntry -ForegroundColor $color
}

# Função para criar configuração de notificações
function Create-NotificationConfig {
    Show-Header "CONFIGURAÇÃO DO SISTEMA DE NOTIFICAÇÕES"
    
    try {
        $configPath = Join-Path -Path $configDir -ChildPath "notification-config.json"
        
        # Verificar se a configuração já existe
        if (Test-Path $configPath) {
            Write-Log "Configuração de notificações já existe: $configPath" -Level "INFO"
            $configExists = $true
            
            # Perguntar se deseja sobrescrever
            $overwrite = Read-Host "Deseja sobrescrever a configuração existente? (S/N)"
            if ($overwrite -ne "S" -and $overwrite -ne "s") {
                Write-Log "Mantendo configuração existente" -Level "INFO"
                return
            }
        }
        
        # Criar configuração padrão
        $config = @{
            "notification_channels" = @(
                @{
                    "type" = "email"
                    "enabled" = $true
                    "config" = @{
                        "smtp_server" = "smtp.acucaradasencomendas.com.br"
                        "smtp_port" = 587
                        "use_ssl" = $true
                        "username" = "alertas@acucaradasencomendas.com.br"
                        "password" = "SUBSTITUIR_COM_SENHA_SEGURA"
                        "from_address" = "alertas@acucaradasencomendas.com.br"
                        "recipients" = @(
                            "seguranca@acucaradasencomendas.com.br",
                            "admin@acucaradasencomendas.com.br"
                        )
                    }
                },
                @{
                    "type" = "slack"
                    "enabled" = $true
                    "config" = @{
                        "webhook_url" = "https://hooks.slack.com/services/SUBSTITUIR_COM_WEBHOOK_REAL"
                        "channel" = "#seguranca-alertas"
                        "username" = "SecurityBot"
                        "icon_emoji" = ":shield:"
                    }
                },
                @{
                    "type" = "teams"
                    "enabled" = $false
                    "config" = @{
                        "webhook_url" = "https://outlook.office.com/webhook/SUBSTITUIR_COM_WEBHOOK_REAL"
                    }
                },
                @{
                    "type" = "sms"
                    "enabled" = $false
                    "config" = @{
                        "api_key" = "SUBSTITUIR_COM_API_KEY"
                        "phone_numbers" = @(
                            "+5511999999999"
                        )
                    }
                }
            )
            "notification_levels" = @{
                "critical" = @{
                    "channels" = @("email", "slack", "sms")
                    "throttle_minutes" = 0  # Sem limitação para críticos
                }
                "high" = @{
                    "channels" = @("email", "slack")
                    "throttle_minutes" = 30  # Máximo de uma notificação a cada 30 minutos
                }
                "medium" = @{
                    "channels" = @("slack")
                    "throttle_minutes" = 60  # Máximo de uma notificação por hora
                }
                "low" = @{
                    "channels" = @("slack")
                    "throttle_minutes" = 360  # Máximo de uma notificação a cada 6 horas
                }
                "info" = @{
                    "channels" = @("slack")
                    "throttle_minutes" = 1440  # Máximo de uma notificação por dia
                }
            }
            "notification_templates" = @{
                "email" = @{
                    "subject_template" = "[{severity}] Alerta de Segurança: {title}"
                    "body_template" = @"
<html>
<body>
<h2>Alerta de Segurança: {title}</h2>
<p><strong>Severidade:</strong> {severity}</p>
<p><strong>Data/Hora:</strong> {timestamp}</p>
<p><strong>Descrição:</strong> {description}</p>
<p><strong>Detalhes:</strong></p>
<pre>{details}</pre>
<p><strong>Ações Recomendadas:</strong></p>
<ul>
{actions}
</ul>
<p>Este é um e-mail automático, por favor não responda.</p>
</body>
</html>
"@
                }
                "slack" = @{
                    "template" = @"
:rotating_light: *Alerta de Segurança: {title}*
>*Severidade:* {severity}
>*Data/Hora:* {timestamp}
>*Descrição:* {description}

*Detalhes:*
```
{details}
```

*Ações Recomendadas:*
{actions}
"@
                }
                "teams" = @{
                    "template" = @"
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "{color}",
    "summary": "Alerta de Segurança: {title}",
    "sections": [{
        "activityTitle": "Alerta de Segurança: {title}",
        "facts": [{
            "name": "Severidade",
            "value": "{severity}"
        }, {
            "name": "Data/Hora",
            "value": "{timestamp}"
        }, {
            "name": "Descrição",
            "value": "{description}"
        }],
        "text": "**Detalhes:**\n\n{details}\n\n**Ações Recomendadas:**\n\n{actions}"
    }]
}
"@
                }
                "sms" = @{
                    "template" = "Alerta de Segurança [{severity}]: {title}. {description}"
                }
            }
            "severity_colors" = @{
                "critical" = "#FF0000"
                "high" = "#FF7F00"
                "medium" = "#FFFF00"
                "low" = "#00FF00"
                "info" = "#0000FF"
            }
            "throttling" = @{
                "enabled" = $true
                "history_retention_days" = 7
            }
        }
        
        # Salvar configuração
        $config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Encoding UTF8
        
        if ($configExists) {
            Write-Log "Configuração de notificações atualizada: $configPath" -Level "SUCCESS"
        } else {
            Write-Log "Configuração de notificações criada: $configPath" -Level "SUCCESS"
        }
        
        Write-Log "IMPORTANTE: Atualize as credenciais e webhooks na configuração antes de usar" -Level "WARNING"
    } catch {
        Write-Log "Erro ao criar configuração de notificações: $_" -Level "ERROR"
    }
}

# Função para enviar notificação por e-mail (simulada)
function Send-EmailNotification {
    param (
        [PSCustomObject]$NotificationConfig,
        [string]$Title,
        [string]$Description,
        [string]$Details,
        [string]$Severity,
        [string[]]$Actions
    )
    
    try {
        $emailConfig = ($NotificationConfig.notification_channels | Where-Object { $_.type -eq "email" }).config
        
        if (-not $emailConfig) {
            Write-Log "Configuração de e-mail não encontrada" -Level "ERROR"
            return $false
        }
        
        # Preparar o conteúdo do e-mail
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $subject = $NotificationConfig.notification_templates.email.subject_template
        $body = $NotificationConfig.notification_templates.email.body_template
        
        # Substituir placeholders
        $subject = $subject.Replace("{severity}", $Severity).Replace("{title}", $Title)
        
        $actionsHtml = ""
        foreach ($action in $Actions) {
            $actionsHtml += "<li>$action</li>"
        }
        
        $body = $body.Replace("{title}", $Title)
        $body = $body.Replace("{severity}", $Severity)
        $body = $body.Replace("{timestamp}", $timestamp)
        $body = $body.Replace("{description}", $Description)
        $body = $body.Replace("{details}", $Details)
        $body = $body.Replace("{actions}", $actionsHtml)
        
        # Em um ambiente real, aqui seria implementado o código para enviar o e-mail
        # Simulação do envio
        Write-Log "[SIMULAÇÃO] Enviando e-mail para $($emailConfig.recipients -join ', ')" -Level "INFO"
        Write-Log "[SIMULAÇÃO] Assunto: $subject" -Level "INFO"
        
        # Salvar o e-mail em um arquivo para demonstração
        $emailFileName = "email_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"
        $emailFilePath = Join-Path -Path $notificationsDir -ChildPath $emailFileName
        
        $emailContent = @"
<!-- Simulação de E-mail -->
<!-- De: $($emailConfig.from_address) -->
<!-- Para: $($emailConfig.recipients -join ', ') -->
<!-- Assunto: $subject -->

$body
"@
        
        Set-Content -Path $emailFilePath -Value $emailContent -Encoding UTF8
        Write-Log "E-mail simulado salvo em: $emailFilePath" -Level "SUCCESS"
        
        return $true
    } catch {
        Write-Log "Erro ao enviar notificação por e-mail: $_" -Level "ERROR"
        return $false
    }
}

# Função para enviar notificação para o Slack (simulada)
function Send-SlackNotification {
    param (
        [PSCustomObject]$NotificationConfig,
        [string]$Title,
        [string]$Description,
        [string]$Details,
        [string]$Severity,
        [string[]]$Actions
    )
    
    try {
        $slackConfig = ($NotificationConfig.notification_channels | Where-Object { $_.type -eq "slack" }).config
        
        if (-not $slackConfig) {
            Write-Log "Configuração do Slack não encontrada" -Level "ERROR"
            return $false
        }
        
        # Preparar a mensagem do Slack
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $message = $NotificationConfig.notification_templates.slack.template
        
        # Substituir placeholders
        $message = $message.Replace("{title}", $Title)
        $message = $message.Replace("{severity}", $Severity)
        $message = $message.Replace("{timestamp}", $timestamp)
        $message = $message.Replace("{description}", $Description)
        $message = $message.Replace("{details}", $Details)
        
        $actionsText = ""
        foreach ($action in $Actions) {
            $actionsText += "• $action\n"
        }
        
        $message = $message.Replace("{actions}", $actionsText)
        
        # Em um ambiente real, aqui seria implementado o código para enviar a mensagem para o Slack
        # Simulação do envio
        Write-Log "[SIMULAÇÃO] Enviando mensagem para o Slack (canal: $($slackConfig.channel))" -Level "INFO"
        
        # Salvar a mensagem em um arquivo para demonstração
        $slackFileName = "slack_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
        $slackFilePath = Join-Path -Path $notificationsDir -ChildPath $slackFileName
        
        $slackContent = @"
# Simulação de Mensagem do Slack
# Canal: $($slackConfig.channel)
# Usuário: $($slackConfig.username)
# Emoji: $($slackConfig.icon_emoji)

$message
"@
        
        Set-Content -Path $slackFilePath -Value $slackContent -Encoding UTF8
        Write-Log "Mensagem do Slack simulada salva em: $slackFilePath" -Level "SUCCESS"
        
        return $true
    } catch {
        Write-Log "Erro ao enviar notificação para o Slack: $_" -Level "ERROR"
        return $false
    }
}

# Função para verificar limitação de notificações (throttling)
function Check-NotificationThrottling {
    param (
        [PSCustomObject]$NotificationConfig,
        [string]$AlertId,
        [string]$Severity
    )
    
    try {
        # Verificar se o throttling está habilitado
        if (-not $NotificationConfig.throttling.enabled) {
            return $true  # Throttling desabilitado, pode enviar
        }
        
        # Obter o tempo de throttling para a severidade
        $throttleMinutes = $NotificationConfig.notification_levels.$Severity.throttle_minutes
        
        if ($throttleMinutes -eq 0) {
            return $true  # Sem limitação para esta severidade
        }
        
        # Verificar histórico de notificações
        $historyFile = Join-Path -Path $notificationsDir -ChildPath "notification_history.json"
        
        if (Test-Path $historyFile) {
            $history = Get-Content -Path $historyFile -Raw | ConvertFrom-Json
        } else {
            $history = @()
        }
        
        # Verificar se existe uma notificação recente para este alerta
        $now = Get-Date
        $recentNotification = $history | Where-Object { 
            $_.alert_id -eq $AlertId -and 
            ([DateTime]$_.timestamp) -gt $now.AddMinutes(-$throttleMinutes) 
        }
        
        if ($recentNotification) {
            $lastTime = [DateTime]$recentNotification.timestamp
            $nextAllowed = $lastTime.AddMinutes($throttleMinutes)
            $waitMinutes = ($nextAllowed - $now).TotalMinutes
            
            Write-Log "Notificação limitada por throttling. Próxima notificação permitida em $([math]::Round($waitMinutes, 1)) minutos" -Level "WARNING"
            return $false
        }
        
        return $true
    } catch {
        Write-Log "Erro ao verificar throttling: $_" -Level "ERROR"
        return $true  # Em caso de erro, permitir o envio
    }
}

# Função para registrar histórico de notificações
function Register-NotificationHistory {
    param (
        [string]$AlertId,
        [string]$Title,
        [string]$Severity,
        [string[]]$Channels
    )
    
    try {
        $historyFile = Join-Path -Path $notificationsDir -ChildPath "notification_history.json"
        
        if (Test-Path $historyFile) {
            $history = Get-Content -Path $historyFile -Raw | ConvertFrom-Json
        } else {
            $history = @()
        }
        
        # Adicionar nova entrada
        $newEntry = @{
            "alert_id" = $AlertId
            "title" = $Title
            "severity" = $Severity
            "channels" = $Channels
            "timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $history += $newEntry
        
        # Limpar entradas antigas
        $retentionDays = 7  # Padrão de 7 dias
        $configPath = Join-Path -Path $configDir -ChildPath "notification-config.json"
        
        if (Test-Path $configPath) {
            $config = Get-Content -Path $configPath -Raw | ConvertFrom-Json
            $retentionDays = $config.throttling.history_retention_days
        }
        
        $cutoffDate = (Get-Date).AddDays(-$retentionDays)
        $history = $history | Where-Object { ([DateTime]$_.timestamp) -gt $cutoffDate }
        
        # Salvar histórico atualizado
        $history | ConvertTo-Json -Depth 10 | Set-Content -Path $historyFile -Encoding UTF8
        
        return $true
    } catch {
        Write-Log "Erro ao registrar histórico de notificações: $_" -Level "ERROR"
        return $false
    }
}

# Função principal para enviar notificação de segurança
function Send-SecurityNotification {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Title,
        
        [Parameter(Mandatory=$true)]
        [string]$Description,
        
        [Parameter(Mandatory=$true)]
        [string]$Details,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet("critical", "high", "medium", "low", "info")]
        [string]$Severity,
        
        [Parameter(Mandatory=$false)]
        [string[]]$Actions = @(),
        
        [Parameter(Mandatory=$false)]
        [string]$AlertId = ""
    )
    
    Show-Header "ENVIO DE NOTIFICAÇÃO DE SEGURANÇA"
    
    try {
        # Gerar ID de alerta se não fornecido
        if ([string]::IsNullOrEmpty($AlertId)) {
            $AlertId = "ALERT-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + ([Guid]::NewGuid().ToString().Substring(0, 8))
        }
        
        Write-Log "Preparando notificação de segurança (ID: $AlertId)" -Level "INFO"
        Write-Log "Título: $Title" -Level "INFO"
        Write-Log "Severidade: $Severity" -Level "INFO"
        
        # Carregar configuração
        $configPath = Join-Path -Path $configDir -ChildPath "notification-config.json"
        
        if (-not (Test-Path $configPath)) {
            Write-Log "Configuração de notificações não encontrada. Criando configuração padrão..." -Level "WARNING"
            Create-NotificationConfig
        }
        
        $config = Get-Content -Path $configPath -Raw | ConvertFrom-Json
        
        # Verificar throttling
        $canSend = Check-NotificationThrottling -NotificationConfig $config -AlertId $AlertId -Severity $Severity
        
        if (-not $canSend) {
            Write-Log "Notificação não enviada devido a limitações de throttling" -Level "WARNING"
            return
        }
        
        # Determinar canais para esta severidade
        $channels = $config.notification_levels.$Severity.channels
        $sentChannels = @()
        
        Write-Log "Enviando notificação para os canais: $($channels -join ', ')" -Level "INFO"
        
        # Enviar para cada canal configurado
        foreach ($channel in $channels) {
            $channelConfig = $config.notification_channels | Where-Object { $_.type -eq $channel }
            
            if (-not $channelConfig -or -not $channelConfig.enabled) {
                Write-Log "Canal '$channel' não configurado ou desabilitado" -Level "WARNING"
                continue
            }
            
            $success = $false
            
            switch ($channel) {
                "email" {
                    $success = Send-EmailNotification -NotificationConfig $config -Title $Title -Description $Description -Details $Details -Severity $Severity -Actions $Actions
                }
                "slack" {
                    $success = Send-SlackNotification -NotificationConfig $config -Title $Title -Description $Description -Details $Details -Severity $Severity -Actions $Actions
                }
                "teams" {
                    Write-Log "Notificação para Microsoft Teams não implementada nesta versão" -Level "WARNING"
                }
                "sms" {
                    Write-Log "Notificação por SMS não implementada nesta versão" -Level "WARNING"
                }
                default {
                    Write-Log "Canal de notificação desconhecido: $channel" -Level "WARNING"
                }
            }
            
            if ($success) {
                $sentChannels += $channel
                Write-Log "Notificação enviada com sucesso para o canal: $channel" -Level "SUCCESS"
            }
        }
        
        # Registrar no histórico
        if ($sentChannels.Count -gt 0) {
            Register-NotificationHistory -AlertId $AlertId -Title $Title -Severity $Severity -Channels $sentChannels
            Write-Log "Notificação registrada no histórico" -Level "SUCCESS"
        } else {
            Write-Log "Nenhum canal de notificação foi bem-sucedido" -Level "ERROR"
        }
        
        return $AlertId
    } catch {
        Write-Log "Erro ao enviar notificação de segurança: $_" -Level "ERROR"
        return $null
    }
}

# Função para testar o sistema de notificações
function Test-NotificationSystem {
    Show-Header "TESTE DO SISTEMA DE NOTIFICAÇÕES"
    
    try {
        # Verificar se a configuração existe
        $configPath = Join-Path -Path $configDir -ChildPath "notification-config.json"
        
        if (-not (Test-Path $configPath)) {
            Write-Log "Configuração de notificações não encontrada. Criando configuração padrão..." -Level "WARNING"
            Create-NotificationConfig
        }
        
        # Enviar notificação de teste para cada nível de severidade
        $severities = @("info", "low", "medium", "high", "critical")
        
        foreach ($severity in $severities) {
            $title = "Teste de Notificação - $severity"
            $description = "Esta é uma notificação de teste para verificar o funcionamento do sistema de notificações."
            $details = "Detalhes técnicos da notificação de teste:\n- Severidade: $severity\n- Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')\n- Sistema: $(hostname)"
            $actions = @(
                "Verificar se a notificação foi recebida corretamente",
                "Confirmar formatação e conteúdo",
                "Ajustar configurações se necessário"
            )
            
            Write-Log "Enviando notificação de teste com severidade '$severity'" -Level "INFO"
            
            $alertId = Send-SecurityNotification -Title $title -Description $description -Details $details -Severity $severity -Actions $actions
            
            if ($alertId) {
                Write-Log "Notificação de teste enviada com sucesso (ID: $alertId)" -Level "SUCCESS"
            } else {
                Write-Log "Falha ao enviar notificação de teste com severidade '$severity'" -Level "ERROR"
            }
            
            # Pequena pausa entre notificações
            Start-Sleep -Seconds 2
        }
        
        Write-Log "Teste do sistema de notificações concluído" -Level "SUCCESS"
    } catch {
        Write-Log "Erro ao testar sistema de notificações: $_" -Level "ERROR"
    }
}

# Função principal
function Initialize-NotificationSystem {
    Show-Header "INICIALIZAÇÃO DO SISTEMA DE NOTIFICAÇÕES DE SEGURANÇA"
    
    # Criar diretórios necessários
    Create-RequiredDirectories
    
    # Criar configuração de notificações
    Create-NotificationConfig
    
    # Perguntar se deseja realizar um teste
    $runTest = Read-Host "Deseja realizar um teste do sistema de notificações? (S/N)"
    
    if ($runTest -eq "S" -or $runTest -eq "s") {
        Test-NotificationSystem
    }
    
    Write-Log "Sistema de notificações de segurança inicializado com sucesso" -Level "SUCCESS"
    Write-Log "\nPara enviar notificações, use a função Send-SecurityNotification" -Level "INFO"
    Write-Log "Exemplo: Send-SecurityNotification -Title 'Título do Alerta' -Description 'Descrição' -Details 'Detalhes técnicos' -Severity 'high' -Actions @('Ação recomendada 1', 'Ação recomendada 2')" -Level "INFO"
}

# Executar a função principal
Initialize-NotificationSystem
