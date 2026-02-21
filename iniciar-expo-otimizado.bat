@echo off
echo Iniciando Expo com configuracoes otimizadas...

:: Limpa caches
call limpar-caches.bat

:: Configura variaveis de ambiente
node configurar-ambiente.js

:: Tenta corrigir IPs
set REACT_NATIVE_PACKAGER_HOSTNAME=%EXPO_DEVTOOLS_LISTEN_ADDRESS%

:: Configura memoria para o Node.js
set NODE_OPTIONS=--max_old_space_size=6144

:: Inicia o Expo com configuracoes otimizadas
echo Iniciando Expo...
pnpm expo start --clear
