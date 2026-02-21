# Script para atualizar manualmente o progresso da implementação de segurança

# Caminho para o arquivo do dashboard
$dashboardPath = Join-Path -Path $PSScriptRoot -ChildPath "dashboard-seguranca.html"
$atualizarDashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"

# Verificar se os arquivos necessários existem
if (-not (Test-Path -Path $dashboardPath)) {
    Write-Error "Arquivo do dashboard não encontrado em: $dashboardPath"
    exit 1
}

if (-not (Test-Path -Path $atualizarDashboardScript)) {
    Write-Error "Script de atualização do dashboard não encontrado em: $atualizarDashboardScript"
    exit 1
}

# Função para criar ou atualizar o arquivo de configuração de progresso
function Update-ProgressConfig {
    param (
        [Parameter(Mandatory = $true)]
        [hashtable]$ProgressData
    )
    
    $configPath = Join-Path -Path $PSScriptRoot -ChildPath "progresso-seguranca.json"
    
    # Converter para JSON e salvar
    $ProgressData | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Force
    
    Write-Host "Configuração de progresso atualizada com sucesso!" -ForegroundColor Green
}

# Função para carregar a configuração de progresso existente
function Get-ProgressConfig {
    $configPath = Join-Path -Path $PSScriptRoot -ChildPath "progresso-seguranca.json"
    
    if (Test-Path -Path $configPath) {
        $config = Get-Content -Path $configPath -Raw | ConvertFrom-Json
        
        # Converter para hashtable
        $progressData = @{
            "AnaliseEstatica" = @{
                "Progresso" = $config.AnaliseEstatica.Progresso
                "Status" = $config.AnaliseEstatica.Status
                "Tarefas" = @()
            }
            "TestesPenetracao" = @{
                "Progresso" = $config.TestesPenetracao.Progresso
                "Status" = $config.TestesPenetracao.Status
                "Tarefas" = @()
            }
            "Monitoramento" = @{
                "Progresso" = $config.Monitoramento.Progresso
                "Status" = $config.Monitoramento.Status
                "Tarefas" = @()
            }
            "Treinamento" = @{
                "Progresso" = $config.Treinamento.Progresso
                "Status" = $config.Treinamento.Status
                "Tarefas" = @()
            }
            "RespostaIncidentes" = @{
                "Progresso" = $config.RespostaIncidentes.Progresso
                "Status" = $config.RespostaIncidentes.Status
                "Tarefas" = @()
            }
            "Vulnerabilidades" = @{
                "Criticas" = $config.Vulnerabilidades.Criticas
                "Altas" = $config.Vulnerabilidades.Altas
                "Medias" = $config.Vulnerabilidades.Medias
                "Baixas" = $config.Vulnerabilidades.Baixas
            }
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
    } else {
        # Criar uma configuração padrão
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
            "ProgressoGeral" = 0
        }
        
        return $progressData
    }
}

# Função para determinar o status com base no progresso
function Get-StatusFromProgress {
    param (
        [Parameter(Mandatory = $true)]
        [int]$Progresso
    )
    
    if ($Progresso -eq 0) {
        return "Pendente"
    } elseif ($Progresso -eq 100) {
        return "Concluído"
    } elseif ($Progresso -lt 30) {
        return "Planejado"
    } else {
        return "Em Progresso"
    }
}

# Função para atualizar o progresso manualmente
function Update-ManualProgress {
    Clear-Host
    Write-Host "=== Atualização Manual de Progresso - Açucaradas Encomendas ===" -ForegroundColor Magenta
    
    # Carregar configuração atual
    $progressData = Get-ProgressConfig
    
    # Exibir valores atuais
    Write-Host "\nValores Atuais:" -ForegroundColor Cyan
    Write-Host "1. Análise Estática (SAST): $($progressData.AnaliseEstatica.Progresso)% - $($progressData.AnaliseEstatica.Status)"
    Write-Host "2. Testes de Penetração: $($progressData.TestesPenetracao.Progresso)% - $($progressData.TestesPenetracao.Status)"
    Write-Host "3. Monitoramento SIEM: $($progressData.Monitoramento.Progresso)% - $($progressData.Monitoramento.Status)"
    Write-Host "4. Treinamento da Equipe: $($progressData.Treinamento.Progresso)% - $($progressData.Treinamento.Status)"
    Write-Host "5. Resposta a Incidentes: $($progressData.RespostaIncidentes.Progresso)% - $($progressData.RespostaIncidentes.Status)"
    Write-Host "6. Vulnerabilidades (Críticas, Altas, Médias, Baixas): $($progressData.Vulnerabilidades.Criticas), $($progressData.Vulnerabilidades.Altas), $($progressData.Vulnerabilidades.Medias), $($progressData.Vulnerabilidades.Baixas)"
    Write-Host "7. Progresso Geral: $($progressData.ProgressoGeral)%"
    
    # Menu de opções
    Write-Host "\nEscolha o componente para atualizar (1-6) ou 0 para sair:" -ForegroundColor Yellow
    $opcao = Read-Host "Opção"
    
    switch ($opcao) {
        "1" {
            $novoProgresso = Read-Host "Novo progresso para Análise Estática (0-100)"
            if ($novoProgresso -match '^\d+$' -and [int]$novoProgresso -ge 0 -and [int]$novoProgresso -le 100) {
                $progressData.AnaliseEstatica.Progresso = [int]$novoProgresso
                $progressData.AnaliseEstatica.Status = Get-StatusFromProgress -Progresso $novoProgresso
                Write-Host "Progresso da Análise Estática atualizado para $novoProgresso%" -ForegroundColor Green
            } else {
                Write-Host "Valor inválido. O progresso deve ser um número entre 0 e 100." -ForegroundColor Red
            }
        }
        "2" {
            $novoProgresso = Read-Host "Novo progresso para Testes de Penetração (0-100)"
            if ($novoProgresso -match '^\d+$' -and [int]$novoProgresso -ge 0 -and [int]$novoProgresso -le 100) {
                $progressData.TestesPenetracao.Progresso = [int]$novoProgresso
                $progressData.TestesPenetracao.Status = Get-StatusFromProgress -Progresso $novoProgresso
                Write-Host "Progresso dos Testes de Penetração atualizado para $novoProgresso%" -ForegroundColor Green
            } else {
                Write-Host "Valor inválido. O progresso deve ser um número entre 0 e 100." -ForegroundColor Red
            }
        }
        "3" {
            $novoProgresso = Read-Host "Novo progresso para Monitoramento SIEM (0-100)"
            if ($novoProgresso -match '^\d+$' -and [int]$novoProgresso -ge 0 -and [int]$novoProgresso -le 100) {
                $progressData.Monitoramento.Progresso = [int]$novoProgresso
                $progressData.Monitoramento.Status = Get-StatusFromProgress -Progresso $novoProgresso
                Write-Host "Progresso do Monitoramento SIEM atualizado para $novoProgresso%" -ForegroundColor Green
            } else {
                Write-Host "Valor inválido. O progresso deve ser um número entre 0 e 100." -ForegroundColor Red
            }
        }
        "4" {
            $novoProgresso = Read-Host "Novo progresso para Treinamento da Equipe (0-100)"
            if ($novoProgresso -match '^\d+$' -and [int]$novoProgresso -ge 0 -and [int]$novoProgresso -le 100) {
                $progressData.Treinamento.Progresso = [int]$novoProgresso
                $progressData.Treinamento.Status = Get-StatusFromProgress -Progresso $novoProgresso
                Write-Host "Progresso do Treinamento da Equipe atualizado para $novoProgresso%" -ForegroundColor Green
            } else {
                Write-Host "Valor inválido. O progresso deve ser um número entre 0 e 100." -ForegroundColor Red
            }
        }
        "5" {
            $novoProgresso = Read-Host "Novo progresso para Resposta a Incidentes (0-100)"
            if ($novoProgresso -match '^\d+$' -and [int]$novoProgresso -ge 0 -and [int]$novoProgresso -le 100) {
                $progressData.RespostaIncidentes.Progresso = [int]$novoProgresso
                $progressData.RespostaIncidentes.Status = Get-StatusFromProgress -Progresso $novoProgresso
                Write-Host "Progresso da Resposta a Incidentes atualizado para $novoProgresso%" -ForegroundColor Green
            } else {
                Write-Host "Valor inválido. O progresso deve ser um número entre 0 e 100." -ForegroundColor Red
            }
        }
        "6" {
            Write-Host "\nAtualização de Vulnerabilidades:" -ForegroundColor Cyan
            
            $novasCriticas = Read-Host "Número de vulnerabilidades críticas"
            if ($novasCriticas -match '^\d+$') {
                $progressData.Vulnerabilidades.Criticas = [int]$novasCriticas
            } else {
                Write-Host "Valor inválido para vulnerabilidades críticas." -ForegroundColor Red
            }
            
            $novasAltas = Read-Host "Número de vulnerabilidades altas"
            if ($novasAltas -match '^\d+$') {
                $progressData.Vulnerabilidades.Altas = [int]$novasAltas
            } else {
                Write-Host "Valor inválido para vulnerabilidades altas." -ForegroundColor Red
            }
            
            $novasMedias = Read-Host "Número de vulnerabilidades médias"
            if ($novasMedias -match '^\d+$') {
                $progressData.Vulnerabilidades.Medias = [int]$novasMedias
            } else {
                Write-Host "Valor inválido para vulnerabilidades médias." -ForegroundColor Red
            }
            
            $novasBaixas = Read-Host "Número de vulnerabilidades baixas"
            if ($novasBaixas -match '^\d+$') {
                $progressData.Vulnerabilidades.Baixas = [int]$novasBaixas
            } else {
                Write-Host "Valor inválido para vulnerabilidades baixas." -ForegroundColor Red
            }
            
            Write-Host "Dados de vulnerabilidades atualizados." -ForegroundColor Green
        }
        "0" {
            return $false
        }
        default {
            Write-Host "Opção inválida." -ForegroundColor Red
        }
    }
    
    # Recalcular progresso geral
    $progressoGeral = (
        $progressData.AnaliseEstatica.Progresso + 
        $progressData.TestesPenetracao.Progresso + 
        $progressData.Monitoramento.Progresso + 
        $progressData.Treinamento.Progresso + 
        $progressData.RespostaIncidentes.Progresso
    ) / 5
    
    $progressData.ProgressoGeral = [Math]::Round($progressoGeral)
    
    # Salvar configuração atualizada
    Update-ProgressConfig -ProgressData $progressData
    
    # Perguntar se deseja atualizar o dashboard
    $atualizarDashboard = Read-Host "\nDeseja atualizar o dashboard com os novos valores? (S/N)"
    if ($atualizarDashboard -eq "S" -or $atualizarDashboard -eq "s") {
        # Executar o script de atualização do dashboard
        & $atualizarDashboardScript
    }
    
    # Perguntar se deseja continuar atualizando
    $continuar = Read-Host "\nDeseja continuar atualizando outros componentes? (S/N)"
    if ($continuar -eq "S" -or $continuar -eq "s") {
        return $true
    } else {
        return $false
    }
}

# Função principal
function Start-ManualProgressUpdate {
    $continuar = $true
    
    while ($continuar) {
        $continuar = Update-ManualProgress
    }
    
    Write-Host "\nAtualização de progresso concluída." -ForegroundColor Magenta
    
    # Perguntar se deseja abrir o dashboard
    $abrirDashboard = Read-Host "Deseja abrir o dashboard no navegador? (S/N)"
    if ($abrirDashboard -eq "S" -or $abrirDashboard -eq "s") {
        Start-Process $dashboardPath
    }
}

# Iniciar o processo de atualização manual
Start-ManualProgressUpdate