# Script alternativo para gerar arquivo AAB para o projeto Acucaradas Encomendas
# Este script usa uma abordagem diferente, ignorando a etapa de prebuild do Expo

# Configuracoes
$projectDir = Get-Location
$outputDir = Join-Path $projectDir "android\app\build\outputs\bundle\release"

Write-Host "=== Geracao de AAB para Google Play Store (Metodo Alternativo) ===" -ForegroundColor Cyan
Write-Host "Iniciando processo alternativo de geracao do arquivo AAB para o aplicativo Acucaradas Encomendas..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o diretorio android existe
$androidDir = Join-Path $projectDir "android"
if (-not (Test-Path $androidDir)) {
    Write-Host "Diretorio 'android' nao encontrado. Este script requer que o projeto ja tenha sido ejetado." -ForegroundColor Red
    exit 1
}

# Verificar se o arquivo gradlew existe
if (-not (Test-Path (Join-Path $androidDir "gradlew.bat"))) {
    Write-Host "Arquivo gradlew.bat nao encontrado no diretorio android." -ForegroundColor Red
    exit 1
}

# Etapa 1: Navegar para o diretorio android e executar o comando gradlew
Write-Host ""
Write-Host "Etapa 1: Gerando o arquivo AAB diretamente..." -ForegroundColor Cyan
Write-Host "Navegando para o diretorio android e executando gradlew bundleRelease" -ForegroundColor Yellow

# Salvar o diretorio atual
$currentDir = Get-Location

try {
    # Navegar para o diretorio android
    Set-Location $androidDir
    
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
Write-Host "=== Processo alternativo de geracao de AAB concluido ===" -ForegroundColor Cyan
Write-Host ""