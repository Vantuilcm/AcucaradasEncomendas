# Script para gerar relatórios de segurança em PDF

# Verificar e instalar módulos necessários
function Install-RequiredModules {
    $modulosNecessarios = @("PSWriteHTML", "PSWritePDF")
    
    foreach ($modulo in $modulosNecessarios) {
        if (-not (Get-Module -ListAvailable -Name $modulo)) {
            Write-Host "Instalando módulo $modulo..." -ForegroundColor Yellow
            try {
                Install-Module -Name $modulo -Force -Scope CurrentUser -ErrorAction Stop
                Write-Host "Módulo $modulo instalado com sucesso!" -ForegroundColor Green
            }
            catch {
                Write-Error "Erro ao instalar o módulo $modulo: $_"
                Write-Host "Por favor, execute o PowerShell como administrador e tente novamente." -ForegroundColor Red
                exit 1
            }
        }
        else {
            Write-Host "Módulo $modulo já está instalado." -ForegroundColor Green
        }
    }
}

# Função para obter dados do progresso de segurança
function Get-SecurityProgressData {
    # Caminho para o script de atualização do dashboard
    $atualizarDashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
    
    if (Test-Path -Path $atualizarDashboardScript) {
        # Importar a função do script de atualização
        . $atualizarDashboardScript
        
        # Chamar a função para obter os dados de progresso
        return Get-SecurityImplementationProgress
    }
    else {
        # Dados de exemplo caso o script não seja encontrado
        return @{
            "ProgressoGeral" = 60
            "AnaliseEstatica" = @{
                "Progresso" = 100
                "Status" = "Concluído"
                "Tarefas" = @(
                    @{"Nome" = "Configuração do SonarQube"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-30).ToString("dd/MM/yyyy")},
                    @{"Nome" = "Integração com CI/CD"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-25).ToString("dd/MM/yyyy")},
                    @{"Nome" = "Primeira análise completa"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-20).ToString("dd/MM/yyyy")}
                )
            }
            "TestesPenetracao" = @{
                "Progresso" = 50
                "Status" = "Em Progresso"
                "Tarefas" = @(
                    @{"Nome" = "Testes automatizados"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-15).ToString("dd/MM/yyyy")},
                    @{"Nome" = "Testes de autenticação"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-10).ToString("dd/MM/yyyy")},
                    @{"Nome" = "Testes de injeção"; "Concluida" = $false; "Data" = "Pendente"},
                    @{"Nome" = "Testes de XSS"; "Concluida" = $false; "Data" = "Pendente"}
                )
            }
            "Monitoramento" = @{
                "Progresso" = 30
                "Status" = "Em Progresso"
                "Tarefas" = @(
                    @{"Nome" = "Configuração do ambiente"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-5).ToString("dd/MM/yyyy")},
                    @{"Nome" = "Integração com aplicação"; "Concluida" = $false; "Data" = "Pendente"},
                    @{"Nome" = "Configuração de alertas"; "Concluida" = $false; "Data" = "Pendente"},
                    @{"Nome" = "Dashboards personalizados"; "Concluida" = $false; "Data" = "Pendente"}
                )
            }
            "Treinamento" = @{
                "Progresso" = 10
                "Status" = "Planejado"
                "Tarefas" = @(
                    @{"Nome" = "Preparação do material"; "Concluida" = $true; "Data" = (Get-Date).ToString("dd/MM/yyyy")},
                    @{"Nome" = "Módulo 1: Fundamentos"; "Concluida" = $false; "Data" = "Agendado: " + (Get-Date).AddDays(10).ToString("dd/MM/yyyy")},
                    @{"Nome" = "Módulo 2: Desenvolvimento"; "Concluida" = $false; "Data" = "Pendente"},
                    @{"Nome" = "Módulo 3: Ferramentas"; "Concluida" = $false; "Data" = "Pendente"}
                )
            }
            "RespostaIncidentes" = @{
                "Progresso" = 20
                "Status" = "Planejado"
                "Tarefas" = @(
                    @{"Nome" = "Documentação do plano"; "Concluida" = $true; "Data" = (Get-Date).AddDays(-5).ToString("dd/MM/yyyy")},
                    @{"Nome" = "Definição da equipe"; "Concluida" = $false; "Data" = "Pendente"},
                    @{"Nome" = "Simulação de incidentes"; "Concluida" = $false; "Data" = "Pendente"},
                    @{"Nome" = "Revisão e ajustes"; "Concluida" = $false; "Data" = "Pendente"}
                )
            }
            "Vulnerabilidades" = @{
                "Criticas" = 8
                "Altas" = 12
                "Medias" = 20
                "Baixas" = 35
            }
        }
    }
}

# Função para gerar o relatório em HTML
function New-SecurityReportHTML {
    param (
        [Parameter(Mandatory = $true)]
        [hashtable]$ProgressData,
        
        [Parameter(Mandatory = $true)]
        [string]$OutputPath
    )
    
    # Importar os módulos necessários
    Import-Module PSWriteHTML
    
    # Criar o HTML do relatório
    $html = New-HTML -TitleText "Relatório de Segurança - Açucaradas Encomendas" -Online -FilePath $OutputPath {
        New-HTMLHeader {
            New-HTMLText -Text "Relatório de Segurança - Açucaradas Encomendas" -Color "#FF69B4" -Alignment center -FontSize 24
            New-HTMLText -Text "Data: $(Get-Date -Format 'dd/MM/yyyy')" -Color "#666666" -Alignment center -FontSize 14
        }
        
        New-HTMLSection -HeaderText "Resumo do Progresso" -CanCollapse {
            New-HTMLPanel {
                New-HTMLChart {
                    New-ChartRadial -Name "Progresso Geral" -Value $ProgressData.ProgressoGeral
                    New-ChartRadial -Name "Análise Estática" -Value $ProgressData.AnaliseEstatica.Progresso
                    New-ChartRadial -Name "Testes de Penetração" -Value $ProgressData.TestesPenetracao.Progresso
                    New-ChartRadial -Name "Monitoramento SIEM" -Value $ProgressData.Monitoramento.Progresso
                    New-ChartRadial -Name "Treinamento" -Value $ProgressData.Treinamento.Progresso
                    New-ChartRadial -Name "Resposta a Incidentes" -Value $ProgressData.RespostaIncidentes.Progresso
                }
            }
        }
        
        New-HTMLSection -HeaderText "Vulnerabilidades Identificadas" -CanCollapse {
            New-HTMLPanel {
                New-HTMLChart {
                    New-ChartBarOptions -Type bar
                    New-ChartBar -Name "Vulnerabilidades" -Value @($ProgressData.Vulnerabilidades.Criticas, $ProgressData.Vulnerabilidades.Altas, $ProgressData.Vulnerabilidades.Medias, $ProgressData.Vulnerabilidades.Baixas) -Color @("#dc3545", "#fd7e14", "#ffc107", "#28a745") -Labels @("Críticas", "Altas", "Médias", "Baixas")
                }
            }
        }
        
        New-HTMLSection -HeaderText "Detalhes por Componente" {
            # Análise Estática
            New-HTMLSection -HeaderText "Análise Estática (SAST)" -CanCollapse {
                New-HTMLPanel {
                    New-HTMLTable -DataTable $ProgressData.AnaliseEstatica.Tarefas {
                        New-TableHeader -Names "Nome", "Concluida", "Data" -Title "Tarefas de Análise Estática"
                    } -HideFooter
                }
            }
            
            # Testes de Penetração
            New-HTMLSection -HeaderText "Testes de Penetração" -CanCollapse {
                New-HTMLPanel {
                    New-HTMLTable -DataTable $ProgressData.TestesPenetracao.Tarefas {
                        New-TableHeader -Names "Nome", "Concluida", "Data" -Title "Tarefas de Testes de Penetração"
                    } -HideFooter
                }
            }
            
            # Monitoramento SIEM
            New-HTMLSection -HeaderText "Monitoramento SIEM" -CanCollapse {
                New-HTMLPanel {
                    New-HTMLTable -DataTable $ProgressData.Monitoramento.Tarefas {
                        New-TableHeader -Names "Nome", "Concluida", "Data" -Title "Tarefas de Monitoramento SIEM"
                    } -HideFooter
                }
            }
            
            # Treinamento
            New-HTMLSection -HeaderText "Treinamento da Equipe" -CanCollapse {
                New-HTMLPanel {
                    New-HTMLTable -DataTable $ProgressData.Treinamento.Tarefas {
                        New-TableHeader -Names "Nome", "Concluida", "Data" -Title "Tarefas de Treinamento"
                    } -HideFooter
                }
            }
            
            # Resposta a Incidentes
            New-HTMLSection -HeaderText "Resposta a Incidentes" -CanCollapse {
                New-HTMLPanel {
                    New-HTMLTable -DataTable $ProgressData.RespostaIncidentes.Tarefas {
                        New-TableHeader -Names "Nome", "Concluida", "Data" -Title "Tarefas de Resposta a Incidentes"
                    } -HideFooter
                }
            }
        }
        
        New-HTMLSection -HeaderText "Recomendações" {
            New-HTMLList -Type Unordered {
                New-HTMLListItem -Text "Priorizar a correção das vulnerabilidades críticas e altas identificadas."
                New-HTMLListItem -Text "Concluir a implementação do monitoramento SIEM para detecção precoce de incidentes."
                New-HTMLListItem -Text "Acelerar o programa de treinamento para desenvolvedores."
                New-HTMLListItem -Text "Finalizar os testes de penetração pendentes."
                New-HTMLListItem -Text "Realizar simulação de incidentes para validar o plano de resposta."
            }
        }
        
        New-HTMLFooter {
            New-HTMLText -Text "Relatório gerado automaticamente pelo sistema de monitoramento de segurança." -Color "#666666" -Alignment center -FontSize 12
        }
    }
    
    return $OutputPath
}

# Função para converter o relatório HTML para PDF
function Convert-HTMLToPDF {
    param (
        [Parameter(Mandatory = $true)]
        [string]$HTMLPath,
        
        [Parameter(Mandatory = $true)]
        [string]$PDFPath
    )
    
    # Importar o módulo necessário
    Import-Module PSWritePDF
    
    try {
        # Converter HTML para PDF
        ConvertTo-PDF -FilePath $HTMLPath -OutputPath $PDFPath -Options @{
            "Margins"      = @{
                "Left"   = 15
                "Right"  = 15
                "Top"    = 15
                "Bottom" = 15
            }
            "Orientation"   = "Portrait"
            "PaperSize"     = "A4"
            "Grayscale"     = $false
            "PrintBackground" = $true
        }
        
        Write-Host "Relatório PDF gerado com sucesso: $PDFPath" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Erro ao converter HTML para PDF: $_"
        return $false
    }
}

# Função principal para gerar o relatório
function New-SecurityReport {
    param (
        [Parameter(Mandatory = $false)]
        [string]$OutputFolder = $PSScriptRoot,
        
        [Parameter(Mandatory = $false)]
        [switch]$OpenReport
    )
    
    # Verificar e instalar módulos necessários
    Install-RequiredModules
    
    # Criar pasta de relatórios se não existir
    $relatoriosFolder = Join-Path -Path $OutputFolder -ChildPath "Relatorios"
    if (-not (Test-Path -Path $relatoriosFolder)) {
        New-Item -Path $relatoriosFolder -ItemType Directory -Force | Out-Null
    }
    
    # Definir nomes de arquivos
    $dataAtual = Get-Date -Format "yyyyMMdd_HHmmss"
    $htmlPath = Join-Path -Path $relatoriosFolder -ChildPath "Relatorio_Seguranca_$dataAtual.html"
    $pdfPath = Join-Path -Path $relatoriosFolder -ChildPath "Relatorio_Seguranca_$dataAtual.pdf"
    
    # Obter dados de progresso
    $progressData = Get-SecurityProgressData
    
    # Gerar relatório HTML
    Write-Host "Gerando relatório HTML..." -ForegroundColor Cyan
    $htmlReport = New-SecurityReportHTML -ProgressData $progressData -OutputPath $htmlPath
    
    # Converter para PDF
    Write-Host "Convertendo para PDF..." -ForegroundColor Cyan
    $pdfSuccess = Convert-HTMLToPDF -HTMLPath $htmlReport -PDFPath $pdfPath
    
    # Abrir o relatório se solicitado
    if ($OpenReport -and $pdfSuccess) {
        Start-Process $pdfPath
    }
    elseif ($OpenReport) {
        Start-Process $htmlPath
    }
    
    # Retornar informações sobre os relatórios gerados
    return @{
        "HTML" = $htmlPath
        "PDF" = if ($pdfSuccess) { $pdfPath } else { $null }
    }
}

# Menu principal
function Show-Menu {
    Clear-Host
    Write-Host "===== Gerador de Relatórios de Segurança - Açucaradas Encomendas =====" -ForegroundColor Magenta
    Write-Host "1. Gerar relatório de segurança (HTML e PDF)" -ForegroundColor Cyan
    Write-Host "2. Atualizar dados do dashboard e gerar relatório" -ForegroundColor Cyan
    Write-Host "3. Sair" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Magenta
    
    $opcao = Read-Host "Selecione uma opção"
    
    switch ($opcao) {
        "1" { 
            $relatorios = New-SecurityReport -OpenReport
            Write-Host "\nRelatórios gerados:" -ForegroundColor Green
            Write-Host "HTML: $($relatorios.HTML)" -ForegroundColor Yellow
            if ($relatorios.PDF) {
                Write-Host "PDF: $($relatorios.PDF)" -ForegroundColor Yellow
            }
            pause
            Show-Menu 
        }
        "2" { 
            # Atualizar dashboard primeiro
            $atualizarDashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
            if (Test-Path -Path $atualizarDashboardScript) {
                Write-Host "Atualizando dados do dashboard..." -ForegroundColor Yellow
                & $atualizarDashboardScript
            }
            else {
                Write-Warning "Script de atualização do dashboard não encontrado."
            }
            
            # Gerar relatório
            $relatorios = New-SecurityReport -OpenReport
            Write-Host "\nRelatórios gerados:" -ForegroundColor Green
            Write-Host "HTML: $($relatorios.HTML)" -ForegroundColor Yellow
            if ($relatorios.PDF) {
                Write-Host "PDF: $($relatorios.PDF)" -ForegroundColor Yellow
            }
            pause
            Show-Menu 
        }
        "3" { exit }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; pause; Show-Menu }
    }
}

# Iniciar o menu
Show-Menu