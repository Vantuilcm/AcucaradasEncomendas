# Script para gerar arquivo AAB para o projeto Açucaradas Encomendas

# Configurações
$projectDir = Get-Location
$androidDir = Join-Path $projectDir "android"
$outputDir = Join-Path $androidDir "app\build\outputs\bundle\release"

# Verificar se o diretório android existe
if (-not (Test-Path $androidDir)) {
    Write-Host "Diretório 'android' não encontrado. Verificando se é um projeto Expo..."
    
    # Verificar se é um projeto Expo
    $appJsonPath = Join-Path $projectDir "app.json"
    if (Test-Path $appJsonPath) {
        Write-Host "Projeto Expo detectado. Iniciando processo de geração de AAB..."
        
        # Verificar se o EAS CLI está instalado
        try {
            $easVersion = npx eas --version
            Write-Host "EAS CLI versão $easVersion encontrado."
        } catch {
            Write-Host "EAS CLI não encontrado. Instalando..."
            npm install -g eas-cli
        }
        
        # Tentar gerar AAB usando EAS
        Write-Host "Tentando gerar AAB usando EAS Build..."
        Write-Host "NOTA: Este processo requer uma conta Expo configurada e pode levar alguns minutos."
        Write-Host "O build será realizado nos servidores da Expo e um link para download será fornecido."
        
        # Instruções para o usuário
        Write-Host ""
        Write-Host "Para gerar o AAB usando EAS, execute manualmente o comando:"
        Write-Host "npx eas build -p android --profile production" -ForegroundColor Green
        Write-Host ""
        Write-Host "Alternativamente, para gerar localmente (requer ambiente Android configurado):"
        Write-Host "1. Execute: npx expo prebuild -p android"
        Write-Host "2. Navegue para o diretório android: cd android"
        Write-Host "3. Execute: .\gradlew bundleRelease"
        Write-Host ""
        Write-Host "O arquivo AAB será gerado em: android/app/build/outputs/bundle/release/"
        
        exit 0
    } else {
        Write-Host "Não foi possível determinar o tipo de projeto. Verifique se este é um projeto React Native ou Expo válido." -ForegroundColor Red
        exit 1
    }
}

# Se chegou aqui, é um projeto React Native com pasta android
Write-Host "Projeto React Native detectado. Iniciando processo de geração de AAB..."

# Navegar para o diretório android
Set-Location $androidDir

# Executar o comando gradlew para gerar o AAB
Write-Host "Executando gradlew bundleRelease..."
try {
    .\gradlew bundleRelease
    
    # Verificar se o AAB foi gerado
    $aabPath = Join-Path $outputDir "app-release.aab"
    if (Test-Path $aabPath) {
        Write-Host "AAB gerado com sucesso em: $aabPath" -ForegroundColor Green
    } else {
        Write-Host "Não foi possível encontrar o arquivo AAB gerado. Verifique os logs acima para possíveis erros." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erro ao executar gradlew bundleRelease: $_" -ForegroundColor Red
}

# Voltar para o diretório do projeto
Set-Location $projectDir

Write-Host ""
Write-Host "Processo de geração de AAB concluído."