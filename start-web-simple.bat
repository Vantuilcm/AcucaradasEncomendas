@echo off
echo 🚀 Iniciando aplicativo web com Node.js 20.18.0
echo.

REM Mostrar versão do Node.js
echo ⚡ Versão do Node.js:
.\node-v20.18.0-win-x64\node.exe --version
echo.

REM Iniciar o servidor web diretamente
echo 🌐 Iniciando servidor web...
.\node-v20.18.0-win-x64\npx.cmd @expo/cli@latest start --web --port 19006

pause