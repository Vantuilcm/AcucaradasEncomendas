# Script para verificar e corrigir problemas comuns em aplicativos Expo/React Native
# Última atualização: $(Get-Date -Format "dd/MM/yyyy HH:mm")

Write-Host "🔍 Iniciando verificação e correção de problemas comuns..." -ForegroundColor Cyan

# Verificar se o plugin do Reanimated está configurado corretamente no babel.config.js
Write-Host "🔍 Verificando configuração do babel.config.js..." -ForegroundColor Yellow
$babelConfig = Get-Content -Path "babel.config.js" -Raw

if ($babelConfig -match "'react-native-reanimated/plugin'") {
    Write-Host "✅ Plugin do Reanimated encontrado no babel.config.js" -ForegroundColor Green
} else {
    Write-Host "❌ Plugin do Reanimated NÃO encontrado no babel.config.js" -ForegroundColor Red
    Write-Host "🔧 Adicionando plugin do Reanimated ao babel.config.js..." -ForegroundColor Yellow
    
    $newBabelConfig = $babelConfig -replace "plugins:\s*\[([^\]]*)\]", "plugins: [`$1'react-native-reanimated/plugin']"
    Set-Content -Path "babel.config.js" -Value $newBabelConfig
    
    Write-Host "✅ Plugin do Reanimated adicionado ao babel.config.js" -ForegroundColor Green
}

# Verificar se o plugin @babel/plugin-transform-export-namespace-from está instalado e configurado
Write-Host "🔍 Verificando plugin @babel/plugin-transform-export-namespace-from..." -ForegroundColor Yellow

if ($babelConfig -match "'@babel/plugin-transform-export-namespace-from'") {
    Write-Host "✅ Plugin @babel/plugin-transform-export-namespace-from encontrado no babel.config.js" -ForegroundColor Green
} else {
    Write-Host "❌ Plugin @babel/plugin-transform-export-namespace-from NÃO encontrado no babel.config.js" -ForegroundColor Red
    Write-Host "🔧 Adicionando plugin @babel/plugin-transform-export-namespace-from ao babel.config.js..." -ForegroundColor Yellow
    
    $newBabelConfig = $babelConfig -replace "plugins:\s*\[([^\]]*)\]", "plugins: [`$1'@babel/plugin-transform-export-namespace-from']"
    Set-Content -Path "babel.config.js" -Value $newBabelConfig
    
    Write-Host "✅ Plugin @babel/plugin-transform-export-namespace-from adicionado ao babel.config.js" -ForegroundColor Green
    
    # Instalar o plugin se não estiver instalado
    Write-Host "🔧 Instalando @babel/plugin-transform-export-namespace-from..." -ForegroundColor Yellow
    npm install --save-dev @babel/plugin-transform-export-namespace-from
}

# Verificar se o metro.config.js está configurado corretamente
Write-Host "🔍 Verificando configuração do metro.config.js..." -ForegroundColor Yellow
$metroConfig = Get-Content -Path "metro.config.js" -Raw

if ($metroConfig -match "cjs") {
    Write-Host "✅ Configuração para arquivos .cjs encontrada no metro.config.js" -ForegroundColor Green
} else {
    Write-Host "❌ Configuração para arquivos .cjs NÃO encontrada no metro.config.js" -ForegroundColor Red
    Write-Host "🔧 Atualizando metro.config.js para suportar arquivos .cjs..." -ForegroundColor Yellow
    
    # Implementar correção para o metro.config.js
    # Esta é uma implementação simplificada, pode precisar ser ajustada conforme o conteúdo real do arquivo
    $newMetroConfig = $metroConfig -replace "resolver:\s*{([^}]*)}", "resolver: {`$1assetExts: [...config.resolver.assetExts, 'cjs'],}"
    Set-Content -Path "metro.config.js" -Value $newMetroConfig
    
    Write-Host "✅ metro.config.js atualizado para suportar arquivos .cjs" -ForegroundColor Green
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
Write-Host "\n🚀 Verificando se o aplicativo pode ser iniciado..." -ForegroundColor Cyan
$startChoice = Read-Host "Deseja iniciar o aplicativo para verificar se os problemas foram resolvidos? (S/N)"

if ($startChoice -eq "S" -or $startChoice -eq "s") {
    Write-Host "\n🚀 Iniciando o aplicativo..." -ForegroundColor Green
    Write-Host "Pressione Ctrl+C para interromper a execução quando terminar de verificar." -ForegroundColor Yellow
    npx expo start
} else {
    Write-Host "\n✅ Processo de verificação e correção concluído!" -ForegroundColor Green
    Write-Host "Execute 'npx expo start' manualmente quando estiver pronto para testar o aplicativo." -ForegroundColor Cyan
}