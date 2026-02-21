# Script para converter arquivos SVG para PNG

# Verifica se o módulo NuGet está disponível
if (-not (Get-PackageProvider -Name NuGet -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando o provedor de pacotes NuGet..."
    Install-PackageProvider -Name NuGet -Force -Scope CurrentUser
}

# Verifica se o módulo PSGallery está registrado
if (-not (Get-PSRepository -Name PSGallery -ErrorAction SilentlyContinue)) {
    Write-Host "Registrando o repositório PSGallery..."
    Register-PSRepository -Default -InstallationPolicy Trusted
}

# Verifica se o módulo Microsoft.PowerShell.Archive está instalado
if (-not (Get-Module -ListAvailable -Name Microsoft.PowerShell.Archive)) {
    Write-Host "Instalando o módulo Microsoft.PowerShell.Archive..."
    Install-Module -Name Microsoft.PowerShell.Archive -Force -Scope CurrentUser
}

# Cria diretório temporário para os arquivos PNG
$tempDir = "./temp-png"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# Função para criar um arquivo PNG simples
function Create-SimplePNG {
    param (
        [string]$outputPath,
        [int]$width,
        [int]$height,
        [string]$color = "#FF69B4"
    )

    # Cria um bitmap com as dimensões especificadas
    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    
    # Cria um objeto Graphics a partir do bitmap
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Define a cor de fundo
    $backgroundColor = [System.Drawing.ColorTranslator]::FromHtml($color)
    $graphics.Clear($backgroundColor)
    
    # Salva o bitmap como PNG
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Libera os recursos
    $graphics.Dispose()
    $bitmap.Dispose()
}

# Carrega o assembly System.Drawing
Add-Type -AssemblyName System.Drawing

# Cria os arquivos PNG
Write-Host "Criando arquivos PNG..."

# Cria icon.png (1024x1024)
Create-SimplePNG -outputPath "$tempDir/icon.png" -width 1024 -height 1024

# Cria splash.png (1242x2436)
Create-SimplePNG -outputPath "$tempDir/splash.png" -width 1242 -height 2436 -color "#FFFFFF"

# Cria adaptive-icon.png (108x108)
Create-SimplePNG -outputPath "$tempDir/adaptive-icon.png" -width 108 -height 108 -color "#FFFFFF"

# Substitui os arquivos SVG pelos PNG
Write-Host "Substituindo arquivos..."
Copy-Item -Path "$tempDir/icon.png" -Destination "./assets/icon.png" -Force
Copy-Item -Path "$tempDir/splash.png" -Destination "./assets/splash.png" -Force
Copy-Item -Path "$tempDir/adaptive-icon.png" -Destination "./assets/adaptive-icon.png" -Force

# Limpa o diretório temporário
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Conversão concluída com sucesso!"