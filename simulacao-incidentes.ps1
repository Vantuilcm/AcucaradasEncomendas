# Script de Simulação de Incidentes de Segurança
# Açucaradas Encomendas

# Configurações
$logFile = "$PSScriptRoot\simulacao-incidentes.log"
$scenariosDir = "$PSScriptRoot\cenarios-incidentes"
$resultsDir = "$PSScriptRoot\resultados-simulacao"

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

function Initialize-Environment {
    # Criar diretórios necessários
    if (-not (Test-Path $scenariosDir)) {
        New-Item -Path $scenariosDir -ItemType Directory | Out-Null
        Write-Log "Diretório de cenários criado: $scenariosDir" "INFO"
    }
    
    if (-not (Test-Path $resultsDir)) {
        New-Item -Path $resultsDir -ItemType Directory | Out-Null
        Write-Log "Diretório de resultados criado: $resultsDir" "INFO"
    }
    
    # Criar cenários de exemplo se não existirem
    if ((Get-ChildItem -Path $scenariosDir -File).Count -eq 0) {
        Create-ExampleScenarios
    }
}

function Create-ExampleScenarios {
    # Cenário 1: Violação de Dados
    $scenario1 = @"
# Cenário de Simulação: Violação de Dados

## Descrição
Um atacante conseguiu acesso não autorizado ao banco de dados de clientes da Açucaradas Encomendas e extraiu informações pessoais e de pagamento.

## Objetivos da Simulação
1. Testar a capacidade da equipe de detectar a violação de dados
2. Avaliar o tempo de resposta desde a detecção até a contenção
3. Verificar a eficácia dos procedimentos de comunicação interna e externa
4. Testar a capacidade de investigação forense

## Papéis e Responsabilidades
- Coordenador da Simulação: [Nome]
- Equipe de Resposta a Incidentes: [Nomes]
- Equipe de TI: [Nomes]
- Comunicação: [Nomes]
- Jurídico: [Nomes]
- Observadores: [Nomes]

## Cronograma
- Briefing Inicial: 15 minutos
- Simulação: 2 horas
- Debriefing: 45 minutos

## Injeções de Eventos
1. T+0: Alerta do SIEM sobre acesso anômalo ao banco de dados
2. T+15min: Descoberta de consultas SQL não autorizadas nos logs
3. T+30min: Evidência de exfiltração de dados para IP externo
4. T+45min: Recebimento de mensagem de extorsão
5. T+60min: Primeiros relatos de clientes sobre uso indevido de cartões

## Métricas de Avaliação
- Tempo até detecção
- Tempo até contenção
- Qualidade da comunicação interna
- Qualidade da comunicação externa
- Eficácia da investigação
- Conformidade com o plano de resposta a incidentes

## Materiais Necessários
- Cópias do plano de resposta a incidentes
- Formulários de documentação de incidentes
- Lista de contatos de emergência
- Cronômetros para medição de tempo
- Quadro branco ou flipchart para anotações
"@
    
    # Cenário 2: Ataque de Ransomware
    $scenario2 = @"
# Cenário de Simulação: Ataque de Ransomware

## Descrição
Um ransomware infectou vários sistemas da Açucaradas Encomendas, criptografando arquivos críticos e exigindo pagamento para recuperação.

## Objetivos da Simulação
1. Testar a capacidade da equipe de conter a propagação do ransomware
2. Avaliar a eficácia dos procedimentos de recuperação de dados
3. Verificar a tomada de decisão em situações de crise
4. Testar a comunicação com stakeholders

## Papéis e Responsabilidades
- Coordenador da Simulação: [Nome]
- Equipe de Resposta a Incidentes: [Nomes]
- Equipe de TI: [Nomes]
- Diretoria: [Nomes]
- Comunicação: [Nomes]
- Jurídico: [Nomes]
- Observadores: [Nomes]

## Cronograma
- Briefing Inicial: 15 minutos
- Simulação: 3 horas
- Debriefing: 1 hora

## Injeções de Eventos
1. T+0: Primeiros relatos de usuários sobre arquivos inacessíveis
2. T+15min: Descoberta de mensagem de ransomware em sistemas afetados
3. T+30min: Detecção de propagação para outros sistemas
4. T+45min: Sistemas críticos de produção começam a falhar
5. T+60min: Recebimento de instruções de pagamento do atacante
6. T+90min: Mídia social começa a reportar o incidente

## Métricas de Avaliação
- Tempo até contenção da propagação
- Eficácia da isolação de sistemas
- Qualidade da tomada de decisão
- Eficácia da recuperação de dados
- Qualidade da comunicação com stakeholders
- Conformidade com o plano de resposta a incidentes

## Materiais Necessários
- Cópias do plano de resposta a incidentes
- Plano de continuidade de negócios
- Formulários de documentação de incidentes
- Lista de contatos de emergência
- Cronômetros para medição de tempo
- Quadro branco ou flipchart para anotações
"@
    
    # Cenário 3: Comprometimento de Conta Privilegiada
    $scenario3 = @"
# Cenário de Simulação: Comprometimento de Conta Privilegiada

## Descrição
Um atacante comprometeu as credenciais de um administrador de sistemas e está utilizando o acesso privilegiado para movimentação lateral na rede e acesso a sistemas críticos.

## Objetivos da Simulação
1. Testar a capacidade da equipe de detectar atividades anômalas de contas privilegiadas
2. Avaliar a eficácia dos procedimentos de contenção e revogação de acesso
3. Verificar a capacidade de investigação de comprometimento
4. Testar os procedimentos de recuperação de acesso seguro

## Papéis e Responsabilidades
- Coordenador da Simulação: [Nome]
- Equipe de Resposta a Incidentes: [Nomes]
- Equipe de TI: [Nomes]
- Administradores de Sistema: [Nomes]
- Segurança da Informação: [Nomes]
- Observadores: [Nomes]

## Cronograma
- Briefing Inicial: 15 minutos
- Simulação: 2.5 horas
- Debriefing: 45 minutos

## Injeções de Eventos
1. T+0: Alerta do SIEM sobre login em horário incomum
2. T+15min: Detecção de acesso a sistemas não relacionados à função do administrador
3. T+30min: Criação de novas contas privilegiadas detectada
4. T+45min: Evidência de exfiltração de dados confidenciais
5. T+60min: Tentativa de desativação de mecanismos de segurança

## Métricas de Avaliação
- Tempo até detecção
- Tempo até contenção
- Eficácia da revogação de acesso
- Qualidade da investigação
- Eficácia da recuperação de acesso seguro
- Conformidade com o plano de resposta a incidentes

## Materiais Necessários
- Cópias do plano de resposta a incidentes
- Procedimentos de gestão de identidade e acesso
- Formulários de documentação de incidentes
- Lista de contatos de emergência
- Cronômetros para medição de tempo
- Quadro branco ou flipchart para anotações
"@
    
    # Salvar cenários
    $scenario1 | Set-Content -Path "$scenariosDir\cenario-violacao-dados.md"
    $scenario2 | Set-Content -Path "$scenariosDir\cenario-ransomware.md"
    $scenario3 | Set-Content -Path "$scenariosDir\cenario-comprometimento-conta.md"
    
    Write-Log "Cenários de exemplo criados" "INFO"
}

function Show-AvailableScenarios {
    $scenarios = Get-ChildItem -Path $scenariosDir -File
    
    if ($scenarios.Count -eq 0) {
        Write-Host "Nenhum cenário encontrado. Crie cenários no diretório: $scenariosDir" -ForegroundColor Red
        return @()
    }
    
    Write-Host "`nCenários Disponíveis:`" -ForegroundColor Cyan
    for ($i = 0; $i -lt $scenarios.Count; $i++) {
        Write-Host "[$i] $($scenarios[$i].Name)" -ForegroundColor Yellow
    }
    
    return $scenarios
}

function Run-SimulationExercise {
    param (
        [string]$ScenarioPath
    )
    
    if (-not (Test-Path $ScenarioPath)) {
        Write-Host "Cenário não encontrado: $ScenarioPath" -ForegroundColor Red
        return
    }
    
    $scenarioContent = Get-Content -Path $ScenarioPath -Raw
    $scenarioName = (Get-Item $ScenarioPath).BaseName
    
    # Criar diretório para resultados desta simulação
    $simulationId = "sim_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    $simulationDir = "$resultsDir\$simulationId"
    New-Item -Path $simulationDir -ItemType Directory | Out-Null
    
    # Copiar cenário para o diretório de resultados
    Copy-Item -Path $ScenarioPath -Destination "$simulationDir\cenario.md"
    
    # Iniciar simulação
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "                SIMULAÇÃO DE INCIDENTE DE SEGURANÇA" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Cenário: $scenarioName" -ForegroundColor Yellow
    Write-Host "ID da Simulação: $simulationId" -ForegroundColor Yellow
    Write-Host "Data/Hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Exibir conteúdo do cenário
    Write-Host $scenarioContent
    
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "                INÍCIO DA SIMULAÇÃO" -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    # Registrar início da simulação
    $startTime = Get-Date
    Write-Log "Simulação iniciada: $scenarioName (ID: $simulationId)" "INFO"
    
    # Criar arquivo de registro de eventos
    $eventLogPath = "$simulationDir\eventos.log"
    "# Registro de Eventos - Simulação $simulationId`n" | Set-Content -Path $eventLogPath
    "Cenário: $scenarioName`n" | Add-Content -Path $eventLogPath
    "Data/Hora de Início: $($startTime.ToString('yyyy-MM-dd HH:mm:ss'))`n" | Add-Content -Path $eventLogPath
    "## Eventos`n" | Add-Content -Path $eventLogPath
    
    # Simulação interativa
    $running = $true
    while ($running) {
        Write-Host ""
        Write-Host "Opções:" -ForegroundColor Yellow
        Write-Host "1. Registrar evento ou ação"
        Write-Host "2. Injetar novo evento no cenário"
        Write-Host "3. Registrar decisão tomada"
        Write-Host "4. Registrar tempo de resposta"
        Write-Host "5. Finalizar simulação"
        
        $choice = Read-Host "Digite sua opção"
        
        switch ($choice) {
            "1" {
                $eventDesc = Read-Host "Descreva o evento ou ação"
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                "[$timestamp] EVENTO: $eventDesc" | Add-Content -Path $eventLogPath
                Write-Host "Evento registrado." -ForegroundColor Green
            }
            "2" {
                $eventDesc = Read-Host "Descreva o novo evento a ser injetado no cenário"
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                "[$timestamp] INJEÇÃO: $eventDesc" | Add-Content -Path $eventLogPath
                Write-Host "Evento injetado: $eventDesc" -ForegroundColor Magenta
                Write-Host "Comunique este evento aos participantes da simulação." -ForegroundColor Magenta
            }
            "3" {
                $decisionDesc = Read-Host "Descreva a decisão tomada"
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                "[$timestamp] DECISÃO: $decisionDesc" | Add-Content -Path $eventLogPath
                Write-Host "Decisão registrada." -ForegroundColor Green
            }
            "4" {
                $metricName = Read-Host "Nome da métrica de tempo (ex: 'Tempo até detecção')"
                $timeValue = Read-Host "Valor do tempo (em minutos)"
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                "[$timestamp] MÉTRICA: $metricName = $timeValue minutos" | Add-Content -Path $eventLogPath
                Write-Host "Tempo registrado." -ForegroundColor Green
            }
            "5" {
                $running = $false
            }
            default {
                Write-Host "Opção inválida!" -ForegroundColor Red
            }
        }
    }
    
    # Finalizar simulação
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "                FIM DA SIMULAÇÃO" -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Duração total: $($duration.Hours)h $($duration.Minutes)m $($duration.Seconds)s" -ForegroundColor Yellow
    
    # Registrar fim da simulação
    "
## Resumo
" | Add-Content -Path $eventLogPath
    "Data/Hora de Término: $($endTime.ToString('yyyy-MM-dd HH:mm:ss'))" | Add-Content -Path $eventLogPath
    "Duração Total: $($duration.Hours)h $($duration.Minutes)m $($duration.Seconds)s" | Add-Content -Path $eventLogPath
    
    Write-Log "Simulação finalizada: $scenarioName (ID: $simulationId) - Duração: $($duration.ToString())" "INFO"
    
    # Coletar feedback e lições aprendidas
    Collect-SimulationFeedback -SimulationDir $simulationDir
    
    Write-Host ""
    Write-Host "Resultados da simulação salvos em: $simulationDir" -ForegroundColor Green
    Write-Host "Registro de eventos: $eventLogPath" -ForegroundColor Green
    
    Read-Host "Pressione Enter para continuar"
}

function Collect-SimulationFeedback {
    param (
        [string]$SimulationDir
    )
    
    $feedbackPath = "$SimulationDir\feedback.md"
    
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "                FEEDBACK E LIÇÕES APRENDIDAS" -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Por favor, responda às seguintes perguntas para documentar o feedback e lições aprendidas." -ForegroundColor Yellow
    Write-Host "Pressione Enter para pular qualquer pergunta que não seja aplicável." -ForegroundColor Yellow
    Write-Host ""
    
    "# Feedback e Lições Aprendidas`n" | Set-Content -Path $feedbackPath
    
    # Pontos fortes
    Write-Host "Quais foram os pontos fortes observados durante a simulação?" -ForegroundColor Cyan
    $strengths = Read-Host "Pontos fortes"
    if ($strengths) {
        "`n## Pontos Fortes`n" | Add-Content -Path $feedbackPath
        "$strengths`n" | Add-Content -Path $feedbackPath
    }
    
    # Áreas de melhoria
    Write-Host "Quais foram as áreas que precisam de melhoria?" -ForegroundColor Cyan
    $improvements = Read-Host "Áreas de melhoria"
    if ($improvements) {
        "`n## Áreas de Melhoria`n" | Add-Content -Path $feedbackPath
        "$improvements`n" | Add-Content -Path $feedbackPath
    }
    
    # Lições aprendidas
    Write-Host "Quais foram as principais lições aprendidas?" -ForegroundColor Cyan
    $lessons = Read-Host "Lições aprendidas"
    if ($lessons) {
        "`n## Lições Aprendidas`n" | Add-Content -Path $feedbackPath
        "$lessons`n" | Add-Content -Path $feedbackPath
    }
    
    # Recomendações
    Write-Host "Quais são as recomendações para melhorar a resposta a incidentes?" -ForegroundColor Cyan
    $recommendations = Read-Host "Recomendações"
    if ($recommendations) {
        "`n## Recomendações`n" | Add-Content -Path $feedbackPath
        "$recommendations`n" | Add-Content -Path $feedbackPath
    }
    
    # Próximos passos
    Write-Host "Quais são os próximos passos a serem tomados?" -ForegroundColor Cyan
    $nextSteps = Read-Host "Próximos passos"
    if ($nextSteps) {
        "`n## Próximos Passos`n" | Add-Content -Path $feedbackPath
        "$nextSteps`n" | Add-Content -Path $feedbackPath
    }
    
    # Avaliação geral
    Write-Host "Qual é a avaliação geral da simulação (1-5, onde 5 é excelente)?" -ForegroundColor Cyan
    $rating = Read-Host "Avaliação (1-5)"
    if ($rating) {
        "`n## Avaliação Geral`n" | Add-Content -Path $feedbackPath
        "$rating/5`n" | Add-Content -Path $feedbackPath
    }
    
    Write-Host "Feedback coletado e salvo em: $feedbackPath" -ForegroundColor Green
}

function Create-NewScenario {
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "                CRIAR NOVO CENÁRIO DE SIMULAÇÃO" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $scenarioName = Read-Host "Nome do cenário (sem espaços, use hífens)"
    if ([string]::IsNullOrWhiteSpace($scenarioName)) {
        Write-Host "Nome do cenário inválido!" -ForegroundColor Red
        return
    }
    
    $scenarioPath = "$scenariosDir\cenario-$scenarioName.md"
    if (Test-Path $scenarioPath) {
        Write-Host "Já existe um cenário com este nome!" -ForegroundColor Red
        return
    }
    
    # Coletar informações do cenário
    Write-Host ""
    $description = Read-Host "Descrição do cenário"
    
    Write-Host ""
    Write-Host "Objetivos da Simulação (digite 'fim' para terminar):" -ForegroundColor Yellow
    $objectives = @()
    $objective = ""
    $i = 1
    do {
        $objective = Read-Host "Objetivo $i"
        if ($objective -ne "fim" -and -not [string]::IsNullOrWhiteSpace($objective)) {
            $objectives += $objective
            $i++
        }
    } while ($objective -ne "fim")
    
    Write-Host ""
    Write-Host "Injeções de Eventos (digite 'fim' para terminar):" -ForegroundColor Yellow
    $events = @()
    $event = ""
    $i = 1
    do {
        $event = Read-Host "Evento $i"
        if ($event -ne "fim" -and -not [string]::IsNullOrWhiteSpace($event)) {
            $events += $event
            $i++
        }
    } while ($event -ne "fim")
    
    # Criar conteúdo do cenário
    $content = @"
# Cenário de Simulação: $scenarioName

## Descrição
$description

## Objetivos da Simulação
"@
    
    for ($i = 0; $i -lt $objectives.Count; $i++) {
        $content += "`n$($i+1). $($objectives[$i])"
    }
    
    $content += @"


## Papéis e Responsabilidades
- Coordenador da Simulação: [Nome]
- Equipe de Resposta a Incidentes: [Nomes]
- Equipe de TI: [Nomes]
- Outros Participantes: [Nomes]
- Observadores: [Nomes]

## Cronograma
- Briefing Inicial: [Duração]
- Simulação: [Duração]
- Debriefing: [Duração]

## Injeções de Eventos
"@
    
    for ($i = 0; $i -lt $events.Count; $i++) {
        $content += "`n$($i+1). $($events[$i])"
    }
    
    $content += @"


## Métricas de Avaliação
- Tempo até detecção
- Tempo até contenção
- Qualidade da comunicação
- Eficácia da resposta
- Conformidade com o plano de resposta a incidentes

## Materiais Necessários
- Cópias do plano de resposta a incidentes
- Formulários de documentação de incidentes
- Lista de contatos de emergência
- Cronômetros para medição de tempo
- Quadro branco ou flipchart para anotações
"@
    
    # Salvar cenário
    $content | Set-Content -Path $scenarioPath
    
    Write-Host ""
    Write-Host "Cenário criado com sucesso: $scenarioPath" -ForegroundColor Green
    Write-Log "Novo cenário criado: $scenarioName" "INFO"
    
    Read-Host "Pressione Enter para continuar"
}

function Generate-SimulationReport {
    param (
        [string]$SimulationDir
    )
    
    if (-not (Test-Path $SimulationDir)) {
        Write-Host "Diretório de simulação não encontrado: $SimulationDir" -ForegroundColor Red
        return
    }
    
    $scenarioPath = "$SimulationDir\cenario.md"
    $eventsPath = "$SimulationDir\eventos.log"
    $feedbackPath = "$SimulationDir\feedback.md"
    $reportPath = "$SimulationDir\relatorio-simulacao.md"
    
    if (-not (Test-Path $scenarioPath) -or -not (Test-Path $eventsPath)) {
        Write-Host "Arquivos de simulação incompletos!" -ForegroundColor Red
        return
    }
    
    $scenarioContent = Get-Content -Path $scenarioPath -Raw
    $eventsContent = Get-Content -Path $eventsPath -Raw
    $feedbackContent = ""
    if (Test-Path $feedbackPath) {
        $feedbackContent = Get-Content -Path $feedbackPath -Raw
    }
    
    # Extrair informações do cenário
    $scenarioName = "Desconhecido"
    if ($scenarioContent -match "# Cenário de Simulação: (.+)$") {
        $scenarioName = $matches[1]
    }
    
    # Criar relatório
    $report = @"
# Relatório de Simulação de Incidente de Segurança

## Resumo Executivo

Este relatório apresenta os resultados da simulação de incidente de segurança "$scenarioName" realizada em $(Get-Date -Format "dd/MM/yyyy"). A simulação teve como objetivo testar a eficácia do plano de resposta a incidentes da Açucaradas Encomendas e identificar áreas de melhoria.

## Detalhes da Simulação

### Cenário

$scenarioContent

### Registro de Eventos

$eventsContent

### Feedback e Lições Aprendidas

$feedbackContent

## Conclusão

Esta simulação proporcionou uma oportunidade valiosa para testar os procedimentos de resposta a incidentes da organização em um ambiente controlado. As lições aprendidas e recomendações identificadas devem ser incorporadas ao plano de resposta a incidentes para melhorar a capacidade da organização de responder efetivamente a incidentes reais.

## Próximos Passos

1. Revisar e atualizar o plano de resposta a incidentes com base nas lições aprendidas
2. Implementar as recomendações identificadas
3. Agendar a próxima simulação para testar as melhorias implementadas
4. Continuar o treinamento da equipe de resposta a incidentes

---

**Relatório Preparado por:** [Nome]

**Data:** $(Get-Date -Format "dd/MM/yyyy")
"@
    
    # Salvar relatório
    $report | Set-Content -Path $reportPath
    
    Write-Host "Relatório gerado com sucesso: $reportPath" -ForegroundColor Green
    Write-Log "Relatório de simulação gerado: $reportPath" "INFO"
    
    Read-Host "Pressione Enter para continuar"
}

function Show-SimulationResults {
    $simulations = Get-ChildItem -Path $resultsDir -Directory
    
    if ($simulations.Count -eq 0) {
        Write-Host "Nenhuma simulação encontrada." -ForegroundColor Red
        return
    }
    
    Write-Host "`nSimulações Realizadas:`" -ForegroundColor Cyan
    for ($i = 0; $i -lt $simulations.Count; $i++) {
        $simId = $simulations[$i].Name
        $scenarioPath = "$($simulations[$i].FullName)\cenario.md"
        $scenarioName = "Desconhecido"
        
        if (Test-Path $scenarioPath) {
            $scenarioContent = Get-Content -Path $scenarioPath -Raw
            if ($scenarioContent -match "# Cenário de Simulação: (.+)$") {
                $scenarioName = $matches[1]
            }
        }
        
        Write-Host "[$i] $simId - $scenarioName" -ForegroundColor Yellow
    }
    
    Write-Host ""
    $choice = Read-Host "Digite o número da simulação para ver detalhes ou gerar relatório (ou 'c' para cancelar)"
    
    if ($choice -eq "c") {
        return
    }
    
    if ($choice -match '^\d+$' -and [int]$choice -ge 0 -and [int]$choice -lt $simulations.Count) {
        $selectedSim = $simulations[[int]$choice]
        
        Write-Host ""
        Write-Host "Opções para a simulação $($selectedSim.Name):" -ForegroundColor Yellow
        Write-Host "1. Ver registro de eventos"
        Write-Host "2. Ver feedback"
        Write-Host "3. Gerar relatório"
        Write-Host "4. Voltar"
        
        $action = Read-Host "Digite sua opção"
        
        switch ($action) {
            "1" {
                $eventsPath = "$($selectedSim.FullName)\eventos.log"
                if (Test-Path $eventsPath) {
                    Clear-Host
                    Write-Host "=================================================================" -ForegroundColor Cyan
                    Write-Host "                REGISTRO DE EVENTOS" -ForegroundColor Cyan
                    Write-Host "=================================================================" -ForegroundColor Cyan
                    Write-Host ""
                    Get-Content -Path $eventsPath | Write-Host
                } else {
                    Write-Host "Registro de eventos não encontrado!" -ForegroundColor Red
                }
                Read-Host "Pressione Enter para continuar"
            }
            "2" {
                $feedbackPath = "$($selectedSim.FullName)\feedback.md"
                if (Test-Path $feedbackPath) {
                    Clear-Host
                    Write-Host "=================================================================" -ForegroundColor Cyan
                    Write-Host "                FEEDBACK E LIÇÕES APRENDIDAS" -ForegroundColor Cyan
                    Write-Host "=================================================================" -ForegroundColor Cyan
                    Write-Host ""
                    Get-Content -Path $feedbackPath | Write-Host
                } else {
                    Write-Host "Feedback não encontrado!" -ForegroundColor Red
                }
                Read-Host "Pressione Enter para continuar"
            }
            "3" {
                Generate-SimulationReport -SimulationDir $selectedSim.FullName
            }
        }
    } else {
        Write-Host "Opção inválida!" -ForegroundColor Red
        Read-Host "Pressione Enter para continuar"
    }
}

function Show-Menu {
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "      SIMULAÇÃO DE INCIDENTES DE SEGURANÇA - AÇUCARADAS ENCOMENDAS" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Menu Principal:" -ForegroundColor Yellow
    Write-Host "1. Iniciar nova simulação"
    Write-Host "2. Criar novo cenário"
    Write-Host "3. Ver resultados de simulações anteriores"
    Write-Host "4. Gerar relatório de simulação"
    Write-Host "0. Sair"
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    $choice = Read-Host "Digite sua opção"
    return $choice
}

# Inicialização
Write-Host "Inicializando ambiente de simulação de incidentes..." -ForegroundColor Cyan
Initialize-Environment

# Menu principal
$exit = $false
while (-not $exit) {
    $choice = Show-Menu
    
    switch ($choice) {
        "0" { $exit = $true }
        "1" {
            $scenarios = Show-AvailableScenarios
            if ($scenarios.Count -gt 0) {
                $scenarioIndex = Read-Host "Digite o número do cenário que deseja simular"
                if ($scenarioIndex -match '^\d+$' -and [int]$scenarioIndex -ge 0 -and [int]$scenarioIndex -lt $scenarios.Count) {
                    Run-SimulationExercise -ScenarioPath $scenarios[[int]$scenarioIndex].FullName
                } else {
                    Write-Host "Índice de cenário inválido!" -ForegroundColor Red
                    Read-Host "Pressione Enter para continuar"
                }
            } else {
                Read-Host "Pressione Enter para continuar"
            }
        }
        "2" { Create-NewScenario }
        "3" { Show-SimulationResults }
        "4" {
            $simulations = Get-ChildItem -Path $resultsDir -Directory
            if ($simulations.Count -eq 0) {
                Write-Host "Nenhuma simulação encontrada." -ForegroundColor Red
                Read-Host "Pressione Enter para continuar"
            } else {
                Write-Host "`nSimulações Disponíveis para Relatório:`" -ForegroundColor Cyan
                for ($i = 0; $i -lt $simulations.Count; $i++) {
                    Write-Host "[$i] $($simulations[$i].Name)" -ForegroundColor Yellow
                }
                
                $simIndex = Read-Host "Digite o número da simulação para gerar relatório"
                if ($simIndex -match '^\d+$' -and [int]$simIndex -ge 0 -and [int]$simIndex -lt $simulations.Count) {
                    Generate-SimulationReport -SimulationDir $simulations[[int]$simIndex].FullName
                } else {
                    Write-Host "Índice de simulação inválido!" -ForegroundColor Red
                    Read-Host "Pressione Enter para continuar"
                }
            }
        }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; Read-Host "Pressione Enter para continuar" }
    }
}

Write-Host "Programa finalizado." -ForegroundColor Cyan