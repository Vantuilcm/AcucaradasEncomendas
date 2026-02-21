# Script para revisar metadados e preparar recursos graficos para Google Play Store
# Autor: AppPublisherAI
# Data: 2023

# Configuracoes iniciais
$ErrorActionPreference = "Stop"
$metadataDir = "$PSScriptRoot\play-store-metadata"
$resourcesDir = "$PSScriptRoot\play-store-resources"

# Funcao para log colorido
function Write-Log {
    param (
        [string]$Message,
        [string]$Type = "Info" # Info, Success, Warning, Error
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Type) {
        "Info"    { $color = "Cyan";    $prefix = "[INFO]" }
        "Success" { $color = "Green";   $prefix = "[SUCCESS]" }
        "Warning" { $color = "Yellow";  $prefix = "[WARNING]" }
        "Error"   { $color = "Red";     $prefix = "[ERROR]" }
        default    { $color = "White";   $prefix = "[LOG]" }
    }
    
    Write-Host "$timestamp $prefix $Message" -ForegroundColor $color
}

# Verificar se o diretorio de metadados existe
if (-not (Test-Path $metadataDir)) {
    Write-Log "Diretorio de metadados nao encontrado: $metadataDir" -Type Error
    Write-Log "Execute primeiro o script gerar-metadados-play-store.ps1" -Type Error
    exit 1
}

# Verificar se o diretorio de recursos existe, se nao, criar
if (-not (Test-Path $resourcesDir)) {
    Write-Log "Criando diretorio para recursos graficos: $resourcesDir" -Type Info
    New-Item -Path $resourcesDir -ItemType Directory -Force | Out-Null
}

# Funcao para revisar metadados
function Review-Metadata {
    Write-Log "Iniciando revisao de metadados..." -Type Info
    
    # Verificar arquivos de metadados
    $requiredFiles = @(
        "app-name.txt",
        "short-description.txt",
        "full-description.txt",
        "release-notes.txt",
        "keywords.txt"
    )
    
    foreach ($file in $requiredFiles) {
        $filePath = "$metadataDir\$file"
        if (Test-Path $filePath) {
            $content = Get-Content -Path $filePath -Raw
            if ([string]::IsNullOrWhiteSpace($content)) {
                Write-Log "Arquivo $file esta vazio" -Type Warning
            } else {
                Write-Log "Arquivo $file encontrado e preenchido" -Type Success
            }
        } else {
            Write-Log "Arquivo $file nao encontrado, criando template..." -Type Warning
            
            $templateContent = switch ($file) {
                "app-name.txt" { "Acucaradas Encomendas" }
                "short-description.txt" { "Aplicativo para gerenciamento de encomendas de doces e bolos." }
                "full-description.txt" { @"
Acucaradas Encomendas e um aplicativo completo para gerenciamento de encomendas de doces e bolos.

Principais funcionalidades:
- Cadastro de clientes
- Cadastro de produtos
- Gerenciamento de pedidos
- Controle de estoque
- Relatorios de vendas
- Notificacoes de entrega

Ideal para confeiteiros e doceiros que desejam organizar seu negocio de forma eficiente.
"@ }
                "release-notes.txt" { "Versao inicial do aplicativo Acucaradas Encomendas." }
                "keywords.txt" { "confeitaria, doces, bolos, encomendas, gerenciamento, confeiteiro, doceiro" }
                default { "" }
            }
            
            Set-Content -Path $filePath -Value $templateContent
            Write-Log "Template criado para $file" -Type Success
        }
    }
    
    Write-Log "Revisao de metadados concluida" -Type Success
}

# Funcao para preparar recursos graficos
function Prepare-GraphicResources {
    Write-Log "Iniciando preparacao de recursos graficos..." -Type Info
    
    # Criar diretorios para recursos
    $iconDir = "$resourcesDir\icones"
    $screenshotDir = "$resourcesDir\screenshots"
    $featureGraphicDir = "$resourcesDir\feature-graphic"
    
    if (-not (Test-Path $iconDir)) {
        New-Item -Path $iconDir -ItemType Directory -Force | Out-Null
        Write-Log "Diretorio para icones criado: $iconDir" -Type Success
    }
    
    if (-not (Test-Path $screenshotDir)) {
        New-Item -Path $screenshotDir -ItemType Directory -Force | Out-Null
        Write-Log "Diretorio para screenshots criado: $screenshotDir" -Type Success
    }
    
    if (-not (Test-Path $featureGraphicDir)) {
        New-Item -Path $featureGraphicDir -ItemType Directory -Force | Out-Null
        Write-Log "Diretorio para imagem de destaque criado: $featureGraphicDir" -Type Success
    }
    
    # Criar template HTML para icones
    $iconTemplatePath = "$iconDir\template-icone.html"
    $iconTemplateContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template para Icone - Google Play Store</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #d81b60;
            border-bottom: 2px solid #d81b60;
            padding-bottom: 10px;
        }
        h2 {
            color: #d81b60;
            margin-top: 30px;
        }
        .icon-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 20px 0;
            padding: 20px;
            border: 1px dashed #ccc;
            border-radius: 8px;
            background-color: #fafafa;
        }
        .icon-container {
            width: 512px;
            height: 512px;
            background-color: #e0e0e0;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
        }
        .icon-container img {
            max-width: 100%;
            max-height: 100%;
        }
        .upload-area {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        .upload-button {
            background-color: #d81b60;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Template para Icone - Google Play Store</h1>
        
        <div class="upload-area">
            <h2>Carregar Icone</h2>
            <p>Selecione uma imagem PNG com 512x512 pixels</p>
            <input type="file" id="icon-upload" accept="image/*">
        </div>
        
        <div class="icon-preview">
            <h2>Visualizacao do Icone</h2>
            <div class="icon-container" id="preview-container">
                <p>Sua imagem aparecera aqui</p>
            </div>
        </div>
        
        <h2>Requisitos do Icone</h2>
        <ul>
            <li><strong>Formato:</strong> PNG com fundo transparente</li>
            <li><strong>Tamanho:</strong> 512x512 pixels</li>
            <li><strong>Qualidade:</strong> Alta resolucao, sem pixelizacao</li>
            <li><strong>Estilo:</strong> Simples, reconhecivel e consistente com a marca</li>
        </ul>
        
        <h2>Dicas para um Bom Icone</h2>
        <ul>
            <li>Use formas simples e reconheciveis</li>
            <li>Evite texto dentro do icone</li>
            <li>Mantenha consistencia com a identidade visual do app</li>
            <li>Teste como o icone aparece em diferentes tamanhos</li>
            <li>Considere como o icone aparecera em diferentes fundos</li>
        </ul>
    </div>
    
    <script>
        document.getElementById("icon-upload").addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.alt = "Icone do App";
                
                const container = document.getElementById("preview-container");
                container.innerHTML = "";
                container.appendChild(img);
                
                // Verificar dimensoes
                img.onload = function() {
                    if (img.naturalWidth !== 512 || img.naturalHeight !== 512) {
                        alert("Atencao: A imagem tem " + img.naturalWidth + "x" + img.naturalHeight + "px. O tamanho recomendado e 512x512px.");
                    }
                };
            };
            reader.readAsDataURL(file);
        });
    </script>
</body>
</html>
"@
    
    Set-Content -Path $iconTemplatePath -Value $iconTemplateContent
    Write-Log "Template HTML para icones criado: $iconTemplatePath" -Type Success
    
    # Criar template HTML para screenshots
    $screenshotTemplatePath = "$screenshotDir\template-screenshot.html"
    $screenshotTemplateContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template para Screenshots - Google Play Store</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #d81b60;
            border-bottom: 2px solid #d81b60;
            padding-bottom: 10px;
        }
        h2 {
            color: #d81b60;
            margin-top: 30px;
        }
        .screenshot-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 20px 0;
            padding: 20px;
            border: 1px dashed #ccc;
            border-radius: 8px;
            background-color: #fafafa;
        }
        .phone-frame {
            width: 270px;
            height: 480px;
            background-color: #e0e0e0;
            border: 10px solid #333;
            border-radius: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
        }
        .phone-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .upload-area {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        .upload-button {
            background-color: #d81b60;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Template para Screenshots - Google Play Store</h1>
        
        <div class="upload-area">
            <h2>Carregar Screenshot</h2>
            <p>Selecione uma imagem com resolucao minima de 1080x1920 pixels</p>
            <input type="file" id="screenshot-upload" accept="image/*">
        </div>
        
        <div class="screenshot-preview">
            <h2>Visualizacao da Screenshot</h2>
            <div class="phone-frame" id="preview-container">
                <p>Sua imagem aparecera aqui</p>
            </div>
        </div>
        
        <h2>Requisitos para Screenshots</h2>
        <ul>
            <li><strong>Formato:</strong> JPG ou PNG</li>
            <li><strong>Resolucao minima:</strong> 1080x1920 pixels (retrato) ou 1920x1080 (paisagem)</li>
            <li><strong>Quantidade:</strong> Minimo de 2, maximo de 8 screenshots</li>
            <li><strong>Qualidade:</strong> Alta resolucao, sem compressao excessiva</li>
        </ul>
        
        <h2>Dicas para Boas Screenshots</h2>
        <ul>
            <li>Mostre as principais funcionalidades do app</li>
            <li>Organize em ordem logica (da funcionalidade mais importante para a menos importante)</li>
            <li>Use texto explicativo quando necessario</li>
            <li>Mantenha consistencia visual entre todas as screenshots</li>
            <li>Evite mostrar informacoes sensiveis ou dados pessoais</li>
        </ul>
    </div>
    
    <script>
        document.getElementById("screenshot-upload").addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.alt = "Screenshot do App";
                
                const container = document.getElementById("preview-container");
                container.innerHTML = "";
                container.appendChild(img);
                
                // Verificar dimensoes
                img.onload = function() {
                    if (img.naturalWidth < 1080 || img.naturalHeight < 1920) {
                        if (img.naturalWidth < img.naturalHeight) {
                            // Modo retrato
                            alert("Atencao: A imagem tem " + img.naturalWidth + "x" + img.naturalHeight + "px. O tamanho minimo recomendado e 1080x1920px para modo retrato.");
                        } else {
                            // Modo paisagem
                            alert("Atencao: A imagem tem " + img.naturalWidth + "x" + img.naturalHeight + "px. O tamanho minimo recomendado e 1920x1080px para modo paisagem.");
                        }
                    }
                };
            };
            reader.readAsDataURL(file);
        });
    </script>
</body>
</html>
"@
    
    Set-Content -Path $screenshotTemplatePath -Value $screenshotTemplateContent
    Write-Log "Template HTML para screenshots criado: $screenshotTemplatePath" -Type Success
    
    # Criar template HTML para imagem de destaque
    $featureGraphicTemplatePath = "$featureGraphicDir\template-feature-graphic.html"
    $featureGraphicTemplateContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template para Imagem de Destaque - Google Play Store</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1100px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #d81b60;
            border-bottom: 2px solid #d81b60;
            padding-bottom: 10px;
        }
        h2 {
            color: #d81b60;
            margin-top: 30px;
        }
        .preview-wrapper {
            position: relative;
            margin: 20px 0;
            padding: 20px;
            border: 1px dashed #ccc;
            border-radius: 8px;
            background-color: #fafafa;
        }
        #preview-container {
            width: 1024px;
            height: 500px;
            background-color: #e0e0e0;
            margin: 0 auto;
            position: relative;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #preview-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        #safe-area {
            position: absolute;
            top: 50px;
            left: 50px;
            right: 50px;
            bottom: 50px;
            border: 2px dashed rgba(255, 0, 0, 0.5);
            pointer-events: none;
            display: flex;
            justify-content: center;
            align-items: center;
            color: rgba(255, 0, 0, 0.7);
            font-weight: bold;
        }
        .upload-area {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
            width: 100%;
            max-width: 1024px;
        }
        .upload-button {
            background-color: #d81b60;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
        .controls {
            display: flex;
            justify-content: center;
            margin-top: 10px;
        }
        .control-button {
            background-color: #333;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Template para Imagem de Destaque - Google Play Store</h1>
        
        <div class="upload-area">
            <h2>Carregar Imagem de Destaque</h2>
            <p>Selecione uma imagem com 1024x500 pixels</p>
            <input type="file" id="feature-graphic-upload" accept="image/*">
        </div>
        
        <div class="preview-wrapper">
            <h2>Visualizacao da Imagem de Destaque</h2>
            <div id="preview-container">
                <p>Sua imagem aparecera aqui</p>
                <div id="safe-area">Area segura para conteudo importante</div>
            </div>
            <div class="controls">
                <button id="toggle-safe-area" class="control-button">Alternar Area Segura</button>
            </div>
        </div>
        
        <h2>Requisitos da Imagem de Destaque</h2>
        <ul>
            <li><strong>Formato:</strong> JPG ou PNG (sem transparencia)</li>
            <li><strong>Tamanho:</strong> 1024x500 pixels</li>
            <li><strong>Area segura:</strong> Mantenha elementos importantes dentro da area central</li>
            <li><strong>Qualidade:</strong> Alta resolucao, sem compressao excessiva</li>
        </ul>
        
        <h2>Dicas para uma Boa Imagem de Destaque</h2>
        <ul>
            <li><strong>Simplicidade:</strong> Use design limpo e facil de entender</li>
            <li><strong>Legibilidade:</strong> Texto grande e claro (se houver)</li>
            <li><strong>Identidade:</strong> Inclua o logo e elementos da marca</li>
            <li><strong>Cores:</strong> Use cores que representem sua marca e sejam consistentes com o aplicativo</li>
            <li><strong>Contraste:</strong> Garanta bom contraste para visibilidade</li>
        </ul>
        
        <h2>O que Evitar</h2>
        <ul>
            <li>Texto pequeno ou excessivo</li>
            <li>Bordas ou cantos arredondados (a imagem ocupara todo o espaco retangular)</li>
            <li>Incluir informacoes de classificacao, premios ou promocoes</li>
            <li>Usar a palavra "app" ou "aplicativo"</li>
            <li>Incluir screenshots de dispositivos</li>
        </ul>
    </div>
    
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const uploadInput = document.getElementById("feature-graphic-upload");
            const previewContainer = document.getElementById("preview-container");
            const safeArea = document.getElementById("safe-area");
            const toggleSafeAreaButton = document.getElementById("toggle-safe-area");
            
            // Alternar visibilidade da area segura
            toggleSafeAreaButton.addEventListener("click", function() {
                if (safeArea.style.display === "none") {
                    safeArea.style.display = "flex";
                } else {
                    safeArea.style.display = "none";
                }
            });
            
            // Carregar imagem
            uploadInput.addEventListener("change", function(event) {
                const file = event.target.files[0];
                
                // Verificar se e uma imagem
                if (!file || !file.type.match("image.*")) return;
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Limpar container
                    previewContainer.innerHTML = "";
                    
                    // Criar imagem
                    const img = document.createElement("img");
                    img.src = e.target.result;
                    img.alt = "Imagem de Destaque";
                    
                    // Adicionar imagem ao container
                    previewContainer.appendChild(img);
                    previewContainer.appendChild(safeArea);
                    
                    // Verificar dimensoes da imagem
                    img.onload = function() {
                        if (img.naturalWidth !== 1024 || img.naturalHeight !== 500) {
                            alert("Atencao: A imagem tem " + img.naturalWidth + "x" + img.naturalHeight + "px. O tamanho recomendado e 1024x500px.");
                        }
                    };
                };
                
                reader.readAsDataURL(file);
            });
        });
    </script>
</body>
</html>
"@
    
    Set-Content -Path $featureGraphicTemplatePath -Value $featureGraphicTemplateContent
    Write-Log "Template HTML para imagem de destaque criado: $featureGraphicTemplatePath" -Type Success
    
    Write-Log "Preparacao de recursos graficos concluida" -Type Success
}

# Funcao para criar README com checklist
function Create-Checklist {
    Write-Log "Criando README com checklist..." -Type Info
    
    $readmePath = "$resourcesDir\README.md"
    $readmeContent = @"
# Recursos Graficos para Google Play Store - Acucaradas Encomendas

## Checklist de Recursos

### Icones
- [ ] Icone do aplicativo (512x512px, PNG com transparencia)
- [ ] Icone adaptativo (foreground e background)

### Screenshots
- [ ] Minimo de 2 screenshots para smartphone
- [ ] Screenshots em alta resolucao (1080x1920px recomendado)
- [ ] Screenshots mostram as principais funcionalidades
- [ ] Texto explicativo adicionado (se aplicavel)

### Imagem de Destaque (Feature Graphic)
- [ ] Imagem de destaque criada (1024x500px)
- [ ] Design limpo e atraente
- [ ] Inclui logo e elementos da marca
- [ ] Bom contraste e legibilidade

## Proximos Passos

1. Abra os templates HTML em seu navegador para criar os recursos graficos
2. Salve as imagens nos respectivos diretorios
3. Verifique se todos os recursos atendem aos requisitos da Google Play Store
4. Prossiga para o envio do aplicativo na Google Play Console

## Recursos Adicionais

- [Diretrizes de design para Google Play](https://developer.android.com/distribute/best-practices/launch/store-listing)
- [Especificacoes de recursos graficos](https://support.google.com/googleplay/android-developer/answer/9866151)
"@
    
    Set-Content -Path $readmePath -Value $readmeContent
    Write-Log "README com checklist criado: $readmePath" -Type Success
}

# Executar funcoes principais
Review-Metadata
Prepare-GraphicResources
Create-Checklist

Write-Log "Script concluido com sucesso!" -Type Success
Write-Log "Verifique os diretorios de metadados e recursos graficos:" -Type Info
Write-Log "- Metadados: $metadataDir" -Type Info
Write-Log "- Recursos Graficos: $resourcesDir" -Type Info
Write-Log "Abra os templates HTML em seu navegador para criar os recursos graficos" -Type Info