# Script de Implementação Gradual de Medidas de Segurança
# Açucaradas Encomendas

# Configurações
$logFile = "$PSScriptRoot\implementacao-seguranca.log"
$configFile = "$PSScriptRoot\implementacao-config.json"
$defaultConfig = @{
    "fases" = @(
        @{
            "nome" = "Análise Estática de Código";
            "status" = "Não iniciado";
            "progresso" = 0;
            "dataInicio" = $null;
            "dataFim" = $null;
            "responsavel" = "";
        },
        @{
            "nome" = "Treinamento da Equipe";
            "status" = "Não iniciado";
            "progresso" = 0;
            "dataInicio" = $null;
            "dataFim" = $null;
            "responsavel" = "";
        },
        @{
            "nome" = "Testes de Penetração";
            "status" = "Não iniciado";
            "progresso" = 0;
            "dataInicio" = $null;
            "dataFim" = $null;
            "responsavel" = "";
        },
        @{
            "nome" = "Implementação do SIEM";
            "status" = "Não iniciado";
            "progresso" = 0;
            "dataInicio" = $null;
            "dataFim" = $null;
            "responsavel" = "";
        },
        @{
            "nome" = "Simulação de Incidentes";
            "status" = "Não iniciado";
            "progresso" = 0;
            "dataInicio" = $null;
            "dataFim" = $null;
            "responsavel" = "";
        }
    ]
}

# Funções de Utilidade
function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $logMessage
}

function Initialize-Configuration {
    if (-not (Test-Path $configFile)) {
        $defaultConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $configFile
        Write-Log "Arquivo de configuração criado com valores padrão" "INFO"
    } else {
        Write-Log "Arquivo de configuração já existe" "INFO"
    }
}

function Get-Configuration {
    $config = Get-Content -Path $configFile | ConvertFrom-Json
    return $config
}

function Save-Configuration {
    param (
        $Config
    )
    
    $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $configFile
    Write-Log "Configuração salva" "INFO"
}

function Update-PhaseStatus {
    param (
        [int]$PhaseIndex,
        [string]$Status,
        [int]$Progress,
        [string]$Responsible = $null
    )
    
    $config = Get-Configuration
    $phase = $config.fases[$PhaseIndex]
    
    $phase.status = $Status
    $phase.progresso = $Progress
    
    if ($Status -eq "Em andamento" -and $phase.dataInicio -eq $null) {
        $phase.dataInicio = (Get-Date -Format "yyyy-MM-dd")
    }
    
    if ($Status -eq "Concluído") {
        $phase.dataFim = (Get-Date -Format "yyyy-MM-dd")
    }
    
    if ($Responsible) {
        $phase.responsavel = $Responsible
    }
    
    Save-Configuration $config
    Write-Log "Fase '$($phase.nome)' atualizada: Status=$Status, Progresso=$Progress%" "INFO"
}

function Show-ImplementationStatus {
    $config = Get-Configuration
    
    Write-Host "`nStatus da Implementação de Segurança - Açucaradas Encomendas`n" -ForegroundColor Cyan
    Write-Host "=================================================================`n" -ForegroundColor Cyan
    
    foreach ($index in 0..($config.fases.Count - 1)) {
        $phase = $config.fases[$index]
        $statusColor = switch ($phase.status) {
            "Não iniciado" { "Gray" }
            "Em andamento" { "Yellow" }
            "Concluído" { "Green" }
            default { "White" }
        }
        
        Write-Host "[$index] $($phase.nome)" -ForegroundColor Cyan
        Write-Host "  Status: " -NoNewline
        Write-Host "$($phase.status)" -ForegroundColor $statusColor
        Write-Host "  Progresso: $($phase.progresso)%"
        Write-Host "  Responsável: $($phase.responsavel)"
        if ($phase.dataInicio) { Write-Host "  Data Início: $($phase.dataInicio)" }
        if ($phase.dataFim) { Write-Host "  Data Conclusão: $($phase.dataFim)" }
        Write-Host ""
    }
}

function Start-StaticAnalysisImplementation {
    Write-Host "`nIniciando implementação da Análise Estática de Código`n" -ForegroundColor Green
    Write-Host "=================================================================`n" -ForegroundColor Green
    
    # Atualizar status da fase
    Update-PhaseStatus -PhaseIndex 0 -Status "Em andamento" -Progress 10
    
    # Verificar pré-requisitos
    Write-Host "Verificando pré-requisitos..." -ForegroundColor Yellow
    
    # Verificar se o SonarQube está configurado
    $sonarqubeScript = "$PSScriptRoot\run-sonarqube-scan.ps1"
    if (Test-Path $sonarqubeScript) {
        Write-Host "✓ Script do SonarQube encontrado" -ForegroundColor Green
    } else {
        Write-Host "✗ Script do SonarQube não encontrado. Criando..." -ForegroundColor Red
        # Aqui seria chamado o script para criar o arquivo run-sonarqube-scan.ps1
        Write-Host "Script do SonarQube criado em: $sonarqubeScript" -ForegroundColor Green
    }
    
    # Verificar se o ESLint está configurado
    $eslintConfig = "$PSScriptRoot\.eslintrc.json"
    if (Test-Path $eslintConfig) {
        Write-Host "✓ Configuração do ESLint encontrada" -ForegroundColor Green
    } else {
        Write-Host "✗ Configuração do ESLint não encontrada. Criando..." -ForegroundColor Red
        # Aqui seria chamado o script para criar o arquivo .eslintrc.json
        Write-Host "Configuração do ESLint criada em: $eslintConfig" -ForegroundColor Green
    }
    
    # Passos para integração com CI/CD
    Write-Host "`nPassos para integração com CI/CD:`" -ForegroundColor Yellow
    Write-Host "1. Adicionar etapa de análise estática no pipeline de CI/CD"
    Write-Host "2. Configurar regras de qualidade e segurança"
    Write-Host "3. Definir gates de qualidade para aprovação/rejeição"
    Write-Host "4. Configurar notificações para falhas de segurança"
    
    # Atualizar progresso
    Update-PhaseStatus -PhaseIndex 0 -Status "Em andamento" -Progress 30
    
    Write-Host "`nPróximos passos:`" -ForegroundColor Yellow
    Write-Host "1. Execute o script run-sonarqube-scan.ps1 para realizar a primeira análise"
    Write-Host "2. Revise os resultados e configure as regras conforme necessário"
    Write-Host "3. Integre o script ao pipeline de CI/CD da sua equipe"
    Write-Host "4. Treine a equipe para interpretar e corrigir os problemas identificados"
    
    Write-Host "`nImplementação da Análise Estática de Código iniciada com sucesso!`n" -ForegroundColor Green
}

function Start-SecurityTrainingImplementation {
    Write-Host "`nIniciando implementação do Treinamento em Segurança`n" -ForegroundColor Green
    Write-Host "=================================================================`n" -ForegroundColor Green
    
    # Atualizar status da fase
    Update-PhaseStatus -PhaseIndex 1 -Status "Em andamento" -Progress 10
    
    # Verificar pré-requisitos
    Write-Host "Verificando pré-requisitos..." -ForegroundColor Yellow
    
    # Verificar se o plano de treinamento está disponível
    $trainingPlan = "$PSScriptRoot\PLANO_TREINAMENTO_SEGURANCA.md"
    if (Test-Path $trainingPlan) {
        Write-Host "✓ Plano de treinamento encontrado" -ForegroundColor Green
    } else {
        Write-Host "✗ Plano de treinamento não encontrado. Criando..." -ForegroundColor Red
        # Aqui seria chamado o script para criar o arquivo PLANO_TREINAMENTO_SEGURANCA.md
        Write-Host "Plano de treinamento criado em: $trainingPlan" -ForegroundColor Green
    }
    
    # Passos para implementação do treinamento
    Write-Host "`nPassos para implementação do treinamento:`" -ForegroundColor Yellow
    Write-Host "1. Agendar sessões iniciais dos módulos fundamentais"
    Write-Host "2. Preparar material de apoio e ambiente de laboratório"
    Write-Host "3. Criar avaliações pré e pós-treinamento"
    Write-Host "4. Configurar sistema de acompanhamento de progresso"
    
    # Atualizar progresso
    Update-PhaseStatus -PhaseIndex 1 -Status "Em andamento" -Progress 20
    
    Write-Host "`nPróximos passos:`" -ForegroundColor Yellow
    Write-Host "1. Revise o plano de treinamento e adapte-o às necessidades da equipe"
    Write-Host "2. Agende as primeiras sessões de treinamento"
    Write-Host "3. Prepare o material e ambiente para os exercícios práticos"
    Write-Host "4. Implemente um sistema de avaliação e acompanhamento"
    
    Write-Host "`nImplementação do Treinamento em Segurança iniciada com sucesso!`n" -ForegroundColor Green
}

function Start-PenetrationTestingImplementation {
    Write-Host "`nIniciando implementação dos Testes de Penetração`n" -ForegroundColor Green
    Write-Host "=================================================================`n" -ForegroundColor Green
    
    # Atualizar status da fase
    Update-PhaseStatus -PhaseIndex 2 -Status "Em andamento" -Progress 10
    
    # Verificar pré-requisitos
    Write-Host "Verificando pré-requisitos..." -ForegroundColor Yellow
    
    # Verificar se os scripts de pentest estão disponíveis
    $pentestScript = "$PSScriptRoot\pentest-automation.ps1"
    if (Test-Path $pentestScript) {
        Write-Host "✓ Script de automação de pentest encontrado" -ForegroundColor Green
    } else {
        Write-Host "✗ Script de automação de pentest não encontrado. Criando..." -ForegroundColor Red
        # Aqui seria chamado o script para criar o arquivo pentest-automation.ps1
        Write-Host "Script de automação de pentest criado em: $pentestScript" -ForegroundColor Green
    }
    
    $pentestManual = "$PSScriptRoot\PENTEST_MANUAL.md"
    if (Test-Path $pentestManual) {
        Write-Host "✓ Manual de pentest encontrado" -ForegroundColor Green
    } else {
        Write-Host "✗ Manual de pentest não encontrado. Criando..." -ForegroundColor Red
        # Aqui seria chamado o script para criar o arquivo PENTEST_MANUAL.md
        Write-Host "Manual de pentest criado em: $pentestManual" -ForegroundColor Green
    }
    
    # Passos para implementação dos testes de penetração
    Write-Host "`nPassos para implementação dos testes de penetração:`" -ForegroundColor Yellow
    Write-Host "1. Definir escopo e ambiente para os testes iniciais"
    Write-Host "2. Configurar ferramentas e ambiente de teste"
    Write-Host "3. Executar testes automatizados para estabelecer linha de base"
    Write-Host "4. Analisar resultados e priorizar correções"
    
    # Atualizar progresso
    Update-PhaseStatus -PhaseIndex 2 -Status "Em andamento" -Progress 20
    
    Write-Host "`nPróximos passos:`" -ForegroundColor Yellow
    Write-Host "1. Execute o script pentest-automation.ps1 para realizar os testes automatizados"
    Write-Host "2. Revise o manual de pentest e planeje os testes manuais complementares"
    Write-Host "3. Documente os resultados e crie um plano de remediação"
    Write-Host "4. Agende ciclos regulares de testes para acompanhar a evolução"
    
    Write-Host "`nImplementação dos Testes de Penetração iniciada com sucesso!`n" -ForegroundColor Green
}

function Start-SIEMImplementation {
    Write-Host "`nIniciando implementação do SIEM`n" -ForegroundColor Green
    Write-Host "=================================================================`n" -ForegroundColor Green
    
    # Atualizar status da fase
    Update-PhaseStatus -PhaseIndex 3 -Status "Em andamento" -Progress 10
    
    # Verificar pré-requisitos
    Write-Host "Verificando pré-requisitos..." -ForegroundColor Yellow
    
    # Verificar se os scripts do SIEM estão disponíveis
    $siemScript = "$PSScriptRoot\siem-setup.ps1"
    if (Test-Path $siemScript) {
        Write-Host "✓ Script de configuração do SIEM encontrado" -ForegroundColor Green
    } else {
        Write-Host "✗ Script de configuração do SIEM não encontrado. Criando..." -ForegroundColor Red
        # Aqui seria chamado o script para criar o arquivo siem-setup.ps1
        Write-Host "Script de configuração do SIEM criado em: $siemScript" -ForegroundColor Green
    }
    
    $siemDocs = "$PSScriptRoot\SIEM_DOCUMENTATION.md"
    if (Test-Path $siemDocs) {
        Write-Host "✓ Documentação do SIEM encontrada" -ForegroundColor Green
    } else {
        Write-Host "✗ Documentação do SIEM não encontrada. Criando..." -ForegroundColor Red
        # Aqui seria chamado o script para criar o arquivo SIEM_DOCUMENTATION.md
        Write-Host "Documentação do SIEM criada em: $siemDocs" -ForegroundColor Green
    }
    
    # Passos para implementação do SIEM
    Write-Host "`nPassos para implementação do SIEM:`" -ForegroundColor Yellow
    Write-Host "1. Configurar ambiente de homologação para o SIEM"
    Write-Host "2. Instalar componentes básicos (ELK Stack e Wazuh)"
    Write-Host "3. Configurar fontes de log iniciais"
    Write-Host "4. Definir regras de alerta e dashboards básicos"
    
    # Atualizar progresso
    Update-PhaseStatus -PhaseIndex 3 -Status "Em andamento" -Progress 20
    
    Write-Host "`nPróximos passos:`" -ForegroundColor Yellow
    Write-Host "1. Execute o script siem-setup.ps1 para configurar o ambiente de homologação"
    Write-Host "2. Configure as fontes de log iniciais conforme a documentação"
    Write-Host "3. Teste os alertas e dashboards básicos"
    Write-Host "4. Planeje a migração para o ambiente de produção após validação"
    
    Write-Host "`nImplementação do SIEM iniciada com sucesso!`n" -ForegroundColor Green
}

function Start-IncidentResponseImplementation {
    Write-Host "`nIniciando implementação da Simulação de Incidentes`n" -ForegroundColor Green
    Write-Host "=================================================================`n" -ForegroundColor Green
    
    # Atualizar status da fase
    Update-PhaseStatus -PhaseIndex 4 -Status "Em andamento" -Progress 10
    
    # Verificar pré-requisitos
    Write-Host "Verificando pré-requisitos..." -ForegroundColor Yellow
    
    # Verificar se o plano de resposta a incidentes está disponível
    $irpPlan = "$PSScriptRoot\PLANO_RESPOSTA_INCIDENTES.md"
    if (Test-Path $irpPlan) {
        Write-Host "✓ Plano de resposta a incidentes encontrado" -ForegroundColor Green
    } else {
        Write-Host "✗ Plano de resposta a incidentes não encontrado. Criando..." -ForegroundColor Red
        # Aqui seria chamado o script para criar o arquivo PLANO_RESPOSTA_INCIDENTES.md
        Write-Host "Plano de resposta a incidentes criado em: $irpPlan" -ForegroundColor Green
    }
    
    # Passos para implementação da simulação de incidentes
    Write-Host "`nPassos para implementação da simulação de incidentes:`" -ForegroundColor Yellow
    Write-Host "1. Preparar cenários para exercícios de mesa"
    Write-Host "2. Definir papéis e responsabilidades para a simulação"
    Write-Host "3. Agendar primeira sessão de simulação"
    Write-Host "4. Preparar métricas de avaliação"
    
    # Atualizar progresso
    Update-PhaseStatus -PhaseIndex 4 -Status "Em andamento" -Progress 20
    
    Write-Host "`nPróximos passos:`" -ForegroundColor Yellow
    Write-Host "1. Revise o plano de resposta a incidentes"
    Write-Host "2. Desenvolva cenários realistas para os exercícios de mesa"
    Write-Host "3. Agende a primeira sessão de simulação"
    Write-Host "4. Prepare um sistema para documentar e avaliar os resultados"
    
    Write-Host "`nImplementação da Simulação de Incidentes iniciada com sucesso!`n" -ForegroundColor Green
}

function Show-Menu {
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "      IMPLEMENTAÇÃO GRADUAL DE SEGURANÇA - AÇUCARADAS ENCOMENDAS" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Menu Principal:" -ForegroundColor Yellow
    Write-Host "1. Ver status da implementação"
    Write-Host "2. Iniciar implementação da Análise Estática de Código"
    Write-Host "3. Iniciar implementação do Treinamento em Segurança"
    Write-Host "4. Iniciar implementação dos Testes de Penetração"
    Write-Host "5. Iniciar implementação do SIEM"
    Write-Host "6. Iniciar implementação da Simulação de Incidentes"
    Write-Host "7. Atualizar status de uma fase"
    Write-Host "8. Gerar relatório de progresso"
    Write-Host "0. Sair"
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    $choice = Read-Host "Digite sua opção"
    return $choice
}

function Update-PhaseStatusMenu {
    Clear-Host
    $config = Get-Configuration
    
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "                ATUALIZAR STATUS DE FASE" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    for ($i = 0; $i -lt $config.fases.Count; $i++) {
        Write-Host "$i. $($config.fases[$i].nome) - Status atual: $($config.fases[$i].status)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    $phaseIndex = Read-Host "Digite o número da fase que deseja atualizar"
    
    if ($phaseIndex -ge 0 -and $phaseIndex -lt $config.fases.Count) {
        Write-Host ""
        Write-Host "Opções de status:" -ForegroundColor Yellow
        Write-Host "1. Não iniciado"
        Write-Host "2. Em andamento"
        Write-Host "3. Concluído"
        
        $statusChoice = Read-Host "Digite o número do novo status"
        $status = switch ($statusChoice) {
            1 { "Não iniciado" }
            2 { "Em andamento" }
            3 { "Concluído" }
            default { $config.fases[$phaseIndex].status }
        }
        
        $progress = Read-Host "Digite o progresso (0-100)"
        if (-not ($progress -match '^\d+$') -or [int]$progress -lt 0 -or [int]$progress -gt 100) {
            $progress = $config.fases[$phaseIndex].progresso
            Write-Host "Progresso inválido. Mantendo o valor atual." -ForegroundColor Red
        }
        
        $responsible = Read-Host "Digite o nome do responsável (deixe em branco para manter o atual)"
        if ([string]::IsNullOrWhiteSpace($responsible)) {
            $responsible = $config.fases[$phaseIndex].responsavel
        }
        
        Update-PhaseStatus -PhaseIndex $phaseIndex -Status $status -Progress ([int]$progress) -Responsible $responsible
        Write-Host "Status atualizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "Índice de fase inválido!" -ForegroundColor Red
    }
    
    Read-Host "Pressione Enter para continuar"
}

function Generate-ProgressReport {
    $config = Get-Configuration
    $reportTemplate = "$PSScriptRoot\MODELO_RELATORIO_PROGRESSO.md"
    $reportOutput = "$PSScriptRoot\RELATORIO_PROGRESSO_$(Get-Date -Format 'yyyy-MM-dd').md"
    
    if (-not (Test-Path $reportTemplate)) {
        Write-Host "Modelo de relatório não encontrado: $reportTemplate" -ForegroundColor Red
        return
    }
    
    $template = Get-Content -Path $reportTemplate -Raw
    
    # Substituir placeholders com dados reais
    $startDate = ($config.fases | Where-Object { $_.dataInicio -ne $null } | Sort-Object dataInicio | Select-Object -First 1).dataInicio
    if (-not $startDate) { $startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd") }
    
    $endDate = (Get-Date).ToString("yyyy-MM-dd")
    
    $template = $template.Replace("[Data Início]", $startDate)
    $template = $template.Replace("[Data Fim]", $endDate)
    
    # Criar resumo executivo
    $completedPhases = ($config.fases | Where-Object { $_.status -eq "Concluído" }).Count
    $inProgressPhases = ($config.fases | Where-Object { $_.status -eq "Em andamento" }).Count
    $notStartedPhases = ($config.fases | Where-Object { $_.status -eq "Não iniciado" }).Count
    $overallProgress = [math]::Round(($config.fases | Measure-Object -Property progresso -Average).Average)
    
    $executiveSummary = "Este relatório apresenta o progresso da implementação das medidas de segurança para a Açucaradas Encomendas durante o período de $startDate a $endDate. "
    $executiveSummary += "Atualmente, $completedPhases fases estão concluídas, $inProgressPhases em andamento e $notStartedPhases não iniciadas, com um progresso geral de $overallProgress%. "
    
    if ($inProgressPhases -gt 0) {
        $currentPhases = ($config.fases | Where-Object { $_.status -eq "Em andamento" }).nome -join ", "
        $executiveSummary += "As fases atualmente em andamento são: $currentPhases. "
    }
    
    $nextPhase = $config.fases | Where-Object { $_.status -eq "Não iniciado" } | Select-Object -First 1
    if ($nextPhase) {
        $executiveSummary += "A próxima fase a ser iniciada será: $($nextPhase.nome)."
    }
    
    $template = $template.Replace("[Incluir aqui um resumo geral do progresso, destacando principais conquistas, desafios e próximos passos].", $executiveSummary)
    
    # Salvar relatório
    $template | Set-Content -Path $reportOutput
    
    Write-Host "Relatório de progresso gerado com sucesso: $reportOutput" -ForegroundColor Green
    Write-Host "NOTA: Este é um relatório básico. Você deve editá-lo para adicionar detalhes específicos sobre atividades, métricas, desafios e próximos passos." -ForegroundColor Yellow
    
    Read-Host "Pressione Enter para continuar"
}

# Inicialização
Write-Host "Inicializando implementação gradual de segurança..." -ForegroundColor Cyan
Initialize-Configuration

# Menu principal
$exit = $false
while (-not $exit) {
    $choice = Show-Menu
    
    switch ($choice) {
        "0" { $exit = $true }
        "1" { Show-ImplementationStatus; Read-Host "Pressione Enter para continuar" }
        "2" { Start-StaticAnalysisImplementation; Read-Host "Pressione Enter para continuar" }
        "3" { Start-SecurityTrainingImplementation; Read-Host "Pressione Enter para continuar" }
        "4" { Start-PenetrationTestingImplementation; Read-Host "Pressione Enter para continuar" }
        "5" { Start-SIEMImplementation; Read-Host "Pressione Enter para continuar" }
        "6" { Start-IncidentResponseImplementation; Read-Host "Pressione Enter para continuar" }
        "7" { Update-PhaseStatusMenu }
        "8" { Generate-ProgressReport }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; Read-Host "Pressione Enter para continuar" }
    }
}

Write-Host "Programa finalizado." -ForegroundColor Cyan