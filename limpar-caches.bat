@echo off
echo ===================================================
echo    LIMPANDO CACHES DO EXPO E DEPENDENCIAS
echo ===================================================

echo Encerrando processos Node.js anteriores...
taskkill /F /IM node.exe >nul 2>&1

echo Limpando cache do Expo...
if exist ".expo" (
  rmdir /S /Q ".expo"
  echo Cache do Expo removido com sucesso!
) else (
  echo Cache do Expo nao encontrado.
)

echo Limpando cache do Metro...
if exist ".metro-cache" (
  rmdir /S /Q ".metro-cache"
  echo Cache do Metro removido com sucesso!
) else (
  echo Cache do Metro nao encontrado.
)

echo Limpando cache do Node.js...
if exist "node_modules.cache" (
  rmdir /S /Q "node_modules.cache"
  echo Cache do Node.js removido com sucesso!
) else (
  echo Cache do Node.js nao encontrado.
)

echo Limpando cache do PNPM...
pnpm store prune

echo ===================================================
echo    LIMPEZA DE CACHE CONCLUIDA
echo ===================================================

echo Pressione qualquer tecla para sair...
pause > nul
