# Script para gerenciamento de treinamentos de segurança

# Caminho para os arquivos de configuração
$configPath = Join-Path -Path $PSScriptRoot -ChildPath "treinamento-config.json"
$progressoPath = Join-Path -Path $PSScriptRoot -ChildPath "progresso-seguranca.json"
$materiaisPath = Join-Path -Path $PSScriptRoot -ChildPath "materiais-treinamento"

Write-Host "=== Sistema de Gerenciamento de Treinamentos de Segurança ===" -ForegroundColor Magenta

# Criar diretório de materiais se não existir
if (-not (Test-Path -Path $materiaisPath)) {
    New-Item -Path $materiaisPath -ItemType Directory -Force | Out-Null
    Write-Host "Diretório de materiais criado em: $materiaisPath" -ForegroundColor Green
    
    # Criar arquivos de exemplo para os materiais de treinamento
    @(
        "seguranca-basica.md",
        "owasp-top10.md",
        "senhas-seguras.md",
        "engenharia-social.md",
        "seguranca-apis.md"
    ) | ForEach-Object {
        $filePath = Join-Path -Path $materiaisPath -ChildPath $_
        $fileName = $_ -replace ".md", ""
        $title = ($fileName -split '-' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) }) -join ' '
        
        $content = @"
# $title

## Descrição
Este é um material de treinamento sobre $title.

## Objetivos
- Compreender os conceitos básicos de $title
- Aplicar as melhores práticas de $title
- Identificar riscos relacionados a $title

## Conteúdo
1. Introdução
2. Conceitos Fundamentais
3. Melhores Práticas
4. Exemplos Práticos
5. Exercícios

## Referências
- [OWASP](https://owasp.org/)
- [NIST](https://www.nist.gov/)
- [ISO/IEC 27001](https://www.iso.org/isoiec-27001-information-security.html)
"@
        
        Set-Content -Path $filePath -Value $content -Force
    }
}

# Função para carregar a configuração de treinamentos
function Get-TrainingConfig {
    if (Test-Path -Path $configPath) {
        $config = Get-Content -Path $configPath -Raw | ConvertFrom-Json
        return $config
    } else {
        # Criar configuração padrão
        $config = @{
            "Treinamentos" = @(
                @{
                    "Id" = "seguranca-basica"
                    "Nome" = "Segurança Básica"
                    "Descricao" = "Fundamentos de segurança para todos os colaboradores"
                    "MaterialPath" = "seguranca-basica.md"
                    "DuracaoHoras" = 2
                    "Obrigatorio" = $true
                    "Participantes" = @()
                },
                @{
                    "Id" = "owasp-top10"
                    "Nome" = "OWASP Top 10"
                    "Descricao" = "As 10 vulnerabilidades mais críticas em aplicações web"
                    "MaterialPath" = "owasp-top10.md"
                    "DuracaoHoras" = 4
                    "Obrigatorio" = $true
                    "Participantes" = @()
                },
                @{
                    "Id" = "senhas-seguras"
                    "Nome" = "Senhas Seguras"
                    "Descricao" = "Boas práticas para criação e gerenciamento de senhas"
                    "MaterialPath" = "senhas-seguras.md"
                    "DuracaoHoras" = 1
                    "Obrigatorio" = $true
                    "Participantes" = @()
                },
                @{
                    "Id" = "engenharia-social"
                    "Nome" = "Engenharia Social"
                    "Descricao" = "Como identificar e prevenir ataques de engenharia social"
                    "MaterialPath" = "engenharia-social.md"
                    "DuracaoHoras" = 2
                    "Obrigatorio" = $true
                    "Participantes" = @()
                },
                @{
                    "Id" = "seguranca-apis"
                    "Nome" = "Segurança em APIs"
                    "Descricao" = "Proteção de APIs contra ataques e vulnerabilidades"
                    "MaterialPath" = "seguranca-apis.md"
                    "DuracaoHoras" = 3
                    "Obrigatorio" = $false
                    "Participantes" = @()
                }
            )
            "Equipes" = @(
                @{
                    "Id" = "desenvolvimento"
                    "Nome" = "Equipe de Desenvolvimento"
                    "Membros" = @(
                        @{
                            "Nome" = "João Silva"
                            "Email" = "joao.silva@acucaradas.com"
                            "Cargo" = "Desenvolvedor Senior"
                            "TreinamentosConcluidos" = @()
                        },
                        @{
                            "Nome" = "Maria Oliveira"
                            "Email" = "maria.oliveira@acucaradas.com"
                            "Cargo" = "Desenvolvedora Junior"
                            "TreinamentosConcluidos" = @()
                        }
                    )
                },
                @{
                    "Id" = "operacoes"
                    "Nome" = "Equipe de Operações"
                    "Membros" = @(
                        @{
                            "Nome" = "Carlos Pereira"
                            "Email" = "carlos.pereira@acucaradas.com"
                            "Cargo" = "DevOps Engineer"
                            "TreinamentosConcluidos" = @()
                        }
                    )
                },
                @{
                    "Id" = "gestao"
                    "Nome" = "Equipe de Gestão"
                    "Membros" = @(
                        @{
                            "Nome" = "Ana Souza"
                            "Email" = "ana.souza@acucaradas.com"
                            "Cargo" = "Gerente de Projetos"
                            "TreinamentosConcluidos" = @()
                        }
                    )
                }
            )
            "UltimaAtualizacao" = (Get-Date).ToString("dd/MM/yyyy HH:mm")
        }
        
        $config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Force
        return $config
    }
}

# Função para salvar a configuração de treinamentos
function Save-TrainingConfig {
    param (
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$Config
    )
    
    $Config.UltimaAtualizacao = (Get-Date).ToString("dd/MM/yyyy HH:mm")
    $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Force
    
    # Atualizar também o arquivo de progresso de segurança
    if (Test-Path -Path $progressoPath) {
        $progressoConfig = Get-Content -Path $progressoPath -Raw | ConvertFrom-Json
        
        # Calcular progresso do treinamento
        $totalMembros = 0
        $totalTreinamentosConcluidos = 0
        $treinamentosObrigatorios = ($Config.Treinamentos | Where-Object { $_.Obrigatorio -eq $true }).Count
        
        foreach ($equipe in $Config.Equipes) {
            $totalMembros += $equipe.Membros.Count
            
            foreach ($membro in $equipe.Membros) {
                $totalTreinamentosConcluidos += ($membro.TreinamentosConcluidos | Where-Object { 
                    $treinamentoId = $_
                    ($Config.Treinamentos | Where-Object { $_.Id -eq $treinamentoId -and $_.Obrigatorio -eq $true }).Count -gt 0
                }).Count
            }
        }
        
        $treinamentosTotais = $totalMembros * $treinamentosObrigatorios
        $treinamentoProgresso = if ($treinamentosTotais -gt 0) { [Math]::Round(($totalTreinamentosConcluidos / $treinamentosTotais) * 100) } else { 0 }
        
        # Atualizar o progresso no arquivo de configuração
        $progressoConfig.Treinamento.Progresso = $treinamentoProgresso
        
        if ($treinamentoProgresso -eq 100) {
            $progressoConfig.Treinamento.Status = "Concluído"
        } elseif ($treinamentoProgresso -gt 0) {
            $progressoConfig.Treinamento.Status = "Em Progresso"
        } else {
            $progressoConfig.Treinamento.Status = "Não Iniciado"
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

# Função para listar todos os treinamentos
function Show-Trainings {
    $config = Get-TrainingConfig
    
    Write-Host "`nLista de Treinamentos Disponíveis:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    foreach ($treinamento in $config.Treinamentos) {
        $obrigatorio = if ($treinamento.Obrigatorio) { "[OBRIGATÓRIO]" } else { "[OPCIONAL]" }
        $participantes = $treinamento.Participantes.Count
        
        Write-Host "$($treinamento.Id): $($treinamento.Nome) $obrigatorio" -ForegroundColor Yellow
        Write-Host "  Descrição: $($treinamento.Descricao)"
        Write-Host "  Duração: $($treinamento.DuracaoHoras) hora(s)"
        Write-Host "  Participantes: $participantes"
        Write-Host "----------------------------------------" -ForegroundColor Cyan
    }
}

# Função para listar todas as equipes e membros
function Show-Teams {
    $config = Get-TrainingConfig
    
    Write-Host "`nLista de Equipes e Membros:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    foreach ($equipe in $config.Equipes) {
        Write-Host "$($equipe.Id): $($equipe.Nome)" -ForegroundColor Yellow
        Write-Host "  Membros:" -ForegroundColor White
        
        foreach ($membro in $equipe.Membros) {
            $treinamentosConcluidos = $membro.TreinamentosConcluidos.Count
            $treinamentosObrigatorios = ($config.Treinamentos | Where-Object { $_.Obrigatorio -eq $true }).Count
            $progresso = if ($treinamentosObrigatorios -gt 0) { [Math]::Round(($treinamentosConcluidos / $treinamentosObrigatorios) * 100) } else { 0 }
            
            Write-Host "    - $($membro.Nome) ($($membro.Cargo)) - Progresso: $progresso%"
        }
        
        Write-Host "----------------------------------------" -ForegroundColor Cyan
    }
}

# Função para adicionar um novo treinamento
function Add-Training {
    $config = Get-TrainingConfig
    
    Write-Host "`nAdicionar Novo Treinamento" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    $id = Read-Host "ID do treinamento (sem espaços, use hífens)"
    
    # Verificar se o ID já existe
    if (($config.Treinamentos | Where-Object { $_.Id -eq $id }).Count -gt 0) {
        Write-Host "ERRO: Já existe um treinamento com este ID." -ForegroundColor Red
        return
    }
    
    $nome = Read-Host "Nome do treinamento"
    $descricao = Read-Host "Descrição do treinamento"
    $materialPath = Read-Host "Nome do arquivo de material (ex: nome-arquivo.md)"
    $duracaoHoras = Read-Host "Duração em horas"
    $obrigatorioInput = Read-Host "Obrigatório? (S/N)"
    $obrigatorio = $obrigatorioInput -eq "S" -or $obrigatorioInput -eq "s"
    
    # Criar o novo treinamento
    $novoTreinamento = @{
        "Id" = $id
        "Nome" = $nome
        "Descricao" = $descricao
        "MaterialPath" = $materialPath
        "DuracaoHoras" = [int]$duracaoHoras
        "Obrigatorio" = $obrigatorio
        "Participantes" = @()
    }
    
    # Adicionar à configuração
    $config.Treinamentos += $novoTreinamento
    
    # Criar arquivo de material se não existir
    $materialFilePath = Join-Path -Path $materiaisPath -ChildPath $materialPath
    if (-not (Test-Path -Path $materialFilePath)) {
        $title = ($id -split '-' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) }) -join ' '
        
        $content = @"
# $nome

## Descrição
$descricao

## Objetivos
- Compreender os conceitos básicos de $nome
- Aplicar as melhores práticas de $nome
- Identificar riscos relacionados a $nome

## Conteúdo
1. Introdução
2. Conceitos Fundamentais
3. Melhores Práticas
4. Exemplos Práticos
5. Exercícios

## Referências
- [OWASP](https://owasp.org/)
- [NIST](https://www.nist.gov/)
- [ISO/IEC 27001](https://www.iso.org/isoiec-27001-information-security.html)
"@
        
        Set-Content -Path $materialFilePath -Value $content -Force
        Write-Host "Material de treinamento criado em: $materialFilePath" -ForegroundColor Green
    }
    
    # Salvar a configuração
    Save-TrainingConfig -Config $config
    
    Write-Host "Treinamento '$nome' adicionado com sucesso!" -ForegroundColor Green
}

# Função para adicionar um novo membro a uma equipe
function Add-TeamMember {
    $config = Get-TrainingConfig
    
    Write-Host "`nAdicionar Novo Membro à Equipe" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    # Listar equipes disponíveis
    Write-Host "Equipes disponíveis:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $config.Equipes.Count; $i++) {
        Write-Host "$($i+1). $($config.Equipes[$i].Nome) ($($config.Equipes[$i].Id))"
    }
    
    $equipeIndex = [int](Read-Host "`nSelecione o número da equipe") - 1
    
    if ($equipeIndex -lt 0 -or $equipeIndex -ge $config.Equipes.Count) {
        Write-Host "ERRO: Seleção de equipe inválida." -ForegroundColor Red
        return
    }
    
    $nome = Read-Host "Nome do membro"
    $email = Read-Host "Email do membro"
    $cargo = Read-Host "Cargo do membro"
    
    # Criar o novo membro
    $novoMembro = @{
        "Nome" = $nome
        "Email" = $email
        "Cargo" = $cargo
        "TreinamentosConcluidos" = @()
    }
    
    # Adicionar à equipe selecionada
    $config.Equipes[$equipeIndex].Membros += $novoMembro
    
    # Salvar a configuração
    Save-TrainingConfig -Config $config
    
    Write-Host "Membro '$nome' adicionado à equipe '$($config.Equipes[$equipeIndex].Nome)' com sucesso!" -ForegroundColor Green
}

# Função para registrar conclusão de treinamento
function Register-TrainingCompletion {
    $config = Get-TrainingConfig
    
    Write-Host "`nRegistrar Conclusão de Treinamento" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    # Listar membros disponíveis
    Write-Host "Membros disponíveis:" -ForegroundColor Yellow
    $membrosLista = @()
    $index = 1
    
    foreach ($equipe in $config.Equipes) {
        foreach ($membro in $equipe.Membros) {
            $membrosLista += @{
                "Index" = $index
                "Nome" = $membro.Nome
                "Equipe" = $equipe.Nome
                "EquipeIndex" = $config.Equipes.IndexOf($equipe)
                "MembroIndex" = $equipe.Membros.IndexOf($membro)
            }
            
            Write-Host "$index. $($membro.Nome) - $($equipe.Nome)"
            $index++
        }
    }
    
    $membroIndex = [int](Read-Host "`nSelecione o número do membro") - 1
    
    if ($membroIndex -lt 0 -or $membroIndex -ge $membrosLista.Count) {
        Write-Host "ERRO: Seleção de membro inválida." -ForegroundColor Red
        return
    }
    
    $membroSelecionado = $membrosLista[$membroIndex]
    
    # Listar treinamentos disponíveis
    Write-Host "`nTreinamentos disponíveis:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $config.Treinamentos.Count; $i++) {
        $treinamento = $config.Treinamentos[$i]
        $concluido = $config.Equipes[$membroSelecionado.EquipeIndex].Membros[$membroSelecionado.MembroIndex].TreinamentosConcluidos -contains $treinamento.Id
        $status = if ($concluido) { "[CONCLUÍDO]" } else { "[PENDENTE]" }
        $obrigatorio = if ($treinamento.Obrigatorio) { "[OBRIGATÓRIO]" } else { "[OPCIONAL]" }
        
        Write-Host "$($i+1). $($treinamento.Nome) $status $obrigatorio"
    }
    
    $treinamentoIndex = [int](Read-Host "`nSelecione o número do treinamento") - 1
    
    if ($treinamentoIndex -lt 0 -or $treinamentoIndex -ge $config.Treinamentos.Count) {
        Write-Host "ERRO: Seleção de treinamento inválida." -ForegroundColor Red
        return
    }
    
    $treinamentoId = $config.Treinamentos[$treinamentoIndex].Id
    $treinamentosConcluidos = $config.Equipes[$membroSelecionado.EquipeIndex].Membros[$membroSelecionado.MembroIndex].TreinamentosConcluidos
    
    # Verificar se o treinamento já foi concluído
    if ($treinamentosConcluidos -contains $treinamentoId) {
        $remover = Read-Host "Este treinamento já foi concluído. Deseja remover a conclusão? (S/N)"
        
        if ($remover -eq "S" -or $remover -eq "s") {
            $config.Equipes[$membroSelecionado.EquipeIndex].Membros[$membroSelecionado.MembroIndex].TreinamentosConcluidos = $treinamentosConcluidos | Where-Object { $_ -ne $treinamentoId }
            
            # Remover da lista de participantes do treinamento
            $config.Treinamentos[$treinamentoIndex].Participantes = $config.Treinamentos[$treinamentoIndex].Participantes | Where-Object { $_ -ne "$($membroSelecionado.Nome) <$($config.Equipes[$membroSelecionado.EquipeIndex].Membros[$membroSelecionado.MembroIndex].Email)>" }
            
            Write-Host "Conclusão do treinamento removida com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "Operação cancelada." -ForegroundColor Yellow
            return
        }
    } else {
        # Adicionar o treinamento à lista de concluídos
        $config.Equipes[$membroSelecionado.EquipeIndex].Membros[$membroSelecionado.MembroIndex].TreinamentosConcluidos += $treinamentoId
        
        # Adicionar à lista de participantes do treinamento
        $participante = "$($membroSelecionado.Nome) <$($config.Equipes[$membroSelecionado.EquipeIndex].Membros[$membroSelecionado.MembroIndex].Email)>"
        $config.Treinamentos[$treinamentoIndex].Participantes += $participante
        
        Write-Host "Treinamento registrado como concluído com sucesso!" -ForegroundColor Green
    }
    
    # Salvar a configuração
    Save-TrainingConfig -Config $config
}

# Função para gerar relatório de progresso de treinamento
function New-TrainingReport {
    $config = Get-TrainingConfig
    
    $reportPath = Join-Path -Path $PSScriptRoot -ChildPath "relatorio-treinamento.html"
    
    Write-Host "`nGerando relatório de treinamento..." -ForegroundColor Cyan
    
    # Calcular estatísticas
    $totalMembros = 0
    $totalTreinamentosConcluidos = 0
    $treinamentosObrigatorios = ($config.Treinamentos | Where-Object { $_.Obrigatorio -eq $true }).Count
    
    foreach ($equipe in $config.Equipes) {
        $totalMembros += $equipe.Membros.Count
        
        foreach ($membro in $equipe.Membros) {
            $totalTreinamentosConcluidos += ($membro.TreinamentosConcluidos | Where-Object { 
                $treinamentoId = $_
                ($config.Treinamentos | Where-Object { $_.Id -eq $treinamentoId -and $_.Obrigatorio -eq $true }).Count -gt 0
            }).Count
        }
    }
    
    $treinamentosTotais = $totalMembros * $treinamentosObrigatorios
    $treinamentoProgresso = if ($treinamentosTotais -gt 0) { [Math]::Round(($totalTreinamentosConcluidos / $treinamentosTotais) * 100) } else { 0 }
    
    # Gerar HTML do relatório
    $htmlRelatorio = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Treinamentos de Segurança - Açucaradas Encomendas</title>
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
        
        .progress-section {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .progress-bar-container {
            background-color: #f0f0f0;
            border-radius: 5px;
            height: 25px;
            margin: 10px 0;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            background-color: var(--primary-color);
            text-align: center;
            color: white;
            line-height: 25px;
            transition: width 0.5s ease-in-out;
        }
        
        .team-section {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .team-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        
        .team-name {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .team-progress {
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
            background-color: var(--info-color);
            color: white;
        }
        
        .member-card {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 10px;
            border-left: 3px solid var(--primary-color);
        }
        
        .member-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .member-name {
            font-weight: bold;
        }
        
        .member-progress {
            font-size: 0.9em;
        }
        
        .training-list {
            margin-top: 10px;
            font-size: 0.9em;
        }
        
        .training-item {
            padding: 5px 0;
            border-bottom: 1px dotted #eee;
        }
        
        .training-completed {
            color: var(--success-color);
        }
        
        .training-pending {
            color: var(--warning-color);
        }
        
        .training-section {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .training-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .training-card {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border-top: 3px solid var(--primary-color);
        }
        
        .training-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .training-desc {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }
        
        .training-meta {
            display: flex;
            justify-content: space-between;
            font-size: 0.8em;
            color: #777;
        }
        
        .tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            color: white;
            margin-right: 5px;
        }
        
        .tag-required {
            background-color: var(--danger-color);
        }
        
        .tag-optional {
            background-color: var(--info-color);
        }
        
        footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            color: #777;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .training-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>Relatório de Treinamentos de Segurança</h1>
        <p>Açucaradas Encomendas - Programa de Conscientização em Segurança</p>
    </header>
    
    <div class="container">
        <div class="report-info">
            <h2>Informações do Relatório</h2>
            <p><strong>Data do Relatório:</strong> {{DATA_RELATORIO}}</p>
            <p><strong>Total de Equipes:</strong> {{TOTAL_EQUIPES}}</p>
            <p><strong>Total de Membros:</strong> {{TOTAL_MEMBROS}}</p>
            <p><strong>Total de Treinamentos:</strong> {{TOTAL_TREINAMENTOS}}</p>
        </div>
        
        <div class="progress-section">
            <h2>Progresso Geral</h2>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: {{PROGRESSO_GERAL}}%">{{PROGRESSO_GERAL}}%</div>
            </div>
            <p><strong>Treinamentos Obrigatórios Concluídos:</strong> {{TREINAMENTOS_CONCLUIDOS}} de {{TREINAMENTOS_TOTAIS}}</p>
        </div>
        
        <div class="training-section">
            <h2>Treinamentos Disponíveis</h2>
            <div class="training-grid">
                {{TREINAMENTOS_CARDS}}
            </div>
        </div>
        
        <div class="team-section">
            <h2>Progresso por Equipe</h2>
            {{EQUIPES_CONTENT}}
        </div>
    </div>
    
    <footer>
        <p>Relatório gerado automaticamente pelo Sistema de Gerenciamento de Treinamentos - Açucaradas Encomendas</p>
        <p>© 2023 Açucaradas Encomendas. Todos os direitos reservados.</p>
    </footer>
</body>
</html>
"@
    
    # Substituir placeholders com dados reais
    $htmlRelatorio = $htmlRelatorio.Replace("{{DATA_RELATORIO}}", (Get-Date).ToString("dd/MM/yyyy HH:mm"))
    $htmlRelatorio = $htmlRelatorio.Replace("{{TOTAL_EQUIPES}}", $config.Equipes.Count)
    $htmlRelatorio = $htmlRelatorio.Replace("{{TOTAL_MEMBROS}}", $totalMembros)
    $htmlRelatorio = $htmlRelatorio.Replace("{{TOTAL_TREINAMENTOS}}", $config.Treinamentos.Count)
    $htmlRelatorio = $htmlRelatorio.Replace("{{PROGRESSO_GERAL}}", $treinamentoProgresso)
    $htmlRelatorio = $htmlRelatorio.Replace("{{TREINAMENTOS_CONCLUIDOS}}", $totalTreinamentosConcluidos)
    $htmlRelatorio = $htmlRelatorio.Replace("{{TREINAMENTOS_TOTAIS}}", $treinamentosTotais)
    
    # Gerar cards de treinamentos
    $treinamentosCards = ""
    
    foreach ($treinamento in $config.Treinamentos) {
        $obrigatorioTag = if ($treinamento.Obrigatorio) { "<span class='tag tag-required'>Obrigatório</span>" } else { "<span class='tag tag-optional'>Opcional</span>" }
        $participantes = $treinamento.Participantes.Count
        
        $treinamentosCards += @"
        <div class="training-card">
            <div class="training-title">$($treinamento.Nome) $obrigatorioTag</div>
            <div class="training-desc">$($treinamento.Descricao)</div>
            <div class="training-meta">
                <span>Duração: $($treinamento.DuracaoHoras)h</span>
                <span>Participantes: $participantes</span>
            </div>
        </div>
"@
    }
    
    $htmlRelatorio = $htmlRelatorio.Replace("{{TREINAMENTOS_CARDS}}", $treinamentosCards)
    
    # Gerar conteúdo de equipes
    $equipesContent = ""
    
    foreach ($equipe in $config.Equipes) {
        $membrosContent = ""
        $equipeProgresso = 0
        $equipeTreinamentosConcluidos = 0
        $equipeTreinamentosTotais = 0
        
        foreach ($membro in $equipe.Membros) {
            $membroTreinamentosConcluidos = ($membro.TreinamentosConcluidos | Where-Object { 
                $treinamentoId = $_
                ($config.Treinamentos | Where-Object { $_.Id -eq $treinamentoId -and $_.Obrigatorio -eq $true }).Count -gt 0
            }).Count
            
            $membroTreinamentosTotais = $treinamentosObrigatorios
            $membroProgresso = if ($membroTreinamentosTotais -gt 0) { [Math]::Round(($membroTreinamentosConcluidos / $membroTreinamentosTotais) * 100) } else { 0 }
            
            $equipeTreinamentosConcluidos += $membroTreinamentosConcluidos
            $equipeTreinamentosTotais += $membroTreinamentosTotais
            
            $treinamentosLista = ""
            
            foreach ($treinamento in ($config.Treinamentos | Where-Object { $_.Obrigatorio -eq $true })) {
                $concluido = $membro.TreinamentosConcluidos -contains $treinamento.Id
                $statusClass = if ($concluido) { "training-completed" } else { "training-pending" }
                $statusText = if ($concluido) { "Concluído" } else { "Pendente" }
                
                $treinamentosLista += @"
                <div class="training-item $statusClass">$($treinamento.Nome) - $statusText</div>
"@
            }
            
            $membrosContent += @"
            <div class="member-card">
                <div class="member-header">
                    <div class="member-name">$($membro.Nome) <small>($($membro.Cargo))</small></div>
                    <div class="member-progress">Progresso: $membroProgresso%</div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: $membroProgresso%">$membroProgresso%</div>
                </div>
                <div class="training-list">
                    $treinamentosLista
                </div>
            </div>
"@
        }
        
        $equipeProgresso = if ($equipeTreinamentosTotais -gt 0) { [Math]::Round(($equipeTreinamentosConcluidos / $equipeTreinamentosTotais) * 100) } else { 0 }
        
        $equipesContent += @"
        <div class="team-section">
            <div class="team-header">
                <div class="team-name">$($equipe.Nome)</div>
                <div class="team-progress">$equipeProgresso%</div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: $equipeProgresso%">$equipeProgresso%</div>
            </div>
            $membrosContent
        </div>
"@
    }
    
    $htmlRelatorio = $htmlRelatorio.Replace("{{EQUIPES_CONTENT}}", $equipesContent)
    
    # Salvar relatório
    $htmlRelatorio | Set-Content -Path $reportPath -Force
    
    Write-Host "Relatório gerado com sucesso em: $reportPath" -ForegroundColor Green
    
    return $reportPath
}

# Função para atualizar o dashboard de segurança
function Update-SecurityDashboard {
    $dashboardScript = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-dashboard.ps1"
    
    if (Test-Path -Path $dashboardScript) {
        Write-Host "`nAtualizando dashboard de segurança..." -ForegroundColor Cyan
        try {
            & $dashboardScript
            Write-Host "Dashboard atualizado com sucesso!" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "ERRO ao atualizar o dashboard: $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "`nERRO: Script de atualização do dashboard não encontrado em: $dashboardScript" -ForegroundColor Red
        return $false
    }
}

# Menu principal
function Show-MainMenu {
    $sair = $false
    
    while (-not $sair) {
        Clear-Host
        Write-Host "=== Sistema de Gerenciamento de Treinamentos de Segurança ===" -ForegroundColor Magenta
        Write-Host "1. Listar Treinamentos Disponíveis" -ForegroundColor Cyan
        Write-Host "2. Listar Equipes e Membros" -ForegroundColor Cyan
        Write-Host "3. Adicionar Novo Treinamento" -ForegroundColor Cyan
        Write-Host "4. Adicionar Novo Membro à Equipe" -ForegroundColor Cyan
        Write-Host "5. Registrar Conclusão de Treinamento" -ForegroundColor Cyan
        Write-Host "6. Gerar Relatório de Treinamento" -ForegroundColor Cyan
        Write-Host "7. Atualizar Dashboard de Segurança" -ForegroundColor Cyan
        Write-Host "8. Sair" -ForegroundColor Cyan
        
        $opcao = Read-Host "`nEscolha uma opção"
        
        switch ($opcao) {
            "1" { Show-Trainings; Read-Host "`nPressione Enter para continuar" }
            "2" { Show-Teams; Read-Host "`nPressione Enter para continuar" }
            "3" { Add-Training; Read-Host "`nPressione Enter para continuar" }
            "4" { Add-TeamMember; Read-Host "`nPressione Enter para continuar" }
            "5" { Register-TrainingCompletion; Read-Host "`nPressione Enter para continuar" }
            "6" {
                $reportPath = New-TrainingReport
                $abrirRelatorio = Read-Host "`nDeseja abrir o relatório no navegador? (S/N)"
                
                if ($abrirRelatorio -eq "S" -or $abrirRelatorio -eq "s") {
                    Start-Process $reportPath
                }
            }
            "7" { Update-SecurityDashboard; Read-Host "`nPressione Enter para continuar" }
            "8" { $sair = $true }
            default { Write-Host "`nOpção inválida!" -ForegroundColor Red; Read-Host "`nPressione Enter para continuar" }
        }
    }
}

# Iniciar o menu principal
Show-MainMenu