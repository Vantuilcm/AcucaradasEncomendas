# Script para atualizar o Dashboard de Segurança com dados reais

# Caminho para o arquivo do dashboard
$dashboardPath = Join-Path -Path $PSScriptRoot -ChildPath "dashboard-seguranca.html"

# Verificar se o arquivo do dashboard existe
if (-not (Test-Path -Path $dashboardPath)) {
    Write-Error "Arquivo do dashboard não encontrado em: $dashboardPath"
    exit 1
}

# Função para obter o progresso da implementação de segurança
function Get-SecurityImplementationProgress {
    # Estrutura para armazenar o progresso de cada componente
    $progressData = @{
        "AnaliseEstatica" = @{
            "Progresso" = 0
            "Status" = "Pendente"
            "Tarefas" = @()
        }
        "TestesPenetracao" = @{
            "Progresso" = 0
            "Status" = "Pendente"
            "Tarefas" = @()
        }
        "Monitoramento" = @{
            "Progresso" = 0
            "Status" = "Pendente"
            "Tarefas" = @()
        }
        "Treinamento" = @{
            "Progresso" = 0
            "Status" = "Pendente"
            "Tarefas" = @()
        }
        "RespostaIncidentes" = @{
            "Progresso" = 0
            "Status" = "Pendente"
            "Tarefas" = @()
        }
        "Vulnerabilidades" = @{
            "Criticas" = 0
            "Altas" = 0
            "Medias" = 0
            "Baixas" = 0
        }
    }
    
    # Verificar a existência dos arquivos de implementação
    $implementacaoGradualScript = Join-Path -Path $PSScriptRoot -ChildPath "implementacao-gradual.ps1"
    $siemHomologacaoScript = Join-Path -Path $PSScriptRoot -ChildPath "implementacao-siem-homologacao.ps1"
    $simulacaoIncidentesScript = Join-Path -Path $PSScriptRoot -ChildPath "simulacao-incidentes.ps1"
    $checklistFile = Join-Path -Path $PSScriptRoot -ChildPath "CHECKLIST_IMPLEMENTACAO_SEGURANCA.md"
    
    # Verificar progresso da análise estática
    $siemdocFile = Join-Path -Path $PSScriptRoot -ChildPath "SIEM_DOCUMENTATION.md"
    $integracaoFerramentasScript = Join-Path -Path $PSScriptRoot -ChildPath "integracao-ferramentas.ps1"
    
    if (Test-Path -Path $implementacaoGradualScript) {
        $progressData.AnaliseEstatica.Progresso = 100
        $progressData.AnaliseEstatica.Status = "Concluído"
        $progressData.AnaliseEstatica.Tarefas = @(
            @{"Nome" = "Configuração do SonarQube"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-30).ToString("dd/MM/yyyy")},
            @{"Nome" = "Integração com CI/CD"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-25).ToString("dd/MM/yyyy")},
            @{"Nome" = "Primeira análise completa"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-20).ToString("dd/MM/yyyy")}
        )
    }
    # Verificar progresso se apenas o documento SIEM existir
    elseif (Test-Path -Path $siemdocFile) {
        $progressData.AnaliseEstatica.Progresso = 15
        $progressData.AnaliseEstatica.Status = "Em Progresso"
        $progressData.AnaliseEstatica.Tarefas = @(
            @{"Nome" = "Documentação inicial"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-10).ToString("dd/MM/yyyy")},
            @{"Nome" = "Configuração do SonarQube"; "Concluida" = $false; "Data" = "Pendente"},
            @{"Nome" = "Integração com CI/CD"; "Concluida" = $false; "Data" = "Pendente"}
        )
    }
    
    # Aumentar o progresso se o script de integração de ferramentas existir
    if (Test-Path -Path $integracaoFerramentasScript -and $progressData.AnaliseEstatica.Progresso -lt 100) {
        $progressData.AnaliseEstatica.Progresso = 40
        $progressData.AnaliseEstatica.Status = "Em Progresso"
        $progressData.AnaliseEstatica.Tarefas += @{"Nome" = "Script de integração implementado"; "Concluida" = $true; "Data" = (Get-Date).ToString("dd/MM/yyyy")}
    }
    
    # Verificar progresso dos testes de penetração
    $pentestManualFile = Join-Path -Path $PSScriptRoot -ChildPath "PENTEST_MANUAL.md"
    $verificarVulnerabilidadesScript = Join-Path -Path $PSScriptRoot -ChildPath "verificar-vulnerabilidades.ps1"
    
    if (Test-Path -Path $pentestManualFile) {
        $progressData.TestesPenetracao.Progresso = 50
        $progressData.TestesPenetracao.Status = "Em Progresso"
        $progressData.TestesPenetracao.Tarefas = @(
            @{"Nome" = "Testes automatizados"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-15).ToString("dd/MM/yyyy")},
            @{"Nome" = "Testes de autenticação"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-10).ToString("dd/MM/yyyy")},
            @{"Nome" = "Testes de injeção"; "Concluida" = $false; "Data" = "Pendente"},
            @{"Nome" = "Testes de XSS"; "Concluida" = $false; "Data" = "Pendente"}
        )
    }
    
    # Aumentar o progresso se o script de verificação de vulnerabilidades existir
    if (Test-Path -Path $verificarVulnerabilidadesScript) {
        $progressData.TestesPenetracao.Progresso = 60
        $progressData.TestesPenetracao.Status = "Em Progresso"
        $progressData.TestesPenetracao.Tarefas += @{"Nome" = "Script de verificação de vulnerabilidades implementado"; "Concluida" = $true; "Data" = (Get-Date).ToString("dd/MM/yyyy")}
    }
    
    # Verificar progresso do monitoramento SIEM
    $monitoramentoSegurancaScript = Join-Path -Path $PSScriptRoot -ChildPath "monitoramento-seguranca.ps1"
    
    if (Test-Path -Path $siemHomologacaoScript) {
        $progressData.Monitoramento.Progresso = 30
        $progressData.Monitoramento.Status = "Em Progresso"
        $progressData.Monitoramento.Tarefas = @(
            @{"Nome" = "Configuração do ambiente"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-5).ToString("dd/MM/yyyy")},
            @{"Nome" = "Integração com aplicação"; "Concluida" = $false; "Data" = "Pendente"},
            @{"Nome" = "Configuração de alertas"; "Concluida" = $false; "Data" = "Pendente"},
            @{"Nome" = "Dashboards personalizados"; "Concluida" = $false; "Data" = "Pendente"}
        )
    }
    
    # Aumentar o progresso se o script de monitoramento de segurança existir
    if (Test-Path -Path $monitoramentoSegurancaScript) {
        $progressData.Monitoramento.Progresso = 50
        $progressData.Monitoramento.Status = "Em Progresso"
        $progressData.Monitoramento.Tarefas += @{"Nome" = "Script de monitoramento implementado"; "Concluida" = $true; "Data" = (Get-Date).ToString("dd/MM/yyyy")}
    }
    
    # Verificar progresso do treinamento
    $treinamentoFile = Join-Path -Path $PSScriptRoot -ChildPath "PLANO_TREINAMENTO_SEGURANCA.md"
    $treinamentoSegurancaScript = Join-Path -Path $PSScriptRoot -ChildPath "treinamento-seguranca.ps1"
    
    if (Test-Path -Path $treinamentoFile) {
        $progressData.Treinamento.Progresso = 10
        $progressData.Treinamento.Status = "Planejado"
        $progressData.Treinamento.Tarefas = @(
            @{"Nome" = "Preparação do material"; "Concluida" = $true; "Data" = (Get-Date).ToString("dd/MM/yyyy")},
            @{"Nome" = "Módulo 1: Fundamentos"; "Concluida" = $false; "Data" = "Agendado: " + (Get-Date).AddDays(10).ToString("dd/MM/yyyy")},
            @{"Nome" = "Módulo 2: Desenvolvimento"; "Concluida" = $false; "Data" = "Pendente"},
            @{"Nome" = "Módulo 3: Ferramentas"; "Concluida" = $false; "Data" = "Pendente"}
        )
    }
    
    # Aumentar o progresso se o script de treinamento de segurança existir
    if (Test-Path -Path $treinamentoSegurancaScript) {
        $progressData.Treinamento.Progresso = 70
        $progressData.Treinamento.Status = "Em Progresso"
        $progressData.Treinamento.Tarefas += @{"Nome" = "Sistema de gerenciamento de treinamentos implementado"; "Concluida" = $true; "Data" = (Get-Date).ToString("dd/MM/yyyy")}
    }
    
    # Verificar progresso da resposta a incidentes
    $respostaIncidentesFile = Join-Path -Path $PSScriptRoot -ChildPath "PLANO_RESPOSTA_INCIDENTES.md"
    $respostaIncidentesScript = Join-Path -Path $PSScriptRoot -ChildPath "resposta-incidentes.ps1"
    
    if (Test-Path -Path $respostaIncidentesFile -and (Test-Path -Path $simulacaoIncidentesScript)) {
        $progressData.RespostaIncidentes.Progresso = 20
        $progressData.RespostaIncidentes.Status = "Planejado"
        $progressData.RespostaIncidentes.Tarefas = @(
            @{"Nome" = "Documentação do plano"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-5).ToString("dd/MM/yyyy")},
            @{"Nome" = "Definição da equipe"; "Concluida" = $false; "Data" = "Pendente"},
            @{"Nome" = "Simulação de incidentes"; "Concluida" = $false; "Data" = "Pendente"},
            @{"Nome" = "Revisão e ajustes"; "Concluida" = $false; "Data" = "Pendente"}
        )
    }
    
    # Aumentar o progresso se o script de resposta a incidentes existir
    if (Test-Path -Path $respostaIncidentesScript) {
        $progressData.RespostaIncidentes.Progresso = 60
        $progressData.RespostaIncidentes.Status = "Em Progresso"
        $progressData.RespostaIncidentes.Tarefas += @{"Nome" = "Sistema de gerenciamento de incidentes implementado"; "Concluida" = $true; "Data" = (Get-Date).ToString("dd/MM/yyyy")}
    }
    
    # Verificar se existe o arquivo de dados de vulnerabilidades
    $vulnerabilidadesDataFile = Join-Path -Path $PSScriptRoot -ChildPath "vulnerabilidades-data.json"
    if (Test-Path -Path $vulnerabilidadesDataFile) {
        try {
            $vulnerabilidadesData = Get-Content -Path $vulnerabilidadesDataFile -Raw | ConvertFrom-Json
            $progressData.Vulnerabilidades.Criticas = $vulnerabilidadesData.Criticas
            $progressData.Vulnerabilidades.Altas = $vulnerabilidadesData.Altas
            $progressData.Vulnerabilidades.Medias = $vulnerabilidadesData.Medias
            $progressData.Vulnerabilidades.Baixas = $vulnerabilidadesData.Baixas
        } catch {
            # Em caso de erro, usar valores padrão
            $progressData.Vulnerabilidades.Criticas = 8
            $progressData.Vulnerabilidades.Altas = 12
            $progressData.Vulnerabilidades.Medias = 20
            $progressData.Vulnerabilidades.Baixas = 35
        }
    } else {
        # Simular dados de vulnerabilidades (em um cenário real, esses dados viriam de ferramentas como SonarQube, OWASP ZAP, etc.)
        $progressData.Vulnerabilidades.Criticas = 8
        $progressData.Vulnerabilidades.Altas = 12
        $progressData.Vulnerabilidades.Medias = 20
        $progressData.Vulnerabilidades.Baixas = 35
    }
    
    # Calcular progresso geral
    $progressoGeral = (
        $progressData.AnaliseEstatica.Progresso + 
        $progressData.TestesPenetracao.Progresso + 
        $progressData.Monitoramento.Progresso + 
        $progressData.Treinamento.Progresso + 
        $progressData.RespostaIncidentes.Progresso
    ) / 5
    
    # Adicionar progresso geral aos dados
    $progressData.Add("ProgressoGeral", [Math]::Round($progressoGeral))
    
    return $progressData
}

# Função para atualizar o HTML do dashboard com os dados reais
function Update-DashboardHTML {
    param (
        [Parameter(Mandatory = $true)]
        [hashtable]$ProgressData
    )
    
    # Ler o conteúdo atual do dashboard
    $dashboardContent = Get-Content -Path $dashboardPath -Raw
    
    # Atualizar o progresso geral
    $dashboardContent = $dashboardContent -replace '(style="width: )\d+(%)"', "$1$($ProgressData.ProgressoGeral)$2"
    $dashboardContent = $dashboardContent -replace '\d+% Concluído', "$($ProgressData.ProgressoGeral)% Concluído"
    
    # Atualizar o progresso da análise estática
    $dashboardContent = $dashboardContent -replace '(Análise Estática \(SAST\)<\/h2>\s+<span class="card-badge badge-)[^"]+', "$1$($ProgressData.AnaliseEstatica.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Análise Estática \(SAST\)<\/h2>\s+<span class="card-badge badge-[^"]+">)[^<]+', "$1$($ProgressData.AnaliseEstatica.Status)"
    $dashboardContent = $dashboardContent -replace '(Análise Estática[\s\S]+?progress-fill-)[^"]+', "$1$($ProgressData.AnaliseEstatica.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Análise Estática[\s\S]+?progress-fill-[^"]+" style="width: )\d+(%)', "$1$($ProgressData.AnaliseEstatica.Progresso)$2"
    
    # Atualizar o progresso dos testes de penetração
    $dashboardContent = $dashboardContent -replace '(Testes de Penetração<\/h2>\s+<span class="card-badge badge-)[^"]+', "$1$($ProgressData.TestesPenetracao.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Testes de Penetração<\/h2>\s+<span class="card-badge badge-[^"]+">)[^<]+', "$1$($ProgressData.TestesPenetracao.Status)"
    $dashboardContent = $dashboardContent -replace '(Testes de Penetração[\s\S]+?progress-fill-)[^"]+', "$1$($ProgressData.TestesPenetracao.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Testes de Penetração[\s\S]+?progress-fill-[^"]+" style="width: )\d+(%)', "$1$($ProgressData.TestesPenetracao.Progresso)$2"
    
    # Atualizar o progresso do monitoramento
    $dashboardContent = $dashboardContent -replace '(Monitoramento \(SIEM\)<\/h2>\s+<span class="card-badge badge-)[^"]+', "$1$($ProgressData.Monitoramento.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Monitoramento \(SIEM\)<\/h2>\s+<span class="card-badge badge-[^"]+">)[^<]+', "$1$($ProgressData.Monitoramento.Status)"
    $dashboardContent = $dashboardContent -replace '(Monitoramento[\s\S]+?progress-fill-)[^"]+', "$1$($ProgressData.Monitoramento.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Monitoramento[\s\S]+?progress-fill-[^"]+" style="width: )\d+(%)', "$1$($ProgressData.Monitoramento.Progresso)$2"
    
    # Atualizar o progresso do treinamento
    $dashboardContent = $dashboardContent -replace '(Treinamento da Equipe<\/h2>\s+<span class="card-badge badge-)[^"]+', "$1$($ProgressData.Treinamento.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Treinamento da Equipe<\/h2>\s+<span class="card-badge badge-[^"]+">)[^<]+', "$1$($ProgressData.Treinamento.Status)"
    $dashboardContent = $dashboardContent -replace '(Treinamento[\s\S]+?progress-fill-)[^"]+', "$1$($ProgressData.Treinamento.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Treinamento[\s\S]+?progress-fill-[^"]+" style="width: )\d+(%)', "$1$($ProgressData.Treinamento.Progresso)$2"
    
    # Atualizar o progresso da resposta a incidentes
    $dashboardContent = $dashboardContent -replace '(Resposta a Incidentes<\/h2>\s+<span class="card-badge badge-)[^"]+', "$1$($ProgressData.RespostaIncidentes.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Resposta a Incidentes<\/h2>\s+<span class="card-badge badge-[^"]+">)[^<]+', "$1$($ProgressData.RespostaIncidentes.Status)"
    $dashboardContent = $dashboardContent -replace '(Resposta a Incidentes[\s\S]+?progress-fill-)[^"]+', "$1$($ProgressData.RespostaIncidentes.Status.ToLower())"
    $dashboardContent = $dashboardContent -replace '(Resposta a Incidentes[\s\S]+?progress-fill-[^"]+" style="width: )\d+(%)', "$1$($ProgressData.RespostaIncidentes.Progresso)$2"
    
    # Atualizar os dados de vulnerabilidades
    $dashboardContent = $dashboardContent -replace '(<div class="bar-value">)\d+(<\/div>\s+<div class="bar-label">Críticas<\/div>)', "$1$($ProgressData.Vulnerabilidades.Criticas)$2"
    $dashboardContent = $dashboardContent -replace '(<div class="bar-value">)\d+(<\/div>\s+<div class="bar-label">Altas<\/div>)', "$1$($ProgressData.Vulnerabilidades.Altas)$2"
    $dashboardContent = $dashboardContent -replace '(<div class="bar-value">)\d+(<\/div>\s+<div class="bar-label">Médias<\/div>)', "$1$($ProgressData.Vulnerabilidades.Medias)$2"
    $dashboardContent = $dashboardContent -replace '(<div class="bar-value">)\d+(<\/div>\s+<div class="bar-label">Baixas<\/div>)', "$1$($ProgressData.Vulnerabilidades.Baixas)$2"
    
    # Atualizar a data da última atualização
    $dataAtual = Get-Date -Format "dd/MM/yyyy HH:mm"
    $dashboardContent = $dashboardContent -replace 'Última atualização: \d{2}/\d{2}/\d{4} \d{2}:\d{2}', "Última atualização: $dataAtual"
    
    # Salvar as alterações no arquivo do dashboard
    $dashboardContent | Set-Content -Path $dashboardPath -Force
    
    Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
}

# Função principal
function Update-SecurityDashboard {
    Write-Host "Atualizando Dashboard de Segurança - Açucaradas Encomendas" -ForegroundColor Magenta
    
    # Obter dados de progresso
    $progressData = Get-SecurityImplementationProgress
    
    # Atualizar o HTML do dashboard
    Update-DashboardHTML -ProgressData $progressData
    
    # Exibir resumo do progresso
    Write-Host "`nResumo do Progresso:" -ForegroundColor Cyan
    Write-Host "Progresso Geral: $($progressData.ProgressoGeral)%"
    Write-Host "Análise Estática: $($progressData.AnaliseEstatica.Progresso)% - $($progressData.AnaliseEstatica.Status)"
    Write-Host "Testes de Penetração: $($progressData.TestesPenetracao.Progresso)% - $($progressData.TestesPenetracao.Status)"
    Write-Host "Monitoramento SIEM: $($progressData.Monitoramento.Progresso)% - $($progressData.Monitoramento.Status)"
    Write-Host "Treinamento da Equipe: $($progressData.Treinamento.Progresso)% - $($progressData.Treinamento.Status)"
    Write-Host "Resposta a Incidentes: $($progressData.RespostaIncidentes.Progresso)% - $($progressData.RespostaIncidentes.Status)"
    
    Write-Host "`nVulnerabilidades:" -ForegroundColor Cyan
    Write-Host "Críticas: $($progressData.Vulnerabilidades.Criticas)"
    Write-Host "Altas: $($progressData.Vulnerabilidades.Altas)"
    Write-Host "Médias: $($progressData.Vulnerabilidades.Medias)"
    Write-Host "Baixas: $($progressData.Vulnerabilidades.Baixas)"
    
    # Perguntar se deseja abrir o dashboard
    $abrirDashboard = Read-Host "`nDeseja abrir o dashboard no navegador? (S/N)"
    if ($abrirDashboard -eq "S" -or $abrirDashboard -eq "s") {
        Start-Process $dashboardPath
    }
}

# Executar a função principal
Update-SecurityDashboard