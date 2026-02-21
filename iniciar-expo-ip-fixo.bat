@echo off
echo Iniciando Expo com IP fixo...
echo.

set EXPO_DEVTOOLS_LISTEN_ADDRESS=192.168.0.11
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.11

echo Usando IP: 192.168.0.11
echo.

npx expo start

pause