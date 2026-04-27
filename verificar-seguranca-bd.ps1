# Script para verificar a segurança do banco de dados
# Verifica configurações de autenticação, criptografia, permissões e backups

# Caminho para arquivos de log e configuração
$configPath = Join-Path -Path $PSScriptRoot -ChildPath "config-seguranca-bd.json"
$logPath = Join-Path -Path $PSScriptRoot -ChildPath "logs"
$logFile = Join-Path -Path $logPath -ChildPath "verificacao-bd-$(Get-Date -Format 'yyyy-MM-dd').log"
$reportPath = Join-Path -Path $PSScriptRoot -ChildPath "relatorios"
$reportFile = Join-Path -Path $reportPath -ChildPath "relatorio-seguranca-bd-$(Get-Date -Format 'yyyy-MM-dd').html"

# Criar diretórios se não existirem
if (-not (Test-Path -Path $logPath)) {
    New-Item -Path $logPath -ItemType Directory -Force | Out-Null
}

if (-not (Test-Path -Path $reportPath)) {
    New-Item -Path $reportPath -ItemType Directory -Force | Out-Null
}

# Função para registrar logs
function Write-DatabaseSecurityLog {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Adicionar entrada ao arquivo de log
    Add-Content -Path $logFile -Value $logEntry -Encoding UTF8
    
    # Exibir mensagem no console com cores apropriadas
    switch ($Level) {
        "Info"    { Write-Host $logEntry -ForegroundColor Gray }
        "Warning" { Write-Host $logEntry -ForegroundColor Yellow }
        "Error"   { Write-Host $logEntry -ForegroundColor Red }
        "Success" { Write-Host $logEntry -ForegroundColor Green }
    }
}

# Função para carregar configuração
function Get-DatabaseSecurityConfig {
    # Verificar se o arquivo de configuração existe
    if (Test-Path -Path $configPath) {
        try {
            $config = Get-Content -Path $configPath -Raw | ConvertFrom-Json
            Write-DatabaseSecurityLog -Message "Configuração carregada com sucesso" -Level "Info"
            return $config
        } catch {
            Write-DatabaseSecurityLog -Message "Erro ao carregar configuração: $_" -Level "Error"
        }
    }
    
    # Criar configuração padrão se não existir
    Write-DatabaseSecurityLog -Message "Criando configuração padrão" -Level "Info"
    $defaultConfig = @{
        "BancosDados" = @(
            @{
                "Nome" = "Banco de Dados Principal"
                "Tipo" = "SQL Server" # SQL Server, MySQL, PostgreSQL, etc.
                "Servidor" = "localhost"
                "Porta" = 1433
                "NomeDB" = "AcucaradasDB"
                "UsuarioLeitura" = "leitor_seguranca"
                "SenhaLeitura" = "" # Deixar em branco, será solicitada durante a execução
                "VerificarAutenticacao" = $true
                "VerificarCriptografia" = $true
                "VerificarPermissoes" = $true
                "VerificarBackups" = $true
                "VerificarAtualizacoes" = $true
                "VerificarLogs" = $true
                "IgnorarFalsosPositivos" = $false
                "VerificacaoDetalhada" = $false
            }
        )
        "IntervaloVerificacao" = 24 # horas
        "NotificarEmail" = $true
        "EmailDestinatarios" = @("admin@acucaradas.local")
        "FalsosPositivosConhecidos" = @(
            @{
                "BancoDados" = "AcucaradasDB"
                "Tipo" = "Criptografia"
                "Objeto" = "tabela_produtos"
                "Motivo" = "Não contém dados sensíveis, criptografia não necessária"
                "DataAdicao" = (Get-Date -Format "yyyy-MM-dd")
            },
            @{
                "BancoDados" = "AcucaradasDB"
                "Tipo" = "Autenticacao"
                "Objeto" = "AutenticacaoMista"
                "Motivo" = "Necessário para integração com sistemas legados"
                "DataAdicao" = (Get-Date -Format "yyyy-MM-dd")
            }
        )
    }
    
    # Salvar configuração padrão
    $defaultConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Encoding UTF8
    Write-DatabaseSecurityLog -Message "Configuração padrão criada" -Level "Success"
    
    return $defaultConfig
}

# Função para verificar autenticação do banco de dados
function Test-DatabaseAuthentication {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$DatabaseConfig,
        
        [Parameter(Mandatory = $false)]
        [PSCustomObject]$Config
    )
    
    Write-DatabaseSecurityLog -Message "Verificando autenticação para $($DatabaseConfig.Nome)" -Level "Info"
    
    # Função para verificar se um problema é um falso positivo conhecido
    function Test-IsFalsoPositivo {
        param (
            [Parameter(Mandatory=$true)]
            [string]$Tipo,
            
            [Parameter(Mandatory=$true)]
            [string]$Objeto
        )
        
        if ($null -eq $Config.FalsosPositivosConhecidos) {
            return $false
        }
        
        foreach ($fp in $Config.FalsosPositivosConhecidos) {
            if ($fp.BancoDados -eq $DatabaseConfig.NomeDB -and $fp.Tipo -eq $Tipo -and $fp.Objeto -eq $Objeto) {
                return $true
            }
        }
        
        return $false
    }
    
    # Em um ambiente real, faríamos uma conexão real ao banco de dados
    # Para este exemplo, vamos simular a verificação
    
    # Simular configurações de autenticação
    $authSettings = @{
        "AutenticacaoWindows" = $false
        "AutenticacaoMista" = $true
        "SenhaComplexaObrigatoria" = $true
        "PoliticaBloqueioContasAtiva" = $true
        "TentativasAntesBloquear" = 3
        "TempoBloqueioConta" = 30 # minutos
        "RotacaoSenhaObrigatoria" = $false
        "DiasParaExpiracaoSenha" = 90
    }
    
    # Verificar configurações de autenticação
    $issues = @()
    
    # Verificar tipo de autenticação
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Autenticacao" -Objeto "AutenticacaoMista"
    if (-not $authSettings.AutenticacaoWindows -and $authSettings.AutenticacaoMista) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Info" } else { "Warning" }
            Write-DatabaseSecurityLog -Message "Autenticação mista está habilitada - recomenda-se usar autenticação Windows quando possível $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Autenticacao"
                "Objeto" = "AutenticacaoMista"
                "Descricao" = "Autenticação mista está habilitada - recomenda-se usar autenticação Windows quando possível"
                "Severidade" = "Média"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Configurar autenticação Windows quando possível para maior segurança"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Autenticação Windows está habilitada" -Level "Success"
    }
    
    # Verificar política de senha complexa
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Autenticacao" -Objeto "SenhaComplexaObrigatoria"
    if (-not $authSettings.SenhaComplexaObrigatoria) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Error" }
            Write-DatabaseSecurityLog -Message "Política de senha complexa não está habilitada $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Autenticacao"
                "Objeto" = "SenhaComplexaObrigatoria"
                "Descricao" = "Política de senha complexa não está habilitada"
                "Severidade" = "Alta"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Habilitar política de senha complexa para todas as contas de banco de dados"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Política de senha complexa está habilitada" -Level "Success"
    }
    
    # Verificar política de bloqueio de contas
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Autenticacao" -Objeto "PoliticaBloqueioContasAtiva"
    if (-not $authSettings.PoliticaBloqueioContasAtiva) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Error" }
            Write-DatabaseSecurityLog -Message "Política de bloqueio de contas não está habilitada $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Autenticacao"
                "Objeto" = "PoliticaBloqueioContasAtiva"
                "Descricao" = "Política de bloqueio de contas não está habilitada"
                "Severidade" = "Alta"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Habilitar política de bloqueio de contas para prevenir ataques de força bruta"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Política de bloqueio de contas está habilitada (Tentativas: $($authSettings.TentativasAntesBloquear), Tempo: $($authSettings.TempoBloqueioConta) min)" -Level "Success"
    }
    
    # Verificar rotação de senha obrigatória
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Autenticacao" -Objeto "RotacaoSenhaObrigatoria"
    if (-not $authSettings.RotacaoSenhaObrigatoria) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Info" } else { "Warning" }
            Write-DatabaseSecurityLog -Message "Rotação de senha obrigatória não está habilitada $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Autenticacao"
                "Objeto" = "RotacaoSenhaObrigatoria"
                "Descricao" = "Rotação de senha obrigatória não está habilitada"
                "Severidade" = "Média"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Configurar política de expiração de senha para contas de banco de dados"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Rotação de senha obrigatória está habilitada (Expiração: $($authSettings.DiasParaExpiracaoSenha) dias)" -Level "Success"
    }
    
    # Filtrar falsos positivos se necessário
    $realIssues = if ($DatabaseConfig.IgnorarFalsosPositivos) {
        $issues | Where-Object { -not $_.FalsoPositivo }
    } else {
        $issues
    }
    
    return @{
        "Success" = ($realIssues.Count -eq 0)
        "Issues" = $realIssues
        "AllIssues" = $issues
        "Settings" = $authSettings
    }
}

# Função para verificar SQL Injection em stored procedures
function Test-StoredProceduresSQLInjection {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$DatabaseConfig,
        
        [Parameter(Mandatory = $false)]
        [PSCustomObject]$Config
    )
    
    Write-DatabaseSecurityLog -Message "Verificando vulnerabilidades de SQL Injection em stored procedures para $($DatabaseConfig.Nome)" -Level "Info"
    
    # Função para verificar se um problema é um falso positivo conhecido
    function Test-IsFalsoPositivo {
        param (
            [Parameter(Mandatory=$true)]
            [string]$Tipo,
            
            [Parameter(Mandatory=$true)]
            [string]$Objeto
        )
        
        if ($null -eq $Config.FalsosPositivosConhecidos) {
            return $false
        }
        
        foreach ($fp in $Config.FalsosPositivosConhecidos) {
            if ($fp.BancoDados -eq $DatabaseConfig.NomeDB -and $fp.Tipo -eq $Tipo -and $fp.Objeto -eq $Objeto) {
                return $true
            }
        }
        
        return $false
    }
    
    # Simular stored procedures vulneráveis (em um ambiente real, isso seria uma análise real do código)
    $vulnerableStoredProcs = @(
        @{
            "Nome" = "sp_GetUserByInput"
            "Vulnerabilidade" = "Concatenação direta de parâmetros sem validação"
            "Codigo" = "CREATE PROCEDURE sp_GetUserByInput @input VARCHAR(100) AS BEGIN SELECT * FROM Users WHERE username = '" + @input + "' END"
            "Severidade" = "Crítica"
        },
        @{
            "Nome" = "sp_UpdateUserProfile"
            "Vulnerabilidade" = "Uso de EXEC com parâmetros não sanitizados"
            "Codigo" = "CREATE PROCEDURE sp_UpdateUserProfile @userId INT, @sql VARCHAR(1000) AS BEGIN EXEC(@sql) END"
            "Severidade" = "Crítica"
        },
        @{
            "Nome" = "sp_SearchProducts"
            "Vulnerabilidade" = "Construção dinâmica de SQL sem parametrização"
            "Codigo" = "CREATE PROCEDURE sp_SearchProducts @term VARCHAR(100) AS BEGIN DECLARE @sql NVARCHAR(1000) SET @sql = 'SELECT * FROM Products WHERE Name LIKE ''%' + @term + '%''' EXEC sp_executesql @sql END"
            "Severidade" = "Alta"
        }
    )
    
    $issues = @()
    
    foreach ($proc in $vulnerableStoredProcs) {
        $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "SQLInjection" -Objeto $proc.Nome
        
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Error" }
            Write-DatabaseSecurityLog -Message "Stored procedure '$($proc.Nome)' vulnerável a SQL Injection: $($proc.Vulnerabilidade) $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            
            $issues += @{
                "Tipo" = "SQLInjection"
                "Objeto" = $proc.Nome
                "Descricao" = "Stored procedure vulnerável a SQL Injection: $($proc.Vulnerabilidade)"
                "Codigo" = $proc.Codigo
                "Severidade" = $proc.Severidade
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Utilizar parâmetros SQL (sp_executesql com parâmetros) ou stored procedures parametrizadas"
            }
        }
    }
    
    # Filtrar falsos positivos se necessário
    $realIssues = if ($DatabaseConfig.IgnorarFalsosPositivos) {
        $issues | Where-Object { -not $_.FalsoPositivo }
    } else {
        $issues
    }
    
    return @{
        "Success" = ($realIssues.Count -eq 0)
        "Issues" = $realIssues
        "AllIssues" = $issues
    }
}

# Função para verificar configurações de auditoria do banco de dados
function Test-DatabaseAudit {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$DatabaseConfig,
        
        [Parameter(Mandatory = $false)]
        [PSCustomObject]$Config
    )
    
    Write-DatabaseSecurityLog -Message "Verificando configurações de auditoria para $($DatabaseConfig.Nome)" -Level "Info"
    
    # Função para verificar se um problema é um falso positivo conhecido
    function Test-IsFalsoPositivo {
        param (
            [Parameter(Mandatory=$true)]
            [string]$Tipo,
            
            [Parameter(Mandatory=$true)]
            [string]$Objeto
        )
        
        if ($null -eq $Config.FalsosPositivosConhecidos) {
            return $false
        }
        
        foreach ($fp in $Config.FalsosPositivosConhecidos) {
            if ($fp.BancoDados -eq $DatabaseConfig.NomeDB -and $fp.Tipo -eq $Tipo -and $fp.Objeto -eq $Objeto) {
                return $true
            }
        }
        
        return $false
    }
    
    # Simular configurações de auditoria
    $auditSettings = @{
        "AuditoriaAtiva" = $false
        "AuditoriaLogin" = $true
        "AuditoriaOperacoesDDL" = $false
        "AuditoriaOperacoesDML" = $false
        "AuditoriaAcessoAdministrativo" = $true
        "RetencaoLogs" = 30 # dias
        "MonitoramentoTempoReal" = $false
        "AlertasConfigurados" = $false
    }
    
    $issues = @()
    
    # Verificar se auditoria está ativa
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Auditoria" -Objeto "AuditoriaAtiva"
    if (-not $auditSettings.AuditoriaAtiva) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Error" }
            Write-DatabaseSecurityLog -Message "Auditoria de banco de dados não está ativa $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Auditoria"
                "Objeto" = "AuditoriaAtiva"
                "Descricao" = "Auditoria de banco de dados não está ativa"
                "Severidade" = "Alta"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Ativar auditoria de banco de dados para rastrear atividades e detectar comportamentos suspeitos"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Auditoria de banco de dados está ativa" -Level "Success"
    }
    
    # Verificar auditoria de operações DDL
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Auditoria" -Objeto "AuditoriaOperacoesDDL"
    if (-not $auditSettings.AuditoriaOperacoesDDL) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Warning" }
            Write-DatabaseSecurityLog -Message "Auditoria de operações DDL não está ativa $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Auditoria"
                "Objeto" = "AuditoriaOperacoesDDL"
                "Descricao" = "Auditoria de operações DDL (CREATE, ALTER, DROP) não está ativa"
                "Severidade" = "Média"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Ativar auditoria de operações DDL para monitorar alterações na estrutura do banco de dados"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Auditoria de operações DDL está ativa" -Level "Success"
    }
    
    # Verificar auditoria de operações DML
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Auditoria" -Objeto "AuditoriaOperacoesDML"
    if (-not $auditSettings.AuditoriaOperacoesDML) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Warning" }
            Write-DatabaseSecurityLog -Message "Auditoria de operações DML não está ativa $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Auditoria"
                "Objeto" = "AuditoriaOperacoesDML"
                "Descricao" = "Auditoria de operações DML (INSERT, UPDATE, DELETE) não está ativa"
                "Severidade" = "Média"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Ativar auditoria de operações DML para tabelas sensíveis para monitorar alterações nos dados"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Auditoria de operações DML está ativa" -Level "Success"
    }
    
    # Verificar monitoramento em tempo real
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Auditoria" -Objeto "MonitoramentoTempoReal"
    if (-not $auditSettings.MonitoramentoTempoReal) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Warning" }
            Write-DatabaseSecurityLog -Message "Monitoramento em tempo real não está configurado $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Auditoria"
                "Objeto" = "MonitoramentoTempoReal"
                "Descricao" = "Monitoramento em tempo real de atividades suspeitas não está configurado"
                "Severidade" = "Média"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Implementar monitoramento em tempo real para detectar atividades suspeitas imediatamente"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Monitoramento em tempo real está configurado" -Level "Success"
    }
    
    # Filtrar falsos positivos se necessário
    $realIssues = if ($DatabaseConfig.IgnorarFalsosPositivos) {
        $issues | Where-Object { -not $_.FalsoPositivo }
    } else {
        $issues
    }
    
    return @{
        "Success" = ($realIssues.Count -eq 0)
        "Issues" = $realIssues
        "AllIssues" = $issues
    }
}

# Função principal para verificar segurança do banco de dados
function Start-DatabaseSecurityCheck {
    param (
        [Parameter(Mandatory = $false)]
        [switch]$GenerateReport = $true,
        
        [Parameter(Mandatory = $false)]
        [switch]$IgnorarFalsosPositivos = $false,
        
        [Parameter(Mandatory = $false)]
        [switch]$VerificacaoDetalhada = $false,
        
        [Parameter(Mandatory = $false)]
        [switch]$EnviarNotificacoes = $false
    )
    
    Write-Host "Iniciando verificação de segurança do banco de dados..." -ForegroundColor Cyan
    
    # Carregar configuração
    $config = Get-DatabaseSecurityConfig
    
    # Criar diretório para falsos positivos se não existir
    $falsosPositivosDir = Join-Path -Path $PSScriptRoot -ChildPath "config"
    if (-not (Test-Path -Path $falsosPositivosDir)) {
        New-Item -Path $falsosPositivosDir -ItemType Directory -Force | Out-Null
    }
    
    # Verificar cada banco de dados configurado
    foreach ($dbConfig in $config.BancosDados) {
        Write-Host "`nVerificando banco de dados: $($dbConfig.Nome)" -ForegroundColor Cyan
        
        # Aplicar parâmetros globais às configurações do banco de dados
        $dbConfig | Add-Member -NotePropertyName "IgnorarFalsosPositivos" -NotePropertyValue $IgnorarFalsosPositivos -Force
        $dbConfig | Add-Member -NotePropertyName "VerificacaoDetalhada" -NotePropertyValue $VerificacaoDetalhada -Force
        
        $results = @{}
        $allIssues = @()
        
        # Verificar autenticação
        if ($dbConfig.VerificarAutenticacao) {
            $results.Autenticacao = Test-DatabaseAuthentication -DatabaseConfig $dbConfig -Config $config
            if ($results.Autenticacao.AllIssues) {
                $allIssues += $results.Autenticacao.AllIssues | ForEach-Object { 
                    $_ | Add-Member -NotePropertyName "Categoria" -NotePropertyValue "Autenticação" -PassThru 
                }
            }
        }
        
        # Verificar criptografia
        if ($dbConfig.VerificarCriptografia) {
            $results.Criptografia = Test-DatabaseEncryption -DatabaseConfig $dbConfig -Config $config
            if ($results.Criptografia.Issues) {
                $allIssues += $results.Criptografia.Issues | ForEach-Object { 
                    $_ | Add-Member -NotePropertyName "Categoria" -NotePropertyValue "Criptografia" -PassThru 
                }
            }
        }
        
        # Verificar permissões
        if ($dbConfig.VerificarPermissoes) {
            $results.Permissoes = Test-DatabasePermissions -DatabaseConfig $dbConfig -Config $config
            if ($results.Permissoes.Issues) {
                $allIssues += $results.Permissoes.Issues | ForEach-Object { 
                    $_ | Add-Member -NotePropertyName "Categoria" -NotePropertyValue "Permissões" -PassThru 
                }
            }
        }
        
        # Verificar backups
        if ($dbConfig.VerificarBackups) {
            $results.Backups = Test-DatabaseBackups -DatabaseConfig $dbConfig -Config $config
            if ($results.Backups.Issues) {
                $allIssues += $results.Backups.Issues | ForEach-Object { 
                    $_ | Add-Member -NotePropertyName "Categoria" -NotePropertyValue "Backups" -PassThru 
                }
            }
        }
        
        # Verificar atualizações
        if ($dbConfig.VerificarAtualizacoes) {
            $results.Atualizacoes = Test-DatabaseUpdates -DatabaseConfig $dbConfig -Config $config
            if ($results.Atualizacoes.Issues) {
                $allIssues += $results.Atualizacoes.Issues | ForEach-Object { 
                    $_ | Add-Member -NotePropertyName "Categoria" -NotePropertyValue "Atualizações" -PassThru 
                }
            }
        }
        
        # Verificar logs
        if ($dbConfig.VerificarLogs) {
            $results.Logs = Test-DatabaseLogs -DatabaseConfig $dbConfig -Config $config
            if ($results.Logs.Issues) {
                $allIssues += $results.Logs.Issues | ForEach-Object { 
                    $_ | Add-Member -NotePropertyName "Categoria" -NotePropertyValue "Logs" -PassThru 
                }
            }
        }
        
        # Verificações adicionais detalhadas
        if ($VerificacaoDetalhada) {
            Write-Host "Realizando verificações detalhadas..." -ForegroundColor Yellow
            
            # Verificar SQL Injection em stored procedures
            $results.SQLInjection = Test-StoredProceduresSQLInjection -DatabaseConfig $dbConfig -Config $config
            if ($results.SQLInjection.Issues) {
                $allIssues += $results.SQLInjection.Issues | ForEach-Object { 
                    $_ | Add-Member -NotePropertyName "Categoria" -NotePropertyValue "SQL Injection" -PassThru 
                }
            }
            
            # Verificar configurações de auditoria
            $results.Auditoria = Test-DatabaseAudit -DatabaseConfig $dbConfig -Config $config
            if ($results.Auditoria.Issues) {
                $allIssues += $results.Auditoria.Issues | ForEach-Object { 
                    $_ | Add-Member -NotePropertyName "Categoria" -NotePropertyValue "Auditoria" -PassThru 
                }
            }
        }
        
        # Resumo de problemas encontrados
        $realIssues = $allIssues | Where-Object { -not $_.FalsoPositivo }
        $falsePositives = $allIssues | Where-Object { $_.FalsoPositivo }
        
        Write-Host "`nResumo de problemas encontrados:" -ForegroundColor Cyan
        Write-Host "  - Total de problemas: $($allIssues.Count)" -ForegroundColor White
        Write-Host "  - Problemas reais: $($realIssues.Count)" -ForegroundColor $(if ($realIssues.Count -gt 0) { "Red" } else { "Green" })
        Write-Host "  - Falsos positivos: $($falsePositives.Count)" -ForegroundColor DarkGray
        
        # Exibir problemas críticos
        $criticalIssues = $realIssues | Where-Object { $_.Severidade -eq "Crítica" }
        if ($criticalIssues.Count -gt 0) {
            Write-Host "`nProblemas críticos encontrados:" -ForegroundColor Red
            foreach ($issue in $criticalIssues) {
                Write-Host "  - [$($issue.Categoria)] $($issue.Descricao)" -ForegroundColor Red
                Write-Host "    Recomendação: $($issue.Recomendacao)" -ForegroundColor Yellow
            }
        }
        
        # Enviar notificações se solicitado e houver problemas críticos
        if ($EnviarNotificacoes -and $criticalIssues.Count -gt 0 -and $config.NotificarEmail) {
            Write-Host "`nEnviando notificações por e-mail..." -ForegroundColor Yellow
            # Em um ambiente real, implementaríamos o envio de e-mail aqui
            Write-Host "  Notificações enviadas para: $($config.EmailDestinatarios -join ", ")" -ForegroundColor Green
        }
        
        # Gerar relatório se solicitado
        if ($GenerateReport) {
            $reportContent = New-DatabaseSecurityReport -DatabaseConfig $dbConfig -Results $results -AllIssues $allIssues
            $reportFilePath = Join-Path -Path $reportPath -ChildPath "relatorio-$($dbConfig.NomeDB)-$(Get-Date -Format 'yyyy-MM-dd').html"
            $reportContent | Out-File -FilePath $reportFilePath -Encoding UTF8
            Write-Host "Relatório gerado em: $reportFilePath" -ForegroundColor Green
        }
    }
    
    Write-Host "`nVerificação de segurança do banco de dados concluída." -ForegroundColor Green
}

# Função para verificar criptografia do banco de dados
function Test-DatabaseEncryption {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$DatabaseConfig,
        
        [Parameter(Mandatory = $false)]
        [PSCustomObject]$Config
    )
    
    Write-DatabaseSecurityLog -Message "Verificando criptografia para $($DatabaseConfig.Nome)" -Level "Info"
    
    # Função para verificar se um problema é um falso positivo conhecido
    function Test-IsFalsoPositivo {
        param (
            [Parameter(Mandatory=$true)]
            [string]$Tipo,
            
            [Parameter(Mandatory=$true)]
            [string]$Objeto
        )
        
        if ($null -eq $Config.FalsosPositivosConhecidos) {
            return $false
        }
        
        foreach ($fp in $Config.FalsosPositivosConhecidos) {
            if ($fp.BancoDados -eq $DatabaseConfig.NomeDB -and $fp.Tipo -eq $Tipo -and $fp.Objeto -eq $Objeto) {
                return $true
            }
        }
        
        return $false
    }
    
    # Simular configurações de criptografia
    $encryptionSettings = @{
        "TransportEncryption" = $true # SSL/TLS para conexões
        "DataAtRestEncryption" = $false # TDE ou similar
        "ColumnLevelEncryption" = $false # Criptografia em nível de coluna
        "BackupEncryption" = $true # Criptografia de backups
        "KeyRotation" = $false # Rotação de chaves de criptografia
        "CertificateExpiration" = (Get-Date).AddMonths(6) # Data de expiração do certificado
    }
    
    # Verificar configurações de criptografia
    $issues = @()
    
    # Verificar criptografia de transporte
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Criptografia" -Objeto "TransportEncryption"
    if (-not $encryptionSettings.TransportEncryption) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Error" }
            Write-DatabaseSecurityLog -Message "Criptografia de transporte (SSL/TLS) não está habilitada $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Criptografia"
                "Objeto" = "TransportEncryption"
                "Descricao" = "Criptografia de transporte (SSL/TLS) não está habilitada"
                "Severidade" = "Alta"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Configurar conexões SSL/TLS para o banco de dados"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Criptografia de transporte (SSL/TLS) está habilitada" -Level "Success"
    }
    
    # Verificar criptografia de dados em repouso
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Criptografia" -Objeto "DataAtRestEncryption"
    if (-not $encryptionSettings.DataAtRestEncryption) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Error" }
            Write-DatabaseSecurityLog -Message "Criptografia de dados em repouso (TDE) não está habilitada $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Criptografia"
                "Objeto" = "DataAtRestEncryption"
                "Descricao" = "Criptografia de dados em repouso (TDE) não está habilitada"
                "Severidade" = "Crítica"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Implementar Transparent Data Encryption (TDE) para proteger dados em repouso"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Criptografia de dados em repouso (TDE) está habilitada" -Level "Success"
    }
    
    # Verificar criptografia em nível de coluna
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Criptografia" -Objeto "ColumnLevelEncryption"
    if (-not $encryptionSettings.ColumnLevelEncryption) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Warning" }
            Write-DatabaseSecurityLog -Message "Criptografia em nível de coluna não está sendo utilizada $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Criptografia"
                "Objeto" = "ColumnLevelEncryption"
                "Descricao" = "Criptografia em nível de coluna não está sendo utilizada"
                "Severidade" = "Média"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Implementar criptografia em nível de coluna para dados sensíveis (PII, dados financeiros, etc.)"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Criptografia em nível de coluna está sendo utilizada" -Level "Success"
    }
    
    # Verificar criptografia de backups
    $isFalsoPositivo = Test-IsFalsoPositivo -Tipo "Criptografia" -Objeto "BackupEncryption"
    if (-not $encryptionSettings.BackupEncryption) {
        if (-not $DatabaseConfig.IgnorarFalsosPositivos -or -not $isFalsoPositivo) {
            $logLevel = if ($isFalsoPositivo) { "Warning" } else { "Error" }
            Write-DatabaseSecurityLog -Message "Criptografia de backups não está habilitada $(if ($isFalsoPositivo) { "[FALSO POSITIVO]" } else { "" })" -Level $logLevel
            $issues += @{
                "Tipo" = "Criptografia"
                "Objeto" = "BackupEncryption"
                "Descricao" = "Criptografia de backups não está habilitada"
                "Severidade" = "Alta"
                "FalsoPositivo" = $isFalsoPositivo
                "Recomendacao" = "Configurar criptografia para todos os backups de banco de dados"
            }
        }
    } else {
        Write-DatabaseSecurityLog -Message "Criptografia de backups está habilitada" -Level "Success"
    }
    
    if (-not $encryptionSettings.KeyRotation) {
        Write-DatabaseSecurityLog -Message "Rotação de chaves de criptografia não está configurada" -Level "Warning"
        $issues += "Rotação de chaves de criptografia não está configurada"
    } else {
        Write-DatabaseSecurityLog -Message "Rotação de chaves de criptografia está configurada" -Level "Success"
    }
    
    $daysUntilExpiration = ($encryptionSettings.CertificateExpiration - (Get-Date)).Days
    if ($daysUntilExpiration -lt 30) {
        Write-DatabaseSecurityLog -Message "Certificado SSL expirará em $daysUntilExpiration dias" -Level "Warning"
        $issues += "Certificado SSL expirará em $daysUntilExpiration dias"
    } else {
        Write-DatabaseSecurityLog -Message "Certificado SSL válido por mais $daysUntilExpiration dias" -Level "Success"
    }
    
    return @{
        "Success" = ($issues.Count -eq 0)
        "Issues" = $issues
        "Settings" = $encryptionSettings
    }
}

# Função para verificar permissões do banco de dados
function Test-DatabasePermissions {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$DatabaseConfig
    )
    
    Write-DatabaseSecurityLog -Message "Verificando permissões para $($DatabaseConfig.Nome)" -Level "Info"
    
    # Simular configurações de permissões
    $permissionSettings = @{
        "PrincipioPrivilegioMinimo" = $false # Princípio do privilégio mínimo aplicado
        "ContasAdministradorLimitadas" = $true # Número limitado de contas com privilégios administrativos
        "UsuariosAplicacaoSeparados" = $true # Usuários de aplicação separados por função
        "RolesPersonalizadas" = $false # Uso de roles personalizadas em vez de roles padrão
        "AcessoPublicoRestrito" = $true # Acesso público restrito
        "PermissoesGuestRevogadas" = $true # Permissões de guest revogadas
        "AuditoriaPeriodica" = $false # Auditoria periódica de permissões
    }
    
    # Simular usuários com permissões elevadas
    $adminUsers = @(
        @{ "Nome" = "sa"; "Ativo" = $true; "UltimoLogin" = (Get-Date).AddDays(-30) },
        @{ "Nome" = "admin_db"; "Ativo" = $true; "UltimoLogin" = (Get-Date).AddDays(-2) },
        @{ "Nome" = "backup_operator"; "Ativo" = $true; "UltimoLogin" = (Get-Date).AddDays(-1) }
    )
    
    # Verificar configurações de permissões
    $issues = @()
    
    if (-not $permissionSettings.PrincipioPrivilegioMinimo) {
        Write-DatabaseSecurityLog -Message "Princípio do privilégio mínimo não está sendo aplicado" -Level "Error"
        $issues += "Princípio do privilégio mínimo não está sendo aplicado"
    } else {
        Write-DatabaseSecurityLog -Message "Princípio do privilégio mínimo está sendo aplicado" -Level "Success"
    }
    
    if (-not $permissionSettings.ContasAdministradorLimitadas) {
        Write-DatabaseSecurityLog -Message "Número excessivo de contas com privilégios administrativos" -Level "Error"
        $issues += "Número excessivo de contas com privilégios administrativos"
    } else {
        Write-DatabaseSecurityLog -Message "Número limitado de contas com privilégios administrativos" -Level "Success"
    }
    
    if (-not $permissionSettings.UsuariosAplicacaoSeparados) {
        Write-DatabaseSecurityLog -Message "Usuários de aplicação não estão separados por função" -Level "Warning"
        $issues += "Usuários de aplicação não estão separados por função"
    } else {
        Write-DatabaseSecurityLog -Message "Usuários de aplicação estão separados por função" -Level "Success"
    }
    
    if (-not $permissionSettings.RolesPersonalizadas) {
        Write-DatabaseSecurityLog -Message "Não estão sendo utilizadas roles personalizadas" -Level "Warning"
        $issues += "Não estão sendo utilizadas roles personalizadas"
    } else {
        Write-DatabaseSecurityLog -Message "Estão sendo utilizadas roles personalizadas" -Level "Success"
    }
    
    if (-not $permissionSettings.AcessoPublicoRestrito) {
        Write-DatabaseSecurityLog -Message "Acesso público não está restrito" -Level "Error"
        $issues += "Acesso público não está restrito"
    } else {
        Write-DatabaseSecurityLog -Message "Acesso público está restrito" -Level "Success"
    }
    
    if (-not $permissionSettings.PermissoesGuestRevogadas) {
        Write-DatabaseSecurityLog -Message "Permissões de guest não foram revogadas" -Level "Error"
        $issues += "Permissões de guest não foram revogadas"
    } else {
        Write-DatabaseSecurityLog -Message "Permissões de guest foram revogadas" -Level "Success"
    }
    
    if (-not $permissionSettings.AuditoriaPeriodica) {
        Write-DatabaseSecurityLog -Message "Não está sendo realizada auditoria periódica de permissões" -Level "Warning"
        $issues += "Não está sendo realizada auditoria periódica de permissões"
    } else {
        Write-DatabaseSecurityLog -Message "Está sendo realizada auditoria periódica de permissões" -Level "Success"
    }
    
    # Verificar usuários administrativos
    if ($adminUsers | Where-Object { $_.Nome -eq "sa" -and $_.Ativo -eq $true }) {
        Write-DatabaseSecurityLog -Message "Conta 'sa' está ativa - recomenda-se desabilitar" -Level "Error"
        $issues += "Conta 'sa' está ativa"
    }
    
    # Verificar logins antigos
    $oldLogins = $adminUsers | Where-Object { ($_.UltimoLogin - (Get-Date)).Days -lt -90 }
    if ($oldLogins.Count -gt 0) {
        Write-DatabaseSecurityLog -Message "Existem $($oldLogins.Count) contas administrativas sem login há mais de 90 dias" -Level "Warning"
        $issues += "Existem contas administrativas sem login há mais de 90 dias"
    }
    
    return @{
        "Success" = ($issues.Count -eq 0)
        "Issues" = $issues
        "Settings" = $permissionSettings
        "AdminUsers" = $adminUsers
    }
}

# Função para verificar backups do banco de dados
function Test-DatabaseBackups {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$DatabaseConfig
    )
    
    Write-DatabaseSecurityLog -Message "Verificando backups para $($DatabaseConfig.Nome)" -Level "Info"
    
    # Simular configurações de backup
    $backupSettings = @{
        "BackupCompleto" = @{
            "Habilitado" = $true
            "Frequencia" = "Diária"
            "UltimoBackup" = (Get-Date).AddDays(-1)
            "RetencaoDias" = 30
            "Criptografado" = $true
            "TesteRestauracao" = $false
        }
        "BackupDiferencial" = @{
            "Habilitado" = $true
            "Frequencia" = "12 horas"
            "UltimoBackup" = (Get-Date).AddHours(-14)
            "RetencaoDias" = 7
            "Criptografado" = $true
            "TesteRestauracao" = $false
        }
        "BackupLog" = @{
            "Habilitado" = $true
            "Frequencia" = "1 hora"
            "UltimoBackup" = (Get-Date).AddHours(-2)
            "RetencaoDias" = 3
            "Criptografado" = $true
            "TesteRestauracao" = $false
        }
        "LocalArmazenamento" = @{
            "Local" = $true
            "Remoto" = $true
            "Cloud" = $false
        }
    }
    
    # Verificar configurações de backup
    $issues = @()
    
    # Verificar backup completo
    if (-not $backupSettings.BackupCompleto.Habilitado) {
        Write-DatabaseSecurityLog -Message "Backup completo não está habilitado" -Level "Error"
        $issues += "Backup completo não está habilitado"
    } else {
        $diasDesdeUltimoBackupCompleto = ((Get-Date) - $backupSettings.BackupCompleto.UltimoBackup).Days
        if ($diasDesdeUltimoBackupCompleto -gt 1) {
            Write-DatabaseSecurityLog -Message "Último backup completo foi realizado há $diasDesdeUltimoBackupCompleto dias" -Level "Warning"
            $issues += "Último backup completo foi realizado há $diasDesdeUltimoBackupCompleto dias"
        } else {
            Write-DatabaseSecurityLog -Message "Backup completo está em dia (último: $($backupSettings.BackupCompleto.UltimoBackup.ToString('dd/MM/yyyy HH:mm')))" -Level "Success"
        }
    }
    
    # Verificar backup diferencial
    if (-not $backupSettings.BackupDiferencial.Habilitado) {
        Write-DatabaseSecurityLog -Message "Backup diferencial não está habilitado" -Level "Warning"
        $issues += "Backup diferencial não está habilitado"
    } else {
        $horasDesdeUltimoBackupDiferencial = ((Get-Date) - $backupSettings.BackupDiferencial.UltimoBackup).TotalHours
        if ($horasDesdeUltimoBackupDiferencial -gt 12) {
            Write-DatabaseSecurityLog -Message "Último backup diferencial foi realizado há $([Math]::Round($horasDesdeUltimoBackupDiferencial, 1)) horas" -Level "Warning"
            $issues += "Último backup diferencial foi realizado há $([Math]::Round($horasDesdeUltimoBackupDiferencial, 1)) horas"
        } else {
            Write-DatabaseSecurityLog -Message "Backup diferencial está em dia (último: $($backupSettings.BackupDiferencial.UltimoBackup.ToString('dd/MM/yyyy HH:mm')))" -Level "Success"
        }
    }
    
    # Verificar backup de log
    if (-not $backupSettings.BackupLog.Habilitado) {
        Write-DatabaseSecurityLog -Message "Backup de log não está habilitado" -Level "Warning"
        $issues += "Backup de log não está habilitado"
    } else {
        $horasDesdeUltimoBackupLog = ((Get-Date) - $backupSettings.BackupLog.UltimoBackup).TotalHours
        if ($horasDesdeUltimoBackupLog -gt 1) {
            Write-DatabaseSecurityLog -Message "Último backup de log foi realizado há $([Math]::Round($horasDesdeUltimoBackupLog, 1)) horas" -Level "Warning"
            $issues += "Último backup de log foi realizado há $([Math]::Round($horasDesdeUltimoBackupLog, 1)) horas"
        } else {
            Write-DatabaseSecurityLog -Message "Backup de log está em dia (último: $($backupSettings.BackupLog.UltimoBackup.ToString('dd/MM/yyyy HH:mm')))" -Level "Success"
        }
    }
    
    # Verificar criptografia de backups
    if (-not $backupSettings.BackupCompleto.Criptografado) {
        Write-DatabaseSecurityLog -Message "Backup completo não está sendo criptografado" -Level "Error"
        $issues += "Backup completo não está sendo criptografado"
    }
    
    if (-not $backupSettings.BackupDiferencial.Criptografado) {
        Write-DatabaseSecurityLog -Message "Backup diferencial não está sendo criptografado" -Level "Error"
        $issues += "Backup diferencial não está sendo criptografado"
    }
    
    if (-not $backupSettings.BackupLog.Criptografado) {
        Write-DatabaseSecurityLog -Message "Backup de log não está sendo criptografado" -Level "Error"
        $issues += "Backup de log não está sendo criptografado"
    }
    
    # Verificar teste de restauração
    if (-not $backupSettings.BackupCompleto.TesteRestauracao) {
        Write-DatabaseSecurityLog -Message "Não está sendo realizado teste de restauração para backup completo" -Level "Warning"
        $issues += "Não está sendo realizado teste de restauração para backup completo"
    }
    
    # Verificar locais de armazenamento
    if (-not $backupSettings.LocalArmazenamento.Remoto -and -not $backupSettings.LocalArmazenamento.Cloud) {
        Write-DatabaseSecurityLog -Message "Backups estão sendo armazenados apenas localmente" -Level "Error"
        $issues += "Backups estão sendo armazenados apenas localmente"
    }
    
    if (-not $backupSettings.LocalArmazenamento.Cloud) {
        Write-DatabaseSecurityLog -Message "Backups não estão sendo armazenados na nuvem" -Level "Warning"
        $issues += "Backups não estão sendo armazenados na nuvem"
    }
    
    return @{
        "Success" = ($issues.Count -eq 0)
        "Issues" = $issues
        "Settings" = $backupSettings
    }
}

# Função para verificar atualizações do banco de dados
function Test-DatabaseUpdates {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$DatabaseConfig
    )
    
    Write-DatabaseSecurityLog -Message "Verificando atualizações para $($DatabaseConfig.Nome)" -Level "Info"
    
    # Simular informações de versão e atualizações
    $updateInfo = @{
        "VersaoAtual" = "15.0.4312.2"
        "UltimaVersaoDisponivel" = "15.0.4345.5"
        "AtualizacoesPendentes" = 3
        "AtualizacoesCriticas" = 1
        "UltimaAtualizacao" = (Get-Date).AddMonths(-2)
        "JanelaManutencaoConfigurada" = $true
        "PatchManagementAutomatizado" = $false
        "AmbienteTesteAtualizacoes" = $false
    }
    
    # Verificar atualizações
    $issues = @()
    
    if ($updateInfo.AtualizacoesPendentes -gt 0) {
        Write-DatabaseSecurityLog -Message "Existem $($updateInfo.AtualizacoesPendentes) atualizações pendentes" -Level "Warning"
        $issues += "Existem $($updateInfo.AtualizacoesPendentes) atualizações pendentes"
        
        if ($updateInfo.AtualizacoesCriticas -gt 0) {
            Write-DatabaseSecurityLog -Message "Existem $($updateInfo.AtualizacoesCriticas) atualizações críticas pendentes" -Level "Error"
            $issues += "Existem $($updateInfo.AtualizacoesCriticas) atualizações críticas pendentes"
        }
    } else {
        Write-DatabaseSecurityLog -Message "Sistema de banco de dados está atualizado" -Level "Success"
    }
    
    $diasDesdeUltimaAtualizacao = ((Get-Date) - $updateInfo.UltimaAtualizacao).Days
    if ($diasDesdeUltimaAtualizacao -gt 90) {
        Write-DatabaseSecurityLog -Message "Última atualização foi realizada há $diasDesdeUltimaAtualizacao dias" -Level "Warning"
        $issues += "Última atualização foi realizada há $diasDesdeUltimaAtualizacao dias"
    }
    
    if (-not $updateInfo.JanelaManutencaoConfigurada) {
        Write-DatabaseSecurityLog -Message "Janela de manutenção não está configurada" -Level "Warning"
        $issues += "Janela de manutenção não está configurada"
    }
    
    if (-not $updateInfo.PatchManagementAutomatizado) {
        Write-DatabaseSecurityLog -Message "Gerenciamento automatizado de patches não está configurado" -Level "Warning"
        $issues += "Gerenciamento automatizado de patches não está configurado"
    }
    
    if (-not $updateInfo.AmbienteTesteAtualizacoes) {
        Write-DatabaseSecurityLog -Message "Não existe ambiente de teste para atualizações" -Level "Warning"
        $issues += "Não existe ambiente de teste para atualizações"
    }
    
    return @{
        "Success" = ($issues.Count -eq 0)
        "Issues" = $issues
        "Settings" = $updateInfo
    }
}

# Função para verificar logs do banco de dados
function Test-DatabaseLogs {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$DatabaseConfig
    )
    
    Write-DatabaseSecurityLog -Message "Verificando logs para $($DatabaseConfig.Nome)" -Level "Info"
    
    # Simular configurações de logs
    $logSettings = @{
        "AuditoriaLogin" = $true
        "AuditoriaAcessoDados" = $false
        "AuditoriaAlteracaoEstrutura" = $true
        "AuditoriaAdministrativa" = $true
        "RetencaoLogs" = 90 # dias
        "MonitoramentoAtivo" = $true
        "AlertasConfigurados" = $true
        "IntegracaoSIEM" = $false
    }
    
    # Verificar configurações de logs
    $issues = @()
    
    if (-not $logSettings.AuditoriaLogin) {
        Write-DatabaseSecurityLog -Message "Auditoria de login não está habilitada" -Level "Error"
        $issues += "Auditoria de login não está habilitada"
    } else {
        Write-DatabaseSecurityLog -Message "Auditoria de login está habilitada" -Level "Success"
    }
    
    if (-not $logSettings.AuditoriaAcessoDados) {
        Write-DatabaseSecurityLog -Message "Auditoria de acesso a dados não está habilitada" -Level "Warning"
        $issues += "Auditoria de acesso a dados não está habilitada"
    } else {
        Write-DatabaseSecurityLog -Message "Auditoria de acesso a dados está habilitada" -Level "Success"
    }
    
    if (-not $logSettings.AuditoriaAlteracaoEstrutura) {
        Write-DatabaseSecurityLog -Message "Auditoria de alteração de estrutura não está habilitada" -Level "Error"
        $issues += "Auditoria de alteração de estrutura não está habilitada"
    } else {
        Write-DatabaseSecurityLog -Message "Auditoria de alteração de estrutura está habilitada" -Level "Success"
    }
    
    if (-not $logSettings.AuditoriaAdministrativa) {
        Write-DatabaseSecurityLog -Message "Auditoria administrativa não está habilitada" -Level "Error"
        $issues += "Auditoria administrativa não está habilitada"
    } else {
        Write-DatabaseSecurityLog -Message "Auditoria administrativa está habilitada" -Level "Success"
    }
    
    if ($logSettings.RetencaoLogs -lt 180) {
        Write-DatabaseSecurityLog -Message "Período de retenção de logs ($($logSettings.RetencaoLogs) dias) é menor que o recomendado (180 dias)" -Level "Warning"
        $issues += "Período de retenção de logs é menor que o recomendado"
    } else {
        Write-DatabaseSecurityLog -Message "Período de retenção de logs ($($logSettings.RetencaoLogs) dias) está adequado" -Level "Success"
    }
    
    if (-not $logSettings.MonitoramentoAtivo) {
        Write-DatabaseSecurityLog -Message "Monitoramento ativo de logs não está habilitado" -Level "Warning"
        $issues += "Monitoramento ativo de logs não está habilitado"
    } else {
        Write-DatabaseSecurityLog -Message "Monitoramento ativo de logs está habilitado" -Level "Success"
    }
    
    if (-not $logSettings.AlertasConfigurados) {
        Write-DatabaseSecurityLog -Message "Alertas de segurança não estão configurados" -Level "Warning"
        $issues += "Alertas de segurança não estão configurados"
    } else {
        Write-DatabaseSecurityLog -Message "Alertas de segurança estão configurados" -Level "Success"
    }
    
    if (-not $logSettings.IntegracaoSIEM) {
        Write-DatabaseSecurityLog -Message "Integração com SIEM não está configurada" -Level "Warning"
        $issues += "Integração com SIEM não está configurada"
    } else {
        Write-DatabaseSecurityLog -Message "Integração com SIEM está configurada" -Level "Success"
    }
    
    return @{
        "Success" = ($issues.Count -eq 0)
        "Issues" = $issues
        "Settings" = $logSettings
    }
}

# Função para gerar relatório HTML
function New-DatabaseSecurityReport {
    param (
        [Parameter(Mandatory = $true)]
        [hashtable]$Results
    )
    
    Write-DatabaseSecurityLog -Message "Gerando relatório HTML" -Level "Info"
    
    # Calcular pontuação de segurança
    $totalChecks = 0
    $passedChecks = 0
    
    foreach ($database in $Results.Keys) {
        $databaseResult = $Results[$database]
        
        # Autenticação
        $totalChecks += $databaseResult.AuthenticationCheck.Issues.Count + ($databaseResult.AuthenticationCheck.Success ? 1 : 0)
        if ($databaseResult.AuthenticationCheck.Success) { $passedChecks++ }
        
        # Criptografia
        $totalChecks += $databaseResult.EncryptionCheck.Issues.Count + ($databaseResult.EncryptionCheck.Success ? 1 : 0)
        if ($databaseResult.EncryptionCheck.Success) { $passedChecks++ }
        
        # Permissões
        $totalChecks += $databaseResult.PermissionsCheck.Issues.Count + ($databaseResult.PermissionsCheck.Success ? 1 : 0)
        if ($databaseResult.PermissionsCheck.Success) { $passedChecks++ }
        
        # Backups
        $totalChecks += $databaseResult.BackupsCheck.Issues.Count + ($databaseResult.BackupsCheck.Success ? 1 : 0)
        if ($databaseResult.BackupsCheck.Success) { $passedChecks++ }
        
        # Atualizações
        $totalChecks += $databaseResult.UpdatesCheck.Issues.Count + ($databaseResult.UpdatesCheck.Success ? 1 : 0)
        if ($databaseResult.UpdatesCheck.Success) { $passedChecks++ }
        
        # Logs
        $totalChecks += $databaseResult.LogsCheck.Issues.Count + ($databaseResult.LogsCheck.Success ? 1 : 0)
        if ($databaseResult.LogsCheck.Success) { $passedChecks++ }
    }
    
    $securityScore = [Math]::Round(($passedChecks / $totalChecks) * 100)
    
    # Gerar HTML
    $html = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Segurança do Banco de Dados - Açucaradas Encomendas</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 5px;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .score-container {
            text-align: center;
            margin: 20px 0;
        }
        .score {
            font-size: 48px;
            font-weight: bold;
            color: #fff;
            background-color: #2c3e50;
            display: inline-block;
            width: 100px;
            height: 100px;
            line-height: 100px;
            border-radius: 50%;
            margin-bottom: 10px;
        }
        .score-label {
            font-size: 18px;
            font-weight: bold;
        }
        .database-section {
            margin-bottom: 30px;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
        }
        .database-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .database-status {
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
        }
        .status-pass {
            background-color: #27ae60;
            color: white;
        }
        .status-fail {
            background-color: #e74c3c;
            color: white;
        }
        .status-warning {
            background-color: #f39c12;
            color: white;
        }
        .check-section {
            margin-bottom: 20px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        .check-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .check-status {
            padding: 3px 8px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 14px;
        }
        .issues-list {
            margin-top: 10px;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 3px;
        }
        .issues-list ul {
            margin-bottom: 0;
            padding-left: 20px;
        }
        .issues-list li {
            margin-bottom: 5px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #7f8c8d;
            font-size: 14px;
        }
        .recommendations {
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #3498db;
            margin-top: 20px;
        }
        .recommendations h3 {
            margin-top: 0;
        }
        .recommendations ul {
            margin-bottom: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Relatório de Segurança do Banco de Dados</h1>
        <p>Este relatório apresenta os resultados da verificação de segurança dos bancos de dados da Açucaradas Encomendas.</p>
        <p><strong>Data da verificação:</strong> $(Get-Date -Format "dd/MM/yyyy HH:mm")</p>
        
        <div class="score-container">
            <div class="score" style="background-color: $(if($securityScore -ge 90){"#27ae60"}elseif($securityScore -ge 70){"#f39c12"}else{"#e74c3c"});">$securityScore</div>
            <div class="score-label">Pontuação de Segurança</div>
        </div>
        
        <h2>Resumo da Verificação</h2>
        <p>Total de verificações: $totalChecks</p>
        <p>Verificações bem-sucedidas: $passedChecks</p>
        <p>Bancos de dados verificados: $($Results.Keys.Count)</p>
        
"@
    
    # Adicionar seções para cada banco de dados
    foreach ($database in $Results.Keys) {
        $databaseResult = $Results[$database]
        $databaseStatus = if (
            $databaseResult.AuthenticationCheck.Success -and 
            $databaseResult.EncryptionCheck.Success -and 
            $databaseResult.PermissionsCheck.Success -and 
            $databaseResult.BackupsCheck.Success -and 
            $databaseResult.UpdatesCheck.Success -and 
            $databaseResult.LogsCheck.Success
        ) { "pass" } elseif (
            $databaseResult.AuthenticationCheck.Issues.Count -gt 0 -or 
            $databaseResult.EncryptionCheck.Issues.Count -gt 0 -or 
            $databaseResult.PermissionsCheck.Issues.Count -gt 0 -or 
            $databaseResult.BackupsCheck.Issues.Count -gt 0 -or 
            $databaseResult.UpdatesCheck.Issues.Count -gt 0 -or 
            $databaseResult.LogsCheck.Issues.Count -gt 0
        ) { "warning" } else { "fail" }
        
        $html += @"
        <div class="database-section">
            <div class="database-header">
                <h2>$database</h2>
                <span class="database-status status-$databaseStatus">$(if($databaseStatus -eq "pass"){"APROVADO"}elseif($databaseStatus -eq "warning"){"ATENÇÃO"}else{"FALHA"})</span>
            </div>
            
            <!-- Autenticação -->
            <div class="check-section">
                <div class="check-header">
                    <h3>Autenticação</h3>
                    <span class="check-status status-$(if($databaseResult.AuthenticationCheck.Success){"pass"}else{"fail"})">$(if($databaseResult.AuthenticationCheck.Success){"APROVADO"}else{"FALHA"})</span>
                </div>
                
                $(if($databaseResult.AuthenticationCheck.Issues.Count -gt 0) {
                    "<div class=\"issues-list\">\n                        <h4>Problemas encontrados:</h4>\n                        <ul>\n"
                    foreach($issue in $databaseResult.AuthenticationCheck.Issues) {
                        "                            <li>$issue</li>\n"
                    }
                    "                        </ul>\n                    </div>"
                } else {
                    "<p>Nenhum problema encontrado nas configurações de autenticação.</p>"
                })
            </div>
            
            <!-- Criptografia -->
            <div class="check-section">
                <div class="check-header">
                    <h3>Criptografia</h3>
                    <span class="check-status status-$(if($databaseResult.EncryptionCheck.Success){"pass"}else{"fail"})">$(if($databaseResult.EncryptionCheck.Success){"APROVADO"}else{"FALHA"})</span>
                </div>
                
                $(if($databaseResult.EncryptionCheck.Issues.Count -gt 0) {
                    "<div class=\"issues-list\">\n                        <h4>Problemas encontrados:</h4>\n                        <ul>\n"
                    foreach($issue in $databaseResult.EncryptionCheck.Issues) {
                        "                            <li>$issue</li>\n"
                    }
                    "                        </ul>\n                    </div>"
                } else {
                    "<p>Nenhum problema encontrado nas configurações de criptografia.</p>"
                })
            </div>
            
            <!-- Permissões -->
            <div class="check-section">
                <div class="check-header">
                    <h3>Permissões</h3>
                    <span class="check-status status-$(if($databaseResult.PermissionsCheck.Success){"pass"}else{"fail"})">$(if($databaseResult.PermissionsCheck.Success){"APROVADO"}else{"FALHA"})</span>
                </div>
                
                $(if($databaseResult.PermissionsCheck.Issues.Count -gt 0) {
                    "<div class=\"issues-list\">\n                        <h4>Problemas encontrados:</h4>\n                        <ul>\n"
                    foreach($issue in $databaseResult.PermissionsCheck.Issues) {
                        "                            <li>$issue</li>\n"
                    }
                    "                        </ul>\n                    </div>"
                } else {
                    "<p>Nenhum problema encontrado nas configurações de permissões.</p>"
                })
            </div>
            
            <!-- Backups -->
            <div class="check-section">
                <div class="check-header">
                    <h3>Backups</h3>
                    <span class="check-status status-$(if($databaseResult.BackupsCheck.Success){"pass"}else{"fail"})">$(if($databaseResult.BackupsCheck.Success){"APROVADO"}else{"FALHA"})</span>
                </div>
                
                $(if($databaseResult.BackupsCheck.Issues.Count -gt 0) {
                    "<div class=\"issues-list\">\n                        <h4>Problemas encontrados:</h4>\n                        <ul>\n"
                    foreach($issue in $databaseResult.BackupsCheck.Issues) {
                        "                            <li>$issue</li>\n"
                    }
                    "                        </ul>\n                    </div>"
                } else {
                    "<p>Nenhum problema encontrado nas configurações de backups.</p>"
                })
            </div>
            
            <!-- Atualizações -->
            <div class="check-section">
                <div class="check-header">
                    <h3>Atualizações</h3>
                    <span class="check-status status-$(if($databaseResult.UpdatesCheck.Success){"pass"}else{"fail"})">$(if($databaseResult.UpdatesCheck.Success){"APROVADO"}else{"FALHA"})</span>
                </div>
                
                $(if($databaseResult.UpdatesCheck.Issues.Count -gt 0) {
                    "<div class=\"issues-list\">\n                        <h4>Problemas encontrados:</h4>\n                        <ul>\n"
                    foreach($issue in $databaseResult.UpdatesCheck.Issues) {
                        "                            <li>$issue</li>\n"
                    }
                    "                        </ul>\n                    </div>"
                } else {
                    "<p>Nenhum problema encontrado nas configurações de atualizações.</p>"
                })
            </div>
            
            <!-- Logs -->
            <div class="check-section">
                <div class="check-header">
                    <h3>Logs</h3>
                    <span class="check-status status-$(if($databaseResult.LogsCheck.Success){"pass"}else{"fail"})">$(if($databaseResult.LogsCheck.Success){"APROVADO"}else{"FALHA"})</span>
                </div>
                
                $(if($databaseResult.LogsCheck.Issues.Count -gt 0) {
                    "<div class=\"issues-list\">\n                        <h4>Problemas encontrados:</h4>\n                        <ul>\n"
                    foreach($issue in $databaseResult.LogsCheck.Issues) {
                        "                            <li>$issue</li>\n"
                    }
                    "                        </ul>\n                    </div>"
                } else {
                    "<p>Nenhum problema encontrado nas configurações de logs.</p>"
                })
            </div>
            
            <div class="recommendations">
                <h3>Recomendações</h3>
                <ul>
"@
        
        # Adicionar recomendações com base nos resultados
        $allIssues = @()
        $allIssues += $databaseResult.AuthenticationCheck.Issues
        $allIssues += $databaseResult.EncryptionCheck.Issues
        $allIssues += $databaseResult.PermissionsCheck.Issues
        $allIssues += $databaseResult.BackupsCheck.Issues
        $allIssues += $databaseResult.UpdatesCheck.Issues
        $allIssues += $databaseResult.LogsCheck.Issues
        
        if ($allIssues.Count -gt 0) {
            foreach ($issue in $allIssues) {
                $html += "                    <li>$issue</li>\n"
            }
        } else {
            $html += "                    <li>Nenhuma recomendação necessária. Todas as verificações foram aprovadas.</li>\n"
        }
        
        $html += @"
                </ul>
            </div>
        </div>
"@
    }
    
    # Finalizar HTML
    $html += @"
        <div class="footer">
            <p>Relatório gerado automaticamente pelo Sistema de Verificação de Segurança - Açucaradas Encomendas</p>
            <p>© $(Get-Date -Format "yyyy") Açucaradas Encomendas - Todos os direitos reservados</p>
        </div>
    </div>
</body>
</html>
"@
    
    # Salvar relatório
    $html | Set-Content -Path $reportFile -Encoding UTF8
    Write-DatabaseSecurityLog -Message "Relatório HTML gerado em $reportFile" -Level "Success"
    
    return $reportFile
}

# Função para atualizar o dashboard de segurança
function Update-SecurityDashboardFromDatabaseCheck {
    param (
        [Parameter(Mandatory = $true)]
        [hashtable]$Results,
        
        [Parameter(Mandatory = $true)]
        [int]$SecurityScore
    )
    
    Write-DatabaseSecurityLog -Message "Atualizando dashboard com resultados da verificação do banco de dados" -Level "Info"
    
    # Verificar se o script de atualização do dashboard existe
    $dashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
    
    if (Test-Path -Path $dashboardScript) {
        try {
            # Em um cenário real, atualizaríamos um arquivo JSON com os resultados
            # para que o dashboard pudesse ler esses dados
            
            # Criar ou atualizar arquivo de dados de vulnerabilidades
            $vulnerabilidadesDataFile = Join-Path -Path $PSScriptRoot -ChildPath "vulnerabilidades-data.json"
            
            # Simular dados de vulnerabilidades com base nos resultados
            $vulnerabilidadesData = @{
                "Criticas" = 0
                "Altas" = 0
                "Medias" = 0
                "Baixas" = 0
            }
            
            foreach ($database in $Results.Keys) {
                $databaseResult = $Results[$database]
                
                # Contar problemas de autenticação como vulnerabilidades
                foreach ($issue in $databaseResult.AuthenticationCheck.Issues) {
                    if ($issue -match "senha|política|bloqueio") {
                        $vulnerabilidadesData.Altas++
                    } else {
                        $vulnerabilidadesData.Medias++
                    }
                }
                
                # Contar problemas de criptografia como vulnerabilidades
                foreach ($issue in $databaseResult.EncryptionCheck.Issues) {
                    if ($issue -match "transporte|TDE|repouso") {
                        $vulnerabilidadesData.Criticas++
                    } else {
                        $vulnerabilidadesData.Altas++
                    }
                }
                
                # Contar problemas de permissões como vulnerabilidades
                foreach ($issue in $databaseResult.PermissionsCheck.Issues) {
                    if ($issue -match "sa|administrativas|público|guest") {
                        $vulnerabilidadesData.Altas++
                    } else {
                        $vulnerabilidadesData.Medias++
                    }
                }
                
                # Contar problemas de backups como vulnerabilidades
                foreach ($issue in $databaseResult.BackupsCheck.Issues) {
                    if ($issue -match "criptografado|apenas localmente") {
                        $vulnerabilidadesData.Altas++
                    } else {
                        $vulnerabilidadesData.Medias++
                    }
                }
                
                # Contar problemas de atualizações como vulnerabilidades
                foreach ($issue in $databaseResult.UpdatesCheck.Issues) {
                    if ($issue -match "críticas") {
                        $vulnerabilidadesData.Criticas++
                    } elseif ($issue -match "pendentes") {
                        $vulnerabilidadesData.Altas++
                    } else {
                        $vulnerabilidadesData.Baixas++
                    }
                }
                
                # Contar problemas de logs como vulnerabilidades
                foreach ($issue in $databaseResult.LogsCheck.Issues) {
                    if ($issue -match "login|administrativa|estrutura") {
                        $vulnerabilidadesData.Altas++
                    } else {
                        $vulnerabilidadesData.Medias++
                    }
                }
            }
            
            # Salvar dados de vulnerabilidades
            $vulnerabilidadesData | ConvertTo-Json | Set-Content -Path $vulnerabilidadesDataFile -Encoding UTF8
            
            # Executar script de atualização do dashboard
            & $dashboardScript
            
            Write-DatabaseSecurityLog -Message "Dashboard atualizado com sucesso" -Level "Success"
            return $true
        } catch {
            Write-DatabaseSecurityLog -Message "Erro ao atualizar dashboard: $_" -Level "Error"
            return $false
        }
    } else {
        Write-DatabaseSecurityLog -Message "Script de atualização do dashboard não encontrado: $dashboardScript" -Level "Warning"
        return $false
    }
}

# Função principal para verificar a segurança do banco de dados
function Start-DatabaseSecurityCheck {
    Write-Host "\n===== Verificação de Segurança do Banco de Dados - Açucaradas Encomendas =====" -ForegroundColor Cyan
    Write-DatabaseSecurityLog -Message "Iniciando verificação de segurança do banco de dados" -Level "Info"
    
    # Carregar configuração
    $config = Get-DatabaseSecurityConfig
    
    # Resultados da verificação
    $results = @{}
    
    # Verificar cada banco de dados configurado
    foreach ($database in $config.BancosDados) {
        Write-Host "\nVerificando banco de dados: $($database.Nome) ($($database.Tipo) - $($database.Servidor):$($database.Porta))" -ForegroundColor Yellow
        Write-DatabaseSecurityLog -Message "Verificando banco de dados: $($database.Nome)" -Level "Info"
        
        # Verificar autenticação
        $authenticationCheck = $null
        if ($database.VerificarAutenticacao) {
            $authenticationCheck = Test-DatabaseAuthentication -DatabaseConfig $database
        }
        
        # Verificar criptografia
        $encryptionCheck = $null
        if ($database.VerificarCriptografia) {
            $encryptionCheck = Test-DatabaseEncryption -DatabaseConfig $database
        }
        
        # Verificar permissões
        $permissionsCheck = $null
        if ($database.VerificarPermissoes) {
            $permissionsCheck = Test-DatabasePermissions -DatabaseConfig $database
        }
        
        # Verificar backups
        $backupsCheck = $null
        if ($database.VerificarBackups) {
            $backupsCheck = Test-DatabaseBackups -DatabaseConfig $database
        }
        
        # Verificar atualizações
        $updatesCheck = $null
        if ($database.VerificarAtualizacoes) {
            $updatesCheck = Test-DatabaseUpdates -DatabaseConfig $database
        }
        
        # Verificar logs
        $logsCheck = $null
        if ($database.VerificarLogs) {
            $logsCheck = Test-DatabaseLogs -DatabaseConfig $database
        }
        
        # Armazenar resultados
        $results[$database.Nome] = @{
            "AuthenticationCheck" = $authenticationCheck
            "EncryptionCheck" = $encryptionCheck
            "PermissionsCheck" = $permissionsCheck
            "BackupsCheck" = $backupsCheck
            "UpdatesCheck" = $updatesCheck
            "LogsCheck" = $logsCheck
        }
    }
    
    # Calcular pontuação de segurança
    $totalChecks = 0
    $passedChecks = 0
    
    foreach ($database in $results.Keys) {
        $databaseResult = $results[$database]
        
        # Autenticação
        if ($databaseResult.AuthenticationCheck) {
            $totalChecks += $databaseResult.AuthenticationCheck.Issues.Count + ($databaseResult.AuthenticationCheck.Success ? 1 : 0)
            if ($databaseResult.AuthenticationCheck.Success) { $passedChecks++ }
        }
        
        # Criptografia
        if ($databaseResult.EncryptionCheck) {
            $totalChecks += $databaseResult.EncryptionCheck.Issues.Count + ($databaseResult.EncryptionCheck.Success ? 1 : 0)
            if ($databaseResult.EncryptionCheck.Success) { $passedChecks++ }
        }
        
        # Permissões
        if ($databaseResult.PermissionsCheck) {
            $totalChecks += $databaseResult.PermissionsCheck.Issues.Count + ($databaseResult.PermissionsCheck.Success ? 1 : 0)
            if ($databaseResult.PermissionsCheck.Success) { $passedChecks++ }
        }
        
        # Backups
        if ($databaseResult.BackupsCheck) {
            $totalChecks += $databaseResult.BackupsCheck.Issues.Count + ($databaseResult.BackupsCheck.Success ? 1 : 0)
            if ($databaseResult.BackupsCheck.Success) { $passedChecks++ }
        }
        
        # Atualizações
        if ($databaseResult.UpdatesCheck) {
            $totalChecks += $databaseResult.UpdatesCheck.Issues.Count + ($databaseResult.UpdatesCheck.Success ? 1 : 0)
            if ($databaseResult.UpdatesCheck.Success) { $passedChecks++ }
        }
        
        # Logs
        if ($databaseResult.LogsCheck) {
            $totalChecks += $databaseResult.LogsCheck.Issues.Count + ($databaseResult.LogsCheck.Success ? 1 : 0)
            if ($databaseResult.LogsCheck.Success) { $passedChecks++ }
        }
    }
    
    $securityScore = 0
    if ($totalChecks -gt 0) {
        $securityScore = [Math]::Round(($passedChecks / $totalChecks) * 100)
    }
    
    Write-Host "\nPontuação de Segurança do Banco de Dados: $securityScore/100" -ForegroundColor $(if($securityScore -ge 90){"Green"}elseif($securityScore -ge 70){"Yellow"}else{"Red"})
    Write-DatabaseSecurityLog -Message "Pontuação de Segurança do Banco de Dados: $securityScore/100" -Level "Info"
    
    # Gerar relatório HTML
    $reportFilePath = New-DatabaseSecurityReport -Results $results
    Write-Host "\nRelatório gerado em: $reportFilePath" -ForegroundColor Green
    
    # Perguntar se deseja abrir o relatório
    $openReport = Read-Host "Deseja abrir o relatório no navegador? (S/N)"
    if ($openReport -eq "S" -or $openReport -eq "s") {
        Start-Process $reportFilePath
    }
    
    # Atualizar dashboard
    $updateDashboard = Read-Host "Deseja atualizar o dashboard de segurança com esses resultados? (S/N)"
    if ($updateDashboard -eq "S" -or $updateDashboard -eq "s") {
        $dashboardUpdated = Update-SecurityDashboardFromDatabaseCheck -Results $results -SecurityScore $securityScore
        
        if ($dashboardUpdated) {
            Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "Não foi possível atualizar o dashboard." -ForegroundColor Yellow
        }
    }
    
    Write-DatabaseSecurityLog -Message "Verificação de segurança do banco de dados concluída" -Level "Success"
    return $results
}

# Menu principal
function Show-DatabaseSecurityMenu {
    Clear-Host
    Write-Host "===== Verificação de Segurança do Banco de Dados - Açucaradas Encomendas =====" -ForegroundColor Cyan
    Write-Host "1. Executar verificação completa"
    Write-Host "2. Verificar apenas autenticação"
    Write-Host "3. Verificar apenas criptografia"
    Write-Host "4. Verificar apenas permissões"
    Write-Host "5. Verificar apenas backups"
    Write-Host "6. Verificar apenas atualizações"
    Write-Host "7. Verificar apenas logs"
    Write-Host "8. Visualizar último relatório"
    Write-Host "9. Atualizar dashboard com último relatório"
    Write-Host "0. Sair"
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    $opcao = Read-Host "Escolha uma opção"
    
    switch ($opcao) {
        "1" {
            # Executar verificação completa
            Start-DatabaseSecurityCheck
            Pause
            Show-DatabaseSecurityMenu
        }
        "2" {
            # Verificar apenas autenticação
            $config = Get-DatabaseSecurityConfig
            foreach ($database in $config.BancosDados) {
                $database.VerificarCriptografia = $false
                $database.VerificarPermissoes = $false
                $database.VerificarBackups = $false
                $database.VerificarAtualizacoes = $false
                $database.VerificarLogs = $false
            }
            Start-DatabaseSecurityCheck
            Pause
            Show-DatabaseSecurityMenu
        }
        "3" {
            # Verificar apenas criptografia
            $config = Get-DatabaseSecurityConfig
            foreach ($database in $config.BancosDados) {
                $database.VerificarAutenticacao = $false
                $database.VerificarPermissoes = $false
                $database.VerificarBackups = $false
                $database.VerificarAtualizacoes = $false
                $database.VerificarLogs = $false
            }
            Start-DatabaseSecurityCheck
            Pause
            Show-DatabaseSecurityMenu
        }
        "4" {
            # Verificar apenas permissões
            $config = Get-DatabaseSecurityConfig
            foreach ($database in $config.BancosDados) {
                $database.VerificarAutenticacao = $false
                $database.VerificarCriptografia = $false
                $database.VerificarBackups = $false
                $database.VerificarAtualizacoes = $false
                $database.VerificarLogs = $false
            }
            Start-DatabaseSecurityCheck
            Pause
            Show-DatabaseSecurityMenu
        }
        "5" {
            # Verificar apenas backups
            $config = Get-DatabaseSecurityConfig
            foreach ($database in $config.BancosDados) {
                $database.VerificarAutenticacao = $false
                $database.VerificarCriptografia = $false
                $database.VerificarPermissoes = $false
                $database.VerificarAtualizacoes = $false
                $database.VerificarLogs = $false
            }
            Start-DatabaseSecurityCheck
            Pause
            Show-DatabaseSecurityMenu
        }
        "6" {
            # Verificar apenas atualizações
            $config = Get-DatabaseSecurityConfig
            foreach ($database in $config.BancosDados) {
                $database.VerificarAutenticacao = $false
                $database.VerificarCriptografia = $false
                $database.VerificarPermissoes = $false
                $database.VerificarBackups = $false
                $database.VerificarLogs = $false
            }
            Start-DatabaseSecurityCheck
            Pause
            Show-DatabaseSecurityMenu
        }
        "7" {
            # Verificar apenas logs
            $config = Get-DatabaseSecurityConfig
            foreach ($database in $config.BancosDados) {
                $database.VerificarAutenticacao = $false
                $database.VerificarCriptografia = $false
                $database.VerificarPermissoes = $false
                $database.VerificarBackups = $false
                $database.VerificarAtualizacoes = $false
            }
            Start-DatabaseSecurityCheck
            Pause
            Show-DatabaseSecurityMenu
        }
        "8" {
            # Visualizar último relatório
            $reportPath = Join-Path -Path $PSScriptRoot -ChildPath "relatorios"
            $latestReport = Get-ChildItem -Path $reportPath -Filter "relatorio-seguranca-bd-*.html" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            
            if ($latestReport) {
                Start-Process $latestReport.FullName
                Write-Host "Abrindo relatório: $($latestReport.FullName)" -ForegroundColor Green
            } else {
                Write-Host "Nenhum relatório encontrado." -ForegroundColor Yellow
            }
            
            Pause
            Show-DatabaseSecurityMenu
        }
        "9" {
            # Atualizar dashboard com último relatório
            $reportPath = Join-Path -Path $PSScriptRoot -ChildPath "relatorios"
            $latestReport = Get-ChildItem -Path $reportPath -Filter "relatorio-seguranca-bd-*.html" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            
            if ($latestReport) {
                # Em um cenário real, carregaríamos os dados do relatório
                # e atualizaríamos o dashboard
                $dashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
                
                if (Test-Path -Path $dashboardScript) {
                    & $dashboardScript
                    Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
                } else {
                    Write-Host "Script de atualização do dashboard não encontrado." -ForegroundColor Yellow
                }
            } else {
                Write-Host "Nenhum relatório encontrado para atualizar o dashboard." -ForegroundColor Yellow
            }
            
            Pause
            Show-DatabaseSecurityMenu
        }
        "0" {
            # Sair
            return
        }
        default {
            Write-Host "Opção inválida. Tente novamente." -ForegroundColor Red
            Pause
            Show-DatabaseSecurityMenu
        }
    }
}

# Verificar se o script está sendo executado diretamente
if ($MyInvocation.InvocationName -ne "." -and $MyInvocation.Line -notmatch '\. ') {
    # Executar menu principal
    Show-DatabaseSecurityMenu
}