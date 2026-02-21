@echo off
echo Iniciando Expo com QR Code otimizado...
echo.

:: Configurar variáveis de ambiente para o IP fixo
set EXPO_DEVTOOLS_LISTEN_ADDRESS=177.192.13.46
set REACT_NATIVE_PACKAGER_HOSTNAME=177.192.13.46

:: Aumentar memória disponível para o Node.js
set NODE_OPTIONS=--max_old_space_size=4096

echo Usando IP: 177.192.13.46
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
npx expo start --clear

pause