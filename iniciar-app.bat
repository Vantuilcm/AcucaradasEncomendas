@echo off
echo ===================================================
echo    INICIALIZADOR ACUCARADAS ENCOMENDAS
echo    Resolvendo conflitos de dependencias NPM
echo ===================================================
echo.

REM Verificar se PowerShell está disponível
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] PowerShell nao encontrado. Por favor, instale o PowerShell.
    pause
    exit /b 1
)

echo [1/5] Aplicando solucao para conflitos de dependencias...
echo.
powershell -ExecutionPolicy Bypass -File .\resolver-conflitos-npm-simples.ps1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao resolver conflitos de dependencias.
    pause
    exit /b 1
)

echo.
echo [2/5] Corrigindo imagens SVG com extensao PNG...
echo.
powershell -ExecutionPolicy Bypass -File .\corrigir-imagens.ps1

echo.
echo [3/5] Limpando cache do NPM...
npm cache clean --force

echo.
echo [4/5] Instalando dependencias com flags de compatibilidade...
npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo [AVISO] Houve alguns avisos na instalacao, mas continuaremos...
)

echo.
echo [5/5] Iniciando o aplicativo...
echo.
echo Limpando cache do Metro Bundler...
npx expo start --clear
if %ERRORLEVEL% NEQ 0 (
    echo [AVISO] Falha ao iniciar com expo start --clear, tentando metodo alternativo...
    npm start
)

pause