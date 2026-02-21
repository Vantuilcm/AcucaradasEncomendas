# Script para resolver conflitos de dependências NPM
# Última atualização: $(Get-Date -Format "dd/MM/yyyy HH:mm")

Write-Host "🔍 Iniciando resolução de conflitos de dependências NPM..." -ForegroundColor Cyan

# Documentação dos conflitos identificados
$conflitosIdentificados = @"
# 🔍 RELATÓRIO DE CONFLITOS NPM

**STATUS GERAL:** Conflitos leves a moderados

## 📦 CONFLITOS DETECTADOS:

1. **Conflito de versões React Native e Expo** - React Native 0.73.6 com Expo ~48.0.20 (incompatível)
2. **Dependências Expo desatualizadas** - Várias dependências em versões incompatíveis:
   - expo-router ^3.5.24 (incompatível com Expo 48)
   - expo-constants ~15.4.6 (incompatível com Expo 48)
   - expo-notifications ^0.31.4 (incompatível com Expo 48)
   - expo-linking 7.1.7 (incompatível com Expo 48)
3. **Conflitos em bibliotecas de navegação**
4. **Conflitos em bibliotecas de animação**
5. **Versões incompatíveis de TypeScript e tipos**

## ✅ AÇÕES IMPLEMENTADAS:

- [X] Atualização do Expo para versão compatível com React Native 0.73.6 (Expo ~50.0.0)
- [X] Sincronização das versões das bibliotecas Expo
  - expo-constants: ~15.0.0
  - expo-linking: ~6.0.0
  - expo-notifications: ~0.27.0
  - expo-router: ~3.0.0
- [X] Atualização das bibliotecas de navegação
  - react-native-screens: ~3.27.0
  - react-native-safe-area-context: 4.8.2
  - react-native-gesture-handler: ~2.14.0
  - react-native-reanimated: ~3.6.0
- [X] Ajuste das versões de TypeScript e tipos
  - typescript: ^5.3.0
  - @types/react: ~18.2.14
- [X] Atualização da seção overrides para garantir consistência
"@

Write-Host $conflitosIdentificados -ForegroundColor Magenta

# Remover node_modules e package-lock.json
Write-Host "🧹 Removendo node_modules e package-lock.json..." -ForegroundColor Yellow
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue

# Limpar cache do NPM
Write-Host "🧼 Limpando cache do NPM..." -ForegroundColor Yellow
npm cache clean --force

# Instalar dependências com --legacy-peer-deps
Write-Host "📦 Instalando dependências com --legacy-peer-deps..." -ForegroundColor Green
Write-Host "⚙️ Usando versões atualizadas compatíveis com Expo 50 e React Native 0.73.6" -ForegroundColor Cyan
npm install --legacy-peer-deps

# Verificar se a instalação foi bem-sucedida
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
    
    # Verificar conflitos restantes
    Write-Host "🔍 Verificando conflitos restantes..." -ForegroundColor Cyan
    npm ls --depth=0
    
    Write-Host "\n📋 Relatório de Conflitos NPM" -ForegroundColor Magenta
    Write-Host "=========================" -ForegroundColor Magenta
    
    # Verificar se há erros no npm ls
    $npmLsOutput = npm ls 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ STATUS GERAL: Conflitos leves detectados" -ForegroundColor Yellow
        Write-Host "\n📦 CONFLITOS DETECTADOS:" -ForegroundColor Yellow
        $npmLsOutput | Select-String -Pattern "UNMET PEER DEPENDENCY|INVALID|missing:|extraneous:" | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
    } else {
        Write-Host "✅ STATUS GERAL: Sem conflitos" -ForegroundColor Green
    }
    
    Write-Host "\n✅ AÇÕES RECOMENDADAS:" -ForegroundColor Green
    Write-Host "- Executar 'npm audit fix' para resolver vulnerabilidades de segurança" -ForegroundColor Green
    Write-Host "- Verificar se o aplicativo está funcionando corretamente" -ForegroundColor Green
    
    Write-Host "\n🧠 SUGESTÕES AVANÇADAS:" -ForegroundColor Cyan
    Write-Host "- Considerar o uso de pnpm para melhor gerenciamento de dependências" -ForegroundColor Cyan
    Write-Host "- Manter as versões do Expo e React Navigation consistentes" -ForegroundColor Cyan
    Write-Host "- Usar 'overrides' para forçar versões específicas de pacotes problemáticos" -ForegroundColor Cyan
    
    # Verificar se o aplicativo pode ser iniciado
    Write-Host "\n🚀 Verificando se o aplicativo pode ser iniciado..." -ForegroundColor Cyan
    $startChoice = Read-Host "Deseja iniciar o aplicativo para verificar se os conflitos foram resolvidos? (S/N)"
    
    if ($startChoice -eq "S" -or $startChoice -eq "s") {
        Write-Host "\n🚀 Iniciando o aplicativo..." -ForegroundColor Green
        Write-Host "Pressione Ctrl+C para interromper a execução quando terminar de verificar." -ForegroundColor Yellow
        npm start
    } else {
        Write-Host "\n✅ Processo de resolução de conflitos concluído!" -ForegroundColor Green
        Write-Host "Execute 'npm start' manualmente quando estiver pronto para testar o aplicativo." -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Falha na instalação das dependências!" -ForegroundColor Red
    Write-Host "Tente executar 'npm install --force' ou 'npm install --legacy-peer-deps --force'" -ForegroundColor Red
}
