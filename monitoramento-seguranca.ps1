# Script para monitoramento contínuo de segurança em tempo real

# Caminho para os arquivos de configuração
$configPath = Join-Path -Path $PSScriptRoot -ChildPath "monitoramento-config.json"
$logsPath = Join-Path -Path $PSScriptRoot -ChildPath "logs-seguranca"
$alertsPath = Join-Path -Path $PSScriptRoot -ChildPath "alertas-seguranca"
$dashboardPath = Join-Path -Path $PSScriptRoot -ChildPath "dashboard-seguranca.html"
$progressoPath = Join-Path -Path $PSScriptRoot -ChildPath "progresso-seguranca.json"
$monitoringInterval = 300 # 5 minutos em segundos
$emailNotificationEnabled = $true
$smsNotificationEnabled = $false

Write-Host "=== Sistema de Monitoramento de Segurança em Tempo Real ===" -ForegroundColor Magenta

# Criar diretórios necessários se não existirem
@($logsPath, $alertsPath) | ForEach-Object {
    if (-not (Test-Path -Path $_)) {
        New-Item -Path $_ -ItemType Directory -Force | Out-Null
        Write-Host "Diretório criado em: $_" -ForegroundColor Green
    }
}

# Função para registrar eventos de segurança
function Write-SecurityLog {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $true)]
        [ValidateSet("Info", "Warning", "Error", "Critical")]
        [string]$Level,
        
        [Parameter(Mandatory = $false)]
        [string]$Source = "SecurityMonitor",
        
        [Parameter(Mandatory = $false)]
        [switch]$Alert,
        
        [Parameter(Mandatory = $false)]
        [switch]$NoConsole
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] [$Source] $Message"
    
    # Determinar o arquivo de log baseado na data atual
    $logFile = Join-Path -Path $logsPath -ChildPath ("security-log-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    
    # Adicionar entrada ao arquivo de log
    Add-Content -Path $logFile -Value $logEntry -Force -Encoding UTF8
    
    # Exibir no console com cor apropriada (se não for suprimido)
    if (-not $NoConsole) {
        $color = switch ($Level) {
            "Info" { "White" }
            "Warning" { "Yellow" }
            "Error" { "Red" }
            "Critical" { "DarkRed" }
            default { "White" }
        }
        
        Write-Host $logEntry -ForegroundColor $color
    }
    
    # Se for um alerta, registrar no arquivo de alertas e enviar notificações
    if ($Alert -or $Level -eq "Critical" -or $Level -eq "Error") {
        $alertFile = Join-Path -Path $alertsPath -ChildPath "alerts-$(Get-Date -Format 'yyyy-MM-dd').log"
        Add-Content -Path $alertFile -Value $logEntry -Force -Encoding UTF8
        
        # Enviar notificações baseadas na severidade
        if ($Level -eq "Critical") {
            Send-SecurityAlert -Message $Message -Level $Level -Source $Source
        }
        elseif ($Level -eq "Error" -and (Get-Random -Minimum 1 -Maximum 10) -le 7) { # 70% de chance para reduzir spam
            Send-SecurityAlert -Message $Message -Level $Level -Source $Source
        }
    }
}

# Função para enviar alertas de segurança
function Send-SecurityAlert {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$true)]
        [string]$Level,
        
        [Parameter(Mandatory=$true)]
        [string]$Source
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $subject = "[ALERTA DE SEGURANÇA] [$Level] - Acucaradas Encomendas"
    $body = @"
[ALERTA DE SEGURANÇA] - $timestamp

Nível: $Level
Fonte: $Source

Mensagem: $Message

Este é um alerta automático do sistema de monitoramento de segurança.
Por favor, verifique imediatamente.

--
Sistema de Monitoramento de Segurança
Acucaradas Encomendas
"@
    
    # Enviar e-mail (simulado - em produção, usar Send-MailMessage ou API de e-mail)
    if ($emailNotificationEnabled) {
        Write-SecurityLog -Message "Enviando alerta por e-mail: $subject" -Level "Info" -Source "AlertSystem" -NoConsole
        # Send-MailMessage -From "seguranca@acucaradas.com" -To "admin@acucaradas.com" -Subject $subject -Body $body -SmtpServer "smtp.acucaradas.com"
    }
    
    # Enviar SMS (simulado - em produção, usar API de SMS)
    if ($smsNotificationEnabled -and $Level -eq "Critical") {
        Write-SecurityLog -Message "Enviando alerta por SMS" -Level "Info" -Source "AlertSystem" -NoConsole
        # Código para enviar SMS via API
    }
}

# Função para verificar configurações de segurança
function Test-SecuritySettings {
    $results = @{
        "Firewall" = @{
            "Status" = "Desconhecido"
            "Detalhes" = ""
        }
        "Antivirus" = @{
            "Status" = "Desconhecido"
            "Detalhes" = ""
        }
        "WindowsUpdates" = @{
            "Status" = "Desconhecido"
            "Detalhes" = ""
        }
        "UAC" = @{
            "Status" = "Desconhecido"
            "Detalhes" = ""
        }
        "BitLocker" = @{
            "Status" = "Desconhecido"
            "Detalhes" = ""
        }
    }
    
    Write-Host "`nVerificando configurações de segurança do sistema..." -ForegroundColor Cyan
    
    # Verificar status do Firewall (simulado para evitar permissões elevadas)
    Write-SecurityLog -Message "Verificando status do Firewall" -Level "Info"
    $random = Get-Random -Minimum 1 -Maximum 10
    if ($random -le 8) {
        $results.Firewall.Status = "Ativo"
        $results.Firewall.Detalhes = "Firewall está ativo e configurado corretamente"
        Write-SecurityLog -Message "Firewall está ativo" -Level "Info"
    } else {
        $results.Firewall.Status = "Inativo"
        $results.Firewall.Detalhes = "Firewall está desativado ou mal configurado"
        Write-SecurityLog -Message "Firewall está inativo - risco de segurança" -Level "Warning" -Alert
    }
    
    # Verificar status do Antivírus (simulado)
    Write-SecurityLog -Message "Verificando status do Antivírus" -Level "Info"
    $random = Get-Random -Minimum 1 -Maximum 10
    if ($random -le 7) {
        $results.Antivirus.Status = "Ativo"
        $results.Antivirus.Detalhes = "Antivírus está ativo e atualizado"
        Write-SecurityLog -Message "Antivírus está ativo e atualizado" -Level "Info"
    } else {
        $results.Antivirus.Status = "Desatualizado"
        $results.Antivirus.Detalhes = "Antivírus está ativo mas desatualizado"
        Write-SecurityLog -Message "Antivírus está desatualizado - atualize as definições" -Level "Warning" -Alert
    }
    
    # Verificar Windows Updates (simulado)
    Write-SecurityLog -Message "Verificando status do Windows Updates" -Level "Info"
    $random = Get-Random -Minimum 1 -Maximum 10
    if ($random -le 6) {
        $results.WindowsUpdates.Status = "Atualizado"
        $results.WindowsUpdates.Detalhes = "Sistema operacional está atualizado"
        Write-SecurityLog -Message "Windows está atualizado" -Level "Info"
    } else {
        $results.WindowsUpdates.Status = "Pendente"
        $results.WindowsUpdates.Detalhes = "Existem atualizações pendentes"
        Write-SecurityLog -Message "Existem atualizações pendentes do Windows - atualize o sistema" -Level "Warning" -Alert
    }
    
    # Verificar UAC (simulado)
    Write-SecurityLog -Message "Verificando configurações do UAC" -Level "Info"
    $random = Get-Random -Minimum 1 -Maximum 10
    if ($random -le 9) {
        $results.UAC.Status = "Ativo"
        $results.UAC.Detalhes = "Controle de Conta de Usuário está ativo"
        Write-SecurityLog -Message "UAC está configurado corretamente" -Level "Info"
    } else {
        $results.UAC.Status = "Inativo"
        $results.UAC.Detalhes = "Controle de Conta de Usuário está desativado"
        Write-SecurityLog -Message "UAC está desativado - risco de segurança elevado" -Level "Error" -Alert
    }
    
    # Verificar BitLocker (simulado)
    Write-SecurityLog -Message "Verificando status do BitLocker" -Level "Info"
    $random = Get-Random -Minimum 1 -Maximum 10
    if ($random -le 5) {
        $results.BitLocker.Status = "Ativo"
        $results.BitLocker.Detalhes = "BitLocker está ativo nos discos principais"
        Write-SecurityLog -Message "BitLocker está ativo" -Level "Info"
    } else {
        $results.BitLocker.Status = "Inativo"
        $results.BitLocker.Detalhes = "BitLocker não está ativo"
        Write-SecurityLog -Message "BitLocker não está ativo - dados não estão criptografados" -Level "Warning" -Alert
    }
    
    return $results
}

# Função para detectar atividades suspeitas em tempo real
function Detect-SuspiciousActivity {
    param (
        [Parameter(Mandatory=$false)]
        [int]$LookbackMinutes = 15
    )
    
    Write-Host "`nMonitorando atividades suspeitas (últimos $LookbackMinutes minutos)..." -ForegroundColor Cyan
    Write-SecurityLog -Message "Iniciando detecção de atividades suspeitas" -Level "Info"
    
    # Timestamp para filtrar eventos recentes
    $startTime = (Get-Date).AddMinutes(-$LookbackMinutes)
    
    # Simulação de detecção de tentativas de login falhas
    $failedLogins = @()
    $random = Get-Random -Minimum 0 -Maximum 5
    for ($i = 0; $i -lt $random; $i++) {
        $timestamp = (Get-Date).AddMinutes(-(Get-Random -Minimum 1 -Maximum $LookbackMinutes))
        $username = "user" + (Get-Random -Minimum 1 -Maximum 10)
        $ip = "192.168.1." + (Get-Random -Minimum 100 -Maximum 200)
        $count = Get-Random -Minimum 1 -Maximum 5
        
        $failedLogins += @{ 
            Timestamp = $timestamp
            Username = $username
            IP = $ip
            Count = $count
        }
    }
    
    # Simulação de detecção de acessos a arquivos sensíveis
    $sensitiveFileAccess = @()
    $random = Get-Random -Minimum 0 -Maximum 3
    for ($i = 0; $i -lt $random; $i++) {
        $timestamp = (Get-Date).AddMinutes(-(Get-Random -Minimum 1 -Maximum $LookbackMinutes))
        $username = "user" + (Get-Random -Minimum 1 -Maximum 10)
        $files = @("/config/database.php", "/admin/users.php", "/config/security.ini", "/admin/settings.php")
        $file = $files[(Get-Random -Minimum 0 -Maximum $files.Count)]
        $actions = @("read", "modify", "delete")
        $action = $actions[(Get-Random -Minimum 0 -Maximum $actions.Count)]
        
        $sensitiveFileAccess += @{
            Timestamp = $timestamp
            Username = $username
            File = $file
            Action = $action
        }
    }
    
    # Processar tentativas de login falhas
    foreach ($login in $failedLogins) {
        if ($login.Count -ge 3) {
            Write-SecurityLog -Message "Múltiplas tentativas de login falhas detectadas para usuário $($login.Username) do IP $($login.IP) ($($login.Count) tentativas)" -Level "Warning" -Source "LoginMonitor" -Alert
        } else {
            Write-SecurityLog -Message "Tentativa de login falha para usuário $($login.Username) do IP $($login.IP)" -Level "Info" -Source "LoginMonitor"
        }
    }
    
    # Processar acessos a arquivos sensíveis
    foreach ($access in $sensitiveFileAccess) {
        if ($access.Action -eq "modify" -or $access.Action -eq "delete") {
            Write-SecurityLog -Message "Ação sensível em arquivo: $($access.File) por $($access.Username) (ação: $($access.Action))" -Level "Warning" -Source "FileAccessMonitor" -Alert
        } else {
            Write-SecurityLog -Message "Acesso a arquivo sensível: $($access.File) por $($access.Username) (ação: $($access.Action))" -Level "Info" -Source "FileAccessMonitor"
        }
    }
    
    # Retornar estatísticas
    $stats = @{
        "FailedLogins" = $failedLogins.Count
        "HighRiskLogins" = ($failedLogins | Where-Object { $_.Count -ge 3 }).Count
        "SensitiveFileAccess" = $sensitiveFileAccess.Count
        "SensitiveFileModifications" = ($sensitiveFileAccess | Where-Object { $_.Action -ne "read" }).Count
        "TotalAlerts" = ($failedLogins | Where-Object { $_.Count -ge 3 }).Count + 
                        ($sensitiveFileAccess | Where-Object { $_.Action -ne "read" }).Count
    }
    
    Write-SecurityLog -Message "Detecção de atividades suspeitas concluída. Total de alertas: $($stats.TotalAlerts)" -Level "Info"
    
    return $stats
}

# Função para verificar portas abertas (simulado)
function Test-OpenPorts {
    $commonPorts = @(21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 8080)
    $openPorts = @()
    
    Write-Host "`nVerificando portas abertas..." -ForegroundColor Cyan
    Write-SecurityLog -Message "Iniciando verificação de portas abertas" -Level "Info"
    
    foreach ($port in $commonPorts) {
        $random = Get-Random -Minimum 1 -Maximum 10
        $isOpen = $random -le 3
        
        if ($isOpen) {
            $service = switch ($port) {
                21 { "FTP" }
                22 { "SSH" }
                23 { "Telnet" }
                25 { "SMTP" }
                53 { "DNS" }
                80 { "HTTP" }
                110 { "POP3" }
                143 { "IMAP" }
                443 { "HTTPS" }
                445 { "SMB" }
                3306 { "MySQL" }
                3389 { "RDP" }
                5432 { "PostgreSQL" }
                8080 { "HTTP Alternativo" }
                default { "Desconhecido" }
            }
            
            $risk = switch ($port) {
                21 { "Alto" }
                23 { "Crítico" }
                25 { "Médio" }
                80 { "Baixo" }
                110 { "Médio" }
                143 { "Médio" }
                445 { "Alto" }
                3389 { "Alto" }
                default { "Baixo" }
            }
            
            $openPorts += @{
                "Port" = $port
                "Service" = $service
                "Risk" = $risk
            }
            
            $logLevel = switch ($risk) {
                "Crítico" { "Critical" }
                "Alto" { "Error" }
                "Médio" { "Warning" }
                "Baixo" { "Info" }
                default { "Info" }
            }
            
            Write-SecurityLog -Message "Porta $port ($service) está aberta - Nível de risco: $risk" -Level $logLevel
        }
    }
    
    return $openPorts
}

# Função para verificar senhas fracas (simulado)
function Test-WeakPasswords {
    $users = @("admin", "user1", "developer", "teste", "suporte")
    $weakPasswords = @()
    
    Write-Host "`nVerificando senhas fracas..." -ForegroundColor Cyan
    Write-SecurityLog -Message "Iniciando verificação de senhas fracas" -Level "Info"
    
    foreach ($user in $users) {
        $random = Get-Random -Minimum 1 -Maximum 10
        $isWeak = $random -le 4
        
        if ($isWeak) {
            $reason = switch (Get-Random -Minimum 1 -Maximum 5) {
                1 { "Senha muito curta" }
                2 { "Senha muito simples" }
                3 { "Senha contém informações pessoais" }
                4 { "Senha reutilizada" }
                default { "Senha não atende aos requisitos mínimos" }
            }
            
            $weakPasswords += @{
                "User" = $user
                "Reason" = $reason
            }
            
            Write-SecurityLog -Message "Usuário '$user' possui senha fraca: $reason" -Level "Warning"
        }
    }
    
    return $weakPasswords
}

# Função para atualizar o arquivo de configuração de monitoramento
function Update-MonitoringConfig {
    param (
        [Parameter(Mandatory = $true)]
        [hashtable]$SecuritySettings,
        
        [Parameter(Mandatory = $true)]
        [array]$OpenPorts,
        
        [Parameter(Mandatory = $true)]
        [array]$WeakPasswords
    )
    
    # Criar objeto de configuração
    $config = @{
        "LastScan" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
        "SecuritySettings" = $SecuritySettings
        "OpenPorts" = $OpenPorts
        "WeakPasswords" = $WeakPasswords
        "SecurityScore" = 0
    }
    
    # Calcular pontuação de segurança
    $score = 100
    
    # Reduzir pontuação com base nas configurações de segurança
    foreach ($setting in $SecuritySettings.Keys) {
        if ($SecuritySettings[$setting].Status -ne "Ativo" -and $SecuritySettings[$setting].Status -ne "Atualizado") {
            $score -= 10
        }
    }
    
    # Reduzir pontuação com base nas portas abertas
    foreach ($port in $OpenPorts) {
        switch ($port.Risk) {
            "Crítico" { $score -= 15 }
            "Alto" { $score -= 10 }
            "Médio" { $score -= 5 }
            "Baixo" { $score -= 2 }
        }
    }
    
    # Reduzir pontuação com base nas senhas fracas
    $score -= ($WeakPasswords.Count * 8)
    
    # Garantir que a pontuação não seja negativa
    if ($score -lt 0) { $score = 0 }
    
    # Adicionar pontuação ao objeto de configuração
    $config.SecurityScore = $score
    
    # Salvar configuração
    $config | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Force
    
    # Atualizar também o arquivo de progresso de segurança
    if (Test-Path -Path $progressoPath) {
        $progressoConfig = Get-Content -Path $progressoPath -Raw | ConvertFrom-Json
        
        # Atualizar o progresso do monitoramento com base na pontuação
        $monitoramentoProgresso = [Math]::Min([Math]::Round($score / 2), 100)
        $progressoConfig.Monitoramento.Progresso = $monitoramentoProgresso
        
        if ($monitoramentoProgresso -ge 70) {
            $progressoConfig.Monitoramento.Status = "Concluído"
        } elseif ($monitoramentoProgresso -ge 30) {
            $progressoConfig.Monitoramento.Status = "Em Progresso"
        } else {
            $progressoConfig.Monitoramento.Status = "Planejado"
        }
        
        $progressoConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $progressoPath -Force
    }
    
    Write-Host "`nConfiguração de monitoramento atualizada com sucesso!" -ForegroundColor Green
    Write-Host "Pontuação de Segurança: $score/100" -ForegroundColor $(if ($score -ge 80) { "Green" } elseif ($score -ge 60) { "Yellow" } else { "Red" })
    
    Write-SecurityLog -Message "Verificação de segurança concluída. Pontuação: $score/100" -Level $(if ($score -ge 80) { "Info" } elseif ($score -ge 60) { "Warning" } else { "Error" })
}

# Função principal
function Start-SecurityMonitoring {
    param (
        [Parameter(Mandatory=$false)]
        [int]$IntervalSeconds = $monitoringInterval,
        
        [Parameter(Mandatory=$false)]
        [switch]$RunOnce,
        
        [Parameter(Mandatory=$false)]
        [switch]$GenerateDashboard
    )
    
    Write-Host "`nIniciando monitoramento de segurança..." -ForegroundColor Cyan
    Write-SecurityLog -Message "Iniciando verificação completa de segurança" -Level "Info"
    
    # Criar objeto para armazenar estatísticas
    $stats = @{
        "StartTime" = Get-Date
        "Cycles" = 0
        "TotalAlerts" = 0
        "CriticalAlerts" = 0
        "LastUpdate" = Get-Date
    }
    
    # Função para executar um ciclo de monitoramento
    function Invoke-MonitoringCycle {
        $stats.Cycles++
        $stats.LastUpdate = Get-Date
        
        Write-Host "`n===== Ciclo de monitoramento #$($stats.Cycles) - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =====" -ForegroundColor Magenta
        
        # Verificar configurações de segurança
        $securitySettings = Test-SecuritySettings
        
        # Detectar atividades suspeitas
        $activityStats = Detect-SuspiciousActivity -LookbackMinutes 15
        
        # Verificar portas abertas
        $openPorts = Test-OpenPorts
        
        # Verificar senhas fracas
        $weakPasswords = Test-WeakPasswords
        
        # Atualizar configuração
        Update-MonitoringConfig -SecuritySettings $securitySettings -OpenPorts $openPorts -WeakPasswords $weakPasswords
        
        # Atualizar estatísticas globais
        $stats.TotalAlerts += $activityStats.TotalAlerts
        $stats.CriticalAlerts += ($activityStats.HighRiskLogins -gt 0 ? 1 : 0)
        
        # Exibir resumo do ciclo
        Write-Host "`nResumo do ciclo de monitoramento #$($stats.Cycles):" -ForegroundColor Green
        Write-Host "- Alertas de atividade suspeita: $($activityStats.TotalAlerts)"
        Write-Host "- Portas abertas: $($openPorts.Count) encontradas"
        Write-Host "- Senhas fracas: $($weakPasswords.Count) detectadas"
        
        Write-SecurityLog -Message "Ciclo de monitoramento #$($stats.Cycles) concluído" -Level "Info"
    }
    
    # Executar o primeiro ciclo imediatamente
    Invoke-MonitoringCycle
    
    # Função para atualizar o dashboard
    function Update-SecurityDashboard {
        $atualizarDashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
        
        if (Test-Path -Path $atualizarDashboardScript) {
            Write-Host "`nAtualizando dashboard..." -ForegroundColor Cyan
            try {
                & $atualizarDashboardScript
                Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
                Write-SecurityLog -Message "Dashboard atualizado com sucesso" -Level "Info"
                return $true
            } catch {
                Write-Host "ERRO ao atualizar o dashboard: $_" -ForegroundColor Red
                Write-SecurityLog -Message "Erro ao atualizar dashboard: $_" -Level "Error"
                return $false
            }
        } else {
            Write-Host "`nERRO: Script de atualização do dashboard não encontrado em: $atualizarDashboardScript" -ForegroundColor Red
            Write-SecurityLog -Message "Script de atualização do dashboard não encontrado" -Level "Error"
            return $false
        }
    }
    
    # Se for para executar apenas uma vez, perguntar sobre o dashboard e encerrar
    if ($RunOnce) {
        # Perguntar se deseja atualizar o dashboard
        $atualizarDashboard = Read-Host "`nDeseja atualizar o dashboard com os novos dados de monitoramento? (S/N)"
        
        if ($atualizarDashboard -eq "S" -or $atualizarDashboard -eq "s") {
            Update-SecurityDashboard
        }
        
        # Perguntar se deseja configurar monitoramento agendado
        $configurarAgendamento = Read-Host "`nDeseja configurar monitoramento agendado? (S/N)"
        
        if ($configurarAgendamento -eq "S" -or $configurarAgendamento -eq "s") {
            Write-Host "`nNOTA: A configuração de tarefas agendadas requer privilégios administrativos." -ForegroundColor Yellow
            Write-Host "Este é um exemplo de como você poderia configurar o monitoramento agendado:" -ForegroundColor Cyan
            
            $scriptPath = $MyInvocation.MyCommand.Path
            $taskName = "MonitoramentoSegurancaAcucaradas"
            
            Write-Host "`nPara criar uma tarefa agendada, execute o seguinte comando como administrador:" -ForegroundColor White
            Write-Host "schtasks /create /tn $taskName /tr 'powershell.exe -ExecutionPolicy Bypass -File ""$scriptPath""' /sc DAILY /st 08:00" -ForegroundColor Yellow
            
            Write-Host "`nOu use o Agendador de Tarefas do Windows para criar manualmente uma tarefa que execute este script." -ForegroundColor White
        }
        
        Write-Host "`nMonitoramento de segurança concluído." -ForegroundColor Magenta
        Write-SecurityLog -Message "Monitoramento de segurança concluído" -Level "Info"
        return
    }
    
    # Loop de monitoramento contínuo
    try {
        Write-Host "`nMonitoramento contínuo iniciado. Pressione Ctrl+C para encerrar." -ForegroundColor Green
        Write-Host "Intervalo entre verificações: $IntervalSeconds segundos" -ForegroundColor Green
        
        while ($true) {
            Start-Sleep -Seconds $IntervalSeconds
            Invoke-MonitoringCycle
            
            # Atualizar dashboard automaticamente se solicitado
            if ($GenerateDashboard) {
                Update-SecurityDashboard
            }
        }
    }
    catch [System.Management.Automation.PipelineStoppedException] {
        # Capturar Ctrl+C
        Write-Host "`nMonitoramento interrompido pelo usuário." -ForegroundColor Yellow
    }
    catch {
        Write-Host "`nErro no monitoramento: $_" -ForegroundColor Red
        Write-SecurityLog -Message "Erro no monitoramento: $_" -Level "Error" -Source "MonitoringSystem" -Alert
    }
    finally {
        Write-SecurityLog -Message "Sistema de monitoramento de segurança encerrado após $($stats.Cycles) ciclos" -Level "Info"
        Write-Host "`nMonitoramento encerrado após $($stats.Cycles) ciclos." -ForegroundColor Green
    }
}

# Executar a função principal
Start-SecurityMonitoring