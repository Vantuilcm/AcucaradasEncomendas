# Script de Auditoria Técnica para Publicação de App
# Açucaradas Encomendas - Relatório de Prontidão para Google Play e App Store

# Configurações iniciais
$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$reportPath = Join-Path -Path $projectRoot -ChildPath "relatorio-auditoria.md"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Função para registrar mensagens no console com cores
function Write-ColorLog {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [string]$ForegroundColor = "White"
    )
    
    Write-Host $Message -ForegroundColor $ForegroundColor
}

# Função para adicionar conteúdo ao relatório
function Add-ToReport {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Content
    )
    
    Add-Content -Path $reportPath -Value $Content
}

# Inicializar o relatório
function Initialize-Report {
    $reportHeader = @"
# Relatório de Auditoria Técnica - Açucaradas Encomendas

**Data da Auditoria:** $timestamp

## Sumário Executivo

Este relatório apresenta os resultados da auditoria técnica realizada no aplicativo Açucaradas Encomendas, avaliando sua prontidão para submissão nas lojas Google Play e App Store.

"@
    
    Set-Content -Path $reportPath -Value $reportHeader
    Write-ColorLog "Relatório inicializado em: $reportPath" -ForegroundColor Green
}

# Função para verificar a estrutura do projeto
function Test-ProjectStructure {
    Write-ColorLog "Verificando estrutura do projeto..." -ForegroundColor Cyan
    
    Add-ToReport "## 1. Estrutura do Projeto"
    
    # Arquivos críticos a verificar
    $criticalFiles = @{
        "Configuração" = @("app.json", "app.config.js", "app.config.ts", "package.json", "metro.config.js", "babel.config.js", "tsconfig.json")
        "Metadados" = @("app.json", "app.config.js", "app.config.ts", "eas.json")
        "Ícones e Splash" = @("assets/icon.png", "assets/splash.png", "assets/adaptive-icon.png")
        "Documentos Legais" = @("PRIVACY.md", "TERMS.md", "privacy-policy.html", "terms-of-service.html")
        "Android" = @("android/app/src/main/AndroidManifest.xml", "android/app/google-services.json")
        "iOS" = @("ios/*/Info.plist", "ios/GoogleService-Info.plist")
    }
    
    $acertos = @()
    $pendencias = @()
    
    foreach ($categoria in $criticalFiles.Keys) {
        Add-ToReport "### 1.$($criticalFiles.Keys.IndexOf($categoria) + 1) $categoria"
        
        foreach ($arquivo in $criticalFiles[$categoria]) {
            $arquivosEncontrados = Get-ChildItem -Path $projectRoot -Filter (Split-Path -Leaf $arquivo) -Recurse -ErrorAction SilentlyContinue
            
            if ($arquivosEncontrados.Count -gt 0) {
                $caminhoRelativo = $arquivosEncontrados[0].FullName.Replace($projectRoot, ".")
                $acertos += "✅ $categoria - $caminhoRelativo"
                Add-ToReport "- ✅ Encontrado: $caminhoRelativo"
            } else {
                $pendencias += "❌ $categoria - Arquivo não encontrado: $arquivo"
                Add-ToReport "- ❌ Não encontrado: $arquivo"
            }
        }
        
        Add-ToReport ""
    }
    
    return @{
        "Acertos" = $acertos
        "Pendencias" = $pendencias
    }
}

# Função para verificar integridade de links e recursos
function Test-ResourceIntegrity {
    Write-ColorLog "Verificando integridade de links e recursos..." -ForegroundColor Cyan
    
    Add-ToReport "## 2. Integridade de Links e Recursos"
    
    $acertos = @()
    $pendencias = @()
    
    # Verificar imagens
    $imageFiles = Get-ChildItem -Path $projectRoot -Include @("*.png", "*.jpg", "*.jpeg", "*.gif", "*.svg") -Recurse
    Add-ToReport "### 2.1 Imagens"
    
    if ($imageFiles.Count -gt 0) {
        $acertos += "✅ Encontradas $($imageFiles.Count) imagens no projeto"
        Add-ToReport "- ✅ Encontradas $($imageFiles.Count) imagens no projeto"
        
        # Verificar tamanho das imagens
        $grandesImagens = $imageFiles | Where-Object { $_.Length -gt 1MB } | Select-Object -ExpandProperty FullName
        
        if ($grandesImagens.Count -gt 0) {
            $pendencias += "⚠️ $($grandesImagens.Count) imagens com tamanho superior a 1MB"
            Add-ToReport "- ⚠️ $($grandesImagens.Count) imagens com tamanho superior a 1MB:"
            
            foreach ($imagem in $grandesImagens) {
                $tamanhoMB = [Math]::Round((Get-Item $imagem).Length / 1MB, 2)
                $caminhoRelativo = $imagem.Replace($projectRoot, ".")
                Add-ToReport "  - $caminhoRelativo ($tamanhoMB MB)"
            }
        } else {
            $acertos += "✅ Todas as imagens têm tamanho otimizado (< 1MB)"
            Add-ToReport "- ✅ Todas as imagens têm tamanho otimizado (< 1MB)"
        }
    } else {
        $pendencias += "❌ Nenhuma imagem encontrada no projeto"
        Add-ToReport "- ❌ Nenhuma imagem encontrada no projeto"
    }
    
    # Verificar links em arquivos JS/TS
    Add-ToReport ""
    Add-ToReport "### 2.2 Links em Código"
    
    $codeFiles = Get-ChildItem -Path $projectRoot -Include @("*.js", "*.jsx", "*.ts", "*.tsx") -Recurse
    $urlPattern = 'https?://[^\s"\'')]+'
    $urlsEncontradas = @()
    
    foreach ($file in $codeFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        $matches = [regex]::Matches($content, $urlPattern)
        
        foreach ($match in $matches) {
            $urlsEncontradas += $match.Value
        }
    }
    
    $urlsEncontradas = $urlsEncontradas | Select-Object -Unique
    
    if ($urlsEncontradas.Count -gt 0) {
        Add-ToReport "- ✅ Encontrados $($urlsEncontradas.Count) links únicos no código"
        Add-ToReport "- ⚠️ Recomendação: Verificar manualmente se os seguintes links estão funcionais:"
        
        foreach ($url in $urlsEncontradas) {
            Add-ToReport "  - $url"
        }
    } else {
        Add-ToReport "- ℹ️ Nenhum link externo encontrado no código"
    }
    
    return @{
        "Acertos" = $acertos
        "Pendencias" = $pendencias
    }
}

# Função para verificar segurança
function Test-Security {
    Write-ColorLog "Verificando segurança..." -ForegroundColor Cyan
    
    Add-ToReport "## 3. Segurança"
    Add-ToReport "### 3.1 Verificação de Credenciais Expostas"
    
    $acertos = @()
    $pendencias = @()
    
    # Padrões de segredos comuns
    $secretPatterns = @{
        "API Key" = '(?i)(api[_-]?key|apikey)[^a-zA-Z0-9]([\"\''`])[0-9a-zA-Z]{16,}\2'
        "Firebase Key" = '(?i)AIza[0-9A-Za-z\\-_]{35}'
        "Google OAuth" = '(?i)[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com'
        "JWT Token" = '(?i)ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*'
        "Password" = '(?i)(password|passwd|pwd)[^a-zA-Z0-9]([\"\''`])[^\2]{8,}\2'
        "Private Key" = '(?i)-----BEGIN PRIVATE KEY-----'
    }
    
    $codeFiles = Get-ChildItem -Path $projectRoot -Include @("*.js", "*.jsx", "*.ts", "*.tsx", "*.json", "*.md", "*.html") -Recurse -Exclude @("node_modules", "*lock.json")
    $secretsFound = @{}
    
    foreach ($file in $codeFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        foreach ($secretType in $secretPatterns.Keys) {
            $pattern = $secretPatterns[$secretType]
            $matches = [regex]::Matches($content, $pattern)
            
            if ($matches.Count -gt 0) {
                $caminhoRelativo = $file.FullName.Replace($projectRoot, ".")
                
                if (-not $secretsFound.ContainsKey($secretType)) {
                    $secretsFound[$secretType] = @()
                }
                
                $secretsFound[$secretType] += "$caminhoRelativo (Linha: $($matches[0].Index))"
            }
        }
    }
    
    if ($secretsFound.Count -gt 0) {
        $pendencias += "❌ Encontradas possíveis credenciais expostas no código"
        Add-ToReport "- ❌ Encontradas possíveis credenciais expostas no código:"
        
        foreach ($secretType in $secretsFound.Keys) {
            Add-ToReport "  - $secretType:"
            
            foreach ($location in $secretsFound[$secretType]) {
                Add-ToReport "    - $location"
            }
        }
    } else {
        $acertos += "✅ Nenhuma credencial exposta encontrada no código"
        Add-ToReport "- ✅ Nenhuma credencial exposta encontrada no código"
    }
    
    # Verificar uso de .env ou variáveis de ambiente
    $envFiles = Get-ChildItem -Path $projectRoot -Filter ".env*" -Recurse -File
    
    if ($envFiles.Count -gt 0) {
        $acertos += "✅ Arquivos .env encontrados para gerenciamento de segredos"
        Add-ToReport "- ✅ Arquivos .env encontrados para gerenciamento de segredos:"
        
        foreach ($file in $envFiles) {
            $caminhoRelativo = $file.FullName.Replace($projectRoot, ".")
            Add-ToReport "  - $caminhoRelativo"
        }
        
        # Verificar se .env está no .gitignore
        $gitignorePath = Join-Path -Path $projectRoot -ChildPath ".gitignore"
        
        if (Test-Path $gitignorePath) {
            $gitignoreContent = Get-Content -Path $gitignorePath -Raw
            
            if ($gitignoreContent -match '\.env') {
                $acertos += "✅ Arquivos .env estão corretamente ignorados no .gitignore"
                Add-ToReport "- ✅ Arquivos .env estão corretamente ignorados no .gitignore"
            } else {
                $pendencias += "❌ Arquivos .env não estão ignorados no .gitignore"
                Add-ToReport "- ❌ Arquivos .env não estão ignorados no .gitignore"
            }
        }
    } else {
        Add-ToReport "- ℹ️ Nenhum arquivo .env encontrado no projeto"
    }
    
    return @{
        "Acertos" = $acertos
        "Pendencias" = $pendencias
    }
}

# Função para verificar otimização de assets
function Test-AssetOptimization {
    Write-ColorLog "Verificando otimização de assets..." -ForegroundColor Cyan
    
    Add-ToReport "## 4. Otimização de Assets"
    
    $acertos = @()
    $pendencias = @()
    
    # Verificar tamanho total de assets
    $assetFolders = @("assets", "images", "img", "icons")
    $assetFiles = @()
    
    foreach ($folder in $assetFolders) {
        $folderPath = Join-Path -Path $projectRoot -ChildPath $folder
        
        if (Test-Path $folderPath) {
            $assetFiles += Get-ChildItem -Path $folderPath -Include @("*.png", "*.jpg", "*.jpeg", "*.gif", "*.svg") -Recurse
        }
    }
    
    if ($assetFiles.Count -gt 0) {
        $totalSize = ($assetFiles | Measure-Object -Property Length -Sum).Sum / 1MB
        $totalSizeFormatted = [Math]::Round($totalSize, 2)
        
        Add-ToReport "### 4.1 Tamanho Total de Assets"
        Add-ToReport "- ℹ️ Tamanho total de assets: $totalSizeFormatted MB ($($assetFiles.Count) arquivos)"
        
        if ($totalSize -gt 50) {
            $pendencias += "⚠️ O tamanho total de assets é muito grande ($totalSizeFormatted MB)"
            Add-ToReport "- ⚠️ O tamanho total de assets é muito grande. Recomenda-se manter abaixo de 50 MB."
        } else {
            $acertos += "✅ O tamanho total de assets está dentro do recomendado ($totalSizeFormatted MB)"
            Add-ToReport "- ✅ O tamanho total de assets está dentro do recomendado."
        }
        
        # Verificar imagens grandes
        $grandesImagens = $assetFiles | Where-Object { $_.Length -gt 500KB } | Sort-Object -Property Length -Descending
        
        if ($grandesImagens.Count -gt 0) {
            Add-ToReport "### 4.2 Imagens Grandes (> 500KB)"
            $pendencias += "⚠️ $($grandesImagens.Count) imagens com tamanho superior a 500KB"
            
            foreach ($imagem in $grandesImagens) {
                $tamanhoKB = [Math]::Round($imagem.Length / 1KB, 2)
                $caminhoRelativo = $imagem.FullName.Replace($projectRoot, ".")
                Add-ToReport "- $caminhoRelativo ($tamanhoKB KB)"
            }
        } else {
            $acertos += "✅ Nenhuma imagem com tamanho superior a 500KB"
            Add-ToReport "### 4.2 Imagens Grandes"
            Add-ToReport "- ✅ Nenhuma imagem com tamanho superior a 500KB"
        }
    } else {
        Add-ToReport "- ℹ️ Nenhum asset encontrado nas pastas padrão"
    }
    
    # Verificar minificação de JS/CSS
    Add-ToReport ""
    Add-ToReport "### 4.3 Minificação de JS/CSS"
    
    $jsFiles = Get-ChildItem -Path $projectRoot -Include @("*.js", "*.jsx") -Recurse -Exclude @("node_modules", "*.min.js")
    $cssFiles = Get-ChildItem -Path $projectRoot -Include @("*.css") -Recurse -Exclude @("node_modules", "*.min.css")
    
    $naoMinificados = @()
    
    # Verificar se há configuração de minificação no package.json
    $packageJsonPath = Join-Path -Path $projectRoot -ChildPath "package.json"
    $temMinificacao = $false
    
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
        
        if ($packageJson.scripts -and ($packageJson.scripts.build -match 'minify|uglify|terser' -or 
                                      $packageJson.devDependencies -match 'minify|uglify|terser|webpack')) {
            $temMinificacao = $true
            $acertos += "✅ Configuração de minificação encontrada no package.json"
            Add-ToReport "- ✅ Configuração de minificação encontrada no package.json"
        }
    }
    
    if (-not $temMinificacao) {
        $pendencias += "⚠️ Nenhuma configuração de minificação encontrada no package.json"
        Add-ToReport "- ⚠️ Nenhuma configuração de minificação encontrada no package.json"
        Add-ToReport "- ℹ️ Recomendação: Adicionar ferramentas de minificação como terser, uglify-js ou webpack"
    }
    
    return @{
        "Acertos" = $acertos
        "Pendencias" = $pendencias
    }
}

# Função para verificar metadados de publicação
function Test-PublishingMetadata {
    Write-ColorLog "Verificando metadados de publicação..." -ForegroundColor Cyan
    
    Add-ToReport "## 5. Metadados de Publicação"
    
    $acertos = @()
    $pendencias = @()
    
    # Verificar app.json ou app.config.js/ts
    $appConfigFiles = Get-ChildItem -Path $projectRoot -Include @("app.json", "app.config.js", "app.config.ts") -Recurse -Depth 1
    
    if ($appConfigFiles.Count -gt 0) {
        $appConfigPath = $appConfigFiles[0].FullName
        $caminhoRelativo = $appConfigPath.Replace($projectRoot, ".")
        
        $acertos += "✅ Arquivo de configuração do app encontrado: $caminhoRelativo"
        Add-ToReport "### 5.1 Configuração do App"
        Add-ToReport "- ✅ Arquivo de configuração do app encontrado: $caminhoRelativo"
        
        # Verificar conteúdo do arquivo de configuração
        $appConfigContent = Get-Content -Path $appConfigPath -Raw
        
        $metadataChecks = @{
            "Nome do App" = '"name"\s*:\s*"[^"]+"'
            "Versão" = '"version"\s*:\s*"[^"]+"'
            "Identificador do Pacote" = '"bundleIdentifier"\s*:\s*"[^"]+"|"package"\s*:\s*"[^"]+"'
            "Ícone" = '"icon"\s*:\s*"[^"]+"'
            "Splash Screen" = '"splash"\s*:'
            "Permissões" = '"permissions"\s*:'
        }
        
        foreach ($check in $metadataChecks.Keys) {
            $pattern = $metadataChecks[$check]
            
            if ($appConfigContent -match $pattern) {
                $acertos += "✅ $check configurado"
                Add-ToReport "- ✅ $check configurado"
            } else {
                $pendencias += "❌ $check não configurado"
                Add-ToReport "- ❌ $check não configurado"
            }
        }
    } else {
        $pendencias += "❌ Nenhum arquivo de configuração do app encontrado"
        Add-ToReport "### 5.1 Configuração do App"
        Add-ToReport "- ❌ Nenhum arquivo de configuração do app encontrado"
    }
    
    # Verificar AndroidManifest.xml
    $androidManifestPath = Get-ChildItem -Path $projectRoot -Include "AndroidManifest.xml" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    
    Add-ToReport ""
    Add-ToReport "### 5.2 Android"
    
    if ($androidManifestPath) {
        $caminhoRelativo = $androidManifestPath.FullName.Replace($projectRoot, ".")
        $acertos += "✅ AndroidManifest.xml encontrado: $caminhoRelativo"
        Add-ToReport "- ✅ AndroidManifest.xml encontrado: $caminhoRelativo"
        
        # Verificar permissões sensíveis
        $androidManifestContent = Get-Content -Path $androidManifestPath.FullName -Raw
        $sensiblePermissions = @(
            "android.permission.READ_CONTACTS",
            "android.permission.WRITE_CONTACTS",
            "android.permission.READ_CALENDAR",
            "android.permission.WRITE_CALENDAR",
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE",
            "android.permission.ACCESS_FINE_LOCATION",
            "android.permission.ACCESS_COARSE_LOCATION",
            "android.permission.RECORD_AUDIO",
            "android.permission.CAMERA",
            "android.permission.READ_PHONE_STATE",
            "android.permission.READ_CALL_LOG",
            "android.permission.WRITE_CALL_LOG",
            "android.permission.READ_SMS",
            "android.permission.SEND_SMS",
            "android.permission.RECEIVE_SMS"
        )
        
        $foundPermissions = @()
        
        foreach ($permission in $sensiblePermissions) {
            if ($androidManifestContent -match $permission) {
                $foundPermissions += $permission
            }
        }
        
        if ($foundPermissions.Count -gt 0) {
            Add-ToReport "- ⚠️ Permissões sensíveis encontradas:"
            
            foreach ($permission in $foundPermissions) {
                Add-ToReport "  - $permission"
            }
            
            Add-ToReport "- ℹ️ Recomendação: Certifique-se de que todas as permissões sensíveis estão justificadas na política de privacidade"
        } else {
            $acertos += "✅ Nenhuma permissão sensível encontrada no AndroidManifest.xml"
            Add-ToReport "- ✅ Nenhuma permissão sensível encontrada no AndroidManifest.xml"
        }
    } else {
        $pendencias += "⚠️ AndroidManifest.xml não encontrado"
        Add-ToReport "- ⚠️ AndroidManifest.xml não encontrado"
    }
    
    # Verificar Info.plist
    $infoPlistPath = Get-ChildItem -Path $projectRoot -Include "Info.plist" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    
    Add-ToReport ""
    Add-ToReport "### 5.3 iOS"
    
    if ($infoPlistPath) {
        $caminhoRelativo = $infoPlistPath.FullName.Replace($projectRoot, ".")
        $acertos += "✅ Info.plist encontrado: $caminhoRelativo"
        Add-ToReport "- ✅ Info.plist encontrado: $caminhoRelativo"
        
        # Verificar chaves de privacidade
        $infoPlistContent = Get-Content -Path $infoPlistPath.FullName -Raw
        $privacyKeys = @(
            "NSCameraUsageDescription",
            "NSPhotoLibraryUsageDescription",
            "NSLocationWhenInUseUsageDescription",
            "NSLocationAlwaysUsageDescription",
            "NSMicrophoneUsageDescription",
            "NSContactsUsageDescription",
            "NSCalendarsUsageDescription",
            "NSRemindersUsageDescription",
            "NSMotionUsageDescription",
            "NSHealthUpdateUsageDescription",
            "NSHealthShareUsageDescription",
            "NSBluetoothAlwaysUsageDescription",
            "NSAppleMusicUsageDescription",
            "NSSpeechRecognitionUsageDescription",
            "NSFaceIDUsageDescription"
        )
        
        $foundPrivacyKeys = @()
        
        foreach ($key in $privacyKeys) {
            if ($infoPlistContent -match $key) {
                $foundPrivacyKeys += $key
            }
        }
        
        if ($foundPrivacyKeys.Count -gt 0) {
            Add-ToReport "- ⚠️ Chaves de privacidade encontradas:"
            
            foreach ($key in $foundPrivacyKeys) {
                Add-ToReport "  - $key"
            }
            
            Add-ToReport "- ℹ️ Recomendação: Certifique-se de que todas as chaves de privacidade têm descrições claras e estão justificadas na política de privacidade"
        } else {
            $acertos += "✅ Nenhuma chave de privacidade encontrada no Info.plist"
            Add-ToReport "- ✅ Nenhuma chave de privacidade encontrada no Info.plist"
        }
    } else {
        $pendencias += "⚠️ Info.plist não encontrado"
        Add-ToReport "- ⚠️ Info.plist não encontrado"
    }
    
    return @{
        "Acertos" = $acertos
        "Pendencias" = $pendencias
    }
}

# Função para verificar páginas legais
function Test-LegalPages {
    Write-ColorLog "Verificando páginas legais..." -ForegroundColor Cyan
    
    Add-ToReport "## 6. Páginas Legais"
    
    $acertos = @()
    $pendencias = @()
    
    # Verificar política de privacidade
    $privacyFiles = Get-ChildItem -Path $projectRoot -Include @("privacy*.md", "privacy*.html", "PRIVACY.md", "privacy-policy.*") -Recurse -ErrorAction SilentlyContinue
    
    Add-ToReport "### 6.1 Política de Privacidade"
    
    if ($privacyFiles.Count -gt 0) {
        $caminhoRelativo = $privacyFiles[0].FullName.Replace($projectRoot, ".")
        $acertos += "✅ Política de Privacidade encontrada: $caminhoRelativo"
        Add-ToReport "- ✅ Política de Privacidade encontrada: $caminhoRelativo"
        
        # Verificar conteúdo da política de privacidade
        $privacyContent = Get-Content -Path $privacyFiles[0].FullName -Raw
        
        $privacyChecks = @{
            "Coleta de Dados" = '(?i)coleta\s+de\s+dados|dados\s+coletados|informações\s+coletadas'
            "Uso de Dados" = '(?i)uso\s+de\s+dados|como\s+usamos|utilização\s+de\s+dados'
            "Compartilhamento" = '(?i)compartilhamento|terceiros|parceiros'
            "Armazenamento" = '(?i)armazenamento|armazenamos|guardamos'
            "Direitos do Usuário" = '(?i)direitos|solicitar|excluir|acessar'
            "Contato" = '(?i)contato|contatar|e-mail|email|telefone'
        }
        
        foreach ($check in $privacyChecks.Keys) {
            $pattern = $privacyChecks[$check]
            
            if ($privacyContent -match $pattern) {
                $acertos += "✅ Política de Privacidade: Seção '$check' encontrada"
                Add-ToReport "- ✅ Seção '$check' encontrada"
            } else {
                $pendencias += "⚠️ Política de Privacidade: Seção '$check' não encontrada"
                Add-ToReport "- ⚠️ Seção '$check' não encontrada"
            }
        }
    } else {
        $pendencias += "❌ Política de Privacidade não encontrada"
        Add-ToReport "- ❌ Política de Privacidade não encontrada"
        Add-ToReport "- ℹ️ A Política de Privacidade é OBRIGATÓRIA para publicação nas lojas"
    }
    
    # Verificar termos de uso
    $termsFiles = Get-ChildItem -Path $projectRoot -Include @("terms*.md", "terms*.html", "TERMS.md", "terms-of-service.*", "terms-of-use.*") -Recurse -ErrorAction SilentlyContinue
    
    Add-ToReport ""
    Add-ToReport "### 6.2 Termos de Uso"
    
    if ($termsFiles.Count -gt 0) {
        $caminhoRelativo = $termsFiles[0].FullName.Replace($projectRoot, ".")
        $acertos += "✅ Termos de Uso encontrados: $caminhoRelativo"
        Add-ToReport "- ✅ Termos de Uso encontrados: $caminhoRelativo"
        
        # Verificar conteúdo dos termos de uso
        $termsContent = Get-Content -Path $termsFiles[0].FullName -Raw
        
        $termsChecks = @{
            "Aceitação dos Termos" = '(?i)aceitação|aceitar|concordar'
            "Uso do Serviço" = '(?i)uso\s+do\s+serviço|utilização|como\s+usar'
            "Restrições" = '(?i)restrições|proibido|não\s+permitido'
            "Propriedade Intelectual" = '(?i)propriedade\s+intelectual|direitos\s+autorais|copyright'
            "Limitação de Responsabilidade" = '(?i)limitação\s+de\s+responsabilidade|responsabilidade|isenção'
            "Alterações nos Termos" = '(?i)alterações|modificações|mudanças'
        }
        
        foreach ($check in $termsChecks.Keys) {
            $pattern = $termsChecks[$check]
            
            if ($termsContent -match $pattern) {
                $acertos += "✅ Termos de Uso: Seção '$check' encontrada"
                Add-ToReport "- ✅ Seção '$check' encontrada"
            } else {
                $pendencias += "⚠️ Termos de Uso: Seção '$check' não encontrada"
                Add-ToReport "- ⚠️ Seção '$check' não encontrada"
            }
        }
    } else {
        $pendencias += "⚠️ Termos de Uso não encontrados"
        Add-ToReport "- ⚠️ Termos de Uso não encontrados"
        Add-ToReport "- ℹ️ Os Termos de Uso são RECOMENDADOS para publicação nas lojas"
    }
    
    # Verificar links para páginas legais no código
    $codeFiles = Get-ChildItem -Path $projectRoot -Include @("*.js", "*.jsx", "*.ts", "*.tsx") -Recurse -Exclude "node_modules"
    $privacyLinkPattern = '(?i)(privacidade|privacy).*?(href|url|link|navigation)'
    $termsLinkPattern = '(?i)(termos|terms).*?(href|url|link|navigation)'
    
    $privacyLinkFound = $false
    $termsLinkFound = $false
    
    foreach ($file in $codeFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        if (-not $privacyLinkFound -and $content -match $privacyLinkPattern) {
            $privacyLinkFound = $true
        }
        
        if (-not $termsLinkFound -and $content -match $termsLinkPattern) {
            $termsLinkFound = $true
        }
        
        if ($privacyLinkFound -and $termsLinkFound) {
            break
        }
    }
    
    Add-ToReport ""
    Add-ToReport "### 6.3 Links para Páginas Legais"
    
    if ($privacyLinkFound) {
        $acertos += "✅ Link para Política de Privacidade encontrado no código"
        Add-ToReport "- ✅ Link para Política de Privacidade encontrado no código"
    } else {
        $pendencias += "❌ Link para Política de Privacidade não encontrado no código"
        Add-ToReport "- ❌ Link para Política de Privacidade não encontrado no código"
        Add-ToReport "- ℹ️ É OBRIGATÓRIO ter um link acessível para a Política de Privacidade no app"
    }
    
    if ($termsLinkFound) {
        $acertos += "✅ Link para Termos de Uso encontrado no código"
        Add-ToReport "- ✅ Link para Termos de Uso encontrado no código"
    } else {
        $pendencias += "⚠️ Link para Termos de Uso não encontrado no código"
        Add-ToReport "- ⚠️ Link para Termos de Uso não encontrado no código"
        Add-ToReport "- ℹ️ É RECOMENDADO ter um link acessível para os Termos de Uso no app"
    }
    
    return @{
        "Acertos" = $acertos
        "Pendencias" = $pendencias
    }
}

# Função para verificar compatibilidade multiplataforma
function Test-CrossPlatformCompatibility {
    Write-ColorLog "Verificando compatibilidade multiplataforma..." -ForegroundColor Cyan
    
    Add-ToReport "## 7. Compatibilidade Multiplataforma"
    
    $acertos = @()
    $pendencias = @()
    
    # Verificar configurações específicas para Android
    $androidSpecificFiles = @(
        "android/app/src/main/AndroidManifest.xml",
        "android/app/google-services.json",
        "android/app/src/main/res/values/strings.xml"
    )
    
    Add-ToReport "### 7.1 Android"
    
    $androidFilesFound = 0
    
    foreach ($file in $androidSpecificFiles) {
        $filePath = Join-Path -Path $projectRoot -ChildPath $file
        
        if (Test-Path $filePath) {
            $androidFilesFound++
            $acertos += "✅ Android: $file encontrado"
            Add-ToReport "- ✅ $file encontrado"
        } else {
            $pendencias += "⚠️ Android: $file não encontrado"
            Add-ToReport "- ⚠️ $file não encontrado"
        }
    }
    
    if ($androidFilesFound -eq 0) {
        $pendencias += "❌ Nenhuma configuração específica para Android encontrada"
        Add-ToReport "- ❌ Nenhuma configuração específica para Android encontrada"
    }
    
    # Verificar configurações específicas para iOS
    $iosSpecificFiles = @(
        "ios/*/Info.plist",
        "ios/GoogleService-Info.plist",
        "ios/Podfile"
    )
    
    Add-ToReport ""
    Add-ToReport "### 7.2 iOS"
    
    $iosFilesFound = 0
    
    foreach ($file in $iosSpecificFiles) {
        $files = Get-ChildItem -Path $projectRoot -Include (Split-Path -Leaf $file) -Recurse -ErrorAction SilentlyContinue
        
        if ($files.Count -gt 0) {
            $iosFilesFound++
            $caminhoRelativo = $files[0].FullName.Replace($projectRoot, ".")
            $acertos += "✅ iOS: $(Split-Path -Leaf $file) encontrado"
            Add-ToReport "- ✅ $(Split-Path -Leaf $file) encontrado: $caminhoRelativo"
        } else {
            $pendencias += "⚠️ iOS: $(Split-Path -Leaf $file) não encontrado"
            Add-ToReport "- ⚠️ $(Split-Path -Leaf $file) não encontrado"
        }
    }
    
    if ($iosFilesFound -eq 0) {
        $pendencias += "❌ Nenhuma configuração específica para iOS encontrada"
        Add-ToReport "- ❌ Nenhuma configuração específica para iOS encontrada"
    }
    
    # Verificar configuração de ícones e splash screens para ambas plataformas
    Add-ToReport ""
    Add-ToReport "### 7.3 Ícones e Splash Screens"
    
    $iconSizes = @{
        "Android" = @(
            "android/app/src/main/res/mipmap-mdpi",
            "android/app/src/main/res/mipmap-hdpi",
            "android/app/src/main/res/mipmap-xhdpi",
            "android/app/src/main/res/mipmap-xxhdpi",
            "android/app/src/main/res/mipmap-xxxhdpi"
        )
        "iOS" = @(
            "ios/*/Images.xcassets/AppIcon.appiconset"
        )
    }
    
    foreach ($platform in $iconSizes.Keys) {
        $platformIconsFound = 0
        
        foreach ($path in $iconSizes[$platform]) {
            $iconFiles = Get-ChildItem -Path $projectRoot -Include "*icon*.png" -Recurse | Where-Object { $_.FullName -like "*$path*" }
            
            if ($iconFiles.Count -gt 0) {
                $platformIconsFound += $iconFiles.Count
            }
        }
        
        if ($platformIconsFound -gt 0) {
            $acertos += "✅ $platform: $platformIconsFound ícones encontrados"
            Add-ToReport "- ✅ $platform: $platformIconsFound ícones encontrados"
        } else {
            $pendencias += "⚠️ $platform: Nenhum ícone específico encontrado"
            Add-ToReport "- ⚠️ $platform: Nenhum ícone específico encontrado"
        }
    }
    
    # Verificar se há ícones genéricos (Expo/React Native)
    $genericIcons = Get-ChildItem -Path $projectRoot -Include @("icon.png", "adaptive-icon.png") -Recurse -Depth 2
    
    if ($genericIcons.Count -gt 0) {
        $acertos += "✅ Ícones genéricos encontrados (compatíveis com Expo/React Native)"
        Add-ToReport "- ✅ Ícones genéricos encontrados (compatíveis com Expo/React Native):"
        
        foreach ($icon in $genericIcons) {
            $caminhoRelativo = $icon.FullName.Replace($projectRoot, ".")
            Add-ToReport "  - $caminhoRelativo"
        }
    }
    
    return @{
        "Acertos" = $acertos
        "Pendencias" = $pendencias
    }
}

# Função para gerar o sumário do relatório
function Add-ReportSummary {
    param (
        [Parameter(Mandatory=$true)]
        [hashtable]$Results
    )
    
    $totalAcertos = ($Results.Values | ForEach-Object { $_.Acertos.Count } | Measure-Object -Sum).Sum
    $totalPendencias = ($Results.Values | ForEach-Object { $_.Pendencias.Count } | Measure-Object -Sum).Sum
    
    $pendenciasCriticas = 0
    $pendenciasImportantes = 0
    $sugestoes = 0
    
    foreach ($section in $Results.Keys) {
        foreach ($pendencia in $Results[$section].Pendencias) {
            if ($pendencia -match "^❌") {
                $pendenciasCriticas++
            } elseif ($pendencia -match "^⚠️") {
                $pendenciasImportantes++
            } else {
                $sugestoes++
            }
        }
    }
    
    # Determinar status geral
    $statusGeral = "Aprovado ✅"
    
    if ($pendenciasCriticas -gt 0) {
        $statusGeral = "Crítico ❌"
    } elseif ($pendenciasImportantes -gt 0) {
        $statusGeral = "Com Pendências ⚠️"
    }
    
    $summary = @"
## STATUS GERAL: $statusGeral

**Resumo da Auditoria:**
- Total de Acertos: $totalAcertos
- Total de Pendências: $totalPendencias
  - Críticas: $pendenciasCriticas
  - Importantes: $pendenciasImportantes
  - Sugestões: $sugestoes

## ACERTOS

"@
    
    Add-Content -Path $reportPath -Value $summary
    
    foreach ($section in $Results.Keys) {
        if ($Results[$section].Acertos.Count -gt 0) {
            Add-Content -Path $reportPath -Value "### $section"
            
            foreach ($acerto in $Results[$section].Acertos) {
                Add-Content -Path $reportPath -Value "- $acerto"
            }
            
            Add-Content -Path $reportPath -Value ""
        }
    }
    
    Add-Content -Path $reportPath -Value "## PENDÊNCIAS"
    
    if ($pendenciasCriticas -gt 0) {
        Add-Content -Path $reportPath -Value "### Críticas"
        
        foreach ($section in $Results.Keys) {
            foreach ($pendencia in $Results[$section].Pendencias) {
                if ($pendencia -match "^❌") {
                    Add-Content -Path $reportPath -Value "- $pendencia"
                }
            }
        }
        
        Add-Content -Path $reportPath -Value ""
    }
    
    if ($pendenciasImportantes -gt 0) {
        Add-Content -Path $reportPath -Value "### Importantes"
        
        foreach ($section in $Results.Keys) {
            foreach ($pendencia in $Results[$section].Pendencias) {
                if ($pendencia -match "^⚠️") {
                    Add-Content -Path $reportPath -Value "- $pendencia"
                }
            }
        }
        
        Add-Content -Path $reportPath -Value ""
    }
    
    # Adicionar sugestões finais
    Add-Content -Path $reportPath -Value "## SUGESTÕES FINAIS"
    
    $sugestoes = @"
### Recomendações Técnicas

- **Otimização de Assets**: Comprima imagens grandes usando ferramentas como TinyPNG ou ImageOptim.
- **Minificação de Código**: Configure a minificação de JS/CSS para reduzir o tamanho do bundle.
- **Testes de Compatibilidade**: Realize testes em diferentes dispositivos Android e iOS antes da submissão.
- **Verificação de Links**: Certifique-se de que todos os links externos e internos estão funcionando corretamente.

### Recomendações para Publicação

- **Metadados Completos**: Prepare screenshots, descrições e palavras-chave otimizadas para as lojas.
- **Política de Privacidade**: Certifique-se de que a política está atualizada e cobre todas as funcionalidades do app.
- **Revisão de Permissões**: Justifique todas as permissões solicitadas na descrição do app.
- **Versão de Teste**: Considere lançar uma versão beta antes da publicação oficial.

### Próximos Passos

1. Corrija as pendências críticas identificadas neste relatório.
2. Implemente as melhorias importantes sugeridas.
3. Execute novamente esta auditoria para verificar se todas as pendências foram resolvidas.
4. Prepare os assets de marketing para as lojas (screenshots, vídeos, descrições).
5. Submeta o aplicativo para revisão nas lojas.
"@
    
    Add-Content -Path $reportPath -Value $sugestoes
}

# Função principal
function Start-TechnicalAudit {
    Write-ColorLog "Iniciando auditoria técnica do projeto Açucaradas Encomendas..." -ForegroundColor Green
    
    # Inicializar o relatório
    Initialize-Report
    
    # Executar todas as verificações
    $results = @{}
    
    $results["Estrutura do Projeto"] = Test-ProjectStructure
    $results["Integridade de Links e Recursos"] = Test-ResourceIntegrity
    $results["Segurança"] = Test-Security
    $results["Otimização de Assets"] = Test-AssetOptimization
    $results["Metadados de Publicação"] = Test-PublishingMetadata
    $results["Páginas Legais"] = Test-LegalPages
    $results["Compatibilidade Multiplataforma"] = Test-CrossPlatformCompatibility
    
    # Adicionar sumário ao relatório
    Add-ReportSummary -Results $results
    
    Write-ColorLog "Auditoria técnica concluída. Relatório gerado em: $reportPath" -ForegroundColor Green
    Write-ColorLog "Abra o arquivo para visualizar os resultados detalhados." -ForegroundColor Green
}

# Executar a auditoria
Start-TechnicalAudit