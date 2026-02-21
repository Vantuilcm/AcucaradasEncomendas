# Script para gerar arquivo AAB localmente para o projeto Acucaradas Encomendas

# Configuracoes
$projectDir = Get-Location
$outputDir = Join-Path $projectDir "android\app\build\outputs\bundle\release"

Write-Host "=== Geracao de AAB para Google Play Store ===" -ForegroundColor Cyan
Write-Host "Iniciando processo de geracao do arquivo AAB para o aplicativo Acucaradas Encomendas..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o Expo CLI esta instalado
try {
    $expoVersion = npx expo --version
    Write-Host "Expo CLI versao $expoVersion encontrado." -ForegroundColor Green
} catch {
    Write-Host "Expo CLI nao encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g expo-cli
}

# Verificar se o projeto e um projeto Expo
$appJsonPath = Join-Path $projectDir "app.json"
if (-not (Test-Path $appJsonPath)) {
    Write-Host "Arquivo app.json nao encontrado. Verifique se este e um projeto Expo valido." -ForegroundColor Red
    exit 1
}

Write-Host "Projeto Expo detectado. Preparando para geracao do AAB..." -ForegroundColor Green

# Etapa 1: Gerar os arquivos nativos do Android
Write-Host ""
Write-Host "Etapa 1: Gerando arquivos nativos do Android..." -ForegroundColor Cyan
Write-Host "Executando: npx expo prebuild -p android" -ForegroundColor Yellow

try {
    npx expo prebuild -p android --clean
    Write-Host "Arquivos nativos do Android gerados com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "Erro ao gerar arquivos nativos do Android: $_" -ForegroundColor Red
    Write-Host "Tente executar manualmente: npx expo prebuild -p android --clean" -ForegroundColor Yellow
    exit 1
}

# Etapa 2: Verificar se o diretorio android foi criado
$androidDir = Join-Path $projectDir "android"
if (-not (Test-Path $androidDir)) {
    Write-Host "Diretorio 'android' nao foi criado. Falha na geracao dos arquivos nativos." -ForegroundColor Red
    exit 1
}

# Etapa 3: Navegar para o diretorio android e executar o comando gradlew
Write-Host ""
Write-Host "Etapa 2: Gerando o arquivo AAB..." -ForegroundColor Cyan
Write-Host "Navegando para o diretorio android e executando gradlew bundleRelease" -ForegroundColor Yellow

# Salvar o diretorio atual
$currentDir = Get-Location

try {
    # Navegar para o diretorio android
    Set-Location $androidDir
    
    # Verificar se o arquivo gradlew existe
    if (-not (Test-Path "gradlew.bat")) {
        Write-Host "Arquivo gradlew.bat nao encontrado no diretorio android." -ForegroundColor Red
        Set-Location $currentDir
        exit 1
    }
    
    # Executar o comando gradlew para gerar o AAB
    Write-Host "Executando: .\gradlew bundleRelease" -ForegroundColor Yellow
    .\gradlew bundleRelease
    
    # Verificar se o AAB foi gerado
    $aabPath = Join-Path $outputDir "app-release.aab"
    if (Test-Path $aabPath) {
        Write-Host "AAB gerado com sucesso em: $aabPath" -ForegroundColor Green
        
        # Obter o tamanho do arquivo
        $fileInfo = Get-Item $aabPath
        $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        
        Write-Host "Tamanho do arquivo: $fileSizeMB MB" -ForegroundColor Green
        
        # Copiar o AAB para a raiz do projeto para facilitar o acesso
        $destPath = Join-Path $projectDir "acucaradas-encomendas.aab"
        Copy-Item $aabPath $destPath -Force
        Write-Host "Arquivo AAB copiado para: $destPath" -ForegroundColor Green
    } else {
        Write-Host "Nao foi possivel encontrar o arquivo AAB gerado. Verifique os logs acima para possiveis erros." -ForegroundColor Red
    }
} catch {
    Write-Host "Erro ao executar gradlew bundleRelease: $_" -ForegroundColor Red
} finally {
    # Voltar para o diretorio original
    Set-Location $currentDir
}

Write-Host ""
Write-Host "=== Processo de geracao de AAB concluido ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Acesse a Google Play Console: https://play.google.com/console" -ForegroundColor White
Write-Host "2. Navegue ate seu aplicativo > Producao > Criar nova versao" -ForegroundColor White
Write-Host "3. Faca upload do arquivo AAB gerado" -ForegroundColor White
Write-Host "4. Preencha as informacoes da versao e envie para revisao" -ForegroundColor White
Write-Host ""
Write-Host "Obrigado por usar o AppPublisherAI!" -ForegroundColor Magenta