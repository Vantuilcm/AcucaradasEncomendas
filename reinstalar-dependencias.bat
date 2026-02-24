@echo off
echo =====================================================
echo SCRIPT DE REINSTALACAO DE DEPENDENCIAS COM RESOLUCAO DE CONFLITOS
echo =====================================================
echo.

echo Limpando caches...
if exist ".expo" (
  rmdir /s /q ".expo"
  echo Cache do Expo removido.
)

if exist ".metro-cache" (
  rmdir /s /q ".metro-cache"
  echo Cache do Metro removido.
)

if exist "node_modules" (
  echo Removendo node_modules...
  rmdir /s /q "node_modules"
  echo node_modules removido.
)

echo.
echo Limpando cache do PNPM...
pnpm store prune

echo.
echo Reinstalando dependencias com configuracoes otimizadas...
pnpm install --force

echo.
echo Verificando dependencias instaladas...
node verificar-dependencias.js

echo.
echo =====================================================
echo REINSTALACAO CONCLUIDA!
echo =====================================================
echo.
echo Proximos passos:
echo 1. Execute: .\iniciar-expo-otimizado.bat
echo 2. Se o problema persistir, verifique o relatorio de dependencias na pasta "relatorios"

echo.
echo Pressione qualquer tecla para continuar...
pause > nul