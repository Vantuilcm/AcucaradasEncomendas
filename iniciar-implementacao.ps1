# Script de Inicialização da Implementação de Segurança
# Açucaradas Encomendas

# Configurações
$logFile = "$PSScriptRoot\implementacao-seguranca.log"
$dataAtual = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

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

function Test-FileExists {
    param (
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        return $true
    } else {
        Write-Log "Arquivo não encontrado: $FilePath" "ERROR"
        Write-Host "Arquivo não encontrado: $FilePath" -ForegroundColor Red
        return $false
    }
}

function Show-Banner {
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Magenta
    Write-Host "      IMPLEMENTAÇÃO DE SEGURANÇA - AÇUCARADAS ENCOMENDAS" -ForegroundColor Magenta
    Write-Host "=================================================================" -ForegroundColor Magenta
    Write-Host "Data de Início: $dataAtual" -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Magenta
    Write-Host ""
}

function Show-Menu {
    Write-Host "Menu Principal:" -ForegroundColor Cyan
    Write-Host "1. Revisar documentação de segurança"
    Write-Host "2. Iniciar implementação gradual"
    Write-Host "3. Configurar análise estática de código (SonarQube)"
    Write-Host "4. Iniciar programa de treinamento"
    Write-Host "5. Configurar ambiente de homologação do SIEM"
    Write-Host "6. Executar testes de penetração"
    Write-Host "7. Simular incidentes de segurança"
    Write-Host "8. Gerar relatório de progresso"
    Write-Host "0. Sair"
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Magenta
    
    $choice = Read-Host "Digite sua opção"
    return $choice
}

function Review-Documentation {
    $documentos = @(
        "$PSScriptRoot\SECURITY_IMPLEMENTATION.md",
        "$PSScriptRoot\PENTEST_MANUAL.md",
        "$PSScriptRoot\SIEM_DOCUMENTATION.md",
        "$PSScriptRoot\PLANO_TREINAMENTO_SEGURANCA.md",
        "$PSScriptRoot\PLANO_RESPOSTA_INCIDENTES.md",
        "$PSScriptRoot\PROXIMOS_PASSOS_IMPLEMENTACAO.md",
        "$PSScriptRoot\CHECKLIST_IMPLEMENTACAO_SEGURANCA.md",
        "$PSScriptRoot\MODELO_RELATORIO_PROGRESSO.md"
    )
    
    $documentosEncontrados = @()
    $documentosFaltantes = @()
    
    foreach ($doc in $documentos) {
        if (Test-Path $doc) {
            $documentosEncontrados += $doc
        } else {
            $documentosFaltantes += $doc
        }
    }
    
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "                REVISÃO DE DOCUMENTAÇÃO" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($documentosFaltantes.Count -gt 0) {
        Write-Host "Documentos faltantes:" -ForegroundColor Red
        foreach ($doc in $documentosFaltantes) {
            Write-Host " - $doc" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    Write-Host "Documentos disponíveis para revisão:" -ForegroundColor Green
    $index = 1
    foreach ($doc in $documentosEncontrados) {
        Write-Host "$index. $(Split-Path $doc -Leaf)" -ForegroundColor Green
        $index++
    }
    Write-Host "0. Voltar ao menu principal"
    Write-Host ""
    
    $choice = Read-Host "Digite o número do documento para abrir (0 para voltar)"
    
    if ($choice -eq "0") {
        return
    }
    
    $choiceIndex = [int]$choice - 1
    if ($choiceIndex -ge 0 -and $choiceIndex -lt $documentosEncontrados.Count) {
        $docToOpen = $documentosEncontrados[$choiceIndex]
        Write-Host "Abrindo documento: $docToOpen" -ForegroundColor Yellow
        Start-Process $docToOpen
    } else {
        Write-Host "Opção inválida!" -ForegroundColor Red
    }
    
    Read-Host "Pressione Enter para continuar"
}

function Start-GradualImplementation {
    $implementacaoScript = "$PSScriptRoot\implementacao-gradual.ps1"
    
    if (Test-FileExists $implementacaoScript) {
        Write-Host "Iniciando script de implementação gradual..." -ForegroundColor Yellow
        Write-Log "Iniciando script de implementação gradual" "INFO"
        
        try {
            & $implementacaoScript
            Write-Log "Script de implementação gradual executado com sucesso" "INFO"
        } catch {
            Write-Log "Erro ao executar script de implementação gradual: $_" "ERROR"
            Write-Host "Erro ao executar script de implementação gradual: $_" -ForegroundColor Red
        }
    }
    
    Read-Host "Pressione Enter para continuar"
}

function Configure-StaticAnalysis {
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "          CONFIGURAÇÃO DE ANÁLISE ESTÁTICA DE CÓDIGO" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Opções de configuração:" -ForegroundColor Yellow
    Write-Host "1. Configurar SonarQube local"
    Write-Host "2. Integrar SonarQube ao pipeline CI/CD"
    Write-Host "3. Executar primeira análise"
    Write-Host "0. Voltar ao menu principal"
    Write-Host ""
    
    $choice = Read-Host "Digite sua opção"
    
    switch ($choice) {
        "1" {
            Write-Host "Iniciando configuração do SonarQube local..." -ForegroundColor Yellow
            Write-Host "Esta operação requer Docker instalado no sistema." -ForegroundColor Yellow
            $confirm = Read-Host "Deseja continuar? (S/N)"
            
            if ($confirm -eq "S" -or $confirm -eq "s") {
                # Verificar se o Docker está instalado
                if (Get-Command docker -ErrorAction SilentlyContinue) {
                    Write-Host "Iniciando container do SonarQube..." -ForegroundColor Cyan
                    docker run -d --name sonarqube -p 9000:9000 sonarqube:latest
                    Write-Host "SonarQube iniciado na porta 9000. Acesse http://localhost:9000" -ForegroundColor Green
                    Write-Host "Credenciais padrão: admin/admin" -ForegroundColor Green
                    Write-Log "Container do SonarQube iniciado na porta 9000" "INFO"
                } else {
                    Write-Host "Docker não encontrado. Por favor, instale o Docker antes de continuar." -ForegroundColor Red
                    Write-Log "Tentativa de iniciar SonarQube falhou: Docker não encontrado" "ERROR"
                }
            }
        }
        "2" {
            Write-Host "Para integrar o SonarQube ao pipeline CI/CD, siga estas etapas:" -ForegroundColor Yellow
            Write-Host "1. Adicione o seguinte snippet ao seu arquivo de configuração CI/CD:" -ForegroundColor Yellow
            Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
            Write-Host "# Exemplo para Azure DevOps pipeline (azure-pipelines.yml)" -ForegroundColor Gray
            Write-Host "steps:" -ForegroundColor Gray
            Write-Host "- task: SonarQubePrepare@4" -ForegroundColor Gray
            Write-Host "  inputs:" -ForegroundColor Gray
            Write-Host "    SonarQube: 'SonarQube'" -ForegroundColor Gray
            Write-Host "    scannerMode: 'MSBuild'" -ForegroundColor Gray
            Write-Host "    projectKey: 'acucaradas-encomendas'" -ForegroundColor Gray
            Write-Host "    projectName: 'Açucaradas Encomendas'" -ForegroundColor Gray
            Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
            Write-Host "2. Configure a conexão de serviço no seu sistema CI/CD" -ForegroundColor Yellow
            Write-Host "3. Adicione a etapa de análise após a compilação" -ForegroundColor Yellow
            Write-Host "4. Adicione a etapa de publicação dos resultados" -ForegroundColor Yellow
            
            Write-Log "Instruções para integração do SonarQube ao pipeline CI/CD exibidas" "INFO"
        }
        "3" {
            Write-Host "Executando primeira análise com SonarScanner..." -ForegroundColor Yellow
            Write-Host "Esta operação requer SonarScanner instalado no sistema." -ForegroundColor Yellow
            $confirm = Read-Host "Deseja continuar? (S/N)"
            
            if ($confirm -eq "S" -or $confirm -eq "s") {
                # Verificar se o SonarScanner está instalado
                if (Get-Command sonar-scanner -ErrorAction SilentlyContinue) {
                    Write-Host "Executando análise..." -ForegroundColor Cyan
                    
                    # Criar arquivo de configuração temporário
                    $sonarPropertiesFile = "$PSScriptRoot\sonar-project.properties"
                    @"
# Configuração para análise do SonarQube
sonar.projectKey=acucaradas-encomendas
sonar.projectName=Açucaradas Encomendas
sonar.projectVersion=1.0
sonar.sources=.
sonar.host.url=http://localhost:9000
sonar.login=admin
sonar.password=admin
"@ | Set-Content -Path $sonarPropertiesFile
                    
                    # Executar análise
                    sonar-scanner
                    
                    # Remover arquivo de configuração temporário
                    Remove-Item -Path $sonarPropertiesFile -Force
                    
                    Write-Host "Análise concluída. Verifique os resultados em http://localhost:9000" -ForegroundColor Green
                    Write-Log "Primeira análise com SonarScanner executada" "INFO"
                } else {
                    Write-Host "SonarScanner não encontrado. Por favor, instale o SonarScanner antes de continuar." -ForegroundColor Red
                    Write-Host "Você pode baixá-lo em: https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/" -ForegroundColor Yellow
                    Write-Log "Tentativa de executar análise falhou: SonarScanner não encontrado" "ERROR"
                }
            }
        }
    }
    
    Read-Host "Pressione Enter para continuar"
}

function Start-TrainingProgram {
    $treinamentoDoc = "$PSScriptRoot\PLANO_TREINAMENTO_SEGURANCA.md"
    
    if (Test-FileExists $treinamentoDoc) {
        Clear-Host
        Write-Host "=================================================================" -ForegroundColor Cyan
        Write-Host "          PROGRAMA DE TREINAMENTO EM SEGURANÇA" -ForegroundColor Cyan
        Write-Host "=================================================================" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Módulos de treinamento disponíveis:" -ForegroundColor Yellow
        Write-Host "1. Fundamentos de Segurança da Informação"
        Write-Host "2. Desenvolvimento Seguro"
        Write-Host "3. Ferramentas e Processos de Segurança"
        Write-Host "4. Workshops Práticos"
        Write-Host "5. Agendar sessão de treinamento"
        Write-Host "0. Voltar ao menu principal"
        Write-Host ""
        
        $choice = Read-Host "Digite sua opção"
        
        switch ($choice) {
            "1" {
                Write-Host "Abrindo material de Fundamentos de Segurança da Informação..." -ForegroundColor Yellow
                Start-Process $treinamentoDoc
                Write-Log "Material de Fundamentos de Segurança da Informação aberto" "INFO"
            }
            "2" {
                Write-Host "Abrindo material de Desenvolvimento Seguro..." -ForegroundColor Yellow
                Start-Process $treinamentoDoc
                Write-Log "Material de Desenvolvimento Seguro aberto" "INFO"
            }
            "3" {
                Write-Host "Abrindo material de Ferramentas e Processos de Segurança..." -ForegroundColor Yellow
                Start-Process $treinamentoDoc
                Write-Log "Material de Ferramentas e Processos de Segurança aberto" "INFO"
            }
            "4" {
                Write-Host "Abrindo material de Workshops Práticos..." -ForegroundColor Yellow
                Start-Process $treinamentoDoc
                Write-Log "Material de Workshops Práticos aberto" "INFO"
            }
            "5" {
                $data = Read-Host "Digite a data para o treinamento (DD/MM/AAAA)"
                $modulo = Read-Host "Digite o número do módulo (1-4)"
                $participantes = Read-Host "Digite o número de participantes"
                
                Write-Host "Treinamento agendado com sucesso!" -ForegroundColor Green
                Write-Host "Data: $data" -ForegroundColor Green
                Write-Host "Módulo: $modulo" -ForegroundColor Green
                Write-Host "Participantes: $participantes" -ForegroundColor Green
                
                Write-Log "Treinamento agendado: Data=$data, Módulo=$modulo, Participantes=$participantes" "INFO"
            }
        }
    }
    
    Read-Host "Pressione Enter para continuar"
}

function Configure-SIEMHomologation {
    $siemScript = "$PSScriptRoot\implementacao-siem-homologacao.ps1"
    
    if (Test-FileExists $siemScript) {
        Write-Host "Iniciando configuração do ambiente de homologação do SIEM..." -ForegroundColor Yellow
        Write-Log "Iniciando configuração do ambiente de homologação do SIEM" "INFO"
        
        try {
            & $siemScript
            Write-Log "Script de configuração do SIEM executado com sucesso" "INFO"
        } catch {
            Write-Log "Erro ao executar script de configuração do SIEM: $_" "ERROR"
            Write-Host "Erro ao executar script de configuração do SIEM: $_" -ForegroundColor Red
        }
    }
    
    Read-Host "Pressione Enter para continuar"
}

function Run-PenetrationTests {
    $pentestScript = "$PSScriptRoot\pentest-automation.ps1"
    
    if (Test-FileExists $pentestScript) {
        Clear-Host
        Write-Host "=================================================================" -ForegroundColor Cyan
        Write-Host "                TESTES DE PENETRAÇÃO" -ForegroundColor Cyan
        Write-Host "=================================================================" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Opções de teste:" -ForegroundColor Yellow
        Write-Host "1. Executar teste automatizado completo"
        Write-Host "2. Executar teste de autenticação"
        Write-Host "3. Executar teste de injeção"
        Write-Host "4. Executar teste de XSS"
        Write-Host "5. Executar teste de configuração"
        Write-Host "0. Voltar ao menu principal"
        Write-Host ""
        
        $choice = Read-Host "Digite sua opção"
        
        if ($choice -eq "0") {
            return
        }
        
        $target = Read-Host "Digite a URL alvo (ex: http://localhost:8080)"
        
        switch ($choice) {
            "1" {
                Write-Host "Executando teste automatizado completo..." -ForegroundColor Yellow
                & $pentestScript -Target $target -FullScan
                Write-Log "Teste de penetração completo executado contra $target" "INFO"
            }
            "2" {
                Write-Host "Executando teste de autenticação..." -ForegroundColor Yellow
                & $pentestScript -Target $target -AuthTest
                Write-Log "Teste de autenticação executado contra $target" "INFO"
            }
            "3" {
                Write-Host "Executando teste de injeção..." -ForegroundColor Yellow
                & $pentestScript -Target $target -InjectionTest
                Write-Log "Teste de injeção executado contra $target" "INFO"
            }
            "4" {
                Write-Host "Executando teste de XSS..." -ForegroundColor Yellow
                & $pentestScript -Target $target -XSSTest
                Write-Log "Teste de XSS executado contra $target" "INFO"
            }
            "5" {
                Write-Host "Executando teste de configuração..." -ForegroundColor Yellow
                & $pentestScript -Target $target -ConfigTest
                Write-Log "Teste de configuração executado contra $target" "INFO"
            }
        }
    }
    
    Read-Host "Pressione Enter para continuar"
}

function Simulate-SecurityIncidents {
    $simulacaoScript = "$PSScriptRoot\simulacao-incidentes.ps1"
    
    if (Test-FileExists $simulacaoScript) {
        Write-Host "Iniciando simulação de incidentes de segurança..." -ForegroundColor Yellow
        Write-Log "Iniciando simulação de incidentes de segurança" "INFO"
        
        try {
            & $simulacaoScript
            Write-Log "Script de simulação de incidentes executado com sucesso" "INFO"
        } catch {
            Write-Log "Erro ao executar script de simulação de incidentes: $_" "ERROR"
            Write-Host "Erro ao executar script de simulação de incidentes: $_" -ForegroundColor Red
        }
    }
    
    Read-Host "Pressione Enter para continuar"
}

function Generate-ProgressReport {
    $modeloRelatorio = "$PSScriptRoot\MODELO_RELATORIO_PROGRESSO.md"
    $checklistImplementacao = "$PSScriptRoot\CHECKLIST_IMPLEMENTACAO_SEGURANCA.md"
    
    if (Test-FileExists $modeloRelatorio -and Test-FileExists $checklistImplementacao) {
        Clear-Host
        Write-Host "=================================================================" -ForegroundColor Cyan
        Write-Host "              GERAÇÃO DE RELATÓRIO DE PROGRESSO" -ForegroundColor Cyan
        Write-Host "=================================================================" -ForegroundColor Cyan
        Write-Host ""
        
        $dataRelatorio = Get-Date -Format "yyyy-MM-dd"
        $nomeRelatorio = "Relatorio_Progresso_$dataRelatorio.md"
        $caminhoRelatorio = "$PSScriptRoot\$nomeRelatorio"
        
        Write-Host "Gerando relatório de progresso..." -ForegroundColor Yellow
        
        # Ler conteúdo do modelo de relatório
        $conteudoModelo = Get-Content -Path $modeloRelatorio -Raw
        
        # Substituir placeholders
        $conteudoModelo = $conteudoModelo -replace '\{DATA\}', $dataRelatorio
        $conteudoModelo = $conteudoModelo -replace '\{RESPONSAVEL\}', $env:USERNAME
        
        # Escrever relatório
        $conteudoModelo | Set-Content -Path $caminhoRelatorio
        
        Write-Host "Relatório gerado com sucesso: $caminhoRelatorio" -ForegroundColor Green
        Write-Host "Abrindo relatório para edição..." -ForegroundColor Yellow
        
        Start-Process $caminhoRelatorio
        
        Write-Log "Relatório de progresso gerado: $caminhoRelatorio" "INFO"
    }
    
    Read-Host "Pressione Enter para continuar"
}

# Inicialização
Show-Banner

# Menu principal
$exit = $false
while (-not $exit) {
    $choice = Show-Menu
    
    switch ($choice) {
        "0" { $exit = $true }
        "1" { Review-Documentation }
        "2" { Start-GradualImplementation }
        "3" { Configure-StaticAnalysis }
        "4" { Start-TrainingProgram }
        "5" { Configure-SIEMHomologation }
        "6" { Run-PenetrationTests }
        "7" { Simulate-SecurityIncidents }
        "8" { Generate-ProgressReport }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; Read-Host "Pressione Enter para continuar" }
    }
}

Write-Host "Programa finalizado." -ForegroundColor Cyan