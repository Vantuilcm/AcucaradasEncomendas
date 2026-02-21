# Script para Verificacao de Formato do Pacote (AAB vs APK)
# Acucaradas Encomendas

# Configuracao de codificacao para caracteres especiais
# Removendo dependencia de UTF-8 para maior compatibilidade

# Configurações iniciais
$ErrorActionPreference = "Continue"
$projectRoot = $PSScriptRoot
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Função para registrar mensagens de log
function Write-Log {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [string]$ForegroundColor = "White"
    )
    
    Write-Host $Message -ForegroundColor $ForegroundColor
}

Write-Host ""
Write-Host "===== VERIFICACAO DE FORMATO DO PACOTE ====="
Write-Host "Iniciado em: $timestamp"
Write-Host "Diretorio do projeto: $projectRoot"
Write-Host "------------------------------------------"
Write-Host ""

# Procurar por arquivos AAB e APK no diretório do projeto
try {
    Write-Log "Buscando arquivos AAB e APK no diretório do projeto..." -ForegroundColor Cyan
    $aabFiles = Get-ChildItem -Path $projectRoot -Include "*.aab" -Recurse -ErrorAction SilentlyContinue
    $apkFiles = Get-ChildItem -Path $projectRoot -Include "*.apk" -Recurse -ErrorAction SilentlyContinue
    
    if ($null -eq $aabFiles) { $aabFiles = @() }
    if ($null -eq $apkFiles) { $apkFiles = @() }
    
    Write-Log "Encontrados $($aabFiles.Count) arquivos AAB e $($apkFiles.Count) arquivos APK." -ForegroundColor Cyan
} catch {
    Write-Log "ERRO ao buscar arquivos: $_" -ForegroundColor Red
    $aabFiles = @()
    $apkFiles = @()
}

# Verificar configuração de build para AAB
try {
    Write-Log "Verificando configurações de build para suporte a AAB..." -ForegroundColor Cyan
    $configFiles = @()
    $configFiles += Get-ChildItem -Path $projectRoot -Include "build.gradle", "app.json", "package.json", "eas.json", "app.config.js", "gradle.properties" -Recurse -ErrorAction SilentlyContinue
    
    if ($null -eq $configFiles) { $configFiles = @() }
    
    Write-Log "Encontrados $($configFiles.Count) arquivos de configuração para análise." -ForegroundColor Cyan
} catch {
    Write-Log "ERRO ao buscar arquivos de configuração: $_" -ForegroundColor Red
    $configFiles = @()
}

$aabConfigFound = $false
$configFilesWithAAB = @()

foreach ($file in $configFiles) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
        
        if ($null -ne $content) {
            if ($content -match "bundleRelease" -or 
                $content -match "appbundle" -or 
                $content -match "bundle" -or
                $content -match "aab") {
                
                $aabConfigFound = $true
                $configFilesWithAAB += $file
                Write-Log "Configuração AAB encontrada em: $($file.Name)" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Log "ERRO ao analisar arquivo $($file.FullName): $_" -ForegroundColor Red
    }
}

# Exibir resultados
Write-Log "RESULTADOS DA VERIFICAÇÃO:" -ForegroundColor Cyan
Write-Host ""

# Verificar se está usando AAB
if ($aabFiles.Count -gt 0) {
    Write-Log "USANDO ANDROID APP BUNDLE (AAB)" -ForegroundColor Green
    Write-Log "Arquivos AAB encontrados: $($aabFiles.Count)" -ForegroundColor White
    Write-Host ""
    
    foreach ($file in $aabFiles) {
        $relativePath = $file.FullName.Replace($projectRoot, ".")
        $sizeInMB = [Math]::Round($file.Length / 1MB, 2)
        Write-Host "- $($file.Name) - $sizeInMB MB"
        Write-Host "  Caminho: $relativePath"
        Write-Host "  Ultima modificacao: $($file.LastWriteTime)"
        Write-Host ""
    }
    
    # Verificar configuração de build
    if ($aabConfigFound) {
        Write-Log "CONFIGURACAO DE BUILD PARA AAB ENCONTRADA" -ForegroundColor Green
        Write-Log "Arquivos de configuracao relevantes:" -ForegroundColor White
        Write-Host ""
        
        foreach ($file in $configFilesWithAAB) {
            $relativePath = $file.FullName.Replace($projectRoot, ".")
            Write-Host "- $($file.Name)"
            Write-Host "  Caminho: $relativePath"
            Write-Host ""
        }
    } else {
        Write-Log "CONFIGURACAO DE BUILD PARA AAB NAO ENCONTRADA EXPLICITAMENTE" -ForegroundColor Yellow
        Write-Log "Recomendacao: Verifique se a configuracao de build esta corretamente definida para gerar AAB" -ForegroundColor White
        Write-Host ""
    }
    
    Write-Log "BENEFICIOS DO FORMATO AAB:" -ForegroundColor Cyan
    Write-Log "+ Padrao recomendado pela Google Play desde agosto de 2021" -ForegroundColor White
    Write-Log "+ Reducao de tamanho de download e instalacao (ate 15% menor)" -ForegroundColor White
    Write-Log "+ Gera APKs otimizados para cada dispositivo" -ForegroundColor White
    Write-Log "+ Permite recursos sob demanda e modulos dinamicos" -ForegroundColor White
    Write-Host ""
    
    Write-Log "STATUS: PRONTO PARA PUBLICACAO" -ForegroundColor Green
} else {
    if ($apkFiles.Count -gt 0) {
        Write-Log "NAO ESTA USANDO ANDROID APP BUNDLE (AAB)" -ForegroundColor Red
        Write-Log "Arquivos APK encontrados: $($apkFiles.Count)" -ForegroundColor White
        Write-Host ""
        
        foreach ($file in $apkFiles) {
            $relativePath = $file.FullName.Replace($projectRoot, ".")
            $sizeInMB = [Math]::Round($file.Length / 1MB, 2)
            Write-Host "- $($file.Name) - $sizeInMB MB"
            Write-Host "  Caminho: $relativePath"
            Write-Host "  Ultima modificacao: $($file.LastWriteTime)"
            Write-Host ""
        }
        
        # Verificar configuração de build
        if ($aabConfigFound) {
            Write-Log "CONFIGURACAO DE BUILD PARA AAB ENCONTRADA, MAS APENAS APK GERADO" -ForegroundColor Yellow
            Write-Log "Recomendacao: Verifique se esta executando o comando correto para gerar AAB" -ForegroundColor White
            Write-Host ""
            
            foreach ($file in $configFilesWithAAB) {
                $relativePath = $file.FullName.Replace($projectRoot, ".")
                Write-Host "- $($file.Name)"
                Write-Host "  Caminho: $relativePath"
                Write-Host ""
            }
        } else {
            Write-Log "CONFIGURACAO DE BUILD PARA AAB NAO ENCONTRADA" -ForegroundColor Red
            Write-Log "Recomendacao: Atualize a configuracao de build para suportar AAB" -ForegroundColor White
            Write-Host ""
        }
        
        Write-Log "RECOMENDACOES PARA MIGRAR PARA AAB:" -ForegroundColor Cyan
        Write-Log "1. Atualizar o processo de build para gerar AAB em vez de APK:" -ForegroundColor White
        Write-Log "   - Android Studio/Gradle: Use './gradlew bundleRelease' em vez de './gradlew assembleRelease'" -ForegroundColor White
        Write-Log "   - React Native: Use 'npx react-native build-android --mode=release' com configuração adequada" -ForegroundColor White
        Write-Log "   - Flutter: Use 'flutter build appbundle' em vez de 'flutter build apk'" -ForegroundColor White
        Write-Log "   - Expo: Configure o EAS Build com 'eas build -p android --profile production'" -ForegroundColor White
        Write-Host ""
        
        Write-Log "STATUS: NECESSITA ATENCAO" -ForegroundColor Yellow
    } else {
        Write-Log "NENHUM ARQUIVO AAB OU APK ENCONTRADO NO PROJETO" -ForegroundColor Red
        
        # Verificar configuração de build
        if ($aabConfigFound) {
            Write-Log "CONFIGURACAO DE BUILD PARA AAB ENCONTRADA, MAS NENHUM ARQUIVO GERADO" -ForegroundColor Yellow
            Write-Log "Recomendacao: Execute o build para gerar o arquivo AAB" -ForegroundColor White
            Write-Host ""
            
            foreach ($file in $configFilesWithAAB) {
                $relativePath = $file.FullName.Replace($projectRoot, ".")
                Write-Host "- $($file.Name)"
                Write-Host "  Caminho: $relativePath"
                Write-Host ""
            }
        } else {
            Write-Log "CONFIGURACAO DE BUILD PARA AAB NAO ENCONTRADA" -ForegroundColor Red
            Write-Log "Recomendacao: Configure o projeto para suportar AAB e execute o build" -ForegroundColor White
            Write-Host ""
        }
        
        Write-Log "COMANDOS PARA GERAR AAB:" -ForegroundColor Cyan
        Write-Log "- Android Studio/Gradle: './gradlew bundleRelease'" -ForegroundColor White
        Write-Log "- React Native: 'npx react-native build-android --mode=release'" -ForegroundColor White
        Write-Log "- Flutter: 'flutter build appbundle'" -ForegroundColor White
        Write-Log "- Expo: 'eas build -p android --profile production'" -ForegroundColor White
        Write-Host ""
        
        Write-Log "STATUS: NECESSITA ATENCAO" -ForegroundColor Yellow
    }
    
    Write-Log "BENEFICIOS DA MIGRACAO PARA AAB:" -ForegroundColor Cyan
    Write-Log "+ Padrao recomendado pela Google Play desde agosto de 2021" -ForegroundColor White
    Write-Log "+ Reducao de tamanho de download e instalacao (ate 15% menor)" -ForegroundColor White
    Write-Log "+ Gera APKs otimizados para cada dispositivo" -ForegroundColor White
    Write-Log "+ Permite recursos sob demanda e modulos dinamicos" -ForegroundColor White
    Write-Host ""
}

# Gerar resumo da verificação
$endTime = Get-Date
$duration = $endTime - [DateTime]::ParseExact($timestamp, "yyyy-MM-dd HH:mm:ss", $null)

Write-Host "------------------------------------------"
Write-Log "RESUMO DA VERIFICACAO:" -ForegroundColor Cyan
Write-Log "- Arquivos AAB encontrados: $($aabFiles.Count)" -ForegroundColor White
Write-Log "- Arquivos APK encontrados: $($apkFiles.Count)" -ForegroundColor White
Write-Log "- Configuracao para AAB: $(if ($aabConfigFound) { "Encontrada" } else { "Nao encontrada" })" -ForegroundColor White
Write-Log "- Tempo de execucao: $($duration.TotalSeconds.ToString("0.00")) segundos" -ForegroundColor White
Write-Host ""

Write-Host "------------------------------------------"
Write-Host ""