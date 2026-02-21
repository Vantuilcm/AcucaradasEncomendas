@echo off
echo Instalando Watchman para o Metro Bundler...

echo 1. Verificando se o Chocolatey está instalado...
where choco >nul 2>nul
if %errorlevel% neq 0 (
    echo Chocolatey não encontrado. Instalando Chocolatey...
    @powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
    if %errorlevel% neq 0 (
        echo Falha ao instalar o Chocolatey. Por favor, instale manualmente.
        echo Visite: https://chocolatey.org/install
        pause
        exit /b 1
    )
    echo Chocolatey instalado com sucesso!
    echo Reinicie este script após a instalação do Chocolatey.
    pause
    exit /b 0
) else (
    echo Chocolatey já está instalado.
)

echo 2. Instalando Watchman via Chocolatey...
choco install watchman -y
if %errorlevel% neq 0 (
    echo Falha ao instalar o Watchman via Chocolatey.
    echo Você pode tentar instalar manualmente seguindo as instruções em:
    echo https://facebook.github.io/watchman/docs/install.html
    pause
    exit /b 1
)

echo 3. Verificando a instalação do Watchman...
watchman --version
if %errorlevel% neq 0 (
    echo Watchman foi instalado, mas não está disponível no PATH.
    echo Reinicie seu terminal ou computador e tente novamente.
    pause
    exit /b 1
)

echo.
echo Watchman instalado com sucesso!
echo.
echo Próximos passos:
echo 1. Execute: .\corrigir-metro-watcher.bat
echo 2. Execute: npx expo start --clear
echo.

pause