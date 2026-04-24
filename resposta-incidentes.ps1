# Script para gerenciamento de resposta a incidentes de segurança

# Caminho para os arquivos de configuração
$configPath = Join-Path -Path $PSScriptRoot -ChildPath "incidentes-config.json"
$logsPath = Join-Path -Path $PSScriptRoot -ChildPath "logs-incidentes"
$progressoPath = Join-Path -Path $PSScriptRoot -ChildPath "progresso-seguranca.json"
$planosPath = Join-Path -Path $PSScriptRoot -ChildPath "planos-resposta"

Write-Host "=== Sistema de Resposta a Incidentes de Segurança ===" -ForegroundColor Magenta

# Criar diretórios necessários se não existirem
if (-not (Test-Path -Path $logsPath)) {
    New-Item -Path $logsPath -ItemType Directory -Force | Out-Null
    Write-Host "Diretório de logs criado em: $logsPath" -ForegroundColor Green
}

if (-not (Test-Path -Path $planosPath)) {
    New-Item -Path $planosPath -ItemType Directory -Force | Out-Null
    Write-Host "Diretório de planos de resposta criado em: $planosPath" -ForegroundColor Green
    
    # Criar arquivos de exemplo para os planos de resposta
    @(
        "violacao-dados.md",
        "malware.md",
        "ddos.md",
        "acesso-nao-autorizado.md",
        "phishing.md"
    ) | ForEach-Object {
        $filePath = Join-Path -Path $planosPath -ChildPath $_
        $fileName = $_ -replace ".md", ""
        $title = ($fileName -split '-' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) }) -join ' '
        
        $content = @"
# Plano de Resposta a Incidentes: $title

## Descrição
Este documento descreve o plano de resposta para incidentes de $title.

## Equipe de Resposta
- Coordenador de Incidentes
- Analista de Segurança
- Administrador de Sistemas
- Representante Jurídico
- Comunicação

## Etapas de Resposta

### 1. Identificação
- Confirmar a ocorrência do incidente
- Avaliar o escopo e impacto inicial
- Documentar evidências iniciais
- Notificar a equipe de resposta

### 2. Contenção
- Isolar sistemas afetados
- Bloquear acessos comprometidos
- Preservar evidências forenses
- Implementar controles temporários

### 3. Erradicação
- Remover a causa raiz do incidente
- Corrigir vulnerabilidades exploradas
- Verificar sistemas relacionados
- Implementar correções permanentes

### 4. Recuperação
- Restaurar sistemas e dados
- Validar a segurança dos sistemas
- Monitorar atividades anômalas
- Retornar à operação normal

### 5. Lições Aprendidas
- Documentar o incidente
- Analisar a causa raiz
- Atualizar procedimentos
- Implementar melhorias

## Contatos de Emergência
- Coordenador de Incidentes: [NOME] - [TELEFONE]
- CERT Nacional: [TELEFONE]
- Polícia Cibernética: [TELEFONE]

## Formulários e Modelos
- Registro de Incidente
- Relatório de Análise
- Comunicado Interno
- Notificação Externa
"@
        
        Set-Content -Path $filePath -Value $content -Force
    }
}

# Função para registrar logs
function Write-IncidentLog {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $true)]
        [ValidateSet("Info", "Warning", "Error", "Critical", "Success")]
        [string]$Level,
        
        [Parameter(Mandatory = $false)]
        [string]$IncidentId = "System"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] [$IncidentId] $Message"
    
    # Determinar o arquivo de log baseado na data atual
    $logFile = Join-Path -Path $logsPath -ChildPath ("incident-log-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    
    # Adicionar entrada ao arquivo de log
    Add-Content -Path $logFile -Value $logEntry -Force
    
    # Exibir no console com cor apropriada
    $color = switch ($Level) {
        "Info" { "White" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
        "Critical" { "DarkRed" }
        "Success" { "Green" }
        default { "White" }
    }
    
    Write-Host $logEntry -ForegroundColor $color
}

# Função para carregar a configuração de incidentes
function Get-IncidentConfig {
    if (Test-Path -Path $configPath) {
        $config = Get-Content -Path $configPath -Raw | ConvertFrom-Json
        return $config
    } else {
        # Criar configuração padrão
        $config = @{
            "TiposIncidentes" = @(
                @{
                    "Id" = "violacao-dados"
                    "Nome" = "Violação de Dados"
                    "Descricao" = "Acesso não autorizado a dados sensíveis"
                    "Severidade" = "Alta"
                    "TempoRespostaAlvo" = "2 horas"
                    "PlanoRespostaPath" = "violacao-dados.md"
                },
                @{
                    "Id" = "malware"
                    "Nome" = "Infecção por Malware"
                    "Descricao" = "Sistemas infectados por malware ou ransomware"
                    "Severidade" = "Alta"
                    "TempoRespostaAlvo" = "1 hora"
                    "PlanoRespostaPath" = "malware.md"
                },
                @{
                    "Id" = "ddos"
                    "Nome" = "Ataque DDoS"
                    "Descricao" = "Ataque de negação de serviço distribuído"
                    "Severidade" = "Média"
                    "TempoRespostaAlvo" = "30 minutos"
                    "PlanoRespostaPath" = "ddos.md"
                },
                @{
                    "Id" = "acesso-nao-autorizado"
                    "Nome" = "Acesso Não Autorizado"
                    "Descricao" = "Tentativa de acesso não autorizado a sistemas"
                    "Severidade" = "Média"
                    "TempoRespostaAlvo" = "4 horas"
                    "PlanoRespostaPath" = "acesso-nao-autorizado.md"
                },
                @{
                    "Id" = "phishing"
                    "Nome" = "Ataque de Phishing"
                    "Descricao" = "Tentativa de phishing contra funcionários"
                    "Severidade" = "Média"
                    "TempoRespostaAlvo" = "3 horas"
                    "PlanoRespostaPath" = "phishing.md"
                }
            )
            "EquipeResposta" = @(
                @{
                    "Nome" = "João Silva"
                    "Cargo" = "Coordenador de Incidentes"
                    "Email" = "joao.silva@acucaradas.com"
                    "Telefone" = "(11) 98765-4321"
                    "Papel" = "Coordenador"
                },
                @{
                    "Nome" = "Maria Oliveira"
                    "Cargo" = "Analista de Segurança"
                    "Email" = "maria.oliveira@acucaradas.com"
                    "Telefone" = "(11) 91234-5678"
                    "Papel" = "Analista"
                },
                @{
                    "Nome" = "Carlos Pereira"
                    "Cargo" = "Administrador de Sistemas"
                    "Email" = "carlos.pereira@acucaradas.com"
                    "Telefone" = "(11) 99876-5432"
                    "Papel" = "Técnico"
                }
            )
            "IncidentesRegistrados" = @()
            "UltimoIncidenteId" = 0
            "UltimaAtualizacao" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
            "SimulacaoRealizada" = $false
        }
        
        $config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Force
        return $config
    }
}

# Função para salvar a configuração de incidentes
function Save-IncidentConfig {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$Config
    )
    
    $Config.UltimaAtualizacao = (Get-Date).ToString("dd/MM/yyyy HH:mm")
    $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Force
    
    # Atualizar também o arquivo de progresso de segurança
    if (Test-Path -Path $progressoPath) {
        $progressoConfig = Get-Content -Path $progressoPath -Raw | ConvertFrom-Json
        
        # Calcular progresso da resposta a incidentes
        $respostaIncidentesProgresso = 0
        
        if ($Config.SimulacaoRealizada) {
            $respostaIncidentesProgresso += 50
        }
        
        if ($Config.IncidentesRegistrados.Count -gt 0) {
            $respostaIncidentesProgresso += 25
        }
        
        if ($Config.EquipeResposta.Count -ge 3) {
            $respostaIncidentesProgresso += 25
        }
        
        # Atualizar o progresso no arquivo de configuração
        $progressoConfig.RespostaIncidentes.Progresso = $respostaIncidentesProgresso
        
        if ($respostaIncidentesProgresso -eq 100) {
            $progressoConfig.RespostaIncidentes.Status = "Concluído"
        } elseif ($respostaIncidentesProgresso -gt 0) {
            $progressoConfig.RespostaIncidentes.Status = "Em Progresso"
        } else {
            $progressoConfig.RespostaIncidentes.Status = "Não Iniciado"
        }
        
        # Recalcular o progresso geral
        $progressoGeral = (
            $progressoConfig.AnaliseEstatica.Progresso + 
            $progressoConfig.TestesPenetracao.Progresso + 
            $progressoConfig.Monitoramento.Progresso + 
            $progressoConfig.Treinamento.Progresso + 
            $progressoConfig.RespostaIncidentes.Progresso
        ) / 5
        
        $progressoConfig.ProgressoGeral = [Math]::Round($progressoGeral)
        
        $progressoConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $progressoPath -Force
    }
}

# Função para listar tipos de incidentes
function Show-IncidentTypes {
    $config = Get-IncidentConfig
    
    Write-Host "`nTipos de Incidentes Configurados:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    foreach ($tipo in $config.TiposIncidentes) {
        Write-Host "$($tipo.Id): $($tipo.Nome)" -ForegroundColor Yellow
        Write-Host "  Descrição: $($tipo.Descricao)"
        Write-Host "  Severidade: $($tipo.Severidade)"
        Write-Host "  Tempo de Resposta Alvo: $($tipo.TempoRespostaAlvo)"
        Write-Host "  Plano de Resposta: $($tipo.PlanoRespostaPath)"
        Write-Host "----------------------------------------" -ForegroundColor Cyan
    }
}

# Função para listar equipe de resposta
function Show-ResponseTeam {
    $config = Get-IncidentConfig
    
    Write-Host "`nEquipe de Resposta a Incidentes:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    foreach ($membro in $config.EquipeResposta) {
        Write-Host "$($membro.Nome) - $($membro.Cargo)" -ForegroundColor Yellow
        Write-Host "  Email: $($membro.Email)"
        Write-Host "  Telefone: $($membro.Telefone)"
        Write-Host "  Papel na Equipe: $($membro.Papel)"
        Write-Host "----------------------------------------" -ForegroundColor Cyan
    }
}

# Função para listar incidentes registrados
function Show-Incidents {
    $config = Get-IncidentConfig
    
    if ($config.IncidentesRegistrados.Count -eq 0) {
        Write-Host "`nNenhum incidente registrado." -ForegroundColor Yellow
        return
    }
    
    Write-Host "`nIncidentes Registrados:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    foreach ($incidente in $config.IncidentesRegistrados) {
        $statusColor = switch ($incidente.Status) {
            "Aberto" { "Red" }
            "Em Andamento" { "Yellow" }
            "Resolvido" { "Green" }
            "Fechado" { "DarkGray" }
            default { "White" }
        }
        
        Write-Host "ID: $($incidente.Id) - $($incidente.Tipo)" -ForegroundColor Yellow
        Write-Host "  Título: $($incidente.Titulo)"
        Write-Host "  Data de Registro: $($incidente.DataRegistro)"
        Write-Host "  Status: $($incidente.Status)" -ForegroundColor $statusColor
        Write-Host "  Severidade: $($incidente.Severidade)"
        Write-Host "  Responsável: $($incidente.Responsavel)"
        Write-Host "----------------------------------------" -ForegroundColor Cyan
    }
}

# Função para adicionar um novo tipo de incidente
function Add-IncidentType {
    $config = Get-IncidentConfig
    
    Write-Host "`nAdicionar Novo Tipo de Incidente" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    $id = Read-Host "ID do tipo de incidente (sem espaços, use hífens)"
    
    # Verificar se o ID já existe
    if (($config.TiposIncidentes | Where-Object { $_.Id -eq $id }).Count -gt 0) {
        Write-Host "ERRO: Já existe um tipo de incidente com este ID." -ForegroundColor Red
        return
    }
    
    $nome = Read-Host "Nome do tipo de incidente"
    $descricao = Read-Host "Descrição do tipo de incidente"
    $severidade = Read-Host "Severidade (Baixa, Média, Alta, Crítica)"
    $tempoResposta = Read-Host "Tempo de resposta alvo (ex: 2 horas)"
    
    # Criar arquivo de plano de resposta
    $planoPath = "$id.md"
    $planoFilePath = Join-Path -Path $planosPath -ChildPath $planoPath
    
    if (-not (Test-Path -Path $planoFilePath)) {
        $title = ($id -split '-' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) }) -join ' '
        
        $content = @"
# Plano de Resposta a Incidentes: $title

## Descrição
Este documento descreve o plano de resposta para incidentes de $title.

## Equipe de Resposta
- Coordenador de Incidentes
- Analista de Segurança
- Administrador de Sistemas
- Representante Jurídico
- Comunicação

## Etapas de Resposta

### 1. Identificação
- Confirmar a ocorrência do incidente
- Avaliar o escopo e impacto inicial
- Documentar evidências iniciais
- Notificar a equipe de resposta

### 2. Contenção
- Isolar sistemas afetados
- Bloquear acessos comprometidos
- Preservar evidências forenses
- Implementar controles temporários

### 3. Erradicação
- Remover a causa raiz do incidente
- Corrigir vulnerabilidades exploradas
- Verificar sistemas relacionados
- Implementar correções permanentes

### 4. Recuperação
- Restaurar sistemas e dados
- Validar a segurança dos sistemas
- Monitorar atividades anômalas
- Retornar à operação normal

### 5. Lições Aprendidas
- Documentar o incidente
- Analisar a causa raiz
- Atualizar procedimentos
- Implementar melhorias

## Contatos de Emergência
- Coordenador de Incidentes: [NOME] - [TELEFONE]
- CERT Nacional: [TELEFONE]
- Polícia Cibernética: [TELEFONE]

## Formulários e Modelos
- Registro de Incidente
- Relatório de Análise
- Comunicado Interno
- Notificação Externa
"@
        
        Set-Content -Path $planoFilePath -Value $content -Force
        Write-Host "Plano de resposta criado em: $planoFilePath" -ForegroundColor Green
    }
    
    # Criar o novo tipo de incidente
    $novoTipo = @{
        "Id" = $id
        "Nome" = $nome
        "Descricao" = $descricao
        "Severidade" = $severidade
        "TempoRespostaAlvo" = $tempoResposta
        "PlanoRespostaPath" = $planoPath
    }
    
    # Adicionar à configuração
    $config.TiposIncidentes += $novoTipo
    
    # Salvar a configuração
    Save-IncidentConfig -Config $config
    
    Write-Host "Tipo de incidente '$nome' adicionado com sucesso!" -ForegroundColor Green
    Write-IncidentLog -Message "Novo tipo de incidente adicionado: $nome" -Level "Info"
}

# Função para adicionar um novo membro à equipe de resposta
function Add-ResponseTeamMember {
    $config = Get-IncidentConfig
    
    Write-Host "`nAdicionar Novo Membro à Equipe de Resposta" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    $nome = Read-Host "Nome do membro"
    $cargo = Read-Host "Cargo do membro"
    $email = Read-Host "Email do membro"
    $telefone = Read-Host "Telefone do membro"
    $papel = Read-Host "Papel na equipe (Coordenador, Analista, Técnico, Comunicação, Jurídico)"
    
    # Criar o novo membro
    $novoMembro = @{
        "Nome" = $nome
        "Cargo" = $cargo
        "Email" = $email
        "Telefone" = $telefone
        "Papel" = $papel
    }
    
    # Adicionar à configuração
    $config.EquipeResposta += $novoMembro
    
    # Salvar a configuração
    Save-IncidentConfig -Config $config
    
    Write-Host "Membro '$nome' adicionado à equipe de resposta com sucesso!" -ForegroundColor Green
    Write-IncidentLog -Message "Novo membro adicionado à equipe de resposta: $nome" -Level "Info"
}

# Função para registrar um novo incidente
function Register-Incident {
    $config = Get-IncidentConfig
    
    Write-Host "`nRegistrar Novo Incidente" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    # Listar tipos de incidentes disponíveis
    Write-Host "Tipos de incidentes disponíveis:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $config.TiposIncidentes.Count; $i++) {
        Write-Host "$($i+1). $($config.TiposIncidentes[$i].Nome) ($($config.TiposIncidentes[$i].Id))"
    }
    
    $tipoIndex = [int](Read-Host "`nSelecione o número do tipo de incidente") - 1
    
    if ($tipoIndex -lt 0 -or $tipoIndex -ge $config.TiposIncidentes.Count) {
        Write-Host "ERRO: Seleção de tipo de incidente inválida." -ForegroundColor Red
        return
    }
    
    $tipoIncidente = $config.TiposIncidentes[$tipoIndex]
    
    $titulo = Read-Host "Título do incidente"
    $descricao = Read-Host "Descrição do incidente"
    $impacto = Read-Host "Impacto (Baixo, Médio, Alto, Crítico)"
    $sistemas = Read-Host "Sistemas afetados (separados por vírgula)"
    
    # Listar membros da equipe de resposta disponíveis
    Write-Host "`nMembros da equipe de resposta disponíveis:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $config.EquipeResposta.Count; $i++) {
        Write-Host "$($i+1). $($config.EquipeResposta[$i].Nome) - $($config.EquipeResposta[$i].Papel)"
    }
    
    $responsavelIndex = [int](Read-Host "`nSelecione o número do responsável pelo incidente") - 1
    
    if ($responsavelIndex -lt 0 -or $responsavelIndex -ge $config.EquipeResposta.Count) {
        Write-Host "ERRO: Seleção de responsável inválida." -ForegroundColor Red
        return
    }
    
    $responsavel = $config.EquipeResposta[$responsavelIndex].Nome
    
    # Incrementar o ID do incidente
    $config.UltimoIncidenteId++
    $incidenteId = "INC-" + $config.UltimoIncidenteId.ToString("D4")
    
    # Criar o novo incidente
    $novoIncidente = @{
        "Id" = $incidenteId
        "Tipo" = $tipoIncidente.Nome
        "TipoId" = $tipoIncidente.Id
        "Titulo" = $titulo
        "Descricao" = $descricao
        "DataRegistro" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
        "Status" = "Aberto"
        "Severidade" = $tipoIncidente.Severidade
        "Impacto" = $impacto
        "SistemasAfetados" = $sistemas -split ',' | ForEach-Object { $_.Trim() }
        "Responsavel" = $responsavel
        "Atualizacoes" = @(
            @{
                "Data" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
                "Autor" = "Sistema"
                "Descricao" = "Incidente registrado."
                "Status" = "Aberto"
            }
        )
    }
    
    # Adicionar à configuração
    $config.IncidentesRegistrados += $novoIncidente
    
    # Salvar a configuração
    Save-IncidentConfig -Config $config
    
    Write-Host "Incidente '$titulo' registrado com sucesso! ID: $incidenteId" -ForegroundColor Green
    Write-IncidentLog -Message "Novo incidente registrado: $titulo" -Level "Warning" -IncidentId $incidenteId
    
    # Exibir plano de resposta
    $planoPath = Join-Path -Path $planosPath -ChildPath $tipoIncidente.PlanoRespostaPath
    
    if (Test-Path -Path $planoPath) {
        $exibirPlano = Read-Host "`nDeseja exibir o plano de resposta para este tipo de incidente? (S/N)"
        
        if ($exibirPlano -eq "S" -or $exibirPlano -eq "s") {
            $planoConteudo = Get-Content -Path $planoPath -Raw
            Write-Host "`n$planoConteudo" -ForegroundColor White
        }
    }
    
    return $incidenteId
}

# Função para atualizar um incidente existente
function Update-Incident {
    $config = Get-IncidentConfig
    
    if ($config.IncidentesRegistrados.Count -eq 0) {
        Write-Host "`nNenhum incidente registrado para atualizar." -ForegroundColor Yellow
        return
    }
    
    Write-Host "`nAtualizar Incidente Existente" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    # Listar incidentes disponíveis
    Write-Host "Incidentes disponíveis:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $config.IncidentesRegistrados.Count; $i++) {
        $incidente = $config.IncidentesRegistrados[$i]
        Write-Host "$($i+1). $($incidente.Id) - $($incidente.Titulo) [$($incidente.Status)]"
    }
    
    $incidenteIndex = [int](Read-Host "`nSelecione o número do incidente") - 1
    
    if ($incidenteIndex -lt 0 -or $incidenteIndex -ge $config.IncidentesRegistrados.Count) {
        Write-Host "ERRO: Seleção de incidente inválida." -ForegroundColor Red
        return
    }
    
    $incidente = $config.IncidentesRegistrados[$incidenteIndex]
    
    Write-Host "`nDetalhes do Incidente:" -ForegroundColor Yellow
    Write-Host "ID: $($incidente.Id)"
    Write-Host "Título: $($incidente.Titulo)"
    Write-Host "Tipo: $($incidente.Tipo)"
    Write-Host "Status Atual: $($incidente.Status)"
    Write-Host "Severidade: $($incidente.Severidade)"
    Write-Host "Responsável: $($incidente.Responsavel)"
    
    # Opções de atualização
    Write-Host "`nOpções de Atualização:" -ForegroundColor Yellow
    Write-Host "1. Adicionar Atualização"
    Write-Host "2. Alterar Status"
    Write-Host "3. Alterar Responsável"
    Write-Host "4. Voltar"
    
    $opcao = Read-Host "`nEscolha uma opção"
    
    switch ($opcao) {
        "1" {
            $descricao = Read-Host "Descrição da atualização"
            
            $atualizacao = @{
                "Data" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
                "Autor" = Read-Host "Autor da atualização"
                "Descricao" = $descricao
                "Status" = $incidente.Status
            }
            
            $config.IncidentesRegistrados[$incidenteIndex].Atualizacoes += $atualizacao
            
            Write-Host "Atualização adicionada com sucesso!" -ForegroundColor Green
            Write-IncidentLog -Message "Atualização adicionada ao incidente: $descricao" -Level "Info" -IncidentId $incidente.Id
        }
        "2" {
            Write-Host "`nStatus disponíveis:" -ForegroundColor Yellow
            Write-Host "1. Aberto"
            Write-Host "2. Em Andamento"
            Write-Host "3. Resolvido"
            Write-Host "4. Fechado"
            
            $statusIndex = Read-Host "`nSelecione o novo status"
            
            $novoStatus = switch ($statusIndex) {
                "1" { "Aberto" }
                "2" { "Em Andamento" }
                "3" { "Resolvido" }
                "4" { "Fechado" }
                default { $incidente.Status }
            }
            
            if ($novoStatus -ne $incidente.Status) {
                $config.IncidentesRegistrados[$incidenteIndex].Status = $novoStatus
                
                $atualizacao = @{
                    "Data" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
                    "Autor" = Read-Host "Autor da atualização"
                    "Descricao" = "Status alterado de '$($incidente.Status)' para '$novoStatus'."
                    "Status" = $novoStatus
                }
                
                $config.IncidentesRegistrados[$incidenteIndex].Atualizacoes += $atualizacao
                
                Write-Host "Status atualizado com sucesso!" -ForegroundColor Green
                Write-IncidentLog -Message "Status do incidente alterado para: $novoStatus" -Level "Info" -IncidentId $incidente.Id
            } else {
                Write-Host "Status não foi alterado." -ForegroundColor Yellow
            }
        }
        "3" {
            # Listar membros da equipe de resposta disponíveis
            Write-Host "`nMembros da equipe de resposta disponíveis:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $config.EquipeResposta.Count; $i++) {
                Write-Host "$($i+1). $($config.EquipeResposta[$i].Nome) - $($config.EquipeResposta[$i].Papel)"
            }
            
            $responsavelIndex = [int](Read-Host "`nSelecione o número do novo responsável") - 1
            
            if ($responsavelIndex -lt 0 -or $responsavelIndex -ge $config.EquipeResposta.Count) {
                Write-Host "ERRO: Seleção de responsável inválida." -ForegroundColor Red
                return
            }
            
            $novoResponsavel = $config.EquipeResposta[$responsavelIndex].Nome
            
            if ($novoResponsavel -ne $incidente.Responsavel) {
                $antigoResponsavel = $incidente.Responsavel
                $config.IncidentesRegistrados[$incidenteIndex].Responsavel = $novoResponsavel
                
                $atualizacao = @{
                    "Data" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
                    "Autor" = Read-Host "Autor da atualização"
                    "Descricao" = "Responsável alterado de '$antigoResponsavel' para '$novoResponsavel'."
                    "Status" = $incidente.Status
                }
                
                $config.IncidentesRegistrados[$incidenteIndex].Atualizacoes += $atualizacao
                
                Write-Host "Responsável atualizado com sucesso!" -ForegroundColor Green
                Write-IncidentLog -Message "Responsável do incidente alterado para: $novoResponsavel" -Level "Info" -IncidentId $incidente.Id
            } else {
                Write-Host "Responsável não foi alterado." -ForegroundColor Yellow
            }
        }
        "4" {
            return
        }
        default {
            Write-Host "Opção inválida!" -ForegroundColor Red
            return
        }
    }
    
    # Salvar a configuração
    Save-IncidentConfig -Config $config
}

# Função para visualizar detalhes de um incidente
function Show-IncidentDetails {
    $config = Get-IncidentConfig
    
    if ($config.IncidentesRegistrados.Count -eq 0) {
        Write-Host "`nNenhum incidente registrado para visualizar." -ForegroundColor Yellow
        return
    }
    
    Write-Host "`nVisualizar Detalhes do Incidente" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    # Listar incidentes disponíveis
    Write-Host "Incidentes disponíveis:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $config.IncidentesRegistrados.Count; $i++) {
        $incidente = $config.IncidentesRegistrados[$i]
        Write-Host "$($i+1). $($incidente.Id) - $($incidente.Titulo) [$($incidente.Status)]"
    }
    
    $incidenteIndex = [int](Read-Host "`nSelecione o número do incidente") - 1
    
    if ($incidenteIndex -lt 0 -or $incidenteIndex -ge $config.IncidentesRegistrados.Count) {
        Write-Host "ERRO: Seleção de incidente inválida." -ForegroundColor Red
        return
    }
    
    $incidente = $config.IncidentesRegistrados[$incidenteIndex]
    
    $statusColor = switch ($incidente.Status) {
        "Aberto" { "Red" }
        "Em Andamento" { "Yellow" }
        "Resolvido" { "Green" }
        "Fechado" { "DarkGray" }
        default { "White" }
    }
    
    Write-Host "`n=== Detalhes do Incidente ===" -ForegroundColor Magenta
    Write-Host "ID: $($incidente.Id)" -ForegroundColor Yellow
    Write-Host "Título: $($incidente.Titulo)"
    Write-Host "Tipo: $($incidente.Tipo)"
    Write-Host "Descrição: $($incidente.Descricao)"
    Write-Host "Data de Registro: $($incidente.DataRegistro)"
    Write-Host "Status: $($incidente.Status)" -ForegroundColor $statusColor
    Write-Host "Severidade: $($incidente.Severidade)"
    Write-Host "Impacto: $($incidente.Impacto)"
    Write-Host "Sistemas Afetados: $($incidente.SistemasAfetados -join ', ')"
    Write-Host "Responsável: $($incidente.Responsavel)"
    
    Write-Host "`nHistórico de Atualizações:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    foreach ($atualizacao in $incidente.Atualizacoes) {
        $atualizacaoStatusColor = switch ($atualizacao.Status) {
            "Aberto" { "Red" }
            "Em Andamento" { "Yellow" }
            "Resolvido" { "Green" }
            "Fechado" { "DarkGray" }
            default { "White" }
        }
        
        Write-Host "[$($atualizacao.Data)] $($atualizacao.Autor)" -ForegroundColor Yellow
        Write-Host "Status: $($atualizacao.Status)" -ForegroundColor $atualizacaoStatusColor
        Write-Host "$($atualizacao.Descricao)"
        Write-Host "----------------------------------------" -ForegroundColor Cyan
    }
    
    # Exibir plano de resposta
    $tipoIncidente = $config.TiposIncidentes | Where-Object { $_.Id -eq $incidente.TipoId } | Select-Object -First 1
    
    if ($null -ne $tipoIncidente) {
        $planoPath = Join-Path -Path $planosPath -ChildPath $tipoIncidente.PlanoRespostaPath
        
        if (Test-Path -Path $planoPath) {
            $exibirPlano = Read-Host "`nDeseja exibir o plano de resposta para este tipo de incidente? (S/N)"
            
            if ($exibirPlano -eq "S" -or $exibirPlano -eq "s") {
                $planoConteudo = Get-Content -Path $planoPath -Raw
                Write-Host "`n$planoConteudo" -ForegroundColor White
            }
        }
    }
}

# Função para gerar relatório de incidentes
function New-IncidentReport {
    $config = Get-IncidentConfig
    
    $reportPath = Join-Path -Path $PSScriptRoot -ChildPath "relatorio-incidentes.html"
    
    Write-Host "`nGerando relatório de incidentes..." -ForegroundColor Cyan
    
    # Calcular estatísticas
    $totalIncidentes = $config.IncidentesRegistrados.Count
    $incidentesAbertos = ($config.IncidentesRegistrados | Where-Object { $_.Status -eq "Aberto" }).Count
    $incidentesEmAndamento = ($config.IncidentesRegistrados | Where-Object { $_.Status -eq "Em Andamento" }).Count
    $incidentesResolvidos = ($config.IncidentesRegistrados | Where-Object { $_.Status -eq "Resolvido" }).Count
    $incidentesFechados = ($config.IncidentesRegistrados | Where-Object { $_.Status -eq "Fechado" }).Count
    
    $incidentesCriticos = ($config.IncidentesRegistrados | Where-Object { $_.Severidade -eq "Crítica" }).Count
    $incidentesAltos = ($config.IncidentesRegistrados | Where-Object { $_.Severidade -eq "Alta" }).Count
    $incidentesMedios = ($config.IncidentesRegistrados | Where-Object { $_.Severidade -eq "Média" }).Count
    $incidentesBaixos = ($config.IncidentesRegistrados | Where-Object { $_.Severidade -eq "Baixa" }).Count
    
    # Gerar HTML do relatório
    $htmlRelatorio = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Incidentes de Segurança - Açucaradas Encomendas</title>
    <style>
        :root {
            --primary-color: #8e44ad;
            --secondary-color: #9b59b6;
            --accent-color: #e74c3c;
            --text-color: #333;
            --light-bg: #f5f5f5;
            --card-bg: #fff;
            --success-color: #2ecc71;
            --warning-color: #f39c12;
            --danger-color: #e74c3c;
            --info-color: #3498db;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--light-bg);
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: var(--primary-color);
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        
        h1, h2, h3 {
            margin-top: 0;
        }
        
        .report-info {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .stats-section {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .stat-card {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            border-top: 3px solid var(--primary-color);
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .stat-open .stat-value {
            color: var(--danger-color);
        }
        
        .stat-progress .stat-value {
            color: var(--warning-color);
        }
        
        .stat-resolved .stat-value {
            color: var(--success-color);
        }
        
        .stat-closed .stat-value {
            color: var(--info-color);
        }
        
        .incidents-section {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .incidents-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .incidents-table th {
            background-color: #f0f0f0;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #ddd;
        }
        
        .incidents-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        
        .incidents-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .status-tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            color: white;
        }
        
        .status-open {
            background-color: var(--danger-color);
        }
        
        .status-progress {
            background-color: var(--warning-color);
        }
        
        .status-resolved {
            background-color: var(--success-color);
        }
        
        .status-closed {
            background-color: #7f8c8d;
        }
        
        .severity-tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            color: white;
        }
        
        .severity-critical {
            background-color: #800000;
        }
        
        .severity-high {
            background-color: var(--danger-color);
        }
        
        .severity-medium {
            background-color: var(--warning-color);
        }
        
        .severity-low {
            background-color: var(--info-color);
        }
        
        .team-section {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .team-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .team-card {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border-left: 3px solid var(--primary-color);
        }
        
        .team-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .team-role {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }
        
        .team-contact {
            font-size: 0.8em;
            color: #777;
        }
        
        footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            color: #777;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .stats-grid, .team-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 480px) {
            .stats-grid, .team-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>Relatório de Incidentes de Segurança</h1>
        <p>Açucaradas Encomendas - Sistema de Resposta a Incidentes</p>
    </header>
    
    <div class="container">
        <div class="report-info">
            <h2>Informações do Relatório</h2>
            <p><strong>Data do Relatório:</strong> {{DATA_RELATORIO}}</p>
            <p><strong>Total de Incidentes:</strong> {{TOTAL_INCIDENTES}}</p>
            <p><strong>Período:</strong> Todos os incidentes registrados</p>
        </div>
        
        <div class="stats-section">
            <h2>Estatísticas de Incidentes</h2>
            
            <h3>Por Status</h3>
            <div class="stats-grid">
                <div class="stat-card stat-open">
                    <h3>Abertos</h3>
                    <div class="stat-value">{{INCIDENTES_ABERTOS}}</div>
                </div>
                <div class="stat-card stat-progress">
                    <h3>Em Andamento</h3>
                    <div class="stat-value">{{INCIDENTES_EM_ANDAMENTO}}</div>
                </div>
                <div class="stat-card stat-resolved">
                    <h3>Resolvidos</h3>
                    <div class="stat-value">{{INCIDENTES_RESOLVIDOS}}</div>
                </div>
                <div class="stat-card stat-closed">
                    <h3>Fechados</h3>
                    <div class="stat-value">{{INCIDENTES_FECHADOS}}</div>
                </div>
            </div>
            
            <h3>Por Severidade</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Crítica</h3>
                    <div class="stat-value" style="color: #800000;">{{INCIDENTES_CRITICOS}}</div>
                </div>
                <div class="stat-card">
                    <h3>Alta</h3>
                    <div class="stat-value" style="color: #e74c3c;">{{INCIDENTES_ALTOS}}</div>
                </div>
                <div class="stat-card">
                    <h3>Média</h3>
                    <div class="stat-value" style="color: #f39c12;">{{INCIDENTES_MEDIOS}}</div>
                </div>
                <div class="stat-card">
                    <h3>Baixa</h3>
                    <div class="stat-value" style="color: #3498db;">{{INCIDENTES_BAIXOS}}</div>
                </div>
            </div>
        </div>
        
        <div class="incidents-section">
            <h2>Lista de Incidentes</h2>
            <table class="incidents-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Tipo</th>
                        <th>Data</th>
                        <th>Status</th>
                        <th>Severidade</th>
                        <th>Responsável</th>
                    </tr>
                </thead>
                <tbody>
                    {{INCIDENTES_ROWS}}
                </tbody>
            </table>
        </div>
        
        <div class="team-section">
            <h2>Equipe de Resposta</h2>
            <div class="team-grid">
                {{EQUIPE_CARDS}}
            </div>
        </div>
    </div>
    
    <footer>
        <p>Relatório gerado automaticamente pelo Sistema de Resposta a Incidentes - Açucaradas Encomendas</p>
        <p>© 2023 Açucaradas Encomendas. Todos os direitos reservados.</p>
    </footer>
</body>
</html>
"@
    
    # Substituir placeholders com dados reais
    $htmlRelatorio = $htmlRelatorio.Replace("{{DATA_RELATORIO}}", (Get-Date).ToString("dd/MM/yyyy HH:mm"))
    $htmlRelatorio = $htmlRelatorio.Replace("{{TOTAL_INCIDENTES}}", $totalIncidentes)
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_ABERTOS}}", $incidentesAbertos)
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_EM_ANDAMENTO}}", $incidentesEmAndamento)
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_RESOLVIDOS}}", $incidentesResolvidos)
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_FECHADOS}}", $incidentesFechados)
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_CRITICOS}}", $incidentesCriticos)
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_ALTOS}}", $incidentesAltos)
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_MEDIOS}}", $incidentesMedios)
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_BAIXOS}}", $incidentesBaixos)
    
    # Gerar linhas da tabela de incidentes
    $incidentesRows = ""
    
    foreach ($incidente in $config.IncidentesRegistrados) {
        $statusClass = switch ($incidente.Status) {
            "Aberto" { "status-open" }
            "Em Andamento" { "status-progress" }
            "Resolvido" { "status-resolved" }
            "Fechado" { "status-closed" }
            default { "" }
        }
        
        $severityClass = switch ($incidente.Severidade) {
            "Crítica" { "severity-critical" }
            "Alta" { "severity-high" }
            "Média" { "severity-medium" }
            "Baixa" { "severity-low" }
            default { "severity-low" }
        }
        
        $incidentesRows += @"
        <tr>
            <td>$($incidente.Id)</td>
            <td>$($incidente.Titulo)</td>
            <td>$($incidente.Tipo)</td>
            <td>$($incidente.DataRegistro)</td>
            <td><span class="status-tag $statusClass">$($incidente.Status)</span></td>
            <td><span class="severity-tag $severityClass">$($incidente.Severidade)</span></td>
            <td>$($incidente.Responsavel)</td>
        </tr>
"@
    }
    
    $htmlRelatorio = $htmlRelatorio.Replace("{{INCIDENTES_ROWS}}", $incidentesRows)
    
    # Gerar cards da equipe de resposta
    $equipeCards = ""
    
    foreach ($membro in $config.EquipeResposta) {
        $equipeCards += @"
        <div class="team-card">
            <div class="team-name">$($membro.Nome)</div>
            <div class="team-role">$($membro.Cargo) - $($membro.Papel)</div>
            <div class="team-contact">
                <div>Email: $($membro.Email)</div>
                <div>Telefone: $($membro.Telefone)</div>
            </div>
        </div>
"@
    }
    
    $htmlRelatorio = $htmlRelatorio.Replace("{{EQUIPE_CARDS}}", $equipeCards)
    
    # Salvar relatório
    $htmlRelatorio | Set-Content -Path $reportPath -Force
    
    Write-Host "Relatório gerado com sucesso em: $reportPath" -ForegroundColor Green
    
    return $reportPath
}

# Função para simular um incidente
function Start-IncidentSimulation {
    $config = Get-IncidentConfig
    
    Write-Host "`nSimulação de Resposta a Incidentes" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    # Listar tipos de incidentes disponíveis
    Write-Host "Tipos de incidentes disponíveis para simulação:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $config.TiposIncidentes.Count; $i++) {
        Write-Host "$($i+1). $($config.TiposIncidentes[$i].Nome) ($($config.TiposIncidentes[$i].Id))"
    }
    
    $tipoIndex = [int](Read-Host "`nSelecione o número do tipo de incidente para simular") - 1
    
    if ($tipoIndex -lt 0 -or $tipoIndex -ge $config.TiposIncidentes.Count) {
        Write-Host "ERRO: Seleção de tipo de incidente inválida." -ForegroundColor Red
        return
    }
    
    $tipoIncidente = $config.TiposIncidentes[$tipoIndex]
    
    Write-Host "`nIniciando simulação de incidente: $($tipoIncidente.Nome)" -ForegroundColor Magenta
    Write-Host "Este é um exercício de simulação. Nenhum sistema real será afetado." -ForegroundColor Yellow
    
    # Registrar incidente simulado
    $incidenteId = Register-Incident
    
    if ([string]::IsNullOrEmpty($incidenteId)) {
        Write-Host "ERRO: Falha ao registrar o incidente simulado." -ForegroundColor Red
        return
    }
    
    # Marcar simulação como realizada
    $config.SimulacaoRealizada = $true
    Save-IncidentConfig -Config $config
    
    Write-Host "`nSimulação iniciada com sucesso! ID do incidente: $incidenteId" -ForegroundColor Green
    Write-IncidentLog -Message "Simulação de incidente iniciada: $($tipoIncidente.Nome)" -Level "Info" -IncidentId $incidenteId
    
    # Exibir cronômetro para tempo de resposta
    $tempoAlvo = $tipoIncidente.TempoRespostaAlvo
    
    Write-Host "`nTempo de resposta alvo: $tempoAlvo" -ForegroundColor Yellow
    Write-Host "Cronômetro iniciado. Pressione qualquer tecla para finalizar a simulação..." -ForegroundColor Yellow
    
    $startTime = Get-Date
    [Console]::ReadKey($true) | Out-Null
    $endTime = Get-Date
    
    $tempoDecorrido = $endTime - $startTime
    
    Write-Host "`nSimulação finalizada!" -ForegroundColor Green
    Write-Host "Tempo decorrido: $($tempoDecorrido.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan
    
    # Atualizar o incidente com o resultado da simulação
    $config = Get-IncidentConfig
    $incidenteIndex = $config.IncidentesRegistrados.IndexOf(($config.IncidentesRegistrados | Where-Object { $_.Id -eq $incidenteId } | Select-Object -First 1))
    
    if ($incidenteIndex -ge 0) {
        $config.IncidentesRegistrados[$incidenteIndex].Status = "Resolvido"
        
        $atualizacao = @{
            "Data" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
            "Autor" = "Sistema"
            "Descricao" = "Simulação finalizada. Tempo de resposta: $($tempoDecorrido.ToString('hh\:mm\:ss'))"
            "Status" = "Resolvido"
        }
        
        $config.IncidentesRegistrados[$incidenteIndex].Atualizacoes += $atualizacao
        
        Save-IncidentConfig -Config $config
        
        Write-IncidentLog -Message "Simulação de incidente finalizada. Tempo de resposta: $($tempoDecorrido.ToString('hh\:mm\:ss'))" -Level "Success" -IncidentId $incidenteId
    }
    
    # Perguntar se deseja gerar relatório
    $gerarRelatorio = Read-Host "`nDeseja gerar um relatório da simulação? (S/N)"
    
    if ($gerarRelatorio -eq "S" -or $gerarRelatorio -eq "s") {
        $reportPath = New-IncidentReport
        
        # Perguntar se deseja abrir o relatório
        $abrirRelatorio = Read-Host "`nDeseja abrir o relatório no navegador? (S/N)"
        
        if ($abrirRelatorio -eq "S" -or $abrirRelatorio -eq "s") {
            Start-Process $reportPath
        }
    }
}

# Função para atualizar o dashboard de segurança
function Update-SecurityDashboardFromIncidents {
    $dashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
    
    if (Test-Path -Path $dashboardScript) {
        Write-Host "`nAtualizando dashboard de segurança com informações de incidentes..." -ForegroundColor Cyan
        
        try {
            # Executar o script de atualização do dashboard
            & $dashboardScript
            
            Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "ERRO ao atualizar o dashboard: $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "ERRO: Script de atualização do dashboard não encontrado em: $dashboardScript" -ForegroundColor Red
        return $false
    }
}

# Menu principal
function Show-MainMenu {
    Clear-Host
    Write-Host "=== Sistema de Resposta a Incidentes de Segurança ===" -ForegroundColor Magenta
    Write-Host "Açucaradas Encomendas" -ForegroundColor Magenta
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host "1. Registrar Novo Incidente" -ForegroundColor Yellow
    Write-Host "2. Listar Incidentes" -ForegroundColor Yellow
    Write-Host "3. Visualizar Detalhes de Incidente" -ForegroundColor Yellow
    Write-Host "4. Atualizar Incidente" -ForegroundColor Yellow
    Write-Host "5. Listar Tipos de Incidentes" -ForegroundColor Yellow
    Write-Host "6. Adicionar Novo Tipo de Incidente" -ForegroundColor Yellow
    Write-Host "7. Listar Equipe de Resposta" -ForegroundColor Yellow
    Write-Host "8. Adicionar Membro à Equipe" -ForegroundColor Yellow
    Write-Host "9. Gerar Relatório de Incidentes" -ForegroundColor Yellow
    Write-Host "10. Iniciar Simulação de Incidente" -ForegroundColor Yellow
    Write-Host "11. Atualizar Dashboard de Segurança" -ForegroundColor Yellow
    Write-Host "0. Sair" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    $opcao = Read-Host "Escolha uma opção"
    
    switch ($opcao) {
        "1" { Register-Incident; pause; Show-MainMenu }
        "2" { Show-Incidents; pause; Show-MainMenu }
        "3" { Show-IncidentDetails; pause; Show-MainMenu }
        "4" { Update-Incident; pause; Show-MainMenu }
        "5" { Show-IncidentTypes; pause; Show-MainMenu }
        "6" { Add-IncidentType; pause; Show-MainMenu }
        "7" { Show-ResponseTeam; pause; Show-MainMenu }
        "8" { Add-ResponseTeamMember; pause; Show-MainMenu }
        "9" { 
            $reportPath = New-IncidentReport
            $abrirRelatorio = Read-Host "`nDeseja abrir o relatório no navegador? (S/N)"
            if ($abrirRelatorio -eq "S" -or $abrirRelatorio -eq "s") {
                Start-Process $reportPath
            }
            pause
            Show-MainMenu 
        }
        "10" { Start-IncidentSimulation; pause; Show-MainMenu }
        "11" { Update-SecurityDashboardFromIncidents; pause; Show-MainMenu }
        "0" { return }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; pause; Show-MainMenu }
    }
}

# Função auxiliar para pausar a execução
function pause {
    Write-Host "`nPressione qualquer tecla para continuar..." -ForegroundColor Cyan
    [Console]::ReadKey($true) | Out-Null
}

# Iniciar o sistema
Show-MainMenu