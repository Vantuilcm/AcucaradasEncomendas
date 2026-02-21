@echo off
echo Iniciando Expo com QR Code otimizado...
echo.

:: Configurar variáveis de ambiente para o IP correto
:: Usando o mesmo IP que aparece no erro (192.168.0.13)
set EXPO_DEVTOOLS_LISTEN_ADDRESS=192.168.0.13
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.13
set EXPO_PUBLIC_ROUTER_IP=192.168.0.13

:: Aumentar memória disponível para o Node.js
set NODE_OPTIONS=--max_old_space_size=4096

echo Usando IP: 192.168.0.13
echo Memória Node.js aumentada para 4GB
echo.

:: Limpar caches
if exist ".expo" (
  rmdir /s /q ".expo"
  echo Cache do Expo removido.
)

if exist ".metro-cache" (
  rmdir /s /q ".metro-cache"
  echo Cache do Metro removido.
)

echo.
echo Iniciando Expo com configurações otimizadas...
echo.

:: Iniciar o Expo com opções para melhorar a compatibilidade
npx expo start --clear --no-dev --minify

pause