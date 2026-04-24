@echo off
echo 🚀 Iniciando aplicativo Acucaradas Encomendas...

:: Limpar caches
echo 🧹 Limpando caches...
rd /s /q ".expo" 2>nul
rd /s /q "node_modules\.cache" 2>nul

:: Definir variáveis de ambiente
set NODE_OPTIONS=--max-old-space-size=4096
set EXPO_METRO_CACHE=false

:: Iniciar o aplicativo
echo 🚀 Iniciando o Expo...
cd /d "%~dp0"
npx.cmd expo start --web --port 8082 --clear

pause