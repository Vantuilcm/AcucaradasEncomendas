# Script otimizado para gerar AAB - Açucaradas Encomendas
# Criado por Rafael Borges (AABMasterAI)

Write-Host "=== Geração de AAB Otimizado para Açucaradas Encomendas ===" -ForegroundColor Cyan
Write-Host "Iniciando processo de geração do arquivo AAB..." -ForegroundColor Cyan
Write-Host ""

# Método direto: Gerar AAB via EAS Build
Write-Host "Gerando AAB via EAS Build..." -ForegroundColor Yellow
Write-Host "Executando: npx eas build -p android --profile production" -ForegroundColor Yellow
npx eas build -p android --profile production
    $updatedContent = $buildGradleContent -replace "versionCode (\d+)", "versionCode $versionCode"
    $updatedContent = $updatedContent -replace "versionName `"([^`"]*)`"", "versionName `"$versionName`""
    
    if ($updatedContent -ne $buildGradleContent) {
        Set-Content -Path $buildGradlePath -Value $updatedContent
        Write-Host "  Versão atualizada para $versionName ($versionCode)" -ForegroundColor Green
    } else {
        Write-Host "✓ Versão já configurada corretamente" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Arquivo build.gradle não encontrado. Verifique a estrutura do projeto." -ForegroundColor Red
    exit 1
}

# Verificar configuração de assinatura
Write-Host "5. Verificando configuração de assinatura..." -ForegroundColor Yellow
$keystorePath = Join-Path $androidDir "app\acucaradas-release-key.keystore"
$keystoreExists = Test-Path $keystorePath

if (-not $keystoreExists) {
    Write-Host "  Keystore não encontrado. Criando keystore para assinatura..." -ForegroundColor Yellow
    
    # Criar diretório para keystore se não existir
    $keystoreDir = Join-Path $androidDir "app"
    if (-not (Test-Path $keystoreDir)) {
        New-Item -ItemType Directory -Path $keystoreDir | Out-Null
    }
    
    # Gerar keystore
    $keytoolCmd = "keytool -genkeypair -v -keystore `"$keystorePath`" -alias acucaradas-key -keyalg RSA -keysize 2048 -validity 10000 -storepass acucaradas123 -keypass acucaradas123 -dname `"CN=Acucaradas Encomendas, OU=Mobile, O=Acucaradas, L=Sao Paulo, ST=SP, C=BR`""
    Invoke-Expression $keytoolCmd
    
    if (Test-Path $keystorePath) {
        Write-Host "✓ Keystore criado com sucesso" -ForegroundColor Green
    } else {
        Write-Host "❌ Falha ao criar keystore. Verifique se o keytool está disponível." -ForegroundColor Red
        exit 1
    }
    
    # Atualizar build.gradle com configuração de assinatura
    $signingConfig = @"

    signingConfigs {
        release {
            storeFile file('acucaradas-release-key.keystore')
            storePassword 'acucaradas123'
            keyAlias 'acucaradas-key'
            keyPassword 'acucaradas123'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
"@
    
    $buildGradleContent = Get-Content $buildGradlePath -Raw
    $updatedContent = $buildGradleContent -replace "buildTypes \{[^}]*\}", $signingConfig
    
    if ($updatedContent -eq $buildGradleContent) {
        # Se não encontrou o padrão exato, tenta inserir antes do último }
        $updatedContent = $buildGradleContent -replace "(\}\s*)$", "$signingConfig`$1"
    }
    
    Set-Content -Path $buildGradlePath -Value $updatedContent
    Write-Host "✓ Configuração de assinatura adicionada ao build.gradle" -ForegroundColor Green
} else {
    Write-Host "✓ Keystore encontrado: $keystorePath" -ForegroundColor Green
}

# Gerar AAB
Write-Host "6. Gerando AAB..." -ForegroundColor Yellow
Set-Location $androidDir

# Limpar builds anteriores
Write-Host "  Limpando builds anteriores..." -ForegroundColor Yellow
./gradlew clean

# Gerar AAB
Write-Host "  Executando build do AAB..." -ForegroundColor Yellow
./gradlew bundleRelease

# Verificar se o AAB foi gerado
$aabPath = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $aabPath) {
    Write-Host "✓ AAB gerado com sucesso: $aabPath" -ForegroundColor Green
    
    # Copiar para diretório raiz para facilitar acesso
    $destPath = Join-Path (Split-Path $androidDir) "acucaradas-encomendas-$versionName.aab"
    Copy-Item $aabPath $destPath
    Write-Host "✓ AAB copiado para: $destPath" -ForegroundColor Green
    
    # Informações sobre o AAB
    $aabSize = (Get-Item $destPath).Length / 1MB
    Write-Host "  Tamanho do AAB: $([math]::Round($aabSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "❌ Falha ao gerar AAB. Verifique os logs acima para mais detalhes." -ForegroundColor Red
    exit 1
}

# Instruções para upload
Write-Host ""
Write-Host "=== Instruções para Upload na Google Play Store ===" -ForegroundColor Cyan
Write-Host "1. Acesse https://play.google.com/console" -ForegroundColor White
Write-Host "2. Selecione o aplicativo 'Açucaradas Encomendas'" -ForegroundColor White
Write-Host "3. Vá para Produção > Lançamentos > Criar novo lançamento" -ForegroundColor White
Write-Host "4. Faça upload do arquivo: $destPath" -ForegroundColor White
Write-Host "5. Preencha as notas de lançamento e envie para revisão" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Guarde o arquivo keystore em local seguro!" -ForegroundColor Yellow
Write-Host "Senha do keystore: acucaradas123" -ForegroundColor Yellow
Write-Host "Alias da chave: acucaradas-key" -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Processo de geração de AAB concluído com sucesso! ===" -ForegroundColor Green