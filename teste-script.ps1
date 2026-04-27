# Script de teste simples

# Variáveis
$conflitosDetectados = 0
$conflitosResolvidos = 0
$listaConflitos = @()

# Adicionar alguns conflitos de teste
$listaConflitos += "React (17.0.2) e React DOM (18.2.0) têm versões diferentes"
$listaConflitos += "@types/react (17.0.50) não é compatível com react (18.2.0)"
$conflitosDetectados = 2
$conflitosResolvidos = 1

# Exibir relatório
Write-Host "RELATÓRIO DE CONFLITOS NPM" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Determinar status geral
$statusGeral = "Sem conflitos"
if ($conflitosDetectados -gt 0) {
    if ($conflitosDetectados -eq $conflitosResolvidos) {
        $statusGeral = "Conflitos resolvidos"
    } elseif ($conflitosResolvidos -gt 0) {
        $statusGeral = "Conflitos parcialmente resolvidos"
    } else {
        $statusGeral = "Conflitos graves não resolvidos"
    }
}

Write-Host "STATUS GERAL: $statusGeral" -ForegroundColor Yellow
Write-Host "Conflitos detectados: $conflitosDetectados" -ForegroundColor Yellow
Write-Host "Conflitos resolvidos: $conflitosResolvidos" -ForegroundColor Yellow

# Listar conflitos detectados
if ($listaConflitos.Count -gt 0) {
    Write-Host "\n📦 CONFLITOS DETECTADOS:" -ForegroundColor Yellow
    foreach ($conflito in $listaConflitos) {
        Write-Host "- $conflito" -ForegroundColor Yellow
    }
}

# Sugestões avançadas
Write-Host "\n🧠 SUGESTÕES AVANÇADAS:" -ForegroundColor Cyan
Write-Host "- Execute 'npm install --legacy-peer-deps' para aplicar as alterações" -ForegroundColor White
Write-Host "- Execute 'npx expo-doctor' para verificar a integridade do projeto" -ForegroundColor White

Write-Host "Script concluido!" -ForegroundColor Cyan