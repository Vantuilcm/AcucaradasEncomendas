# Script para iniciar a atualização manual de progresso

$scriptPath = Join-Path -Path $PSScriptRoot -ChildPath "atualizar-progresso-manual.ps1"

if (Test-Path -Path $scriptPath) {
    Write-Host "Iniciando ferramenta de atualização manual de progresso..." -ForegroundColor Cyan
    & $scriptPath
} else {
    Write-Host "ERRO: Script de atualização manual não encontrado em: $scriptPath" -ForegroundColor Red
    Write-Host "Verifique se o arquivo 'atualizar-progresso-manual.ps1' existe no diretório." -ForegroundColor Yellow
}