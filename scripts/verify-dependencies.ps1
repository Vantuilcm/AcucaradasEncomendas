# Script para verificar a integridade das dependências após a correção
# Criado pelo NPMConflictSolverAI

Write-Host "\n🔍 Verificando integridade das dependências..." -ForegroundColor Cyan

# Verificar conflitos no React Navigation
Write-Host "\n📦 Verificando React Navigation..." -ForegroundColor Yellow
$reactNavOutput = npm ls @react-navigation/native 2>&1
if ($reactNavOutput -match "invalid") {
    Write-Host "❌ Conflitos detectados no React Navigation!" -ForegroundColor Red
    Write-Host $reactNavOutput -ForegroundColor Red
} else {
    Write-Host "✅ React Navigation OK!" -ForegroundColor Green
}

# Verificar conflitos no Expo Constants
Write-Host "\n📦 Verificando Expo Constants..." -ForegroundColor Yellow
$expoConstantsOutput = npm ls expo-constants 2>&1
if ($expoConstantsOutput -match "invalid") {
    Write-Host "❌ Conflitos detectados no Expo Constants!" -ForegroundColor Red
    Write-Host $expoConstantsOutput -ForegroundColor Red
} else {
    Write-Host "✅ Expo Constants OK!" -ForegroundColor Green
}

# Verificar conflitos no Expo Router
Write-Host "\n📦 Verificando Expo Router..." -ForegroundColor Yellow
$expoRouterOutput = npm ls expo-router 2>&1
if ($expoRouterOutput -match "invalid") {
    Write-Host "❌ Conflitos detectados no Expo Router!" -ForegroundColor Red
    Write-Host $expoRouterOutput -ForegroundColor Red
} else {
    Write-Host "✅ Expo Router OK!" -ForegroundColor Green
}

# Verificar vulnerabilidades
Write-Host "\n🔒 Verificando vulnerabilidades..." -ForegroundColor Yellow
npm audit

# Verificar dependências desatualizadas
Write-Host "\n📊 Verificando dependências desatualizadas..." -ForegroundColor Yellow
npm outdated

Write-Host "\n🚀 Verificação concluída!" -ForegroundColor Cyan