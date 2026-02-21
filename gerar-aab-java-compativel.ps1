# Script para gerar arquivo AAB com verificacao de compatibilidade de Java
# Este script verifica a versao do Java antes de tentar compilar

# Configuracoes
$projectDir = Get-Location
$outputDir = Join-Path $projectDir "android\app\build\outputs\bundle\release"

Write-Host "=== Geracao de AAB para Google Play Store (Metodo Compativel) ===" -ForegroundColor Cyan
Write-Host "Iniciando processo de geracao do arquivo AAB para o aplicativo Acucaradas Encomendas..." -ForegroundColor Cyan
Write-Host ""

# Verificar a versao do Java instalada
Write-Host "Verificando a versao do Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1
    $javaVersionString = $javaVersion[0].ToString()
    Write-Host "Java encontrado: $javaVersionString" -ForegroundColor Green
    
    # Extrair a versao principal do Java
    if ($javaVersionString -match '"([0-9]+)(\.[0-9]+)*') {
        $majorVersion = $Matches[1]
        Write-Host "Versao principal do Java: $majorVersion" -ForegroundColor Green
        
        # Verificar se a versao e compativel (Gradle 8.0.1 requer Java 17 ou inferior)
        if ([int]$majorVersion -gt 17) {
            Write-Host "AVISO: A versao do Java ($majorVersion) pode ser incompativel com o Gradle 8.0.1 usado neste projeto." -ForegroundColor Yellow
            Write-Host "O Gradle 8.0.1 suporta ate Java 17. Considere usar uma versao mais antiga do Java para este build." -ForegroundColor Yellow
            
            $continuar = Read-Host "Deseja continuar mesmo assim? (S/N)"
            if ($continuar -ne "S" -and $continuar -ne "s") {
                Write-Host "Operacao cancelada pelo usuario." -ForegroundColor Red
                exit 1
            }
        }
    }
} catch {
    Write-Host "Nao foi possivel determinar a versao do Java. Erro: $_" -ForegroundColor Red
    Write-Host "Verifique se o Java esta instalado e configurado corretamente." -ForegroundColor Red
    exit 1
}

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

# Etapa 1: Configurar o ambiente para usar Java compativel
Write-Host ""
Write-Host "Etapa 1: Configurando ambiente para build..." -ForegroundColor Cyan

# Verificar se existe arquivo gradle.properties
$gradlePropsPath = Join-Path $androidDir "gradle.properties"
if (Test-Path $gradlePropsPath) {
    # Adicionar configuracao para usar Java 11 para compilacao
    $gradleProps = Get-Content $gradlePropsPath -Raw
    if (-not ($gradleProps -match "org.gradle.java.home")) {
        Write-Host "Adicionando configuracao para usar Java compativel em gradle.properties..." -ForegroundColor Yellow
        
        # Verificar se JAVA_HOME esta definido
        if ($env:JAVA_HOME) {
            Add-Content $gradlePropsPath "`n# Configuracao adicionada pelo script de build`norg.gradle.java.home=$env:JAVA_HOME"
            Write-Host "Configurado para usar Java em: $env:JAVA_HOME" -ForegroundColor Green
        } else {
            Write-Host "AVISO: Variavel JAVA_HOME nao encontrada. O build pode falhar se a versao padrao do Java for incompativel." -ForegroundColor Yellow
        }
    }
}

# Etapa 2: Navegar para o diretorio android e executar o comando gradlew
Write-Host ""
Write-Host "Etapa 2: Gerando o arquivo AAB..." -ForegroundColor Cyan
Write-Host "Navegando para o diretorio android e executando gradlew bundleRelease" -ForegroundColor Yellow

# Salvar o diretorio atual
$currentDir = Get-Location

try {
    # Navegar para o diretorio android
    Set-Location $androidDir
    
    # Limpar builds anteriores
    Write-Host "Limpando builds anteriores..." -ForegroundColor Yellow
    .\gradlew clean
    
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
        
        # Sugestoes para resolver problemas comuns
        Write-Host ""
        Write-Host "Sugestoes para resolver problemas:" -ForegroundColor Yellow
        Write-Host "1. Verifique se o Java instalado e compativel com Gradle 8.0.1 (Java 8-17)" -ForegroundColor Yellow
        Write-Host "2. Execute '.\gradlew bundleRelease --stacktrace' para obter mais detalhes sobre o erro" -ForegroundColor Yellow
        Write-Host "3. Verifique se todas as dependencias do projeto estao instaladas" -ForegroundColor Yellow
        Write-Host "4. Considere usar o EAS Build da Expo para gerar o AAB remotamente" -ForegroundColor Yellow
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