# Master Script: Gerar Build e Submeter ao TestFlight (iOS)
# Açucaradas Encomendas - Versão 1.0.1 (Build 363)

Write-Host "=== Iniciando Processo de Build e Submissão para App Store ===" -ForegroundColor Cyan
Write-Host "Projeto: C:\Users\vantu\Downloads\AcucaradasEncomendas"
Write-Host "Build Number Atual: 363"
Write-Host ""

# 1. Garantir que estamos na pasta correta
Set-Location "C:\Users\vantu\Downloads\AcucaradasEncomendas"

# 2. Verificar/Atualizar EAS CLI (Recomendado)
Write-Host ">> Verificando EAS CLI..." -ForegroundColor Yellow
npm install -g eas-cli

# 3. Limpar artefatos antigos
if (Test-Path "build-artifacts") {
    Write-Host ">> Limpando pasta de build..." -ForegroundColor Yellow
    Remove-Item -Path "build-artifacts\*" -Recurse -Force
} else {
    New-Item -ItemType Directory -Path "build-artifacts"
}

# 4. Disparar o Build com Auto-Submit
Write-Host ""
Write-Host "🚀 DISPARANDO BUILD NA NUVEM COM SUBMISSÃO AUTOMÁTICA..." -ForegroundColor Green
Write-Host "⚠️  ATENÇÃO: Este processo pode levar de 15 a 30 minutos."
Write-Host "O EAS irá gerar a IPA e enviar para a Apple assim que terminar."
Write-Host ""

eas build --platform ios --profile production --non-interactive --auto-submit

Write-Host ""
Write-Host "=== Processo Finalizado ===" -ForegroundColor Cyan
Write-Host "Acompanhe o progresso no dashboard do Expo ou no terminal acima."
Read-Host "Pressione Enter para fechar..."
