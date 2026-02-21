# Script para gerar recursos graficos para a Google Play Store
# Autor: AppPublisherAI
# Data: $(Get-Date -Format "dd/MM/yyyy")

# Configuracoes iniciais
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Funcao para exibir mensagens de log
function Write-Log {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Type) {
        "Info"    { "White" }
        "Warning" { "Yellow" }
        "Error"   { "Red" }
        "Success" { "Green" }
    }
    
    Write-Host "[$timestamp] [$Type] $Message" -ForegroundColor $color
}

# Verificar se o modulo PSWriteColor esta instalado
if (-not (Get-Module -ListAvailable -Name PSWriteColor)) {
    Write-Log "Modulo PSWriteColor nao encontrado. Tentando instalar..." -Type Warning
    try {
        Install-Module -Name PSWriteColor -Force -Scope CurrentUser
        Write-Log "Modulo PSWriteColor instalado com sucesso!" -Type Success
    } catch {
        Write-Log "Nao foi possivel instalar o modulo PSWriteColor. Continuando sem ele." -Type Warning
    }
}

# Definir diretorio de recursos graficos
$resourcesDir = "$PSScriptRoot\play-store-graphics"

# Criar diretorio de recursos graficos se nao existir
if (-not (Test-Path -Path $resourcesDir)) {
    try {
        New-Item -Path $resourcesDir -ItemType Directory -Force | Out-Null
        Write-Log "Diretorio de recursos graficos criado: $resourcesDir" -Type Success
    } catch {
        Write-Log "Erro ao criar diretorio de recursos graficos: $_" -Type Error
        exit 1
    }
}

# Criar subdiretorio para icones
$iconsDir = "$resourcesDir\icons"
if (-not (Test-Path -Path $iconsDir)) {
    New-Item -Path $iconsDir -ItemType Directory -Force | Out-Null
    Write-Log "Diretorio de icones criado: $iconsDir" -Type Success
}

# Criar subdiretorio para screenshots
$screenshotsDir = "$resourcesDir\screenshots"
if (-not (Test-Path -Path $screenshotsDir)) {
    New-Item -Path $screenshotsDir -ItemType Directory -Force | Out-Null
    Write-Log "Diretorio de screenshots criado: $screenshotsDir" -Type Success
    
    # Criar subdiretorios para diferentes dispositivos
    $devices = @("phone", "tablet", "tv", "wear")
    foreach ($device in $devices) {
        New-Item -Path "$screenshotsDir\$device" -ItemType Directory -Force | Out-Null
        Write-Log "Subdiretorio para $device criado" -Type Info
    }
}

# Criar subdiretorio para imagens de destaque
$featureGraphicDir = "$resourcesDir\feature-graphic"
if (-not (Test-Path -Path $featureGraphicDir)) {
    New-Item -Path $featureGraphicDir -ItemType Directory -Force | Out-Null
    Write-Log "Diretorio de imagens de destaque criado: $featureGraphicDir" -Type Success
}

# Gerar arquivo HTML com instrucoes para o icone do aplicativo
$iconHtmlPath = "$iconsDir\instrucoes-icone.html"
$iconHtml = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instrucoes para Icone do Aplicativo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2 {
            color: #4285F4;
        }
        .requirements {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .example {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 20px;
        }
        .example-item {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        .example-item img {
            max-width: 100%;
            height: auto;
        }
        .icon-placeholder {
            width: 512px;
            height: 512px;
            background-color: #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #757575;
            margin: 20px auto;
        }
        .checklist {
            list-style-type: none;
            padding-left: 0;
        }
        .checklist li {
            padding: 8px 0 8px 30px;
            position: relative;
        }
        .checklist li:before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #4CAF50;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Instrucoes para Criacao do Icone do Aplicativo</h1>
    
    <div class="requirements">
        <h2>Requisitos da Google Play Store</h2>
        <ul>
            <li><strong>Tamanho:</strong> 512x512 pixels</li>
            <li><strong>Formato:</strong> PNG de 32 bits (com transparencia)</li>
            <li><strong>Tamanho maximo do arquivo:</strong> 1024KB</li>
            <li><strong>Forma:</strong> A Google Play Store exibira seu icone em formato circular nas listagens</li>
        </ul>
    </div>
    
    <h2>Diretrizes de Design</h2>
    <ul class="checklist">
        <li>Use um design simples e reconhecivel</li>
        <li>Evite texto no icone (a menos que seja parte do logotipo da marca)</li>
        <li>Nao use fotos como icones</li>
        <li>Mantenha elementos importantes no centro (evite as bordas)</li>
        <li>Use cores contrastantes para melhor visibilidade</li>
        <li>Teste como o icone aparece em fundos claros e escuros</li>
        <li>Mantenha consistencia com sua identidade visual</li>
    </ul>
    
    <div class="icon-placeholder">
        Seu Icone Aqui<br>
        512x512px
    </div>
    
    <h2>Ferramentas Recomendadas</h2>
    <ul>
        <li><strong>Adobe Illustrator ou Photoshop</strong> - Para design profissional</li>
        <li><strong>Figma</strong> - Alternativa gratuita online com recursos poderosos</li>
        <li><strong>Canva</strong> - Opcao facil para iniciantes com templates</li>
        <li><strong>Icon Kitchen</strong> - Ferramenta online da Google para criar icones de aplicativos</li>
    </ul>
    
    <h2>Dicas Adicionais</h2>
    <ul>
        <li>Crie o icone em formato vetorial primeiro para facilitar redimensionamento</li>
        <li>Salve versoes em diferentes tamanhos para uso em outras partes do aplicativo</li>
        <li>Considere como o icone aparecera em diferentes dispositivos e tamanhos</li>
        <li>Verifique se o icone segue as diretrizes de Material Design</li>
    </ul>
</body>
</html>
"@

Set-Content -Path $iconHtmlPath -Value $iconHtml
Write-Log "Arquivo de instrucoes para icone criado: $iconHtmlPath" -Type Success

# Gerar arquivo HTML com instrucoes para imagem de destaque
$featureGraphicHtmlPath = "$featureGraphicDir\instrucoes-imagem-destaque.html"
$featureGraphicHtml = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instrucoes para Imagem de Destaque</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2 {
            color: #4285F4;
        }
        .requirements {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .example {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 20px;
        }
        .example-item {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        .example-item img {
            max-width: 100%;
            height: auto;
        }
        .graphic-placeholder {
            width: 100%;
            max-width: 1024px;
            height: 500px;
            background-color: #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #757575;
            margin: 20px auto;
        }
        .checklist {
            list-style-type: none;
            padding-left: 0;
        }
        .checklist li {
            padding: 8px 0 8px 30px;
            position: relative;
        }
        .checklist li:before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #4CAF50;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Instrucoes para Criacao da Imagem de Destaque</h1>
    
    <div class="requirements">
        <h2>Requisitos da Google Play Store</h2>
        <ul>
            <li><strong>Tamanho:</strong> 1024x500 pixels</li>
            <li><strong>Formato:</strong> JPG ou PNG de 24 bits (sem transparencia)</li>
            <li><strong>Tamanho maximo do arquivo:</strong> 1024KB</li>
        </ul>
    </div>
    
    <h2>Diretrizes de Design</h2>
    <ul class="checklist">
        <li>Crie uma imagem atraente que represente bem seu aplicativo</li>
        <li>Inclua o nome do aplicativo ou logo de forma visivel</li>
        <li>Evite texto excessivo - mantenha simples e impactante</li>
        <li>Use cores que combinem com a identidade visual do seu app</li>
        <li>Evite bordas, cantos arredondados ou margens</li>
        <li>Nao inclua informacoes de preco ou classificacoes</li>
        <li>Evite usar screenshots do aplicativo na imagem de destaque</li>
    </ul>
    
    <div class="graphic-placeholder">
        Sua Imagem de Destaque Aqui<br>
        1024x500px
    </div>
    
    <h2>Ferramentas Recomendadas</h2>
    <ul>
        <li><strong>Adobe Photoshop</strong> - Para design profissional</li>
        <li><strong>Canva</strong> - Opcao facil com templates prontos</li>
        <li><strong>Figma</strong> - Alternativa gratuita online com recursos poderosos</li>
        <li><strong>GIMP</strong> - Alternativa gratuita ao Photoshop</li>
    </ul>
    
    <h2>Dicas Adicionais</h2>
    <ul>
        <li>A imagem de destaque e a primeira impressao do seu app na Google Play</li>
        <li>Mantenha consistencia visual com seus outros materiais de marketing</li>
        <li>Teste como a imagem aparece em diferentes dispositivos</li>
        <li>Atualize periodicamente para campanhas sazonais ou promocoes</li>
        <li>Considere A/B testing com diferentes imagens para ver qual tem melhor conversao</li>
    </ul>
</body>
</html>
"@

Set-Content -Path $featureGraphicHtmlPath -Value $featureGraphicHtml
Write-Log "Arquivo de instrucoes para imagem de destaque criado: $featureGraphicHtmlPath" -Type Success

# Gerar arquivo HTML com instrucoes para screenshots
$screenshotsHtmlPath = "$screenshotsDir\instrucoes-screenshots.html"
$screenshotsHtml = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instrucoes para Screenshots</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3 {
            color: #4285F4;
        }
        .requirements {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .checklist {
            list-style-type: none;
            padding-left: 0;
        }
        .checklist li {
            padding: 8px 0 8px 30px;
            position: relative;
        }
        .checklist li:before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #4CAF50;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Instrucoes para Captura de Screenshots</h1>
    
    <div class="requirements">
        <h2>Requisitos da Google Play Store</h2>
        <p>Voce pode enviar ate 8 screenshots para cada tipo de dispositivo. Recomenda-se enviar pelo menos 4 screenshots para smartphones.</p>
    </div>
    
    <h2>Especificacoes por Dispositivo</h2>
    
    <h3>Smartphones</h3>
    <table>
        <tr>
            <th>Tipo</th>
            <th>Resolucao Minima</th>
            <th>Relacao de Aspecto</th>
            <th>Formato</th>
        </tr>
        <tr>
            <td>Tela de Telefone (obrigatorio)</td>
            <td>320px</td>
            <td>16:9, 9:16, 2:1, 1:2, 4:3, 3:4</td>
            <td>JPG ou PNG (sem transparencia)</td>
        </tr>
    </table>
    
    <h3>Tablets</h3>
    <table>
        <tr>
            <th>Tipo</th>
            <th>Resolucao Minima</th>
            <th>Relacao de Aspecto</th>
            <th>Formato</th>
        </tr>
        <tr>
            <td>Tela de Tablet (opcional)</td>
            <td>1080px</td>
            <td>16:9, 9:16, 2:1, 1:2, 4:3, 3:4</td>
            <td>JPG ou PNG (sem transparencia)</td>
        </tr>
    </table>
    
    <h2>Diretrizes de Captura</h2>
    <ul class="checklist">
        <li>Capture as principais funcionalidades do seu aplicativo</li>
        <li>Mostre a interface do usuario em uso real</li>
        <li>Evite mostrar barras de status do dispositivo</li>
        <li>Mantenha consistencia visual entre os screenshots</li>
        <li>Considere adicionar texto explicativo sobre os recursos</li>
        <li>Evite bordas, molduras ou efeitos que nao fazem parte do app</li>
        <li>Certifique-se de que o texto e legivel em tamanhos menores</li>
        <li>Nao inclua informacoes de preco nos screenshots</li>
    </ul>
    
    <h2>Sequencia Recomendada</h2>
    <ol>
        <li><strong>Tela inicial/principal</strong> - Primeira impressao do aplicativo</li>
        <li><strong>Funcionalidade principal #1</strong> - Destaque o recurso mais importante</li>
        <li><strong>Funcionalidade principal #2</strong> - Mostre outro recurso valioso</li>
        <li><strong>Funcionalidade principal #3</strong> - Continue destacando recursos importantes</li>
        <li><strong>Experiencia do usuario</strong> - Mostre o app em uso</li>
        <li><strong>Diferenciais competitivos</strong> - O que torna seu app unico</li>
        <li><strong>Integracao social</strong> - Se aplicavel, mostre recursos sociais</li>
        <li><strong>Call to action</strong> - Encerre com uma tela que incentive o download</li>
    </ol>
    
    <h2>Ferramentas Recomendadas</h2>
    <ul>
        <li><strong>Android Studio</strong> - Para capturas em emuladores Android</li>
        <li><strong>Xcode</strong> - Para capturas em simuladores iOS</li>
        <li><strong>Screenshotbot</strong> - Automatizacao de capturas de tela</li>
        <li><strong>Figma/Photoshop</strong> - Para adicionar texto ou elementos visuais</li>
        <li><strong>AppMockUp</strong> - Para criar mockups em dispositivos reais</li>
    </ul>
    
    <h2>Dicas Adicionais</h2>
    <ul>
        <li>Use dados de exemplo realistas e atraentes</li>
        <li>Considere localizar os screenshots para diferentes mercados</li>
        <li>Teste como os screenshots aparecem em diferentes tamanhos</li>
        <li>Atualize os screenshots quando lancar novas funcionalidades importantes</li>
    </ul>
</body>
</html>
"@

Set-Content -Path $screenshotsHtmlPath -Value $screenshotsHtml
Write-Log "Arquivo de instrucoes para screenshots criado: $screenshotsHtmlPath" -Type Success

# Criar arquivo README com instrucoes gerais
$readmePath = "$resourcesDir\README.md"
$readmeContent = @"
# Recursos Graficos para Google Play Store

## Visao Geral
Este diretorio contem todos os recursos graficos necessarios para a publicacao do seu aplicativo na Google Play Store. Siga as instrucoes em cada pasta para preparar os arquivos adequadamente.

## Estrutura de Diretorios

- **icons/** - Icone do aplicativo (512x512px)
- **feature-graphic/** - Imagem de destaque (1024x500px)
- **screenshots/** - Screenshots para diferentes dispositivos
  - **phone/** - Screenshots para smartphones
  - **tablet/** - Screenshots para tablets
  - **tv/** - Screenshots para Android TV (se aplicavel)
  - **wear/** - Screenshots para Wear OS (se aplicavel)

## Checklist de Recursos Graficos

### Obrigatorios
- [ ] Icone do aplicativo (512x512px, PNG com transparencia)
- [ ] Imagem de destaque (1024x500px, JPG ou PNG)
- [ ] Pelo menos 2 screenshots de smartphone

### Recomendados
- [ ] 4-8 screenshots de smartphone mostrando diferentes funcionalidades
- [ ] 4-8 screenshots de tablet (se o app for compativel)
- [ ] Video promocional (opcional, mas altamente recomendado)

## Diretrizes Gerais

1. **Mantenha consistencia visual** em todos os recursos graficos
2. **Destaque os principais recursos** do seu aplicativo
3. **Evite texto excessivo** nas imagens
4. **Nao inclua informacoes de preco** nos recursos graficos
5. **Teste como os recursos aparecem** em diferentes dispositivos e tamanhos

## Proximos Passos

1. Prepare todos os recursos graficos seguindo as instrucoes em cada pasta
2. Verifique se todos os arquivos atendem aos requisitos da Google Play Store
3. Faca upload dos recursos na Google Play Console durante o processo de publicacao

## Recursos Adicionais

- [Diretrizes de Design da Google Play](https://developer.android.com/distribute/best-practices/launch/store-listing)
- [Ferramentas de Design para Desenvolvedores](https://developer.android.com/distribute/best-practices/launch/feature-graphic)
- [Melhores Praticas para Screenshots](https://developer.android.com/distribute/best-practices/launch/screenshots)
"@

Set-Content -Path $readmePath -Value $readmeContent
Write-Log "Arquivo README criado: $readmePath" -Type Success

# Criar arquivo de template para o icone do aplicativo
$iconTemplatePath = "$iconsDir\icone-template.svg"
$iconTemplateSvg = @"
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo circular -->
  <circle cx="256" cy="256" r="256" fill="#F5F5F5"/>
  
  <!-- Circulo de mascara para visualizar como ficara na Play Store -->
  <circle cx="256" cy="256" r="230" fill="#FFFFFF" stroke="#E0E0E0" stroke-width="2"/>
  
  <!-- Texto de instrucao -->
  <text x="256" y="246" font-family="Arial" font-size="24" text-anchor="middle" fill="#757575">Seu Icone Aqui</text>
  <text x="256" y="276" font-family="Arial" font-size="16" text-anchor="middle" fill="#757575">512x512px</text>
  
  <!-- Grade de guia -->
  <line x1="0" y1="256" x2="512" y2="256" stroke="#E0E0E0" stroke-width="1" stroke-dasharray="5,5"/>
  <line x1="256" y1="0" x2="256" y2="512" stroke="#E0E0E0" stroke-width="1" stroke-dasharray="5,5"/>
  
  <!-- Circulo de area segura -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#4CAF50" stroke-width="2" stroke-dasharray="5,5"/>
</svg>
"@

Set-Content -Path $iconTemplatePath -Value $iconTemplateSvg
Write-Log "Template SVG para icone criado: $iconTemplatePath" -Type Success

# Criar arquivo de template para a imagem de destaque
$featureGraphicTemplatePath = "$featureGraphicDir\imagem-destaque-template.svg"
$featureGraphicTemplateSvg = @"
<svg width="1024" height="500" viewBox="0 0 1024 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo -->
  <rect width="1024" height="500" fill="#F5F5F5"/>
  
  <!-- Texto de instrucao -->
  <text x="512" y="240" font-family="Arial" font-size="32" text-anchor="middle" fill="#757575">Sua Imagem de Destaque Aqui</text>
  <text x="512" y="280" font-family="Arial" font-size="24" text-anchor="middle" fill="#757575">1024x500px</text>
  
  <!-- Grade de guia -->
  <line x1="0" y1="250" x2="1024" y2="250" stroke="#E0E0E0" stroke-width="1" stroke-dasharray="5,5"/>
  <line x1="512" y1="0" x2="512" y2="500" stroke="#E0E0E0" stroke-width="1" stroke-dasharray="5,5"/>
  
  <!-- Area segura -->
  <rect x="102.4" y="50" width="819.2" height="400" fill="none" stroke="#4CAF50" stroke-width="2" stroke-dasharray="5,5"/>
  <text x="512" y="470" font-family="Arial" font-size="16" text-anchor="middle" fill="#4CAF50">Area Segura (80% da largura x 80% da altura)</text>
</svg>
"@

Set-Content -Path $featureGraphicTemplatePath -Value $featureGraphicTemplateSvg
Write-Log "Template SVG para imagem de destaque criado: $featureGraphicTemplatePath" -Type Success

# Criar template para screenshot de telefone
$phoneScreenshotTemplatePath = "$screenshotsDir\phone\screenshot-phone-template.svg"
$phoneScreenshotTemplateSvg = @"
<svg width="1080" height="1920" viewBox="0 0 1080 1920" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo -->
  <rect width="1080" height="1920" fill="#F5F5F5"/>
  
  <!-- Texto de instrucao -->
  <text x="540" y="940" font-family="Arial" font-size="48" text-anchor="middle" fill="#757575">Screenshot de Telefone</text>
  <text x="540" y="1000" font-family="Arial" font-size="32" text-anchor="middle" fill="#757575">1080x1920px</text>
  
  <!-- Grade de guia -->
  <line x1="0" y1="960" x2="1080" y2="960" stroke="#E0E0E0" stroke-width="1" stroke-dasharray="5,5"/>
  <line x1="540" y1="0" x2="540" y2="1920" stroke="#E0E0E0" stroke-width="1" stroke-dasharray="5,5"/>
  
  <!-- Area de conteudo principal -->
  <rect x="108" y="192" width="864" height="1536" fill="none" stroke="#4CAF50" stroke-width="2" stroke-dasharray="5,5"/>
  <text x="540" y="1850" font-family="Arial" font-size="24" text-anchor="middle" fill="#4CAF50">Area de Conteudo Principal</text>
</svg>
"@

Set-Content -Path $phoneScreenshotTemplatePath -Value $phoneScreenshotTemplateSvg
Write-Log "Template SVG para screenshot de telefone criado: $phoneScreenshotTemplatePath" -Type Success

# Criar template para screenshot de tablet
$tabletScreenshotTemplatePath = "$screenshotsDir\tablet\screenshot-tablet-template.svg"
$tabletScreenshotTemplateSvg = @"
<svg width="2048" height="1536" viewBox="0 0 2048 1536" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo -->
  <rect width="2048" height="1536" fill="#F5F5F5"/>
  
  <!-- Texto de instrucao -->
  <text x="1024" y="748" font-family="Arial" font-size="48" text-anchor="middle" fill="#757575">Screenshot de Tablet</text>
  <text x="1024" y="808" font-family="Arial" font-size="32" text-anchor="middle" fill="#757575">2048x1536px</text>
  
  <!-- Grade de guia -->
  <line x1="0" y1="768" x2="2048" y2="768" stroke="#E0E0E0" stroke-width="1" stroke-dasharray="5,5"/>
  <line x1="1024" y1="0" x2="1024" y2="1536" stroke="#E0E0E0" stroke-width="1" stroke-dasharray="5,5"/>
  
  <!-- Area de conteudo principal -->
  <rect x="204.8" y="153.6" width="1638.4" height="1228.8" fill="none" stroke="#4CAF50" stroke-width="2" stroke-dasharray="5,5"/>
  <text x="1024" y="1450" font-family="Arial" font-size="24" text-anchor="middle" fill="#4CAF50">Area de Conteudo Principal</text>
</svg>
"@

Set-Content -Path $tabletScreenshotTemplatePath -Value $tabletScreenshotTemplateSvg
Write-Log "Template SVG para screenshot de tablet criado: $tabletScreenshotTemplatePath" -Type Success

# Exibir resumo final
Write-Log "Recursos graficos preparados com sucesso!" -Type Success
Write-Log "Diretorio de recursos: $resourcesDir" -Type Info
Write-Log "\nProximos passos:" -Type Info
Write-Log "1. Acesse os arquivos HTML em cada pasta para obter instrucoes detalhadas" -Type Info
Write-Log "2. Use os templates SVG como base para criar seus recursos graficos" -Type Info
Write-Log "3. Verifique o README.md para um checklist completo" -Type Info
Write-Log "4. Prepare todos os recursos antes de iniciar o processo de publicacao" -Type Info

# Abrir o diretorio de recursos no explorador de arquivos
try {
    Start-Process explorer.exe -ArgumentList $resourcesDir
    Write-Log "Diretorio de recursos aberto no explorador de arquivos" -Type Success
} catch {
    Write-Log "Nao foi possivel abrir o diretorio no explorador. Acesse manualmente: $resourcesDir" -Type Warning
}