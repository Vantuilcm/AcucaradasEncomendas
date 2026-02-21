# Script para instalar e configurar o pacote expo-screen-capture

Write-Host "Iniciando instalação do pacote expo-screen-capture..." -ForegroundColor Cyan

# Verificar se o npm está disponível
try {
    npm --version | Out-Null
    Write-Host "NPM encontrado, continuando com a instalação..." -ForegroundColor Green
} catch {
    Write-Host "ERRO: NPM não encontrado. Por favor, instale o Node.js e o NPM antes de continuar." -ForegroundColor Red
    exit 1
}

# Instalar o pacote expo-screen-capture
Write-Host "Instalando expo-screen-capture..." -ForegroundColor Yellow
try {
    npm install expo-screen-capture --save
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Pacote expo-screen-capture instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "ERRO: Falha ao instalar o pacote expo-screen-capture." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERRO: Ocorreu um problema durante a instalação do pacote." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Verificar se o pacote foi instalado corretamente
Write-Host "Verificando instalação..." -ForegroundColor Yellow
try {
    $packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json
    
    if ($packageJson.dependencies."expo-screen-capture") {
        Write-Host "Verificação concluída: expo-screen-capture está listado nas dependências." -ForegroundColor Green
    } else {
        Write-Host "AVISO: expo-screen-capture não foi encontrado nas dependências do package.json." -ForegroundColor Yellow
        Write-Host "Você pode precisar adicionar manualmente ou verificar a instalação." -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERRO: Não foi possível verificar o package.json." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Instruções de uso
Write-Host "
Instruções de uso do expo-screen-capture:" -ForegroundColor Cyan
Write-Host "1. Importe o pacote em seus componentes:" -ForegroundColor White
Write-Host "   import * as ScreenCapture from 'expo-screen-capture';" -ForegroundColor Gray

Write-Host "2. Para prevenir capturas de tela:" -ForegroundColor White
Write-Host "   await ScreenCapture.preventScreenCaptureAsync();" -ForegroundColor Gray

Write-Host "3. Para permitir capturas de tela:" -ForegroundColor White
Write-Host "   await ScreenCapture.allowScreenCaptureAsync();" -ForegroundColor Gray

Write-Host "4. Para detectar capturas de tela:" -ForegroundColor White
Write-Host "   const subscription = ScreenCapture.addScreenshotListener(() => {" -ForegroundColor Gray
Write-Host "     console.log('Captura de tela detectada');" -ForegroundColor Gray
Write-Host "   });" -ForegroundColor Gray

Write-Host "5. Para remover o listener:" -ForegroundColor White
Write-Host "   subscription.remove();" -ForegroundColor Gray

Write-Host "
Instalação concluída com sucesso!" -ForegroundColor Green
Write-Host "O componente ScreenshotProtection já está configurado para usar este pacote." -ForegroundColor Green