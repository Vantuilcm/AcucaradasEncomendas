@echo off
echo =====================================================
echo SCRIPT DE RESOLUCAO DE CONFLITOS NPM
echo =====================================================
echo.

echo [1/4] Executando script de resolucao de conflitos...
node resolver-conflitos.js

echo [2/4] Limpando caches...
if exist ".expo" (
  rmdir /s /q ".expo"
  echo Cache do Expo removido.
)

if exist ".metro-cache" (
  rmdir /s /q ".metro-cache"
  echo Cache do Metro removido.
)

echo [3/4] Reinstalando dependencias...
pnpm install --force

echo [4/4] Verificando dependencias instaladas...
node verificar-dependencias.js

echo.
echo =====================================================
echo RESOLUCAO DE CONFLITOS CONCLUIDA!
echo =====================================================
echo.
echo Proximos passos:
echo 1. Execute: .\iniciar-expo-otimizado.bat
echo 2. Verifique o relatorio de dependencias na pasta "relatorios"

echo.
echo Pressione qualquer tecla para continuar...
pause > nul