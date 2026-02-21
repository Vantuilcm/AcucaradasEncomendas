@echo off
echo Corrigindo problemas do expo-router e iniciando o Expo...
echo.

:: Parar o servidor Expo atual se estiver rodando
echo Parando servidor Expo atual (se estiver rodando)...
taskkill /f /im node.exe /t 2>nul
echo.

:: Executar o script de correção de IPs
echo Executando script de correção de IPs...
node corrigir-ips.js
echo.

:: Executar o script de correção do expo-router
echo Executando script de correção do expo-router...
node corrigir-expo-router.js
echo.

:: Configurar variáveis de ambiente para o IP correto
echo Configurando variáveis de ambiente com IP correto...
set EXPO_DEVTOOLS_LISTEN_ADDRESS=192.168.0.13
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.13
set EXPO_PUBLIC_ROUTER_IP=192.168.0.13

:: Aumentar memória disponível para o Node.js
set NODE_OPTIONS=--max_old_space_size=4096

echo Usando IP: 192.168.0.13
echo Memória Node.js aumentada para 4GB
echo.

:: Iniciar o Expo com opções para melhorar a compatibilidade
echo Iniciando Expo com configurações otimizadas...
echo.
npx expo start --clear --no-dev --minify

pause