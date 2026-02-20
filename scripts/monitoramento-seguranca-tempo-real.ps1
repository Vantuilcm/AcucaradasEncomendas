<#
.SYNOPSIS
    Sistema de monitoramento de segurança em tempo real para o projeto Acucaradas Encomendas.

.DESCRIPTION
    Este script implementa um sistema de monitoramento contínuo que detecta anomalias de segurança,
    tentativas de intrusão e comportamentos suspeitos em tempo real, complementando os próximos
    passos recomendados para a segurança do projeto.

.NOTES
    Autor: Equipe de Segurança Acucaradas Encomendas
    Data: $(Get-Date -Format "dd/MM/yyyy")
    Requisitos: PowerShell 5.1+, módulos PSEventViewer, PSLogging
#>

# Definir codificação UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Importar módulo de notificações de segurança
$notificacoesPath = "$PSScriptRoot\sistema-notificacoes-seguranca.ps1"
if (Test-Path $notificacoesPath) {
    . $notificacoesPath
} else {
    Write-Error "Módulo de notificações não encontrado em: $notificacoesPath"
    exit 1
}

# Configurações globais
$global:CONFIG = @{
    LogPath = "$PSScriptRoot\..\logs-seguranca\monitoramento"
    ConfigPath = "$PSScriptRoot\..\config-seguranca\monitoramento-config.json"
    DatabasePath = "$PSScriptRoot\..\data-seguranca\monitoramento.db"
    AlertThresholds = @{
        LoginFailures = 5
        APIRateLimit = 100
        FileSystemChanges = 20
        UnauthorizedAccess = 1
    }
    ScanIntervalSeconds = 60
    RetentionDays = 30
}

# Função para mostrar status das tarefas
function Show-MonitoringStatus {
    param (
        [string]$Message,
        [string]$Status = "INFO",
        [switch]$NoNewLine
    )

    $colors = @{
        "SUCCESS" = "Green"
        "INFO" = "Cyan"
        "WARNING" = "Yellow"
        "ERROR" = "Red"
        "CRITICAL" = "DarkRed"
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $statusText = "[$timestamp] [$Status] $Message"
    
    if ($colors.ContainsKey($Status)) {
        Write-Host $statusText -ForegroundColor $colors[$Status] -NoNewline:$NoNewLine
    } else {
        Write-Host $statusText -NoNewline:$NoNewLine
    }

    # Registrar em log
    $logFile = "$($global:CONFIG.LogPath)\monitoring-$(Get-Date -Format 'yyyy-MM-dd').log"
    try {
        if (-not (Test-Path $global:CONFIG.LogPath)) {
            New-Item -Path $global:CONFIG.LogPath -ItemType Directory -Force | Out-Null
        }
        Add-Content -Path $logFile -Value $statusText -Encoding UTF8
    } catch {
        Write-Host "Erro ao escrever no log: $_" -ForegroundColor Red
    }
}

# Função para criar/atualizar configuração
function Initialize-MonitoringConfig {
    if (-not (Test-Path (Split-Path $global:CONFIG.ConfigPath -Parent))) {
        New-Item -Path (Split-Path $global:CONFIG.ConfigPath -Parent) -ItemType Directory -Force | Out-Null
    }

    if (-not (Test-Path $global:CONFIG.ConfigPath)) {
        $defaultConfig = @{
            Monitoring = @{
                Enabled = $true
                ScanIntervalSeconds = $global:CONFIG.ScanIntervalSeconds
                RetentionDays = $global:CONFIG.RetentionDays
            }
            Sources = @{
                EventLogs = @{
                    Enabled = $true
                    Logs = @("Security", "Application", "System")
                }
                FileSystem = @{
                    Enabled = $true
                    Paths = @(
                        "$PSScriptRoot\..\src",
                        "$PSScriptRoot\..\public",
                        "$PSScriptRoot\..\config"
                    )
                    ExcludePatterns = @("*.log", "*.tmp", "node_modules", ".git")
                }
                Network = @{
                    Enabled = $true
                    Ports = @(80, 443, 3000, 8080)
                    MonitorIncoming = $true
                    MonitorOutgoing = $true
                }
                API = @{
                    Enabled = $true
                    Endpoints = @("/api/login", "/api/users", "/api/orders", "/api/products")
                    RateLimiting = $true
                }
                Database = @{
                    Enabled = $true
                    MonitorQueries = $true
                    AlertOnSlowQueries = $true
                }
            }
            Alerts = @{
                Thresholds = $global:CONFIG.AlertThresholds
                NotificationChannels = @("Email", "Slack")
                GroupSimilarAlerts = $true
                CooldownMinutes = 15
            }
            Integration = @{
                SIEM = @{
                    Enabled = $false
                    Endpoint = ""
                    ApiKey = ""
                }
                WAF = @{
                    Enabled = $false
                    AutoBlock = $false
                    BlockDuration = 3600
                }
            }
        }

        $defaultConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $global:CONFIG.ConfigPath -Encoding UTF8
        Show-MonitoringStatus "Configuração padrão criada em: $($global:CONFIG.ConfigPath)" "SUCCESS"
    } else {
        Show-MonitoringStatus "Usando configuração existente: $($global:CONFIG.ConfigPath)" "INFO"
    }

    # Carregar configuração
    try {
        $config = Get-Content -Path $global:CONFIG.ConfigPath -Raw | ConvertFrom-Json
        $global:CONFIG.ScanIntervalSeconds = $config.Monitoring.ScanIntervalSeconds
        $global:CONFIG.RetentionDays = $config.Monitoring.RetentionDays
        $global:CONFIG.AlertThresholds = @{}
        $config.Alerts.Thresholds.PSObject.Properties | ForEach-Object {
            $global:CONFIG.AlertThresholds[$_.Name] = $_.Value
        }
        return $config
    } catch {
        Show-MonitoringStatus "Erro ao carregar configuração: $_" "ERROR"
        return $null
    }
}

# Função para inicializar banco de dados SQLite para armazenamento de eventos
function Initialize-MonitoringDatabase {
    if (-not (Test-Path (Split-Path $global:CONFIG.DatabasePath -Parent))) {
        New-Item -Path (Split-Path $global:CONFIG.DatabasePath -Parent) -ItemType Directory -Force | Out-Null
    }

    # Simulação de criação de banco de dados (em produção, usar SQLite real)
    $dbSchema = @"
-- Esquema do banco de dados de monitoramento
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT,
    processed BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    source TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'new',
    notified BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS baseline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_type TEXT NOT NULL,
    resource_path TEXT NOT NULL,
    hash TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_source ON security_events(source);
CREATE INDEX IF NOT EXISTS idx_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_baseline_resource ON baseline(resource_type, resource_path);
"@

    # Simular criação do banco de dados
    $dbSchema | Out-File -FilePath "$($global:CONFIG.DatabasePath).schema.sql" -Encoding UTF8
    Show-MonitoringStatus "Banco de dados inicializado em: $($global:CONFIG.DatabasePath)" "SUCCESS"
}

# Função para monitorar logs de eventos do Windows
function Monitor-EventLogs {
    param (
        [array]$LogNames = @("Security", "Application", "System"),
        [int]$MaxEvents = 100
    )

    Show-MonitoringStatus "Monitorando logs de eventos: $($LogNames -join ', ')" "INFO"

    # Padrões de eventos críticos de segurança
    $securityPatterns = @{
        # Falhas de login
        "4625" = @{Severity = "high"; Description = "Falha de autenticação"}
        "4740" = @{Severity = "high"; Description = "Conta de usuário bloqueada"}
        # Alterações de privilégios
        "4728" = @{Severity = "medium"; Description = "Membro adicionado a grupo privilegiado"}
        "4732" = @{Severity = "medium"; Description = "Membro adicionado a grupo local"}
        "4756" = @{Severity = "medium"; Description = "Membro adicionado a grupo universal"}
        # Criação/modificação de contas
        "4720" = @{Severity = "medium"; Description = "Conta de usuário criada"}
        "4738" = @{Severity = "medium"; Description = "Conta de usuário modificada"}
        # Limpeza de logs
        "1102" = @{Severity = "critical"; Description = "Log de auditoria limpo"}
        "104" = @{Severity = "critical"; Description = "Log limpo"}
        # Instalação de serviços
        "7045" = @{Severity = "medium"; Description = "Novo serviço instalado"}
        # Aplicação
        "1000" = @{Severity = "medium"; Description = "Erro de aplicação"}
        "1001" = @{Severity = "high"; Description = "Erro de aplicação - falha"}
        # Firewall
        "5152" = @{Severity = "medium"; Description = "Conexão bloqueada pelo Windows Firewall"}
    }

    # Simular obtenção de eventos (em produção, usar Get-WinEvent)
    $events = @()
    foreach ($logName in $LogNames) {
        # Simulação de eventos para demonstração
        $simulatedEvents = @(
            @{Id = 4625; TimeCreated = (Get-Date).AddMinutes(-5); Message = "Falha de autenticação para usuário: admin"; LogName = "Security"}
            @{Id = 7045; TimeCreated = (Get-Date).AddMinutes(-10); Message = "Novo serviço instalado: UpdateService"; LogName = "System"}
            @{Id = 1000; TimeCreated = (Get-Date).AddMinutes(-15); Message = "Erro na aplicação: WebServer.exe"; LogName = "Application"}
        )
        
        $filteredEvents = $simulatedEvents | Where-Object { $_.LogName -eq $logName }
        $events += $filteredEvents
    }

    # Processar eventos encontrados
    foreach ($event in $events) {
        if ($securityPatterns.ContainsKey($event.Id.ToString())) {
            $pattern = $securityPatterns[$event.Id.ToString()]
            $severity = $pattern.Severity
            $description = $pattern.Description
            
            # Registrar evento de segurança
            $eventDetails = @{
                timestamp = $event.TimeCreated
                source = $event.LogName
                event_type = $event.Id
                severity = $severity
                message = $description
                details = $event.Message
            }
            
            # Em produção, inserir no banco de dados SQLite
            # Aqui apenas simulamos o registro
            Show-MonitoringStatus "Evento de segurança detectado: [$severity] $description" $severity.ToUpper()
            
            # Verificar se deve gerar alerta
            if ($severity -eq "high" -or $severity -eq "critical") {
                # Enviar notificação
                if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                    Send-SecurityNotification `
                        -Title "Alerta de Segurança: $description" `
                        -Description "Evento de segurança crítico detectado no log $($event.LogName)" `
                        -Details $event.Message `
                        -Severity $severity `
                        -Actions @(
                            "Investigar a origem do evento",
                            "Verificar se há atividade suspeita relacionada",
                            "Documentar o incidente no sistema de tickets"
                        )
                }
            }
        }
    }
}

# Função para monitorar alterações no sistema de arquivos
function Monitor-FileSystem {
    param (
        [array]$Paths,
        [array]$ExcludePatterns
    )

    Show-MonitoringStatus "Monitorando sistema de arquivos: $($Paths -join ', ')" "INFO"

    # Arquivos críticos para monitorar
    $criticalFiles = @(
        "*web.config",
        "*.env",
        "*config.json",
        "*firebase*.js",
        "*auth*.js",
        "*login*.js",
        "*password*.js",
        "*security*.js",
        "*admin*.php",
        "*upload*.php"
    )

    # Simular detecção de alterações (em produção, usar FileSystemWatcher)
    $changes = @(
        @{Path = "$PSScriptRoot\..\src\config\firebase.js"; ChangeType = "Modified"; TimeStamp = (Get-Date).AddMinutes(-3)}
        @{Path = "$PSScriptRoot\..\public\uploads\temp.php"; ChangeType = "Created"; TimeStamp = (Get-Date).AddMinutes(-7)}
    )

    foreach ($change in $changes) {
        $fileName = Split-Path $change.Path -Leaf
        $filePath = $change.Path
        $changeType = $change.ChangeType
        
        # Verificar se é arquivo crítico
        $isCritical = $false
        foreach ($pattern in $criticalFiles) {
            if ($fileName -like $pattern) {
                $isCritical = $true
                break
            }
        }
        
        # Verificar se deve ser excluído
        $shouldExclude = $false
        foreach ($pattern in $ExcludePatterns) {
            if ($fileName -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        
        if (-not $shouldExclude) {
            $severity = if ($isCritical) { "high" } else { "medium" }
            $message = "$changeType arquivo: $filePath"
            
            # Registrar alteração
            Show-MonitoringStatus $message ($severity.ToUpper())
            
            # Se for arquivo crítico ou criação suspeita, enviar alerta
            if ($isCritical -or ($changeType -eq "Created" -and $fileName -like "*.php")) {
                if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                    Send-SecurityNotification `
                        -Title "Alteração Suspeita em Arquivo" `
                        -Description "$changeType detectado em arquivo $($isCritical ? 'crítico' : 'suspeito')" `
                        -Details "Arquivo: $filePath\nTipo de alteração: $changeType\nHorário: $($change.TimeStamp)" `
                        -Severity $severity `
                        -Actions @(
                            "Verificar a legitimidade da alteração",
                            "Revisar o conteúdo do arquivo",
                            "Reverter alterações não autorizadas"
                        )
                }
            }
        }
    }
}

# Função para monitorar atividade de rede
function Monitor-NetworkActivity {
    param (
        [array]$Ports,
        [bool]$MonitorIncoming = $true,
        [bool]$MonitorOutgoing = $true
    )

    Show-MonitoringStatus "Monitorando atividade de rede nas portas: $($Ports -join ', ')" "INFO"

    # Simular conexões de rede (em produção, usar Get-NetTCPConnection)
    $connections = @(
        @{LocalPort = 443; RemoteAddress = "192.168.1.100"; State = "Established"; OwningProcess = 1234}
        @{LocalPort = 3000; RemoteAddress = "45.33.22.123"; State = "Established"; OwningProcess = 5678}
        @{LocalPort = 8080; RemoteAddress = "10.0.0.5"; State = "Established"; OwningProcess = 9012}
    )

    # Lista de IPs suspeitos (em produção, usar uma API de reputação de IPs)
    $suspiciousIPs = @("45.33.22.123")

    foreach ($conn in $connections) {
        if ($Ports -contains $conn.LocalPort) {
            $isSuspicious = $suspiciousIPs -contains $conn.RemoteAddress
            $severity = if ($isSuspicious) { "high" } else { "low" }
            
            if ($isSuspicious) {
                $message = "Conexão suspeita detectada na porta $($conn.LocalPort) de IP: $($conn.RemoteAddress)"
                Show-MonitoringStatus $message "HIGH"
                
                # Enviar notificação
                if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                    Send-SecurityNotification `
                        -Title "Conexão de Rede Suspeita" `
                        -Description "Detectada conexão de IP com má reputação" `
                        -Details "IP: $($conn.RemoteAddress)\nPorta: $($conn.LocalPort)\nEstado: $($conn.State)\nProcesso: $($conn.OwningProcess)" `
                        -Severity "high" `
                        -Actions @(
                            "Investigar a origem da conexão",
                            "Verificar o processo associado",
                            "Considerar bloqueio do IP no firewall"
                        )
                }
            } else {
                Show-MonitoringStatus "Conexão na porta $($conn.LocalPort) de IP: $($conn.RemoteAddress)" "INFO"
            }
        }
    }
}

# Função para monitorar atividade de API
function Monitor-APIActivity {
    param (
        [array]$Endpoints,
        [bool]$RateLimiting = $true
    )

    Show-MonitoringStatus "Monitorando atividade de API nos endpoints: $($Endpoints -join ', ')" "INFO"

    # Simular logs de API (em produção, ler logs reais)
    $apiLogs = @(
        @{Endpoint = "/api/login"; Method = "POST"; IP = "192.168.1.50"; UserAgent = "Mozilla/5.0"; StatusCode = 401; Timestamp = (Get-Date).AddMinutes(-2); UserId = ""}
        @{Endpoint = "/api/login"; Method = "POST"; IP = "192.168.1.50"; UserAgent = "Mozilla/5.0"; StatusCode = 401; Timestamp = (Get-Date).AddMinutes(-1.5); UserId = ""}
        @{Endpoint = "/api/login"; Method = "POST"; IP = "192.168.1.50"; UserAgent = "Mozilla/5.0"; StatusCode = 401; Timestamp = (Get-Date).AddMinutes(-1); UserId = ""}
        @{Endpoint = "/api/users"; Method = "GET"; IP = "192.168.1.100"; UserAgent = "PostmanRuntime/7.28.4"; StatusCode = 200; Timestamp = (Get-Date).AddMinutes(-5); UserId = "admin"}
        @{Endpoint = "/api/orders"; Method = "GET"; IP = "192.168.1.100"; UserAgent = "PostmanRuntime/7.28.4"; StatusCode = 200; Timestamp = (Get-Date).AddMinutes(-4); UserId = "admin"}
    )

    # Agrupar por IP e endpoint para detectar abusos
    $ipEndpointGroups = $apiLogs | Group-Object -Property IP, Endpoint

    foreach ($group in $ipEndpointGroups) {
        $ip = ($group.Name -split ', ')[0]
        $endpoint = ($group.Name -split ', ')[1]
        $count = $group.Count
        $failedLogins = ($group.Group | Where-Object { $_.StatusCode -eq 401 }).Count
        
        # Verificar tentativas de login com falha
        if ($endpoint -eq "/api/login" -and $failedLogins -ge $global:CONFIG.AlertThresholds.LoginFailures) {
            $message = "Possível ataque de força bruta detectado: $failedLogins tentativas de login com falha do IP $ip"
            Show-MonitoringStatus $message "HIGH"
            
            # Enviar notificação
            if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                Send-SecurityNotification `
                    -Title "Possível Ataque de Força Bruta" `
                    -Description "Múltiplas tentativas de login com falha detectadas" `
                    -Details "IP: $ip\nEndpoint: $endpoint\nNúmero de tentativas: $failedLogins\nPeríodo: Últimos 5 minutos" `
                    -Severity "high" `
                    -Actions @(
                        "Bloquear temporariamente o IP no WAF",
                        "Implementar CAPTCHA após 3 tentativas de login",
                        "Verificar logs para identificar padrões de ataque"
                    )
            }
        }
        
        # Verificar rate limiting
        if ($RateLimiting -and $count -gt $global:CONFIG.AlertThresholds.APIRateLimit) {
            $message = "Possível abuso de API detectado: $count requisições para $endpoint do IP $ip"
            Show-MonitoringStatus $message "MEDIUM"
            
            # Enviar notificação
            if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                Send-SecurityNotification `
                    -Title "Possível Abuso de API" `
                    -Description "Taxa de requisições acima do limite detectada" `
                    -Details "IP: $ip\nEndpoint: $endpoint\nNúmero de requisições: $count\nPeríodo: Últimos 5 minutos" `
                    -Severity "medium" `
                    -Actions @(
                        "Verificar se é um uso legítimo ou abuso",
                        "Implementar rate limiting mais restritivo",
                        "Considerar implementação de throttling por IP"
                    )
            }
        }
    }

    # Verificar padrões de acesso suspeitos
    $adminEndpoints = @("/api/users", "/api/admin")
    $adminAccess = $apiLogs | Where-Object { $adminEndpoints -contains $_.Endpoint }
    
    foreach ($access in $adminAccess) {
        if ($access.UserId -ne "admin" -and $access.StatusCode -eq 200) {
            $message = "Acesso suspeito a endpoint administrativo: $($access.Endpoint) pelo usuário $($access.UserId)"
            Show-MonitoringStatus $message "HIGH"
            
            # Enviar notificação
            if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                Send-SecurityNotification `
                    -Title "Acesso Não Autorizado a Endpoint Admin" `
                    -Description "Usuário não-admin acessou endpoint administrativo" `
                    -Details "Usuário: $($access.UserId)\nEndpoint: $($access.Endpoint)\nIP: $($access.IP)\nHorário: $($access.Timestamp)" `
                    -Severity "high" `
                    -Actions @(
                        "Verificar se o usuário deveria ter acesso",
                        "Revisar permissões de acesso",
                        "Considerar bloqueio temporário da conta"
                    )
            }
        }
    }
}

# Função para monitorar atividade de banco de dados
function Monitor-DatabaseActivity {
    param (
        [bool]$MonitorQueries = $true,
        [bool]$AlertOnSlowQueries = $true
    )

    Show-MonitoringStatus "Monitorando atividade de banco de dados" "INFO"

    # Simular logs de banco de dados (em produção, ler logs reais)
    $dbLogs = @(
        @{Query = "SELECT * FROM users WHERE username = 'admin' AND password = '123456'"; Duration = 50; User = "app"; Timestamp = (Get-Date).AddMinutes(-3)}
        @{Query = "SELECT * FROM users WHERE username LIKE '%' OR '1'='1'"; Duration = 100; User = "app"; Timestamp = (Get-Date).AddMinutes(-2)}
        @{Query = "DELETE FROM orders"; Duration = 200; User = "app"; Timestamp = (Get-Date).AddMinutes(-1)}
    )

    # Padrões de SQL Injection
    $sqlInjectionPatterns = @(
        "'\s*OR\s*'\s*=\s*'",
        "'\s*OR\s*1\s*=\s*1",
        "--\s",
        ";\s*DROP\s+TABLE",
        "UNION\s+SELECT",
        "EXEC\s+xp_",
        "INTO\s+OUTFILE"
    )

    # Verificar queries suspeitas
    foreach ($log in $dbLogs) {
        $isSuspicious = $false
        
        # Verificar padrões de SQL Injection
        foreach ($pattern in $sqlInjectionPatterns) {
            if ($log.Query -match $pattern) {
                $isSuspicious = $true
                $message = "Possível SQL Injection detectado: $($log.Query)"
                Show-MonitoringStatus $message "CRITICAL"
                
                # Enviar notificação
                if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                    Send-SecurityNotification `
                        -Title "Possível SQL Injection Detectado" `
                        -Description "Padrão de SQL Injection identificado em query" `
                        -Details "Query: $($log.Query)\nUsuário: $($log.User)\nHorário: $($log.Timestamp)" `
                        -Severity "critical" `
                        -Actions @(
                            "Bloquear imediatamente o IP de origem",
                            "Verificar se houve comprometimento de dados",
                            "Implementar prepared statements em todas as queries",
                            "Revisar logs para identificar outras tentativas"
                        )
                }
                break
            }
        }
        
        # Verificar queries perigosas (DELETE sem WHERE, etc)
        if (-not $isSuspicious) {
            if ($log.Query -match "^DELETE\s+FROM" -and $log.Query -notmatch "WHERE") {
                $message = "Query perigosa detectada: $($log.Query)"
                Show-MonitoringStatus $message "HIGH"
                
                # Enviar notificação
                if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                    Send-SecurityNotification `
                        -Title "Query Perigosa Detectada" `
                        -Description "DELETE sem cláusula WHERE identificado" `
                        -Details "Query: $($log.Query)\nUsuário: $($log.User)\nHorário: $($log.Timestamp)" `
                        -Severity "high" `
                        -Actions @(
                            "Verificar se a operação foi intencional",
                            "Restaurar dados de backup se necessário",
                            "Implementar confirmação adicional para queries destrutivas"
                        )
                }
            }
        }
        
        # Verificar queries lentas
        if ($AlertOnSlowQueries -and $log.Duration > 1000) {
            $message = "Query lenta detectada: $($log.Query) (Duração: $($log.Duration)ms)"
            Show-MonitoringStatus $message "MEDIUM"
            
            # Enviar notificação
            if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                Send-SecurityNotification `
                    -Title "Query Lenta Detectada" `
                    -Description "Performance degradada em query de banco de dados" `
                    -Details "Query: $($log.Query)\nDuração: $($log.Duration)ms\nUsuário: $($log.User)\nHorário: $($log.Timestamp)" `
                    -Severity "medium" `
                    -Actions @(
                        "Otimizar a query",
                        "Verificar índices no banco de dados",
                        "Considerar caching para queries frequentes"
                    )
                }
            }
        }
    }

# Função para limpar dados antigos
function Clean-OldData {
    param (
        [int]$RetentionDays = 30
    )

    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Show-MonitoringStatus "Limpando dados anteriores a $cutoffDate" "INFO"

    # Limpar logs antigos
    $logFiles = Get-ChildItem -Path $global:CONFIG.LogPath -Filter "*.log" -ErrorAction SilentlyContinue
    foreach ($file in $logFiles) {
        if ($file.LastWriteTime -lt $cutoffDate) {
            Remove-Item -Path $file.FullName -Force
            Show-MonitoringStatus "Arquivo de log removido: $($file.Name)" "INFO"
        }
    }

    # Em produção, limpar registros antigos do banco de dados
    # Aqui apenas simulamos a limpeza
    Show-MonitoringStatus "Registros antigos removidos do banco de dados" "INFO"
}

# Função principal de monitoramento
function Start-SecurityMonitoring {
    param (
        [switch]$RunOnce
    )

    Show-MonitoringStatus "Iniciando sistema de monitoramento de segurança em tempo real" "INFO"

    # Criar diretórios necessários
    $directories = @(
        (Split-Path $global:CONFIG.LogPath -Parent),
        (Split-Path $global:CONFIG.ConfigPath -Parent),
        (Split-Path $global:CONFIG.DatabasePath -Parent)
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            Show-MonitoringStatus "Diretório criado: $dir" "INFO"
        }
    }

    # Inicializar configuração e banco de dados
    $config = Initialize-MonitoringConfig
    Initialize-MonitoringDatabase

    if (-not $config) {
        Show-MonitoringStatus "Falha ao inicializar configuração. Abortando." "ERROR"
        return
    }

    # Executar monitoramento
    if ($RunOnce) {
        # Executar uma vez para teste
        Show-MonitoringStatus "Executando verificação única de segurança" "INFO"
        
        # Monitorar logs de eventos
        Monitor-EventLogs -LogNames $config.Sources.EventLogs.Logs
        
        # Monitorar sistema de arquivos
        Monitor-FileSystem -Paths $config.Sources.FileSystem.Paths -ExcludePatterns $config.Sources.FileSystem.ExcludePatterns
        
        # Monitorar atividade de rede
        Monitor-NetworkActivity -Ports $config.Sources.Network.Ports -MonitorIncoming $config.Sources.Network.MonitorIncoming -MonitorOutgoing $config.Sources.Network.MonitorOutgoing
        
        # Monitorar atividade de API
        Monitor-APIActivity -Endpoints $config.Sources.API.Endpoints -RateLimiting $config.Sources.API.RateLimiting
        
        # Monitorar atividade de banco de dados
        Monitor-DatabaseActivity -MonitorQueries $config.Sources.Database.MonitorQueries -AlertOnSlowQueries $config.Sources.Database.AlertOnSlowQueries
        
        Show-MonitoringStatus "Verificação única concluída" "SUCCESS"
    } else {
        # Executar em loop contínuo
        Show-MonitoringStatus "Iniciando monitoramento contínuo (intervalo: $($config.Monitoring.ScanIntervalSeconds) segundos)" "INFO"
        
        try {
            $lastCleanup = Get-Date
            
            while ($true) {
                # Monitorar logs de eventos
                if ($config.Sources.EventLogs.Enabled) {
                    Monitor-EventLogs -LogNames $config.Sources.EventLogs.Logs
                }
                
                # Monitorar sistema de arquivos
                if ($config.Sources.FileSystem.Enabled) {
                    Monitor-FileSystem -Paths $config.Sources.FileSystem.Paths -ExcludePatterns $config.Sources.FileSystem.ExcludePatterns
                }
                
                # Monitorar atividade de rede
                if ($config.Sources.Network.Enabled) {
                    Monitor-NetworkActivity -Ports $config.Sources.Network.Ports -MonitorIncoming $config.Sources.Network.MonitorIncoming -MonitorOutgoing $config.Sources.Network.MonitorOutgoing
                }
                
                # Monitorar atividade de API
                if ($config.Sources.API.Enabled) {
                    Monitor-APIActivity -Endpoints $config.Sources.API.Endpoints -RateLimiting $config.Sources.API.RateLimiting
                }
                
                # Monitorar atividade de banco de dados
                if ($config.Sources.Database.Enabled) {
                    Monitor-DatabaseActivity -MonitorQueries $config.Sources.Database.MonitorQueries -AlertOnSlowQueries $config.Sources.Database.AlertOnSlowQueries
                }
                
                # Limpar dados antigos (uma vez por dia)
                if ((Get-Date) -gt $lastCleanup.AddDays(1)) {
                    Clean-OldData -RetentionDays $config.Monitoring.RetentionDays
                    $lastCleanup = Get-Date
                }
                
                # Aguardar intervalo configurado
                Start-Sleep -Seconds $config.Monitoring.ScanIntervalSeconds
            }
        } catch {
            Show-MonitoringStatus "Erro no monitoramento: $_" "ERROR"
        } finally {
            Show-MonitoringStatus "Monitoramento encerrado" "INFO"
        }
    }
}

# Função para testar o sistema de monitoramento
function Test-MonitoringSystem {
    Show-MonitoringStatus "Iniciando teste do sistema de monitoramento" "INFO"
    
    # Executar uma verificação única
    Start-SecurityMonitoring -RunOnce
    
    Show-MonitoringStatus "Teste do sistema de monitoramento concluído" "SUCCESS"
}

# Executar função principal se o script for executado diretamente
if ($MyInvocation.InvocationName -ne "." -and $MyInvocation.Line -notmatch '\. ') {
    # Verificar se o módulo de notificações está disponível
    if (-not (Test-Path $notificacoesPath)) {
        Show-MonitoringStatus "AVISO: Módulo de notificações não encontrado. Algumas funcionalidades estarão limitadas." "WARNING"
    }
    
    # Perguntar se deseja executar em modo de teste ou contínuo
    $testMode = Read-Host "Executar em modo de teste? (S/N)"
    
    if ($testMode -eq "S" -or $testMode -eq "s") {
        Test-MonitoringSystem
    } else {
        Start-SecurityMonitoring
    }
}