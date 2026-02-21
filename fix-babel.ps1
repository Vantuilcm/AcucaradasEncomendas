# Script para corrigir configuracao do babel.config.js

Write-Host "Iniciando correcao do babel.config.js..."

# Verificar babel.config.js
$babelConfig = Get-Content -Path "babel.config.js" -Raw

if ($babelConfig -match "'react-native-reanimated/plugin'") {
    Write-Host "Plugin do Reanimated ja esta configurado no babel.config.js"
}
else {
    Write-Host "Plugin do Reanimated nao encontrado. Adicionando..."
    
    # Atualizar o arquivo babel.config.js
    $newBabelConfig = $babelConfig -replace 'plugins: \[', 'plugins: [''react-native-reanimated/plugin'', '
    Set-Content -Path "babel.config.js" -Value $newBabelConfig
    
    Write-Host "Plugin do Reanimated adicionado ao babel.config.js"
}

Write-Host "Processo concluido!"
Write-Host "Execute 'npx expo start' para testar o aplicativo."