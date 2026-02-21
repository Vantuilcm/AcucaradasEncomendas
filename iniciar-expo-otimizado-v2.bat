@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo    INICIANDO EXPO COM CONFIGURACOES OTIMIZADAS v2
echo ===================================================

:: Definir cores para o console
set "ESC=[" 
set "RESET=[0m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "RED=[31m"
set "BLUE=[34m"
set "MAGENTA=[35m"

echo %ESC%%BLUE%mIniciando verificacoes de ambiente...%ESC%%RESET%

:: Verificar se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %ESC%%RED%mERRO: Node.js nao encontrado! Por favor, instale o Node.js.%ESC%%RESET%
    exit /b 1
)

:: Verificar se o PNPM está instalado
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %ESC%%RED%mERRO: PNPM nao encontrado! Por favor, instale o PNPM.%ESC%%RESET%
    echo %ESC%%YELLOW%mExecute: npm install -g pnpm%ESC%%RESET%
    exit /b 1
)

:: Encerrar processos anteriores do Node.js
echo %ESC%%BLUE%mEncerrando processos Node.js anteriores...%ESC%%RESET%
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %ESC%%GREEN%mProcessos Node.js encerrados com sucesso!%ESC%%RESET%
) else (
    echo %ESC%%YELLOW%mNenhum processo Node.js encontrado para encerrar.%ESC%%RESET%
)

:: Limpar caches
echo %ESC%%BLUE%mLimpando caches...%ESC%%RESET%

if exist ".expo" (
    rmdir /S /Q ".expo"
    echo %ESC%%GREEN%mCache do Expo removido!%ESC%%RESET%
) else (
    echo %ESC%%YELLOW%mNenhum cache do Expo encontrado.%ESC%%RESET%
)

if exist ".metro-cache" (
    rmdir /S /Q ".metro-cache"
    echo %ESC%%GREEN%mCache do Metro removido!%ESC%%RESET%
) else (
    echo %ESC%%YELLOW%mNenhum cache do Metro encontrado.%ESC%%RESET%
)

if exist "node_modules\.cache\metro" (
    rmdir /S /Q "node_modules\.cache\metro"
    echo %ESC%%GREEN%mCache do Metro em node_modules removido!%ESC%%RESET%
) else (
    echo %ESC%%YELLOW%mNenhum cache do Metro em node_modules encontrado.%ESC%%RESET%
)

:: Verificar espaço em disco
echo %ESC%%BLUE%mVerificando espaço em disco...%ESC%%RESET%
for /f "tokens=3" %%a in ('dir /-c 2^>nul ^| findstr /c:"bytes free"') do set FREE_SPACE=%%a
set FREE_SPACE=!FREE_SPACE:,=!

:: Converter para GB (aproximadamente)
set /a FREE_SPACE_GB=!FREE_SPACE! / 1073741824

if !FREE_SPACE_GB! LSS 5 (
    echo %ESC%%RED%mAVISO: Pouco espaço em disco disponível: aproximadamente !FREE_SPACE_GB! GB%ESC%%RESET%
    echo %ESC%%YELLOW%mRecomendado: Libere espaço em disco para evitar problemas de build.%ESC%%RESET%
) else (
    echo %ESC%%GREEN%mEspaço em disco suficiente: aproximadamente !FREE_SPACE_GB! GB%ESC%%RESET%
)

:: Verificar e corrigir o Metro Watcher
echo %ESC%%BLUE%mVerificando e corrigindo o Metro Watcher...%ESC%%RESET%

if exist "corrigir-metro-watcher.js" (
    node corrigir-metro-watcher.js
    if %ERRORLEVEL% neq 0 (
        echo %ESC%%YELLOW%mAviso: Não foi possível corrigir o Metro Watcher automaticamente.%ESC%%RESET%
    )
) else (
    echo %ESC%%YELLOW%mAviso: Script corrigir-metro-watcher.js não encontrado.%ESC%%RESET%
)

:: Configurar variáveis de ambiente
echo %ESC%%BLUE%mConfigurando variáveis de ambiente...%ESC%%RESET%

:: Executar script de configuração de ambiente se existir
if exist "configurar-ambiente.js" (
    node configurar-ambiente.js
    if %ERRORLEVEL% equ 0 (
        echo %ESC%%GREEN%mAmbiente configurado com sucesso!%ESC%%RESET%
    ) else (
        echo %ESC%%YELLOW%mAviso: Não foi possível configurar o ambiente automaticamente.%ESC%%RESET%
    )
) else (
    echo %ESC%%YELLOW%mAviso: Script configurar-ambiente.js não encontrado.%ESC%%RESET%
)

:: Definir variáveis de ambiente otimizadas
set METRO_MAX_WORKERS=1
set WATCHMAN_POLLING=true
set NODE_OPTIONS=--max_old_space_size=6144
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.11
set EXPO_DEVTOOLS_LISTEN_ADDRESS=192.168.0.11
set EXPO_USE_METRO_CACHE=false
set METRO_CACHE_RESET=true
set EXPO_TELEMETRY_DISABLED=1
set REACT_NATIVE_TELEMETRY_DISABLED=1
set NODE_ENV=development

echo %ESC%%GREEN%mVariáveis de ambiente configuradas:%ESC%%RESET%
echo   METRO_MAX_WORKERS=%METRO_MAX_WORKERS%
echo   WATCHMAN_POLLING=%WATCHMAN_POLLING%
echo   NODE_OPTIONS=%NODE_OPTIONS%
echo   REACT_NATIVE_PACKAGER_HOSTNAME=%REACT_NATIVE_PACKAGER_HOSTNAME%
echo   EXPO_DEVTOOLS_LISTEN_ADDRESS=%EXPO_DEVTOOLS_LISTEN_ADDRESS%

:: Verificar dependências críticas
echo %ESC%%BLUE%mVerificando dependências críticas...%ESC%%RESET%

if exist "analisar-dependencias.js" (
    echo %ESC%%YELLOW%mDeseja executar a análise completa de dependências? (S/N)%ESC%%RESET%
    choice /C SN /N /M "Escolha uma opção: "
    if !ERRORLEVEL! equ 1 (
        node analisar-dependencias.js
    ) else (
        echo %ESC%%YELLOW%mAnálise de dependências ignorada.%ESC%%RESET%
    )
) else (
    echo %ESC%%YELLOW%mAviso: Script analisar-dependencias.js não encontrado.%ESC%%RESET%
)

:: Iniciar o Expo
echo %ESC%%MAGENTA%m====================================================%ESC%%RESET%
echo %ESC%%MAGENTA%m          INICIANDO EXPO METRO BUNDLER              %ESC%%RESET%
echo %ESC%%MAGENTA%m====================================================%ESC%%RESET%

echo %ESC%%GREEN%mIniciando Expo com configurações otimizadas...%ESC%%RESET%
echo %ESC%%YELLOW%mPressione Ctrl+C para encerrar o servidor quando necessário.%ESC%%RESET%

:: Iniciar o Expo com as configurações otimizadas
pnpm expo start --clear

endlocal