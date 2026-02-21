# Script para resolver problemas do Metro Bundler
# Açucaradas Encomendas - CodePilot Pro

Write-Host "🔧 Iniciando correção do Metro Bundler..." -ForegroundColor Cyan
Write-Host ""

# Função para executar comandos com Node.js 20.18.0
function Invoke-NodeCommand {
    param(
        [string]$Command
    )
    
    $nodePath = ".\node-v20.18.0-win-x64"
    if (Test-Path $nodePath) {
        Write-Host "⚡ Executando: $Command" -ForegroundColor Yellow
        & "$nodePath\npx.cmd" $Command.Split(' ')
    } else {
        Write-Host "❌ Node.js 20.18.0 não encontrado!" -ForegroundColor Red
        exit 1
    }
}

# 1. Parar qualquer processo Expo/Metro em execução
Write-Host "🛑 Parando processos Metro/Expo..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*expo*" -or $_.CommandLine -like "*metro*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Limpar caches
Write-Host "🧹 Limpando caches..." -ForegroundColor Yellow

# Cache do Metro
if (Test-Path "$env:LOCALAPPDATA\Metro") {
    Remove-Item "$env:LOCALAPPDATA\Metro" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cache do Metro limpo"
}

# Cache do Expo
if (Test-Path "$env:USERPROFILE\.expo") {
    Remove-Item "$env:USERPROFILE\.expo\metro-cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cache do Expo limpo"
}

# Cache temporário do projeto
if (Test-Path ".expo") {
    Remove-Item ".expo" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cache local do projeto limpo"
}

# 3. Verificar e corrigir dependências críticas
Write-Host "📦 Verificando dependências críticas..." -ForegroundColor Yellow

$criticalDeps = @(
    "@expo/metro-config",
    "metro",
    "metro-resolver",
    "metro-runtime",
    "metro-source-map",
    "metro-config",
    "metro-core"
)

foreach ($dep in $criticalDeps) {
    Write-Host "🔍 Verificando $dep..."
    $packagePath = "node_modules\$dep"
    if (!(Test-Path $packagePath)) {
        Write-Host "❌ $dep não encontrado, reinstalando..." -ForegroundColor Red
        .\node-v20.18.0-win-x64\npm.cmd install $dep --legacy-peer-deps
    } else {
        Write-Host "✅ $dep OK"
    }
}

# 4. Corrigir configuração do Metro
Write-Host "⚙️ Atualizando configuração do Metro..." -ForegroundColor Yellow

$metroConfig = @'
// Metro configuration for Expo SDK 50
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configurações para resolver problemas de módulos
config.resolver.assetExts.push('cjs');
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'json');

// Configurações de transformação
config.transformer.babelTransformerPath = require.resolve('metro-react-native-babel-transformer');

// Configurações de serialização
config.serializer.customSerializer = undefined;

// Configurações de cache
config.resetCache = true;

module.exports = config;
'@

Set-Content -Path "metro.config.js" -Value $metroConfig -Encoding UTF8
Write-Host "✅ Configuração do Metro atualizada"

# 5. Verificar babel.config.js
Write-Host "🔧 Verificando babel.config.js..." -ForegroundColor Yellow

$babelContent = Get-Content "babel.config.js" -Raw
if ($babelContent -notmatch "react-native-reanimated/plugin") {
    Write-Host "⚠️ Plugin do Reanimated não encontrado, adicionando..." -ForegroundColor Yellow
    
    $newBabelConfig = @'
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-export-namespace-from',
      'react-native-reanimated/plugin' // DEVE ser o último plugin
    ]
  };
};
'@
    
    Set-Content -Path "babel.config.js" -Value $newBabelConfig -Encoding UTF8
    Write-Host "✅ babel.config.js atualizado"
} else {
    Write-Host "✅ babel.config.js OK"
}

# 6. Reinstalar dependências críticas se necessário
Write-Host "🔄 Verificando integridade das dependências..." -ForegroundColor Yellow

if (!(Test-Path "node_modules\@expo\metro-config\build\serializer\withExpoSerializers.js")) {
    Write-Host "❌ Arquivo crítico do Metro não encontrado, reinstalando @expo/metro-config..." -ForegroundColor Red
    .\node-v20.18.0-win-x64\npm.cmd uninstall @expo/metro-config
    .\node-v20.18.0-win-x64\npm.cmd install @expo/metro-config@latest --legacy-peer-deps
}

# 7. Teste de configuração
Write-Host "🧪 Testando configuração..." -ForegroundColor Yellow

try {
    # Verificar se o Metro pode ser carregado
    $testResult = .\node-v20.18.0-win-x64\node.exe -e "try { require('@expo/metro-config'); console.log('OK'); } catch(e) { console.log('ERROR:', e.message); }"
    
    if ($testResult -eq "OK") {
        Write-Host "✅ Configuração do Metro OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Problema detectado: $testResult" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️ Não foi possível testar a configuração" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Correções aplicadas!" -ForegroundColor Green
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Execute: .\dev-with-node20.bat" -ForegroundColor White
Write-Host "   2. Ou manualmente: .\node-v20.18.0-win-x64\npx.cmd expo start --clear" -ForegroundColor White
Write-Host ""
Write-Host "💡 Se ainda houver problemas, execute: .\node-v20.18.0-win-x64\npm.cmd install --legacy-peer-deps" -ForegroundColor Yellow
Write-Host ""