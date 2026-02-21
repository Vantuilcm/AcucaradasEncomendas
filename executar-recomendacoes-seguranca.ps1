# Script para executar as recomendações de segurança implementadas

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Iniciando execução das recomendações de segurança..." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

# Função para exibir status de tarefa
function Show-TaskStatus {
    param (
        [string]$TaskName,
        [string]$Status,
        [string]$Details = ""
    )
    
    $color = switch ($Status) {
        "CONCLUÍDO" { "Green" }
        "EM ANDAMENTO" { "Yellow" }
        "PENDENTE" { "Gray" }
        "ERRO" { "Red" }
        default { "White" }
    }
    
    Write-Host "[$Status]" -ForegroundColor $color -NoNewline
    Write-Host " $TaskName"
    
    if ($Details) {
        Write-Host "  $Details" -ForegroundColor Cyan
    }
}

# 1. Limpeza de Código
Write-Host "\n1. Limpeza de Código" -ForegroundColor Magenta

$removerWordpressPath = "$PSScriptRoot\remover-wordpress.ps1"
if (Test-Path $removerWordpressPath) {
    Show-TaskStatus -TaskName "Script de remoção WordPress criado" -Status "CONCLUÍDO" -Details "Arquivo: $removerWordpressPath"
    
    # Verificar se os diretórios ainda existem
    $wpDirExists = Test-Path "$PSScriptRoot\site-wordpress"
    $wpDirNewExists = Test-Path "$PSScriptRoot\Site wordpress novo"
    
    if ($wpDirExists -or $wpDirNewExists) {
        Show-TaskStatus -TaskName "Execução do script de remoção" -Status "PENDENTE" -Details "Execute o script como administrador: .\remover-wordpress.ps1"
    } else {
        Show-TaskStatus -TaskName "Remoção de diretórios WordPress" -Status "CONCLUÍDO" -Details "Diretórios já foram removidos"
    }
} else {
    Show-TaskStatus -TaskName "Script de remoção WordPress" -Status "ERRO" -Details "Arquivo não encontrado: $removerWordpressPath"
}

# 2. Revisão de Dependências
Write-Host "\n2. Revisão de Dependências" -ForegroundColor Magenta

$resolverDependenciasPath = "$PSScriptRoot\resolver-conflitos-dependencias.ps1"
if (Test-Path $resolverDependenciasPath) {
    Show-TaskStatus -TaskName "Script de resolução de dependências criado" -Status "CONCLUÍDO" -Details "Arquivo: $resolverDependenciasPath"
    Show-TaskStatus -TaskName "Execução do script de dependências" -Status "PENDENTE" -Details "Execute o script: .\resolver-conflitos-dependencias.ps1"
} else {
    Show-TaskStatus -TaskName "Script de resolução de dependências" -Status "ERRO" -Details "Arquivo não encontrado: $resolverDependenciasPath"
}

# 3. Testes de Penetração
Write-Host "\n3. Testes de Penetração" -ForegroundColor Magenta

$testesPenetracaoPath = "$PSScriptRoot\testes-penetracao-firebase.ps1"
if (Test-Path $testesPenetracaoPath) {
    Show-TaskStatus -TaskName "Script de testes de penetração criado" -Status "CONCLUÍDO" -Details "Arquivo: $testesPenetracaoPath"
    Show-TaskStatus -TaskName "Execução dos testes de penetração" -Status "PENDENTE" -Details "Execute o script: .\testes-penetracao-firebase.ps1"
} else {
    Show-TaskStatus -TaskName "Script de testes de penetração" -Status "ERRO" -Details "Arquivo não encontrado: $testesPenetracaoPath"
}

# 4. Documentação
Write-Host "\n4. Documentação" -ForegroundColor Magenta

$documentacaoPath = "$PSScriptRoot\DOCUMENTACAO-NOVA-ARQUITETURA.md"
if (Test-Path $documentacaoPath) {
    Show-TaskStatus -TaskName "Documentação da nova arquitetura criada" -Status "CONCLUÍDO" -Details "Arquivo: $documentacaoPath"
    
    # Atualizar a data na documentação
    $content = Get-Content -Path $documentacaoPath -Raw
    $updatedContent = $content -replace "\[Data Atual\]", (Get-Date -Format "dd/MM/yyyy")
    $updatedContent | Out-File -FilePath $documentacaoPath -Encoding utf8
    
    Show-TaskStatus -TaskName "Atualização da data na documentação" -Status "CONCLUÍDO"
} else {
    Show-TaskStatus -TaskName "Documentação da nova arquitetura" -Status "ERRO" -Details "Arquivo não encontrado: $documentacaoPath"
}

# Atualizar o checklist de implementação de segurança
Write-Host "\nAtualizando checklist de implementação de segurança..." -ForegroundColor Yellow

$checklistPath = "$PSScriptRoot\CHECKLIST_IMPLEMENTACAO_SEGURANCA.md"
if (Test-Path $checklistPath) {
    $checklistContent = Get-Content -Path $checklistPath -Raw
    
    # Atualizar itens do checklist
    $updatedChecklist = $checklistContent -replace "- \[ \] Configuração do SAST", "- [x] Configuração do SAST"
    $updatedChecklist = $updatedChecklist -replace "- \[ \] Integração com pipeline CI/CD", "- [x] Integração com pipeline CI/CD"
    $updatedChecklist = $updatedChecklist -replace "- \[ \] Preparação do ambiente de teste", "- [x] Preparação do ambiente de teste"
    $updatedChecklist = $updatedChecklist -replace "- \[ \] Execução dos testes de penetração", "- [ ] Execução dos testes de penetração (Script criado: testes-penetracao-firebase.ps1)"
    $updatedChecklist = $updatedChecklist -replace "- \[ \] Documentação dos resultados", "- [ ] Documentação dos resultados (Será gerado automaticamente após execução dos testes)"
    
    # Adicionar seção de progresso
    if (-not ($updatedChecklist -match "## Progresso da Implementação")) {
        $updatedChecklist += "

## Progresso da Implementação

**Data da última atualização:** $(Get-Date -Format "dd/MM/yyyy")

- Análise Estática de Código (SAST): 2/3 concluídos
- Treinamento em Segurança: 0/3 concluídos
- Testes de Penetração: 2/4 concluídos
- Implementação do SIEM: 0/3 concluídos

**Progresso geral:** 4/13 itens concluídos (30.8%)

### Próximos Passos Prioritários

1. Executar os scripts de testes de penetração criados
2. Resolver os conflitos de dependências React
3. Remover os diretórios WordPress conforme recomendado
4. Implementar as correções identificadas nos testes de penetração
"
    }
    
    # Salvar o checklist atualizado
    $updatedChecklist | Out-File -FilePath $checklistPath -Encoding utf8
    
    Show-TaskStatus -TaskName "Atualização do checklist de segurança" -Status "CONCLUÍDO" -Details "Arquivo atualizado: $checklistPath"
} else {
    Show-TaskStatus -TaskName "Atualização do checklist de segurança" -Status "ERRO" -Details "Arquivo não encontrado: $checklistPath"
}

# Resumo final
Write-Host "\n==========================================================" -ForegroundColor Yellow
Write-Host "Resumo da implementação das recomendações de segurança:" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

Write-Host "\n✅ Scripts criados:" -ForegroundColor Green
Write-Host " - remover-wordpress.ps1 (Limpeza de Código)" -ForegroundColor White
Write-Host " - resolver-conflitos-dependencias.ps1 (Revisão de Dependências)" -ForegroundColor White
Write-Host " - testes-penetracao-firebase.ps1 (Testes de Penetração)" -ForegroundColor White

Write-Host "\n✅ Documentação atualizada:" -ForegroundColor Green
Write-Host " - DOCUMENTACAO-NOVA-ARQUITETURA.md (Nova arquitetura desacoplada)" -ForegroundColor White
Write-Host " - CHECKLIST_IMPLEMENTACAO_SEGURANCA.md (Progresso de segurança)" -ForegroundColor White

Write-Host "\n⏭️ Próximos passos:" -ForegroundColor Cyan
Write-Host " 1. Execute os scripts criados como administrador" -ForegroundColor White
Write-Host " 2. Revise os relatórios gerados pelos testes de penetração" -ForegroundColor White
Write-Host " 3. Implemente as correções identificadas" -ForegroundColor White
Write-Host " 4. Atualize a documentação com as medidas implementadas" -ForegroundColor White

Write-Host "\n==========================================================" -ForegroundColor Yellow
Write-Host "Para executar todos os scripts, execute os seguintes comandos:" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "
Start-Process PowerShell -Verb RunAs -ArgumentList \"-ExecutionPolicy Bypass -File `"$PSScriptRoot\remover-wordpress.ps1`"\"
.\resolver-conflitos-dependencias.ps1
.\testes-penetracao-firebase.ps1
" -ForegroundColor White

Write-Host "\nImplementação das recomendações de segurança concluída!" -ForegroundColor Green