@echo off
echo Limpando cache do Expo e Metro Bundler...

echo Parando processos do Expo e Metro...
taskkill /f /im node.exe >nul 2>&1

echo Removendo diretorio .expo...
if exist .expo rmdir /s /q .expo

echo Removendo diretorio .metro-cache...
if exist .metro-cache rmdir /s /q .metro-cache

echo Verificando diretorio node_modules\expo-router...
if not exist node_modules\expo-router\entry.js (
    echo Criando arquivo entry.js em expo-router...
    if not exist node_modules\expo-router mkdir node_modules\expo-router
    echo module.exports = require('./build'); > node_modules\expo-router\entry.js
    echo Arquivo entry.js criado com sucesso.
)

echo Limpeza concluida com sucesso!
echo.
echo Para iniciar o aplicativo, execute: npx expo start --clear
echo.

pause