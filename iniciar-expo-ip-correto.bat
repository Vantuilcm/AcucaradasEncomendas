@echo off
echo Iniciando Expo com IP correto...

:: Parar processos Node.js existentes
taskkill /f /im node.exe >nul 2>&1

:: Executar script de correção de IPs
node corrigir-ips.js

:: Executar script de correção do expo-router
node corrigir-expo-router.js

:: Configurar variáveis de ambiente
echo.
echo Usando IP: 177.192.13.46
set EXPO_DEVTOOLS_LISTEN_ADDRESS=177.192.13.46
set REACT_NATIVE_PACKAGER_HOSTNAME=177.192.13.46

:: Aumentar memória do Node.js
echo Memória Node.js aumentada para 4GB
set NODE_OPTIONS=--max_old_space_size=4096

:: Limpar caches
echo.
echo Limpando caches...
npx expo start --clear