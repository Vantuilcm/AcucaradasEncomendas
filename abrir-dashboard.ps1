# Script para abrir o dashboard de segurança diretamente

$dashboardPath = Join-Path -Path $PSScriptRoot -ChildPath "dashboard-seguranca.html"

if (Test-Path -Path $dashboardPath) {
    Write-Host "Abrindo Dashboard de Segurança no navegador padrão..." -ForegroundColor Cyan
    Start-Process $dashboardPath
} else {
    Write-Host "ERRO: Dashboard de segurança não encontrado em: $dashboardPath" -ForegroundColor Red
    Write-Host "Verifique se o arquivo 'dashboard-seguranca.html' existe no diretório." -ForegroundColor Yellow
}