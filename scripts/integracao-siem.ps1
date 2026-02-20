<#
.SYNOPSIS
    Script de integração com sistemas SIEM para o projeto Acucaradas Encomendas.

.DESCRIPTION
    Este script implementa a integração com sistemas SIEM (Security Information and Event Management)
    para centralizar logs de segurança, permitir análise avançada e correlação de eventos, e facilitar
    a detecção de ameaças complexas. Complementa os próximos passos recomendados para segurança.

.NOTES
    Autor: Equipe de Segurança Acucaradas Encomendas
    Data: $(Get-Date -Format "dd/MM/yyyy")
    Requisitos: PowerShell 5.1+
#>

# Definir codificação UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Importar módulo de notificações de segurança
$notificacoesPath = "$PSScriptRoot\sistema-notificacoes-seguranca.ps1"
if (Test-Path $notificacoesPath) {
    . $notificacoesPath
}

# Configurações globais
$global:CONFIG = @{
    LogPath = "$PSScriptRoot\..\logs-seguranca\siem"
    ConfigPath = "$PSScriptRoot\..\config-seguranca\siem-config.json"
    EventsPath = "$PSScriptRoot\..\data-seguranca\siem-events"
    MaxRetries = 3
    RetryDelaySeconds = 5
    BatchSize = 100
    FormatVersion = "1.0"
}

# Função para mostrar status das tarefas
function Show-SIEMStatus {
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
    $logFile = "$($global:CONFIG.LogPath)\siem-$(Get-Date -Format 'yyyy-MM-dd').log"
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
function Initialize-SIEMConfig {
    if (-not (Test-Path (Split-Path $global:CONFIG.ConfigPath -Parent))) {
        New-Item -Path (Split-Path $global:CONFIG.ConfigPath -Parent) -ItemType Directory -Force | Out-Null
    }

    if (-not (Test-Path $global:CONFIG.ConfigPath)) {
        $defaultConfig = @{
            SIEM = @{
                Enabled = $true
                Providers = @(
                    @{
                        Name = "Generic"
                        Type = "HTTP"
                        Enabled = $true
                        Endpoint = "https://siem.example.com/api/logs"
                        ApiKey = "YOUR_API_KEY_HERE"
                        Format = "JSON"
                        Headers = @{
                            "Content-Type" = "application/json"
                            "X-API-Key" = "YOUR_API_KEY_HERE"
                        }
                    },
                    @{
                        Name = "Splunk"
                        Type = "HTTP"
                        Enabled = $false
                        Endpoint = "https://splunk.example.com:8088/services/collector"
                        Token = "YOUR_HEC_TOKEN_HERE"
                        Format = "JSON"
                        Headers = @{
                            "Authorization" = "Splunk YOUR_HEC_TOKEN_HERE"
                        }
                    },
                    @{
                        Name = "ELK"
                        Type = "HTTP"
                        Enabled = $false
                        Endpoint = "https://elasticsearch.example.com:9200/_bulk"
                        Username = "elastic"
                        Password = "YOUR_PASSWORD_HERE"
                        Format = "JSON"
                        Headers = @{
                            "Content-Type" = "application/x-ndjson"
                        }
                    },
                    @{
                        Name = "AzureSentinel"
                        Type = "HTTP"
                        Enabled = $false
                        Endpoint = "https://WORKSPACE_ID.ods.opinsights.azure.com/api/logs?api-version=2016-04-01"
                        WorkspaceId = "WORKSPACE_ID"
                        SharedKey = "SHARED_KEY"
                        LogType = "AcucaradasSecurity"
                        Format = "JSON"
                    }
                )
                Sources = @{
                    ApplicationLogs = @{
                        Enabled = $true
                        Path = "$PSScriptRoot\..\logs\app*.log"
                    }
                    SecurityScans = @{
                        Enabled = $true
                        Path = "$PSScriptRoot\..\logs-seguranca\varredura*.json"
                    }
                    WebServerLogs = @{
                        Enabled = $true
                        Path = "$PSScriptRoot\..\logs\access*.log"
                    }
                    DatabaseLogs = @{
                        Enabled = $true
                        Path = "$PSScriptRoot\..\logs\db*.log"
                    }
                    AuthLogs = @{
                        Enabled = $true
                        Path = "$PSScriptRoot\..\logs\auth*.log"
                    }
                    WindowsEvents = @{
                        Enabled = $true
                        Logs = @("Security", "Application", "System")
                        StartTime = "-1h"
                    }
                }
                Processing = @{
                    EnrichmentEnabled = $true
                    Enrichments = @(
                        @{
                            Type = "GeoIP"
                            Field = "ip_address"
                            TargetField = "geo"
                        },
                        @{
                            Type = "UserInfo"
                            Field = "user_id"
                            TargetField = "user_details"
                        }
                    )
                    Normalization = $true
                    Filtering = @{
                        Enabled = $true
                        ExcludePatterns = @(
                            "*health*check*",
                            "*heartbeat*",
                            "*ping*"
                        )
                    }
                }
                Forwarding = @{
                    BatchSize = $global:CONFIG.BatchSize
                    MaxRetries = $global:CONFIG.MaxRetries
                    RetryDelaySeconds = $global:CONFIG.RetryDelaySeconds
                    FailedEventsPath = "$($global:CONFIG.EventsPath)\failed"
                    OfflineBufferEnabled = $true
                    OfflineBufferPath = "$($global:CONFIG.EventsPath)\buffer"
                    OfflineBufferMaxSize = 1000
                }
            }
        }

        $defaultConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $global:CONFIG.ConfigPath -Encoding UTF8
        Show-SIEMStatus "Configuração padrão criada em: $($global:CONFIG.ConfigPath)" "SUCCESS"
    } else {
        Show-SIEMStatus "Usando configuração existente: $($global:CONFIG.ConfigPath)" "INFO"
    }

    # Carregar configuração
    try {
        $config = Get-Content -Path $global:CONFIG.ConfigPath -Raw | ConvertFrom-Json
        $global:CONFIG.BatchSize = $config.SIEM.Forwarding.BatchSize
        $global:CONFIG.MaxRetries = $config.SIEM.Forwarding.MaxRetries
        $global:CONFIG.RetryDelaySeconds = $config.SIEM.Forwarding.RetryDelaySeconds
        return $config
    } catch {
        Show-SIEMStatus "Erro ao carregar configuração: $_" "ERROR"
        return $null
    }
}

# Função para inicializar diretórios de eventos
function Initialize-EventDirectories {
    $directories = @(
        $global:CONFIG.EventsPath,
        "$($global:CONFIG.EventsPath)\failed",
        "$($global:CONFIG.EventsPath)\buffer",
        "$($global:CONFIG.EventsPath)\processed"
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            Show-SIEMStatus "Diretório criado: $dir" "INFO"
        }
    }
}

# Função para coletar logs de aplicação
function Collect-ApplicationLogs {
    param (
        [string]$LogPath,
        [DateTime]$StartTime = (Get-Date).AddHours(-1)
    )

    Show-SIEMStatus "Coletando logs de aplicação de: $LogPath" "INFO"

    $events = @()
    $logFiles = Get-ChildItem -Path $LogPath -ErrorAction SilentlyContinue

    foreach ($file in $logFiles) {
        if ($file.LastWriteTime -ge $StartTime) {
            try {
                $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
                $logEntries = $content -split "`n" | Where-Object { $_ -ne "" }

                foreach ($entry in $logEntries) {
                    # Tentar analisar a entrada de log
                    try {
                        # Verificar se é JSON
                        $isJson = $entry.Trim().StartsWith('{') -and $entry.Trim().EndsWith('}')
                        
                        if ($isJson) {
                            $logObject = $entry | ConvertFrom-Json
                            $events += $logObject
                        } else {
                            # Tentar analisar formato de log comum
                            if ($entry -match '\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]\s+\[([^\]]+)\]\s+(.+)') {
                                $timestamp = $Matches[1]
                                $level = $Matches[2]
                                $message = $Matches[3]
                                
                                $events += @{
                                    timestamp = $timestamp
                                    level = $level
                                    message = $message
                                    source = $file.Name
                                    type = "application_log"
                                }
                            }
                        }
                    } catch {
                        # Se falhar ao analisar, adicionar como texto simples
                        $events += @{
                            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                            message = $entry
                            source = $file.Name
                            type = "application_log"
                            parse_error = $true
                        }
                    }
                }
            } catch {
                Show-SIEMStatus "Erro ao ler arquivo $($file.FullName): $_" "ERROR"
            }
        }
    }

    Show-SIEMStatus "Coletados $($events.Count) eventos de logs de aplicação" "INFO"
    return $events
}

# Função para coletar logs de varredura de segurança
function Collect-SecurityScanLogs {
    param (
        [string]$LogPath,
        [DateTime]$StartTime = (Get-Date).AddHours(-24)
    )

    Show-SIEMStatus "Coletando logs de varredura de segurança de: $LogPath" "INFO"

    $events = @()
    $logFiles = Get-ChildItem -Path $LogPath -ErrorAction SilentlyContinue

    foreach ($file in $logFiles) {
        if ($file.LastWriteTime -ge $StartTime) {
            try {
                $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
                $scanResults = $content | ConvertFrom-Json
                
                # Processar resultados da varredura
                if ($scanResults.findings -is [array]) {
                    foreach ($finding in $scanResults.findings) {
                        $events += @{
                            timestamp = $scanResults.timestamp ?? (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                            scan_id = $scanResults.scan_id
                            severity = $finding.severity
                            category = $finding.category
                            description = $finding.description
                            location = $finding.location
                            recommendation = $finding.recommendation
                            source = $file.Name
                            type = "security_scan"
                        }
                    }
                } else {
                    # Adicionar o resultado completo se não tiver o formato esperado
                    $events += @{
                        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                        scan_data = $scanResults
                        source = $file.Name
                        type = "security_scan"
                    }
                }
            } catch {
                Show-SIEMStatus "Erro ao processar arquivo de varredura $($file.FullName): $_" "ERROR"
            }
        }
    }

    Show-SIEMStatus "Coletados $($events.Count) eventos de varreduras de segurança" "INFO"
    return $events
}

# Função para coletar logs do Windows Event Log
function Collect-WindowsEventLogs {
    param (
        [array]$LogNames = @("Security", "Application", "System"),
        [string]$StartTime = "-1h",
        [int]$MaxEvents = 1000
    )

    Show-SIEMStatus "Coletando logs de eventos do Windows: $($LogNames -join ', ')" "INFO"

    # Converter string de tempo relativo para DateTime
    $startDateTime = $null
    if ($StartTime -match '^-([0-9]+)([hmd])$') {
        $value = [int]$Matches[1]
        $unit = $Matches[2]
        
        $startDateTime = switch ($unit) {
            'h' { (Get-Date).AddHours(-$value) }
            'm' { (Get-Date).AddMinutes(-$value) }
            'd' { (Get-Date).AddDays(-$value) }
            default { (Get-Date).AddHours(-1) }
        }
    } else {
        try {
            $startDateTime = [DateTime]::Parse($StartTime)
        } catch {
            $startDateTime = (Get-Date).AddHours(-1)
        }
    }

    $events = @()
    
    # Simular coleta de eventos do Windows (em produção, usar Get-WinEvent)
    foreach ($logName in $LogNames) {
        Show-SIEMStatus "Coletando eventos do log: $logName" "INFO"
        
        # Simulação de eventos para demonstração
        $simulatedEvents = @(
            @{Id = 4625; TimeCreated = (Get-Date).AddMinutes(-5); Message = "Falha de autenticação para usuário: admin"; LogName = "Security"}
            @{Id = 7045; TimeCreated = (Get-Date).AddMinutes(-10); Message = "Novo serviço instalado: UpdateService"; LogName = "System"}
            @{Id = 1000; TimeCreated = (Get-Date).AddMinutes(-15); Message = "Erro na aplicação: WebServer.exe"; LogName = "Application"}
        )
        
        $filteredEvents = $simulatedEvents | Where-Object { $_.LogName -eq $logName -and $_.TimeCreated -ge $startDateTime }
        
        foreach ($event in $filteredEvents) {
            $events += @{
                timestamp = $event.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
                event_id = $event.Id
                log_name = $event.LogName
                message = $event.Message
                source = "WindowsEventLog"
                type = "windows_event"
            }
        }
    }

    Show-SIEMStatus "Coletados $($events.Count) eventos do Windows Event Log" "INFO"
    return $events
}

# Função para enriquecer eventos com informações adicionais
function Enrich-Events {
    param (
        [array]$Events,
        [array]$Enrichments
    )

    Show-SIEMStatus "Enriquecendo $($Events.Count) eventos" "INFO"

    foreach ($event in $Events) {
        # Adicionar campos comuns
        $event.collected_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $event.host = $env:COMPUTERNAME
        $event.collector_version = $global:CONFIG.FormatVersion
        
        # Aplicar enriquecimentos específicos
        foreach ($enrichment in $Enrichments) {
            $fieldValue = $null
            
            # Obter valor do campo a ser enriquecido
            if ($event.PSObject.Properties.Name -contains $enrichment.Field) {
                $fieldValue = $event.($enrichment.Field)
            }
            
            if ($fieldValue) {
                switch ($enrichment.Type) {
                    "GeoIP" {
                        # Simulação de enriquecimento GeoIP
                        if ($fieldValue -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
                            $event.($enrichment.TargetField) = @{
                                country = "Brasil"
                                city = "São Paulo"
                                latitude = -23.5505
                                longitude = -46.6333
                            }
                        }
                    }
                    "UserInfo" {
                        # Simulação de enriquecimento de informações de usuário
                        if ($fieldValue) {
                            $event.($enrichment.TargetField) = @{
                                username = $fieldValue
                                department = "TI"
                                role = "Administrador"
                                last_login = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd HH:mm:ss")
                            }
                        }
                    }
                }
            }
        }
    }

    return $Events
}

# Função para normalizar eventos para formato comum
function Normalize-Events {
    param (
        [array]$Events
    )

    Show-SIEMStatus "Normalizando $($Events.Count) eventos" "INFO"

    $normalizedEvents = @()

    foreach ($event in $Events) {
        $normalizedEvent = @{}
        
        # Copiar propriedades existentes
        foreach ($prop in $event.PSObject.Properties) {
            $normalizedEvent[$prop.Name] = $prop.Value
        }
        
        # Garantir campos comuns
        if (-not $normalizedEvent.ContainsKey("timestamp")) {
            $normalizedEvent.timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        if (-not $normalizedEvent.ContainsKey("severity")) {
            # Tentar inferir severidade
            if ($normalizedEvent.ContainsKey("level")) {
                $normalizedEvent.severity = switch ($normalizedEvent.level.ToLower()) {
                    "error" { "high" }
                    "critical" { "critical" }
                    "warning" { "medium" }
                    "info" { "low" }
                    default { "info" }
                }
            } else {
                $normalizedEvent.severity = "info"
            }
        }
        
        if (-not $normalizedEvent.ContainsKey("event_type")) {
            if ($normalizedEvent.ContainsKey("type")) {
                $normalizedEvent.event_type = $normalizedEvent.type
            } else {
                $normalizedEvent.event_type = "unknown"
            }
        }
        
        $normalizedEvents += $normalizedEvent
    }

    return $normalizedEvents
}

# Função para filtrar eventos
function Filter-Events {
    param (
        [array]$Events,
        [array]$ExcludePatterns
    )

    Show-SIEMStatus "Filtrando eventos" "INFO"

    $filteredEvents = @()
    $excludedCount = 0

    foreach ($event in $Events) {
        $shouldExclude = $false
        
        # Verificar padrões de exclusão
        foreach ($pattern in $ExcludePatterns) {
            $messageValue = $null
            
            # Verificar em diferentes campos de mensagem
            if ($event.PSObject.Properties.Name -contains "message") {
                $messageValue = $event.message
            } elseif ($event.PSObject.Properties.Name -contains "description") {
                $messageValue = $event.description
            }
            
            if ($messageValue -and $messageValue -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        
        if (-not $shouldExclude) {
            $filteredEvents += $event
        } else {
            $excludedCount++
        }
    }

    Show-SIEMStatus "$excludedCount eventos excluídos pelo filtro" "INFO"
    return $filteredEvents
}

# Função para formatar eventos para envio ao SIEM
function Format-EventsForSIEM {
    param (
        [array]$Events,
        [string]$Format = "JSON",
        [string]$Provider = "Generic"
    )

    Show-SIEMStatus "Formatando eventos para envio ao SIEM ($Provider)" "INFO"

    switch ($Format) {
        "JSON" {
            # Formato JSON padrão
            return $Events | ConvertTo-Json -Depth 10 -Compress
        }
        "NDJSON" {
            # Formato Newline Delimited JSON (para Elasticsearch)
            $ndjson = ""
            foreach ($event in $Events) {
                $indexLine = "{\"index\":{}}"
                $eventJson = $event | ConvertTo-Json -Depth 10 -Compress
                $ndjson += "$indexLine`n$eventJson`n"
            }
            return $ndjson
        }
        "Splunk" {
            # Formato para Splunk HEC
            $splunkEvents = @()
            foreach ($event in $Events) {
                $splunkEvent = @{
                    event = $event
                    sourcetype = "acucaradas:security"
                    source = $event.source ?? "acucaradas"
                }
                if ($event.timestamp) {
                    try {
                        $dt = [DateTime]::Parse($event.timestamp)
                        $splunkEvent.time = [Math]::Floor(([DateTimeOffset]$dt).ToUnixTimeSeconds())
                    } catch {}
                }
                $splunkEvents += $splunkEvent
            }
            return $splunkEvents | ConvertTo-Json -Depth 10 -Compress
        }
        "AzureSentinel" {
            # Formato para Azure Sentinel
            return $Events | ConvertTo-Json -Depth 10 -Compress
        }
        default {
            # Formato JSON padrão
            return $Events | ConvertTo-Json -Depth 10 -Compress
        }
    }
}

# Função para enviar eventos para o SIEM
function Send-EventsToSIEM {
    param (
        [array]$Events,
        [PSCustomObject]$Provider
    )

    if ($Events.Count -eq 0) {
        Show-SIEMStatus "Nenhum evento para enviar" "INFO"
        return $true
    }

    Show-SIEMStatus "Enviando $($Events.Count) eventos para $($Provider.Name)" "INFO"

    # Formatar eventos para o provedor específico
    $formattedEvents = Format-EventsForSIEM -Events $Events -Format $Provider.Format -Provider $Provider.Name

    # Simular envio para o SIEM (em produção, usar Invoke-RestMethod)
    try {
        # Preparar cabeçalhos
        $headers = @{}
        if ($Provider.Headers -is [PSCustomObject]) {
            foreach ($prop in $Provider.Headers.PSObject.Properties) {
                $headers[$prop.Name] = $prop.Value
            }
        }

        # Simular envio HTTP
        Show-SIEMStatus "Simulando envio para $($Provider.Endpoint)" "INFO"
        
        # Em produção, usar código como este:
        # $response = Invoke-RestMethod -Uri $Provider.Endpoint -Method Post -Body $formattedEvents -Headers $headers
        
        # Simulação de resposta bem-sucedida
        $success = $true
        
        if ($success) {
            Show-SIEMStatus "Eventos enviados com sucesso para $($Provider.Name)" "SUCCESS"
            return $true
        } else {
            Show-SIEMStatus "Falha ao enviar eventos para $($Provider.Name)" "ERROR"
            return $false
        }
    } catch {
        Show-SIEMStatus "Erro ao enviar eventos para $($Provider.Name): $_" "ERROR"
        return $false
    }
}

# Função para salvar eventos que falharam no envio
function Save-FailedEvents {
    param (
        [array]$Events,
        [string]$ProviderName
    )

    $failedDir = "$($global:CONFIG.EventsPath)\failed"
    if (-not (Test-Path $failedDir)) {
        New-Item -Path $failedDir -ItemType Directory -Force | Out-Null
    }

    $fileName = "failed_$(Get-Date -Format 'yyyyMMdd_HHmmss')_$($ProviderName).json"
    $filePath = Join-Path -Path $failedDir -ChildPath $fileName

    try {
        $Events | ConvertTo-Json -Depth 10 | Set-Content -Path $filePath -Encoding UTF8
        Show-SIEMStatus "Eventos que falharam salvos em: $filePath" "INFO"
        return $true
    } catch {
        Show-SIEMStatus "Erro ao salvar eventos que falharam: $_" "ERROR"
        return $false
    }
}

# Função para processar eventos em buffer offline
function Process-OfflineBuffer {
    param (
        [PSCustomObject]$Config
    )

    $bufferDir = $Config.SIEM.Forwarding.OfflineBufferPath
    if (-not (Test-Path $bufferDir)) {
        return
    }

    $bufferFiles = Get-ChildItem -Path $bufferDir -Filter "*.json" -ErrorAction SilentlyContinue
    if ($bufferFiles.Count -eq 0) {
        return
    }

    Show-SIEMStatus "Processando $($bufferFiles.Count) arquivos em buffer offline" "INFO"

    foreach ($file in $bufferFiles) {
        try {
            $events = Get-Content -Path $file.FullName -Raw | ConvertFrom-Json
            
            $allSuccess = $true
            foreach ($provider in $Config.SIEM.Providers | Where-Object { $_.Enabled -eq $true }) {
                $success = $false
                $retryCount = 0
                
                while (-not $success -and $retryCount -lt $global:CONFIG.MaxRetries) {
                    $success = Send-EventsToSIEM -Events $events -Provider $provider
                    
                    if (-not $success) {
                        $retryCount++
                        if ($retryCount -lt $global:CONFIG.MaxRetries) {
                            Show-SIEMStatus "Tentativa $retryCount de $($global:CONFIG.MaxRetries) falhou, tentando novamente em $($global:CONFIG.RetryDelaySeconds) segundos" "WARNING"
                            Start-Sleep -Seconds $global:CONFIG.RetryDelaySeconds
                        }
                    }
                }
                
                if (-not $success) {
                    $allSuccess = $false
                    Save-FailedEvents -Events $events -ProviderName $provider.Name
                }
            }
            
            if ($allSuccess) {
                # Mover para processados
                $processedDir = "$($global:CONFIG.EventsPath)\processed"
                if (-not (Test-Path $processedDir)) {
                    New-Item -Path $processedDir -ItemType Directory -Force | Out-Null
                }
                
                $processedFile = Join-Path -Path $processedDir -ChildPath $file.Name
                Move-Item -Path $file.FullName -Destination $processedFile -Force
                Show-SIEMStatus "Arquivo de buffer processado com sucesso: $($file.Name)" "SUCCESS"
            }
        } catch {
            Show-SIEMStatus "Erro ao processar arquivo de buffer $($file.FullName): $_" "ERROR"
        }
    }
}

# Função para salvar eventos em buffer offline
function Save-EventsToBuffer {
    param (
        [array]$Events
    )

    $bufferDir = "$($global:CONFIG.EventsPath)\buffer"
    if (-not (Test-Path $bufferDir)) {
        New-Item -Path $bufferDir -ItemType Directory -Force | Out-Null
    }

    $fileName = "buffer_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $filePath = Join-Path -Path $bufferDir -ChildPath $fileName

    try {
        $Events | ConvertTo-Json -Depth 10 | Set-Content -Path $filePath -Encoding UTF8
        Show-SIEMStatus "Eventos salvos em buffer offline: $filePath" "INFO"
        return $true
    } catch {
        Show-SIEMStatus "Erro ao salvar eventos em buffer: $_" "ERROR"
        return $false
    }
}

# Função principal para coletar e enviar eventos
function Start-SIEMIntegration {
    param (
        [switch]$ProcessOfflineBufferOnly,
        [switch]$CollectOnly
    )

    Show-SIEMStatus "Iniciando integração com SIEM" "INFO"

    # Criar diretórios necessários
    $directories = @(
        (Split-Path $global:CONFIG.LogPath -Parent),
        (Split-Path $global:CONFIG.ConfigPath -Parent),
        $global:CONFIG.EventsPath
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            Show-SIEMStatus "Diretório criado: $dir" "INFO"
        }
    }

    # Inicializar configuração e diretórios de eventos
    $config = Initialize-SIEMConfig
    Initialize-EventDirectories

    if (-not $config) {
        Show-SIEMStatus "Falha ao inicializar configuração. Abortando." "ERROR"
        return
    }

    # Processar buffer offline se solicitado
    if ($ProcessOfflineBufferOnly) {
        Process-OfflineBuffer -Config $config
        return
    }

    # Coletar eventos de todas as fontes configuradas
    $allEvents = @()

    # Coletar logs de aplicação
    if ($config.SIEM.Sources.ApplicationLogs.Enabled) {
        $appLogs = Collect-ApplicationLogs -LogPath $config.SIEM.Sources.ApplicationLogs.Path
        $allEvents += $appLogs
    }

    # Coletar logs de varredura de segurança
    if ($config.SIEM.Sources.SecurityScans.Enabled) {
        $securityScans = Collect-SecurityScanLogs -LogPath $config.SIEM.Sources.SecurityScans.Path
        $allEvents += $securityScans
    }

    # Coletar logs do Windows Event Log
    if ($config.SIEM.Sources.WindowsEvents.Enabled) {
        $windowsEvents = Collect-WindowsEventLogs -LogNames $config.SIEM.Sources.WindowsEvents.Logs -StartTime $config.SIEM.Sources.WindowsEvents.StartTime
        $allEvents += $windowsEvents
    }

    Show-SIEMStatus "Total de eventos coletados: $($allEvents.Count)" "INFO"

    # Processar eventos
    if ($config.SIEM.Processing.EnrichmentEnabled) {
        $allEvents = Enrich-Events -Events $allEvents -Enrichments $config.SIEM.Processing.Enrichments
    }

    if ($config.SIEM.Processing.Normalization) {
        $allEvents = Normalize-Events -Events $allEvents
    }

    if ($config.SIEM.Processing.Filtering.Enabled) {
        $allEvents = Filter-Events -Events $allEvents -ExcludePatterns $config.SIEM.Processing.Filtering.ExcludePatterns
    }

    # Se for apenas coleta, salvar em buffer e sair
    if ($CollectOnly) {
        if ($allEvents.Count -gt 0) {
            Save-EventsToBuffer -Events $allEvents
        }
        return
    }

    # Enviar eventos para cada provedor SIEM configurado
    $enabledProviders = $config.SIEM.Providers | Where-Object { $_.Enabled -eq $true }
    
    if ($enabledProviders.Count -eq 0) {
        Show-SIEMStatus "Nenhum provedor SIEM habilitado na configuração" "WARNING"
        if ($config.SIEM.Forwarding.OfflineBufferEnabled -and $allEvents.Count -gt 0) {
            Save-EventsToBuffer -Events $allEvents
        }
        return
    }

    # Processar eventos em lotes
    $batchSize = $config.SIEM.Forwarding.BatchSize
    $batches = [Math]::Ceiling($allEvents.Count / $batchSize)

    for ($i = 0; $i -lt $batches; $i++) {
        $startIdx = $i * $batchSize
        $endIdx = [Math]::Min(($i + 1) * $batchSize - 1, $allEvents.Count - 1)
        $batchEvents = $allEvents[$startIdx..$endIdx]
        
        Show-SIEMStatus "Processando lote $($i+1) de $batches ($($batchEvents.Count) eventos)" "INFO"
        
        foreach ($provider in $enabledProviders) {
            $success = $false
            $retryCount = 0
            
            while (-not $success -and $retryCount -lt $global:CONFIG.MaxRetries) {
                $success = Send-EventsToSIEM -Events $batchEvents -Provider $provider
                
                if (-not $success) {
                    $retryCount++
                    if ($retryCount -lt $global:CONFIG.MaxRetries) {
                        Show-SIEMStatus "Tentativa $retryCount de $($global:CONFIG.MaxRetries) falhou, tentando novamente em $($global:CONFIG.RetryDelaySeconds) segundos" "WARNING"
                        Start-Sleep -Seconds $global:CONFIG.RetryDelaySeconds
                    }
                }
            }
            
            if (-not $success) {
                Save-FailedEvents -Events $batchEvents -ProviderName $provider.Name
                
                # Notificar sobre falha persistente
                if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
                    Send-SecurityNotification `
                        -Title "Falha na Integração com SIEM" `
                        -Description "Não foi possível enviar eventos para o provedor SIEM $($provider.Name)" `
                        -Details "Falha após $($global:CONFIG.MaxRetries) tentativas. $($batchEvents.Count) eventos foram salvos no buffer de falhas." `
                        -Severity "medium" `
                        -Actions @(
                            "Verificar conectividade com o endpoint do SIEM",
                            "Validar credenciais e tokens de API",
                            "Verificar logs para detalhes do erro",
                            "Executar processamento manual do buffer de falhas"
                        )
                }
            }
        }
    }

    # Processar buffer offline se houver eventos pendentes
    Process-OfflineBuffer -Config $config

    Show-SIEMStatus "Integração com SIEM concluída" "SUCCESS"
}

# Função para testar a integração com SIEM
function Test-SIEMIntegration {
    Show-SIEMStatus "Iniciando teste de integração com SIEM" "INFO"
    
    # Inicializar configuração
    $config = Initialize-SIEMConfig
    Initialize-EventDirectories

    if (-not $config) {
        Show-SIEMStatus "Falha ao inicializar configuração. Abortando." "ERROR"
        return
    }

    # Criar eventos de teste
    $testEvents = @(
        @{
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            event_type = "test"
            severity = "info"
            message = "Evento de teste para integração com SIEM"
            source = "test_script"
            test_id = [Guid]::NewGuid().ToString()
        }
    )

    # Enriquecer e normalizar eventos de teste
    if ($config.SIEM.Processing.EnrichmentEnabled) {
        $testEvents = Enrich-Events -Events $testEvents -Enrichments $config.SIEM.Processing.Enrichments
    }

    if ($config.SIEM.Processing.Normalization) {
        $testEvents = Normalize-Events -Events $testEvents
    }

    # Enviar para cada provedor habilitado
    $enabledProviders = $config.SIEM.Providers | Where-Object { $_.Enabled -eq $true }
    
    if ($enabledProviders.Count -eq 0) {
        Show-SIEMStatus "Nenhum provedor SIEM habilitado na configuração" "WARNING"
        return
    }

    $allSuccess = $true
    foreach ($provider in $enabledProviders) {
        $success = Send-EventsToSIEM -Events $testEvents -Provider $provider
        
        if (-not $success) {
            $allSuccess = $false
            Show-SIEMStatus "Teste falhou para o provedor: $($provider.Name)" "ERROR"
        } else {
            Show-SIEMStatus "Teste bem-sucedido para o provedor: $($provider.Name)" "SUCCESS"
        }
    }

    if ($allSuccess) {
        Show-SIEMStatus "Teste de integração com SIEM concluído com sucesso" "SUCCESS"
    } else {
        Show-SIEMStatus "Teste de integração com SIEM concluído com falhas" "WARNING"
    }
}

# Executar função principal se o script for executado diretamente
if ($MyInvocation.InvocationName -ne "." -and $MyInvocation.Line -notmatch '\. ') {
    # Verificar se o módulo de notificações está disponível
    if (-not (Test-Path $notificacoesPath)) {
        Show-SIEMStatus "AVISO: Módulo de notificações não encontrado. Algumas funcionalidades estarão limitadas." "WARNING"
    }
    
    # Perguntar modo de execução
    $options = @(
        "1. Executar integração completa (coletar e enviar eventos)",
        "2. Apenas coletar eventos (salvar em buffer)",
        "3. Processar buffer offline",
        "4. Testar integração com SIEM",
        "5. Sair"
    )
    
    Write-Host "\nSelecione uma opção:" -ForegroundColor Cyan
    $options | ForEach-Object { Write-Host $_ }
    $choice = Read-Host "\nOpção"
    
    switch ($choice) {
        "1" { Start-SIEMIntegration }
        "2" { Start-SIEMIntegration -CollectOnly }
        "3" { Start-SIEMIntegration -ProcessOfflineBufferOnly }
        "4" { Test-SIEMIntegration }
        "5" { return }
        default { Show-SIEMStatus "Opção inválida" "ERROR" }
    }
}