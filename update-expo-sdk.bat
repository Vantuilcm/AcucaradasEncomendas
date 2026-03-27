@echo off
echo Atualizando Expo SDK para versao 50 e corrigindo vulnerabilidades...
echo.

powershell -ExecutionPolicy Bypass -File .\update-expo-sdk.ps1

echo.
echo Processo concluido! Pressione qualquer tecla para sair.
pause > nul