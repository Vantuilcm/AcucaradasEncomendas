# Script para corrigir problemas específicos com React Native Reanimated
# Última atualização: $(Get-Date -Format "dd/MM/yyyy HH:mm")

Write-Host "🔍 Iniciando correção de problemas com React Native Reanimated..." -ForegroundColor Cyan

# Verificar se o plugin do Reanimated está configurado corretamente no babel.config.js
Write-Host "🔍 Verificando configuração do babel.config.js..." -ForegroundColor Yellow
$babelConfig = Get-Content -Path "babel.config.js" -Raw

if ($babelConfig -match "'react-native-reanimated/plugin'") {
    Write-Host "✅ Plugin do Reanimated encontrado no babel.config.js" -ForegroundColor Green
} else {
    Write-Host "❌ Plugin do Reanimated NÃO encontrado no babel.config.js" -ForegroundColor Red
    Write-Host "🔧 Adicionando plugin do Reanimated ao babel.config.js..." -ForegroundColor Yellow
    
    # Atualizar o arquivo babel.config.js para incluir o plugin do Reanimated
    $newBabelConfig = $babelConfig -replace 'plugins: \[', 'plugins: [''react-native-reanimated/plugin'', '
    Set-Content -Path "babel.config.js" -Value $newBabelConfig
    
    Write-Host "✅ Plugin do Reanimated adicionado ao babel.config.js" -ForegroundColor Green
}

# Verificar a versão do React Native Reanimated no package.json
Write-Host "🔍 Verificando versão do React Native Reanimated no package.json..." -ForegroundColor Yellow
$packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json

$reanimatedVersion = $packageJson.dependencies."react-native-reanimated"
Write-Host "📦 Versão atual do React Native Reanimated: $reanimatedVersion" -ForegroundColor Cyan

# Verificar se a versão é compatível com Expo SDK 50
if ($reanimatedVersion -match "~3.6.0") {
    Write-Host "✅ Versão do React Native Reanimated é compatível com Expo SDK 50" -ForegroundColor Green
} else {
    Write-Host "❌ Versão do React Native Reanimated pode não ser compatível com Expo SDK 50" -ForegroundColor Red
    Write-Host "🔧 Recomendação: Atualize para a versão ~3.6.0 com o comando:" -ForegroundColor Yellow
    Write-Host "npm install react-native-reanimated@3.6.0 --save" -ForegroundColor Yellow
    
    $updateChoice = Read-Host "Deseja atualizar o React Native Reanimated para a versão 3.6.0? (S/N)"
    
    if ($updateChoice -eq "S" -or $updateChoice -eq "s") {
        Write-Host "🔧 Atualizando React Native Reanimated para a versão 3.6.0..." -ForegroundColor Yellow
        npm install react-native-reanimated@3.6.0 --save
        Write-Host "✅ React Native Reanimated atualizado para a versão 3.6.0" -ForegroundColor Green
    }
}

# Limpar cache e reinstalar dependências
Write-Host "🧹 Limpando cache e reinstalando dependências..." -ForegroundColor Yellow

# Limpar cache do npm
Write-Host "🧼 Limpando cache do NPM..." -ForegroundColor Yellow
npm cache clean --force

# Limpar cache do Expo/Metro
Write-Host "🧼 Limpando cache do Expo/Metro..." -ForegroundColor Yellow
npx expo start --clear --no-dev --non-interactive --no-web --no-ios --no-android

# Verificar se o aplicativo pode ser iniciado
Write-Host "" 
Write-Host "🚀 Verificando se o aplicativo pode ser iniciado..." -ForegroundColor Cyan
$startChoice = Read-Host "Deseja iniciar o aplicativo para verificar se os problemas foram resolvidos? (S/N)"

if ($startChoice -eq "S" -or $startChoice -eq "s") {
    Write-Host "" 
    Write-Host "🚀 Iniciando o aplicativo..." -ForegroundColor Green
    Write-Host "Pressione Ctrl+C para interromper a execução quando terminar de verificar." -ForegroundColor Yellow
    npx expo start
} else {
    Write-Host "" 
    Write-Host "✅ Processo de correção concluído!" -ForegroundColor Green
    Write-Host "Execute 'npx expo start' manualmente quando estiver pronto para testar o aplicativo." -ForegroundColor Cyan
}

Write-Host "" 
Write-Host "📋 Instruções adicionais:" -ForegroundColor Magenta
Write-Host "1. Acesse a rota /teste-animacao para verificar se as animações estão funcionando corretamente." -ForegroundColor Cyan
Write-Host "2. Se ainda houver problemas, verifique se o componente AnimacaoExemplo está sendo importado corretamente." -ForegroundColor Cyan
Write-Host "3. Certifique-se de que o aplicativo foi reiniciado completamente após as alterações." -ForegroundColor Cyan