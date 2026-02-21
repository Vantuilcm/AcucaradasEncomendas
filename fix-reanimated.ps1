# Script para corrigir problemas com React Native Reanimated

Write-Host "🔍 Iniciando correção de problemas com React Native Reanimated..." -ForegroundColor Cyan

# Verificar babel.config.js
Write-Host "🔍 Verificando configuração do babel.config.js..." -ForegroundColor Yellow
$babelConfig = Get-Content -Path "babel.config.js" -Raw

if ($babelConfig -match "'react-native-reanimated/plugin'") {
    Write-Host "✅ Plugin do Reanimated encontrado no babel.config.js" -ForegroundColor Green
}
else {
    Write-Host "❌ Plugin do Reanimated NÃO encontrado no babel.config.js" -ForegroundColor Red
    Write-Host "🔧 Adicionando plugin do Reanimated ao babel.config.js..." -ForegroundColor Yellow
    
    # Atualizar o arquivo babel.config.js
    $newBabelConfig = $babelConfig -replace 'plugins: \[', 'plugins: [''react-native-reanimated/plugin'', '
    Set-Content -Path "babel.config.js" -Value $newBabelConfig
    
    Write-Host "✅ Plugin do Reanimated adicionado ao babel.config.js" -ForegroundColor Green
}

# Verificar package.json
Write-Host "🔍 Verificando versão do React Native Reanimated no package.json..." -ForegroundColor Yellow
$packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json

$reanimatedVersion = $packageJson.dependencies."react-native-reanimated"
Write-Host "📦 Versão atual do React Native Reanimated: $reanimatedVersion" -ForegroundColor Cyan

# Limpar cache
Write-Host "🧹 Limpando cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "Processo de correcao concluido!" -ForegroundColor Green
Write-Host "Execute 'npx expo start' manualmente para testar o aplicativo." -ForegroundColor Cyan
Write-Host "Acesse a rota /teste-animacao para verificar se as animacoes estao funcionando." -ForegroundColor Cyan