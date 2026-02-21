# Script para explicar como usar os templates HTML e salvar imagens
# Autor: AppPublisherAI

# Configuracoes iniciais
$ErrorActionPreference = "Stop"
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

# Verificar se o diretorio de recursos existe
if (-not (Test-Path $resourcesDir)) {
    Write-Log "Diretorio de recursos nao encontrado: $resourcesDir" -Type Error
    Write-Log "Execute primeiro o script revisar-metadados-recursos-v2.ps1" -Type Error
    exit 1
}

# Funcao para mostrar instrucoes de como usar os templates
function Show-TemplateInstructions {
    Clear-Host
    
    Write-Log "COMO USAR OS TEMPLATES HTML E SALVAR IMAGENS" -Type Success
    Write-Log "===========================================" -Type Success
    
    Write-Log "\nPASSO 1: ABRIR OS TEMPLATES HTML NO NAVEGADOR" -Type Info
    Write-Log "---------------------------------------" -Type Info
    Write-Log "1. Navegue ate os diretorios de recursos usando o Windows Explorer:" -Type Info
    Write-Log "   $resourcesDir" -Type Info
    Write-Log "2. Dentro deste diretorio, voce encontrara as seguintes pastas:" -Type Info
    Write-Log "   - icones: Para criar o icone do aplicativo" -Type Info
    Write-Log "   - screenshots: Para criar screenshots do aplicativo" -Type Info
    Write-Log "   - feature-graphic: Para criar a imagem de destaque" -Type Info
    Write-Log "3. Em cada pasta, ha um arquivo HTML (template-*.html)" -Type Info
    Write-Log "4. Clique duas vezes no arquivo HTML para abri-lo no seu navegador padrao" -Type Info
    Write-Log "   Exemplo: Clique duas vezes em 'template-icone.html' na pasta 'icones'" -Type Info
    
    Write-Log "\nPASSO 2: USAR O TEMPLATE PARA CRIAR RECURSOS" -Type Info
    Write-Log "---------------------------------------" -Type Info
    Write-Log "1. Quando o template abrir no navegador, voce vera instrucoes e um botao para upload" -Type Info
    Write-Log "2. Clique no botao 'Escolher arquivo' para selecionar uma imagem do seu computador" -Type Info
    Write-Log "3. O template mostrara uma pre-visualizacao da imagem e verificara se ela atende aos requisitos" -Type Info
    Write-Log "4. Se a imagem nao atender aos requisitos (tamanho, formato), o template mostrara um alerta" -Type Info
    Write-Log "5. Ajuste a imagem conforme necessario usando um editor de imagens (como GIMP, Photoshop, etc.)" -Type Info
    
    Write-Log "\nPASSO 3: SALVAR AS IMAGENS NOS DIRETORIOS CORRETOS" -Type Info
    Write-Log "---------------------------------------" -Type Info
    Write-Log "1. Depois de criar/ajustar a imagem e verificar no template, salve-a no diretorio correto:" -Type Info
    Write-Log "   - Icone: Salve como 'icon.png' na pasta 'icones'" -Type Info
    Write-Log "   - Screenshots: Salve como 'screenshot1.png', 'screenshot2.png', etc. na pasta 'screenshots'" -Type Info
    Write-Log "   - Imagem de destaque: Salve como 'feature-graphic.png' na pasta 'feature-graphic'" -Type Info
    Write-Log "2. Voce pode usar a funcao 'Salvar como' do seu navegador:" -Type Info
    Write-Log "   a. Clique com o botao direito na imagem pre-visualizada" -Type Info
    Write-Log "   b. Selecione 'Salvar imagem como'" -Type Info
    Write-Log "   c. Navegue ate o diretorio correto e salve com o nome adequado" -Type Info
    Write-Log "3. Alternativamente, se voce ja tem as imagens prontas:" -Type Info
    Write-Log "   a. Simplesmente copie-as para os diretorios corretos" -Type Info
    Write-Log "   b. Renomeie-as conforme o padrao sugerido" -Type Info
    
    Write-Log "\nDIRETORIOS PARA SALVAR AS IMAGENS:" -Type Success
    Write-Log "- Icones: $resourcesDir\icones" -Type Success
    Write-Log "- Screenshots: $resourcesDir\screenshots" -Type Success
    Write-Log "- Imagem de destaque: $resourcesDir\feature-graphic" -Type Success
    
    Write-Log "\nDICA: Voce pode abrir estes diretorios agora? (S/N)" -Type Warning
    $response = Read-Host
    if ($response -eq "S" -or $response -eq "s") {
        Start-Process "explorer.exe" -ArgumentList "$resourcesDir"
        Write-Log "Diretorio de recursos aberto no Windows Explorer" -Type Success
    }
    
    Write-Log "\nPROXIMOS PASSOS:" -Type Info
    Write-Log "1. Verifique o arquivo README.md no diretorio de recursos para um checklist completo" -Type Info
    Write-Log "2. Apos preparar todos os recursos, prossiga para o envio do aplicativo na Google Play Console" -Type Info
}

# Executar funcao principal
Show-TemplateInstructions

Write-Log "\nScript concluido! Agora voce sabe como usar os templates e salvar as imagens." -Type Success